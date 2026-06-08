import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import DateDisplay from '../../Utils/formatDateForInput';
import clsx from 'clsx';

// MUI
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import CancelIcon from '@mui/icons-material/Cancel';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import { TextareaAutosize, CircularProgress } from '@mui/material';

// Hooks
import { useTRApproval } from '../../hooks/useTRApproval';
import { useApprovalLogs } from '../../hooks/useApprovalLogs';
import { useApprovalActions } from '../../Utils/approvalActionHandler';

// Components
import BulkActionDialog from '../../Utils/bulkActionDialog';
import Toast from '../../Utils/toast';
import SelectionModeHeader from '../../Utils/selectionModeHeader';

// Custom Utils
import { getStatusBadge } from '../../Utils/filters';


function MvTRForm({
    useProps,
    filteredTR,
    trDetails,
    isLoading,
    error,
    selectedUser,
    trRefresh, 
    trDetailsRefresh,
    selectionMode,
    selectedTR,
    setSelectedTR,
    onEnterSelectionMode,
    onExitSelectionMode,
    onSelectAll, 
    selectAll

}) {
    const { 
        approveTR,
        rejectTR,
        getApprovalStatus,
        getTotalLevels,
        // getNextApproverLevel,
        getXpostStatusText,
        canApprove,
        loading: approvalLoading 
    } = useTRApproval();

    const {approvalLogs} = useApprovalLogs(useProps);
    const [viewItems, setViewItems] = useState({});
    const [viewApprovers, setViewApprovers] = useState({});
    const [selectedDetails, setSelectedDetails] = useState(null);
    const [openAppOptions, setOpenAppOptions] = useState({});
    const [toast, setToast] = useState({ show: false, message: '', type: '' });
    const [totalLevels, setTotalLevels] = useState(3);

    const showToast = useCallback((message, type = 'success') => {
        setToast({ show: true, message, type });
    }, []);

    const hideToast = useCallback(() => {
        setToast(prev => ({ ...prev, show: false }));
    }, []);


// Fetch total levels only once when component mounts
    useEffect(() => {
        let isMounted = true;
        let timeoutId = null;
        
        const fetchTotalLevels = async () => {
          try {
            console.log('🔍 Starting to fetch total levels...');
            console.log('📊 Current totalLevels state before fetch:', totalLevels);
            
            const timeoutPromise = new Promise((_, reject) => {
                timeoutId = setTimeout(() => reject(new Error('Fetch timeout after 10 seconds')), 10000);
            });
            
            const fetchPromise = getTotalLevels();
            const result = await Promise.race([fetchPromise, timeoutPromise]);
            
            clearTimeout(timeoutId);
            
            console.log('📦 Fetch result received:', result);
            
            if (isMounted && result) {
                if (result.success) {
                    console.log('✅ Setting totalLevels to:', result.totalLevels);
                    setTotalLevels(result.totalLevels);
                    
                    // Verify state was updated
                    setTimeout(() => {
                        console.log('🔍 After setTotalLevels, current value should be:', result.totalLevels);
                    }, 100);
                } else {
                    console.error('❌ Failed to fetch total levels:', result.error);
                    console.log('⚠️ Using default totalLevels: 3');
                    setTotalLevels(3);
                }
            }
          } catch (err) {
            clearTimeout(timeoutId);
            console.error('❌ Error fetching total levels:', err);
            if (isMounted) {
                console.log('⚠️ Using default totalLevels due to error: 3');
                setTotalLevels(3);
            }
          }
        };
        
        fetchTotalLevels();
        
        return () => {
            isMounted = false;
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [getTotalLevels]); 

    // Get approval level for a TR
    const getApprovalLevel = useCallback((header, forApproval = true) => {
        if (!header) return 1;
        
        if (header.xpost === 3) {
            return 1;
        } else if (header.xpost === 2 && header.appStat) {
            const approvedLevels = header.appStat.split(',').map(l => parseInt(l.trim()));
            if (forApproval) {
                return approvedLevels.length + 1;
            } else {
                return approvedLevels.length + 1;
            }
        }
        return 1;
    }, []);

    // Get Doc data by ID
    const getDocData = useCallback((DocNo) => {
        return filteredTR?.find(tr => tr.TR_No === DocNo);
    }, [filteredTR]);

    // Use the approval actions hook
    const {
        processingItem: processingTR,
        remarks,
        bulkDialogOpen,
        bulkActionType,
        bulkRemarks,
        bulkLoading,
        handleIndividualAction,
        processBulkAction,
        openBulkDialog,
        closeBulkDialog,
        updateRemarks,
        clearRemarks,
        setBulkRemarks
    } = useApprovalActions({
        onApprove: approveTR,
        onReject: rejectTR,
        // No getItemLevel for JO since it doesn't have multi-level approval
        onRefresh: () => {
            trRefresh?.();
            trDetailsRefresh?.();
            if (onExitSelectionMode) {onExitSelectionMode();}
        },
        onExitSelectionMode,
        showToast
        // getUserInfo is not needed since we'll pass selectedUser directly
    });

  // Handle bulk action wrapper
  const handleBulkAction = useCallback(() => {
        processBulkAction(
          selectedTR, 
          bulkActionType, 
          bulkRemarks, 
          getDocData,
          selectedUser  // Pass the user info here
        );
    }, [selectedTR, bulkActionType, bulkRemarks, processBulkAction, getDocData, selectedUser]);

    const handleViewItemsOpen = (e, TR_No) => {
        e.stopPropagation();
        setViewItems(prev => ({
            ...prev,
            [TR_No]: !prev[TR_No]
        }));
        setViewApprovers(prev => ({
            ...prev,
            [TR_No]: false
        }));
    };

    const handleViewApprovers = (e, TR_No) => {
        e.stopPropagation();
        setViewApprovers(prev => ({
            ...prev,
            [TR_No]: !prev[TR_No]
        }));
        setViewItems(prev => ({
            ...prev,
            [TR_No]: false
        }));
    };

    const handleOpenAppOptions = async (e, TR_No) => {
        e.stopPropagation();        
        setOpenAppOptions(prev => ({
            ...prev,
            [TR_No]: !prev[TR_No]
        }));
        document.body.style.overflow = 'hidden';
    };

    const handleCloseAppOptions = (TR_No) => {
        setOpenAppOptions(prev => ({
            ...prev,
            [TR_No]: false
        }));
        document.body.style.overflow = 'unset';
        clearRemarks(TR_No);
    };

    // Handle individual approve/reject action
    const handleApproveReject = useCallback(async (DocNo, action, remarkText, DocData, currentLevel) => {
        const result = await handleIndividualAction(
            DocNo, 
            action, 
            remarkText, 
            DocData, 
            selectedUser,
            currentLevel
        );
        // If successful, close the modal
        if (result && result.success) {
          handleCloseAppOptions(DocNo);
          // Exit selection mode if we're in it
          if (selectionMode && onExitSelectionMode) {
              onExitSelectionMode();
          }
        }       
        return result;
    }, [handleIndividualAction, selectedUser, handleCloseAppOptions, selectionMode, onExitSelectionMode]);

    const handleShowItems = (item, e) => {
        e.stopPropagation();
        setSelectedDetails(item);
        document.body.style.overflow = 'hidden';
    };

    const handleCloseDetails = () => {
        setSelectedDetails(null);
        document.body.style.overflow = 'unset';
    };

    const longPressTimeout = useRef(null);
    
    const handleLongPressStart = (header) => {
        const canBeApproved = canApprove(header);
        
        if (canBeApproved.canApprove && header.xpost !== 1 && header.DISAPPROVED !== 1) {
            longPressTimeout.current = setTimeout(() => {
                if (onEnterSelectionMode) onEnterSelectionMode(header.TR_No);
            }, 500);
        }
    };

    const handleLongPressEnd = () => {
        if (longPressTimeout.current) {
            clearTimeout(longPressTimeout.current);
        }
    };

    // Filter trDetails by TR_No & Approval logs by TR_No
    const getItemsByTRNo = (TR_No) => {
        return trDetails?.filter(detail => detail.TR_No === TR_No) || [];
    };
    
    const getAppLogByTRNo = (TR_No) => {
        return approvalLogs?.filter(log => (log.TRNO === TR_No) && log.Module === 'Transfer (Internal)') || [];
    };

    // Sort the filteredTR array by date (latest first)
    const sortedFilteredTR = useMemo(() => {
        if (!filteredTR) return [];        
        return [...filteredTR].sort((a, b) => {
            return b.TR_No.localeCompare(a.TR_No);
        });
    }, [filteredTR]);

    // Check if TR is eligible for selection
    const isEligibleForSelection = (header) => {
        const approvalCheck = canApprove(header);
        return approvalCheck.canApprove && header.DISAPPROVED !== 1 && header.xpost !== 1;
    };

    // Get next level for display
    const getNextLevel = (header) => {
        if (header.xpost === 3) return 1;
        if (header.xpost === 2 && header.appStat) {
            const approvedLevels = header.appStat.split(',').length;
            return approvedLevels + 1;
        }
        return null;
    };

    // Show loading state
    if (isLoading || approvalLoading) return (
        <div className="flex flex-col items-center justify-center py-8">
            <CircularProgress />
            <span className="mt-3 text-sm text-gray-500">Loading transfer orders...</span>
        </div>
    );
    
    if (error) return (
        <div className="p-4 text-center text-red-600 rounded-lg bg-red-50">
            Error: {error}
        </div>
    );

    return (
      <>
        <Toast 
          show={toast.show} 
          message={toast.message} 
          type={toast.type} 
          onClose={hideToast} 
        />

        <BulkActionDialog
          isOpen={bulkDialogOpen}
          onClose={closeBulkDialog}
          onConfirm={handleBulkAction}
          actionType={bulkActionType}
          itemCount={selectedTR.length}
          itemName="Transfer (Internal)"
          loading={bulkLoading}
          remarks={bulkRemarks}
          onRemarksChange={setBulkRemarks}
        />

        {selectionMode && selectedTR.length > 0 && (
          <SelectionModeHeader
            selectedCount={selectedTR.length}
            onApprove={() => openBulkDialog('approve')}
            onReject={() => openBulkDialog('reject')}
            onSelectAll={onSelectAll}
            selectAll={selectAll}
          />
        )}

        {sortedFilteredTR.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No Transfer Forms found
          </div>
        ) : (
            sortedFilteredTR?.map((header) => {
              const items = getItemsByTRNo(header.TR_No);
              const logs = getAppLogByTRNo(header.TR_No);
              const statusBadge = getStatusBadge(header, totalLevels);
              const eligibleForSelection = isEligibleForSelection(header);
              const nextLevel = getNextLevel(header);
              // const totalLevels = 3;
              
              return (
                <div 
                  key={header?.ID} 
                  className={clsx(
                    "flex flex-col mx-3 gap-1 p-2 border border-spacing-1 shadow-md rounded-xl",
                    (selectedTR.includes(header.TR_No) && eligibleForSelection) && "bg-slate-200 border-blue-500",
                    !eligibleForSelection && header.xpost !== 1 && "cursor-not-allowed"
                  )}
                  onClick={() => {
                    if (selectionMode && eligibleForSelection) {
                      if (selectedTR.includes(header.TR_No)) {
                        setSelectedTR(prev => prev.filter(j => j !== header.TR_No));
                      } else {
                        setSelectedTR(prev => [...prev, header.TR_No]);
                      }
                    }
                  }}
                  onTouchStart={() => handleLongPressStart(header)}
                  onTouchEnd={handleLongPressEnd}
                  longTouchDelay={500}
                >
                  <div className='flex justify-end'>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${statusBadge.color}`}>
                    {statusBadge.text}
                    </span>
                  </div>
                  <div className='flex justify-between px-2'>
                    <div className='flex items-center gap-2'>
                      <span className='font-sans text-sm font-semibold text-blue-900'>{header.TR_No}</span>
                    </div>
                    <span className='text-sm text-slate-500'><DateDisplay value={header.xDate} format="short" /></span>
                  </div>

                  <div className='flex flex-col px-2 text-sm tracking-wide text-slate-500'>
                    <span>{header.Department}</span>
                    <span> Holder: {header.Holder}</span>
                    <span>For Transfer to: {header.Location}</span>
                    <div className='flex justify-start gap-2 mt-1 '>
                      <span>Remarks:</span>
                      <span className='text-black'>{header.Remarks}</span>
                    </div>
                  </div>

                  {/* Button to View Items and Approvers */}
                  <div className='flex flex-row justify-between px-2 border-t-2'>
                    <div className='flex gap-3'>
                      <button 
                        className={clsx(
                          'flex gap-1 text-xs items-center mt-1 px-3 py-1 border rounded-full transition-all duration-200',
                          !viewItems[header.TR_No] ? 'border-slate-400 hover:border-blue-500' : 'border-blue-500 text-blue-700 bg-blue-50'
                        )}
                        onClick={(e) => handleViewItemsOpen(e, header.TR_No)}
                      >
                        <img className='w-4' src='/icons/actions/boxes.png' alt="items"/>
                        <span className='font-semibold tracking-wide'>Items ({items.length})</span>
                      </button>
                      {(header.approved_by || logs.length > 0) && (
                        <button 
                          className={clsx(
                            'flex gap-1 text-xs items-center mt-1 px-2 border rounded-full transition-all duration-200',
                            !viewApprovers[header.TR_No] ? 'border-slate-400 hover:border-blue-500' : 'border-blue-500 text-blue-700 bg-blue-50'
                          )}
                          onClick={(e) => handleViewApprovers(e, header.TR_No)}
                        >
                          <img className='w-4' src='/icons/actions/approve.png' alt="approvers"/>
                          <span className='font-semibold tracking-wide'>Approval logs</span>
                        </button>
                      )}
                    </div>
                    {eligibleForSelection && header.xpost !== 1 && header.DISAPPROVED !== 1 && (
                      <button 
                        onClick={(e) => handleOpenAppOptions(e, header.TR_No)}
                        className="p-1 transition-colors rounded-full hover:bg-gray-100"
                      >
                        <MoreHorizIcon />
                      </button>
                    )}
                  </div>

                  {/* Items section */}
                  {viewItems[header.TR_No] && (
                    <div className='flex flex-col text-sm'>
                      {items.length > 0 ? (
                        items.map((item, index) => (
                          <div key={item.ID || index} className='flex flex-col gap-1 p-2'>
                            <span
                              onClick={(e) => handleShowItems(item, e)} 
                              className='text-blue-600 cursor-pointer hover:text-blue-800 hover:underline'
                            >
                              {item.FAC_name}
                            </span>   
                            {item.FAC_NO && (
                              <span className='text-gray-600'>
                                {item.FAC_NO}
                              </span>
                            )}                                    
                          </div>
                        ))
                      ) : (
                        <div className='text-sm italic text-center text-gray-500'>
                          No items found for this transfer form.
                        </div>
                      )}
                    </div>
                  )}

                  {/* Show approval logs with level information */}
                  {viewApprovers[header.TR_No] && logs.length > 0 &&
                     <div className='flex flex-col px-3 mt-2 text-sm'>
                      {logs.map((log, idx) => (
                        <div key={idx} className="py-2 border-b border-gray-100 last:border-0">
                          <div className='flex items-center justify-between'>
                            <div className='flex items-center gap-2'>
                              <span className='w-5'>
                                {log.STAT !== 'Disapproved' && log.STAT !== 'Rejected' ? 
                                  <CheckCircleIcon fontSize='small' className='text-green-500' /> : 
                                  <CancelIcon fontSize='small' className='text-red-500'/>
                                }
                              </span>
                              <span className='font-medium'>Level {log.APP_LEVEL}:</span>
                              <span className="font-medium">{log.X_USER?.split('-')[1]}</span>
                            </div>
                            <div className='flex gap-2 text-xs text-gray-500'>
                                {log.STAT !== 'Disapproved' && log.STAT !== 'Rejected' && <span > {log.STAT}</span> }
                              <span><DateDisplay value={log.DT} format="short" /></span>       
                            </div>                             
                          </div>
                          {log.REMARKS && (
                            <div className='pt-1 text-xs italic text-gray-600 pl-7'>
                              "{log.REMARKS}"
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  }

                  {/* Individual Action Modal with level info */}
                  {openAppOptions[header.TR_No] && ReactDOM.createPortal(
                    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-end z-[99999] animate-fade-in'>
                      <div 
                        className='w-full bg-white shadow-xl rounded-t-2xl animate-slide-up'
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className='sticky top-0 px-6 py-4 bg-white border-b rounded-t-2xl'>
                          <div className='flex items-center justify-between'>
                            <div>
                              <h3 className='text-lg font-semibold text-gray-900'>Transfer Form Approval</h3>
                              <p className='text-sm text-gray-500'>{header.TR_No}</p>
                              {nextLevel && (
                                <p className='mt-1 text-xs text-blue-600'>
                                    Level {nextLevel} of {totalLevels} Approval
                                </p>
                              )}
                            </div>
                            <button 
                              onClick={() => handleCloseAppOptions(header.TR_No)}
                              className="p-1 transition-colors rounded-full hover:bg-gray-100"
                            >
                              <KeyboardArrowDownIcon />
                            </button>
                          </div>
                        </div>
                          
                        <div className='p-6'>
                          <div className='mb-4'>
                            <label className='block mb-2 text-sm font-medium text-gray-700'>
                                Remarks <span className="text-red-500">*</span>
                            </label>
                            <TextareaAutosize
                              minRows={3}
                              placeholder={`Please provide your remarks here...`}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              value={remarks[header.TR_No] || ''}
                              onChange={(e) => updateRemarks(header.TR_No, e.target.value)}
                              disabled={processingTR === header.TR_No}
                              autoFocus
                            />
                          </div>
                            
                          <div className='flex flex-col gap-3'>
                            <button 
                              className='flex-1 py-3 tracking-wide text-white transition-colors bg-green-600 rounded-full shadow-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed'
                              onClick={() => handleApproveReject(header.TR_No, 'approve', remarks[header.TR_No] || '', getDocData(header.TR_No))}
                              disabled={processingTR === header.TR_No || !remarks[header.TR_No]}
                            >
                              {processingTR === header.TR_No ? (
                                <div className="flex items-center justify-center gap-2">
                                  <CircularProgress size={20} color="inherit" />
                                  <span>Processing...</span>
                                </div>
                              ) : (
                                `Approve`
                              )}
                            </button>
                            <button 
                              className='flex-1 py-3 tracking-wide text-red-600 transition-colors border border-red-400 rounded-full hover:bg-red-600 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed'
                              onClick={() => handleApproveReject(header.TR_No, 'reject', remarks[header.TR_No] || '', getDocData(header.TR_No))}
                              disabled={processingTR === header.TR_No || !remarks[header.TR_No] }
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>,
                    document.body
                  )}

                  {/* Display the Asset information and its status */}
                  {selectedDetails && ReactDOM.createPortal(
                    <div 
                      style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: "hsla(0, 0%, 20%, 0.3)",
                        display: 'flex',
                        alignItems: 'flex-end',
                        justifyContent: 'center',
                        zIndex: 9999999,
                      }}
                      onClick={handleCloseDetails}
                    >
                      <div 
                                          className='bg-white w-full max-h-[80vh] overflow-y-auto rounded-t-2xl shadow-xl animate-slide-up'
                        onClick={(e) => e.stopPropagation()}
                      >
                          <div className='sticky top-0 px-6 py-4 bg-white border-b'>
                            <div className='flex items-center justify-between'>
                              <h2 className='text-lg font-semibold text-gray-900'>
                                Asset Details
                              </h2>
                              <button 
                                onClick={handleCloseDetails}
                                className="p-1 transition-colors rounded-full hover:bg-gray-100"
                              >
                                <KeyboardArrowDownIcon />
                              </button>
                            </div>
                          </div>

                          <div className='p-6'>
                            <div className='pb-3 mb-4 border-b'>
                              <h3 className='font-semibold text-blue-700 text-md'>{selectedDetails.FAC_name}</h3>
                              <p className='text-sm text-gray-500'>Asset No: {selectedDetails.FAC_NO}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <div className="text-gray-400">TR NO:</div>
                                <div>{selectedDetails.TR_No}</div>
                              </div>
                              <div>
                                <div className="text-gray-400">Quantity</div>
                                <div>{selectedDetails.qty}</div>
                              </div>
                              <div>
                                <div className="text-gray-400">UOM</div>
                                <div>{selectedDetails.UOM}</div>
                              </div>
                              <div>
                                <div className="text-gray-400">New Holder</div>
                                <div>{selectedDetails.New_Holder}</div>
                              </div>
                              <div>
                                <div className="text-sm text-gray-400">Acquired Date</div>
                                <DateDisplay value={selectedDetails.Date_Aq} format="short" />
                              </div>
                              <div>
                                <div className="text-sm text-gray-400">Acquired Value</div>
                                <div>{selectedDetails.Amount_aq}</div>
                              </div>
                              <div>
                                <div className="text-sm text-gray-400">Transfer from:</div>
                                <div>{selectedDetails.Orig_Department}</div>
                              </div>
                              <div>
                                <div className="text-sm text-gray-400">Transfer to:</div>
                                <div>{selectedDetails.New_Location}</div>
                              </div>
                              {selectedDetails.Brand &&
                                <div>
                                  <div className="text-sm text-gray-400">Brand:</div>
                                  <div>{selectedDetails.brand}</div>
                                </div>
                              }
                              {selectedDetails.serial_no &&
                                <div>
                                  <div className="text-sm text-gray-400">Serial No:</div>
                                  <div>{selectedDetails.serialno}</div>
                                </div>
                              }
                            </div>
                          </div>
                          

                      </div>
                    </div>,
                    document.body
                  )}
                </div>                
              );
          })
        )}        
      </>
    );
}

export default MvTRForm;