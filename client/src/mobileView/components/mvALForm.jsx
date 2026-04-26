import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import DateDisplay from '../../Utils/formatDateForInput';
import clsx from 'clsx';

// MUI
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import CancelIcon from '@mui/icons-material/Cancel';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import {TextareaAutosize, CircularProgress} from '@mui/material';
// Hooks
import {useApprovalLogs} from '../../hooks/useApprovalLogs';
import { useAssetLostApproval } from '../../hooks/useAssetLostApproval';
// Custom Utils
import { useApprovalActions } from '../../Utils/approvalActionHandler';
// Components
import BulkActionDialog from '../../Utils/bulkActionDialog';
import Toast from '../../Utils/toast';
import SelectionModeHeader from '../../Utils/selectionModeHeader';



function MvALForm({
  useProps,
  filteredAL,
  assetLostDetails,
  assetLostHeaders,
  isLoading,
  error,
  selectedUser,
  aLostHRefresh, 
  aLostDRefresh,
  selectionMode,
  selectedAL,
  setSelectedAL,
  onEnterSelectionMode,
  onExitSelectionMode,
  onSelectAll, 
  selectAll
}) {

  const { 
  approveAssetLost,
  rejectAssetLost,
  getApprovalStatus,
  getTotalLevels,
  getXpostStatusText,
  canApprove,
  loading: approvalLoading 
  } = useAssetLostApproval();

  const {approvalLogs} = useApprovalLogs(useProps);
  const [viewItems, setViewItems] = useState({});
  const [viewApprovers, setViewApprovers] = useState({});
  const [selectedDetails, setSelectedDetails] = useState(null);
  const [openAppOptions, setOpenAppOptions] = useState({});
  const [toast, setToast] = useState({ show: false, message: '', type: '' });
  const [totalLevels, setTotalLevels] = useState();  

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
            setTotalLevels();
          }
        }
      } catch (err) {
        clearTimeout(timeoutId);
        console.error('❌ Error fetching total levels:', err);
        if (isMounted) {
            console.log('⚠️ Using default totalLevels due to error: 3');
            setTotalLevels();
        }
      }
    };
    
    fetchTotalLevels();
    
    return () => {
        isMounted = false;
        if (timeoutId) clearTimeout(timeoutId);
    };
  }, [getTotalLevels]); 

    // Use the approval actions hook
  const {
    processingItem: processingAL,
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
    onApprove: approveAssetLost,
    onReject: rejectAssetLost,
    // No getItemLevel for JO since it doesn't have multi-level approval
    onRefresh: () => {
      aLostHRefresh?.();
      aLostDRefresh?.();
      if (onExitSelectionMode) {onExitSelectionMode();}
    },
    onExitSelectionMode,
    showToast
    // getUserInfo is not needed since we'll pass selectedUser directly
  });
  

    // Get Doc data by ID
  const getDocData = useCallback((DocNo) => {
      return filteredAL?.find(ad => ad.AAFNo === DocNo);
  }, [filteredAL]);

      // Handle bulk action wrapper
  const handleBulkAction = useCallback(() => {
    processBulkAction(
      selectedAL, 
      bulkActionType, 
      bulkRemarks, 
      getDocData,
      selectedUser  // Pass the user info here
    );
  }, [selectedAL, bulkActionType, bulkRemarks, processBulkAction, getDocData, selectedUser]);

  const handleViewItemsOpen = (e, AAFNo) => {
    e.stopPropagation(); 
    setViewItems(prev => ({
      ...prev,
      [AAFNo]: !prev[AAFNo]
    }));
    setViewApprovers(prev => ({
      ...prev,
      [AAFNo]: false
    }));
  };

  const handleViewApprovers = (e, AAFNo) => {
    e.stopPropagation();
    setViewApprovers(prev => ({
      ...prev,
      [AAFNo]: !prev[AAFNo]
    }));
    setViewItems(prev => ({
      ...prev,
      [AAFNo]: false
    }));
  };

  const handleOpenAppOptions = (e, AAFNo) => {
    e.stopPropagation();
    setOpenAppOptions(prev => ({
        ...prev,
        [AAFNo]: !prev[AAFNo]
    }));
    document.body.style.overflow = 'hidden';
  };


  const handleShowItems = (item, e) => {
    e.stopPropagation();
    setSelectedDetails(item)
    // Prevent background scrolling
    document.body.style.overflow = 'hidden';
  };

  const handleCloseAppOptions = (AAFNo) => {
    setOpenAppOptions(prev => ({
        ...prev,
        [AAFNo]: false
    }));
    document.body.style.overflow = 'unset';
    clearRemarks(AAFNo);
  };


  const handleCloseDetails = () => {
      setSelectedDetails(null);
        // Restore background scrolling
      document.body.style.overflow = 'unset';
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


    const longPressTimeout = useRef(null);
    
    const handleLongPressStart = (header) => {
      const canBeApproved = canApprove(header);
      
      if (canBeApproved.canApprove && header.xPosted !== 1 && header.DISAPPROVED !== 1) {
        longPressTimeout.current = setTimeout(() => {
            if (onEnterSelectionMode) onEnterSelectionMode(header.AAFNo);
        }, 500);
      }
    };

    const handleLongPressEnd = () => {
      if (longPressTimeout.current) {
        clearTimeout(longPressTimeout.current);
      }
    };

    // Filter joDetails by AAFNo & Approval logs by AAFNo
    const getItemsByAANo = (AAFNo) => {
        return assetLostDetails?.filter(detail => detail.AAFNo === AAFNo) || [];
    };
    const getAppLogByAANo = (AAFNo) => {
        return approvalLogs?.filter(log => (log.TRNO === AAFNo) && log.Module === 'Lost Asset') || [];
    }

    // Sort the filteredJo array by date (latest first)
    const sortedFilteredAL= useMemo(() => {
        if (!filteredAL) return [];
        
        return [...filteredAL].sort((a, b) => {
            // Sort by JO number in descending order
            // This assumes JO numbers like DB-JO-0000007 (higher number = newer)
            return b.AAFNo.localeCompare(a.AAFNo);
        });
    }, [filteredAL]);

    // Get status badge color and text
  const getStatusBadge = (header) => {
    if (header.DISAPPROVED === 1) {
      return { text: 'Rejected', color: 'text-slate-400' };
    }
    
    if (header.xPosted === 1) {
      return { text: 'Fully Approved', color: 'text-slate-400' };
    }
    
    if (header.xPosted === 2) {
      const approvedLevels = header.appStat ? header.appStat.split(',').length : 0;

      return { 
        text: `Partially Approved (${approvedLevels}/${totalLevels})`, 
        color: 'bg-yellow-100 text-yellow-800' 
      };
    }
    
    if (header.xPosted === 3) {
      return { text: 'For Approval', color: 'bg-gray-100 text-gray-800' };
    }
    
    return { text: 'Unknown', color: 'bg-gray-100 text-gray-800' };
  };
  
  // Check if AL is eligible for selection
  const isEligibleForSelection = (header) => {
    const approvalCheck = canApprove(header);
    return approvalCheck.canApprove && header.DISAPPROVED !== 1 && header.xPosted !== 1;
  };

  // Get next level for display
  const getNextLevel = (header) => {
    if (header.xPosted === 3) return 1;
    if (header.xPosted === 2 && header.appStat) {
      const approvedLevels = header.appStat.split(',').length;
      return approvedLevels + 1;
    }
    return null;
  };

  // Show loading state
  if (isLoading || approvalLoading) return (
    <div className="flex flex-col items-center justify-center py-8">
      <CircularProgress />
      <span className="mt-3 text-sm text-gray-500">Loading Lost Asset Forms...</span>
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
          itemCount={selectedAL.length}
          itemName="Lost Asset"
          loading={bulkLoading}
          remarks={bulkRemarks}
          onRemarksChange={setBulkRemarks}
        />

        {selectionMode && selectedAL.length > 0 && (
          <SelectionModeHeader
            selectedCount={selectedAL.length}
            onApprove={() => openBulkDialog('approve')}
            onReject={() => openBulkDialog('reject')}
            onSelectAll={onSelectAll}
            selectAll={selectAll}
          />
        )}

        {sortedFilteredAL.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No record found
          </div>
        ) : (
          sortedFilteredAL?.map((header) => {
          const items = getItemsByAANo(header.AAFNo);
          const logs = getAppLogByAANo(header.AAFNo);   
          const statusBadge = getStatusBadge(header);
          const eligibleForSelection = isEligibleForSelection(header);
          const nextLevel = getNextLevel(header);           

          return (
            <div key={header?.ID} 
              className={clsx(
                "flex flex-col mx-3 gap-1 p-2 border border-spacing-1 shadow-md rounded-xl",
                (selectedAL.includes(header.AAFNo) && eligibleForSelection) && "bg-slate-200 border-blue-500",
                !eligibleForSelection && header.xPosted !== 1 && "cursor-not-allowed"
              )}
              onClick={() => {
                // Only allow selection for Waiting status JOs
                if (selectionMode && eligibleForSelection) {
                  if (selectedAL.includes(header.AAFNo)) {
                    setSelectedAL(prev => prev.filter(j => j !== header.AAFNo));
                  } else {
                    setSelectedAL(prev => [...prev, header.AAFNo]);
                  }
                }
              }}
              onTouchStart={() => handleLongPressStart(header)}
              onTouchEnd={handleLongPressEnd}
            >
              {/* Form content - keep your existing JSX here */}
              <div className='flex justify-end'>
                  <span className={`px-2 py-0.5 text-xs rounded-full ${statusBadge.color}`}>
                  {statusBadge.text}
                  </span>
              </div>

              <div className='flex items-center justify-between px-2 text-sm'>
                <span className='font-sans text-sm font-semibold text-blue-900'>{header.AAFNo}</span>
                <DateDisplay value={header.xDate} format="short" />
              </div>

              <div className='flex flex-col px-2'>
                <div className='flex flex-col'>
                  <div className='flex items-start justify-between text-xs text-slate-500 center'>
                    <span>{header.Dep}</span>
                  </div>
                  <div className='flex justify-start gap-2'>
                    <span className='text-xs text-slate-500'>Custodian:</span>
                    <span className='text-sm'>{header.Custodian}</span>
                  </div>
                  <span className='mt-1 text-xs tracking-wide text-slate-500'>Assigned to: {header.EmpName}</span>
                </div>
              </div>

              <div className='flex flex-row justify-between px-2 border-t-2'>
                <div className='flex gap-3'>
                  <button 
                    className={clsx(
                      'flex gap-1 text-xs items-center mt-1 px-2 py-1 border rounded-full',
                        !viewItems[header.AAFNo] ? 'border-slate-400' : 'border-blue-500 text-blue-700'
                      )}
                    onClick={(e) => handleViewItemsOpen(e, header.AAFNo)}
                  >
                    <img className='w-4' src='/icons/actions/boxes.png'/>
                    <span className='font-semibold tracking-wide'>Items ({items.length})</span>
                  </button>
                  {header.appStat && <button 
                    className={clsx(
                      'flex gap-1 text-xs items-center mt-1 px-2 border rounded-full',
                        !viewApprovers[header.AAFNo] ? 'border-slate-400' : 'border-blue-500 text-blue-700'
                      )}
                      onClick={(e) => handleViewApprovers(e, header.AAFNo)}
                    >
                    <img className='w-4' src='/icons/actions/approve.png'/>
                    <span className='font-semibold tracking-wide'>Approvers</span>
                  </button>}
                </div>
                {eligibleForSelection && header.xPosted !== 1 && header.DISAPPROVED !== 1 && (
                <button 
                  onClick={(e) => handleOpenAppOptions(e, header.AAFNo)}
                  className="p-1 transition-colors rounded-full hover:bg-gray-100"
                >
                  <MoreHorizIcon />
                </button>
              )}              
              </div>

              {/* Items section - dynamically mapped from joDetails */}
              {viewItems[header.AAFNo] && (
                <div className='flex flex-col text-sm'>
                  {items.length > 0 ? (
                    items.map((item, index) => (
                      <div key={item.ID || index} className='flex flex-col gap-1 p-2 '>
                        <span
                          onClick={(e) => handleShowItems(item, e)} 
                          className='text-blue-600 hover:text-blue-800 hover:underline'
                        >
                          {item.ItemName}
                        </span>   
                        {item.xStat && (
                          <div className='flex items-center gap-2 text-xs'>
                            <span >Status:</span>
                            <span className='text-xs text-gray-900'>
                                {item.xStat}
                            </span>
                          </div>
                        )}                                 
                      </div>
                    ))
                  ) : (
                    <div className='text-sm italic text-center text-gray-500'>
                      No items found for this Lost Asset Form.
                    </div>
                  )}
                </div>
              )}

              {/* Show approval logs */}
              {viewApprovers[header.AAFNo] && logs.length > 0 &&
                <div className='flex flex-col px-3 mt-2 text-sm'>
                  {logs.map((log, idx) => (
                    <div key={idx} className="py-2 border-b border-gray-100 last:border-0">
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center gap-2'>
                          <span className='w-5'>
                            {log.STAT !== 'Disapproved' ? 
                              <CheckCircleIcon fontSize='small' className='text-green-500' /> : 
                              <CancelIcon fontSize='small' className='text-red-500'/>
                            }
                          </span>
                          <span className='font-medium'>Level {log.APP_LEVEL}:</span>
                          <span className="font-medium">{log.X_USER?.split('-')[1]}</span>
                        </div>
                        <div className='flex gap-2 text-xs text-gray-500'>
                            {log.STAT !== 'Disapproved' && <span > {log.STAT}</span> }
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
              
              {openAppOptions[header.AAFNo] && ReactDOM.createPortal(
                <div className='fixed inset-0 bg-black bg-opacity-50 flex items-end z-[99999] animate-fade-in'>
                  <div 
                    className='w-full bg-white shadow-xl rounded-t-2xl animate-slide-up'
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className='sticky top-0 px-6 py-4 bg-white border-b rounded-t-2xl'>
                      <div className='flex items-center justify-between'>
                        <div>
                          <h3 className='text-lg font-semibold text-gray-900'>Lost Asset Approval</h3>
                          <p className='text-sm text-gray-500'>{header.AAFNo}</p>
                          {nextLevel && (
                              <p className='mt-1 text-xs text-blue-600'>
                                  Level {nextLevel} of {totalLevels} Approval
                              </p>
                          )}
                        </div>
                        <button 
                          onClick={() => handleCloseAppOptions(header.AAFNo)}
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
                          placeholder="Please enter your approval/rejection remarks..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          value={remarks[header.AAFNo] || ''}
                          onChange={(e) => updateRemarks(header.AAFNo, e.target.value)}
                          disabled={processingAL === header.AAFNo}
                          autoFocus
                        />
                      </div>
                      
                      <div className='flex flex-col gap-3'>
                        <button 
                          className='flex-1 py-3 tracking-wide text-white transition-colors bg-green-600 rounded-full shadow-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed'
                          onClick={() => handleApproveReject(header.AAFNo, 'approve', remarks[header.AAFNo] || '', getDocData(header.AAFNo))}
                          disabled={processingAL === header.AAFNo}
                        >
                          {processingAL === header.AAFNo ? (
                            <div className="flex items-center justify-center gap-2">
                              <CircularProgress size={20} color="inherit" />
                              <span>Processing...</span>
                            </div>
                          ) : (
                            'Approve'
                          )}
                        </button>
                        <button 
                          className='flex-1 py-3 tracking-wide text-red-600 transition-colors border border-red-400 rounded-full hover:bg-red-600 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed'
                          onClick={() => handleApproveReject(header.AAFNo, 'reject', remarks[header.AAFNo] || '', getDocData(header.AAFNo))}
                          disabled={processingAL === header.AAFNo}
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
                      // Use RGBA with high specificity
                      // color: 'white',
                      backgroundColor: "hsla(0, 0%, 20%, 0.3)",
                      // Fallback using a semi-transparent PNG data URI (most aggressive approach)
                      // backgroundImage: 'url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=) !important',
                      // backgroundRepeat: 'repeat !important',
                      display: 'flex',
                      alignItems: 'flex-end',
                      justifyContent: 'center',
                      zIndex: 9999999,
                      // opacity: 0.5
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
                            <h3 className='font-semibold text-blue-700 text-md'>{selectedDetails.ItemName}</h3>
                            <p className='text-sm text-gray-500'>Asset No: {selectedDetails.ItemNo}</p>
                          </div>
                            
                            {/* Quantity and Target Date */}
                            <div className="grid grid-cols-2 gap-2 text-sm">                              
                              <div>
                                <div className="text-gray-400">AL NO:</div>
                                <div >{selectedDetails.AAFNo}</div>
                              </div>
                              <div>
                                <div className="text-gray-400 ">Quantity</div>
                                <div >{selectedDetails.Qty}</div>
                              </div>
                              <div>
                                <div className="text-gray-400 ">UOM</div>
                                <div >{selectedDetails.Units}</div>
                              </div>                                   
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

export default MvALForm;