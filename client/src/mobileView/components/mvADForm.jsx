import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
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
import {useApprovalLogs} from '../../hooks/useApprovalLogs';
import {useDisposalApproval} from '../../hooks/useADApproval';
import { useApprovalActions } from '../../Utils/approvalActionHandler';
// Custom Utils
import {borderColor} from '../../Utils/filters';
// Components
import BulkActionDialog from '../../Utils/bulkActionDialog';
import Toast from '../../Utils/toast';
import SelectionModeHeader from '../../Utils/selectionModeHeader';



function MvADForm({
    useProps,
    filteredAD,
    adDetails,
    isLoading,
    error,
    selectedUser,
    adHRefresh, 
    adDetailsRefresh,
    selectionMode,
    selectedAD,
    setSelectedAD,
    onEnterSelectionMode,
    onExitSelectionMode,
    onSelectAll, 
    selectAll
  }) {

  const { 
    approveDisposal,
    rejectDisposal,
    getApprovalStatus,
    getTotalLevels,
    // getNextApproverLevel,
    getXpostStatusText,
    canApprove,
    loading: approvalLoading 
  } = useDisposalApproval();

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

    // Get Doc data by ID
    const getDocData = useCallback((DocNo) => {
        return filteredAD?.find(ad => ad.AD_No === DocNo);
    }, [filteredAD]);
  
      // Use the approval actions hook
      const {
        processingItem: processingAD,
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
          onApprove: approveDisposal,
          onReject: rejectDisposal,
          // No getItemLevel for JO since it doesn't have multi-level approval
          onRefresh: () => {
              adHRefresh?.();
              adDetailsRefresh?.();
              if (onExitSelectionMode) {onExitSelectionMode();}
          },
          onExitSelectionMode,
          showToast
          // getUserInfo is not needed since we'll pass selectedUser directly
      });
  
    // Handle bulk action wrapper
    const handleBulkAction = useCallback(() => {
      processBulkAction(
        selectedAD, 
        bulkActionType, 
        bulkRemarks, 
        getDocData,
        selectedUser  // Pass the user info here
      );
    }, [selectedAD, bulkActionType, bulkRemarks, processBulkAction, getDocData, selectedUser]);


  const handleViewItemsOpen = (e, AD_No) => {
    e.stopPropagation();
    setViewItems(prev => ({
        ...prev,
        [AD_No]: !prev[AD_No]
    }));
    setViewApprovers(prev => ({
        ...prev,
        [AD_No]: false
    }));
  };

  const handleViewApprovers = (e, AD_No) => {
    e.stopPropagation();
    setViewApprovers(prev => ({
        ...prev,
        [AD_No]: !prev[AD_No]
    }));
    setViewItems(prev => ({
        ...prev,
        [AD_No]: false
    }));
  };

  const handleOpenAppOptions = async (e, AD_No) => {
    e.stopPropagation();        
    setOpenAppOptions(prev => ({
        ...prev,
        [AD_No]: !prev[AD_No]
    }));
    document.body.style.overflow = 'hidden';
  };

  const handleCloseAppOptions = (AD_No) => {
    setOpenAppOptions(prev => ({
        ...prev,
        [AD_No]: false
    }));
    document.body.style.overflow = 'unset';
    clearRemarks(AD_No);
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

  const handleShowItems = (item, e) => {
    e.stopPropagation();
    setSelectedDetails(item);
    document.body.style.overflow = 'hidden';
  };

    const longPressTimeout = useRef(null);
    
    const handleLongPressStart = (header) => {
      const canBeApproved = canApprove(header);
      
      if (canBeApproved.canApprove && header.xpost !== 1 && header.DISAPPROVED !== 1) {
        longPressTimeout.current = setTimeout(() => {
            if (onEnterSelectionMode) onEnterSelectionMode(header.AD_No);
        }, 500);
      }
    };

    const handleLongPressEnd = () => {
      if (longPressTimeout.current) {
        clearTimeout(longPressTimeout.current);
      }
    };

  // Filter joDetails by AD_No & Approval logs by AD_No
  const getItemsByADNo = (AD_No) => {
      return adDetails?.filter(detail => detail.AD_No === AD_No) || [];
  };
  const getAppLogByADNo = (AD_No) => {
      return approvalLogs?.filter(log => (log.TRNO === AD_No) && log.Module === 'Disposal') || [];
  }

  // Sort the filteredAD array by date (latest first)
  const sortedFilteredAD = useMemo(() => {
      if (!filteredAD) return [];
      
      return [...filteredAD].sort((a, b) => {
          // Sort by doc number in descending order
          return b.AD_No.localeCompare(a.AD_No);
      });
  }, [filteredAD]);

  // Get status badge color and text
    const getStatusBadge = (header) => {
      if (header.DISAPPROVED === 1) {
        return { text: 'Rejected', color: 'text-slate-400' };
      }
      
      if (header.xpost === 1) {
        return { text: 'Fully Approved', color: 'text-slate-400' };
      }
      
      if (header.xpost === 2) {
        const approvedLevels = header.appStat ? header.appStat.split(',').length : 0;

        return { 
          text: `Partially Approved (${approvedLevels}/${totalLevels})`, 
          color: 'bg-yellow-100 text-yellow-800' 
        };
      }
      
      if (header.xpost === 3) {
        return { text: 'For Approval', color: 'bg-gray-100 text-gray-800' };
      }
      
      return { text: 'Unknown', color: 'bg-gray-100 text-gray-800' };
    };
  
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
        itemCount={selectedAD.length}
        itemName="Disposal"
        loading={bulkLoading}
        remarks={bulkRemarks}
        onRemarksChange={setBulkRemarks}
      />

      {selectionMode && selectedAD.length > 0 && (
        <SelectionModeHeader
          selectedCount={selectedAD.length}
          onApprove={() => openBulkDialog('approve')}
          onReject={() => openBulkDialog('reject')}
          onSelectAll={onSelectAll}
          selectAll={selectAll}
        />
      )}

    {sortedFilteredAD?.length === 0 ? (
       <div className="p-8 text-center text-gray-500">
        No job orders found
      </div>
    ) : (
      sortedFilteredAD?.map((header) => {
      const items = getItemsByADNo(header.AD_No);
      const logs = getAppLogByADNo(header.AD_No);    
      const statusBadge = getStatusBadge(header);
      const eligibleForSelection = isEligibleForSelection(header);
      const nextLevel = getNextLevel(header);
      // const totalLevels = 3;                            

      return (
        <div key={header?.ID} 
          className={clsx(
            "flex flex-col mx-3 gap-1 p-2 border border-spacing-1 shadow-md rounded-xl",
            (selectedAD.includes(header.AD_No) && eligibleForSelection) && "bg-slate-200 border-blue-500",
            !eligibleForSelection && header.xpost !== 1 && "cursor-not-allowed"
          )}
          onClick={() => {
            // Only allow selection for Waiting status JOs
            if (selectionMode && eligibleForSelection) {
              if (selectedAD.includes(header.AD_No)) {
                setSelectedAD(prev => prev.filter(j => j !== header.AD_No));
              } else {
                setSelectedAD(prev => [...prev, header.AD_No]);
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
            <span className='font-sans text-sm font-semibold text-blue-900'>{header.AD_No}</span>
            <DateDisplay value={header.xDate} format="short" />
          </div>

          <div className='flex flex-col px-2'>
            <div className='flex flex-col'>
              <div className='flex items-start justify-between text-xs text-slate-500 center'>
                <span>{header.Deparment_Name}</span>
              </div>
              <span className='mt-1 text-xs tracking-wide text-slate-500'>Evaluated By: {header.Evaluated_By}</span>
              <div className='flex justify-start gap-2'>
                  <span className='text-xs text-slate-500'>Remarks:</span>
                  <span className='text-sm'>{header.Remarks}</span>
              </div>

            </div>
          </div>

          <div className='flex flex-row justify-between px-2 border-t-2'>
            <div className='flex gap-3'>
              <button 
                className={clsx(
                  'flex gap-1 text-xs items-center mt-1 px-2 py-1 border rounded-full',
                    !viewItems[header.AD_No] ? 'border-slate-400' : 'border-blue-500 text-blue-700'
                  )}
                onClick={(e) => handleViewItemsOpen(e, header.AD_No)}
              >
                <img className='w-4' src='/icons/actions/boxes.png'/>
                <span className='font-semibold tracking-wide'>Items ({items.length})</span>
              </button>
              {(header.appStat || logs.length > 0 )&& <button 
                className={clsx(
                  'flex gap-1 text-xs items-center mt-1 px-2 border rounded-full',
                    !viewApprovers[header.AD_No] ? 'border-slate-400' : 'border-blue-500 text-blue-700'
                  )}
                onClick={(e) => handleViewApprovers(e, header.AD_No)}
                >
                  <img className='w-4' src='/icons/actions/approve.png'/>
                  <span className='font-semibold tracking-wide'>Approval logs</span>
              </button>}
            </div>
            {eligibleForSelection && header.xpost !== 1 && header.DISAPPROVED !== 1 && (
              <button 
                onClick={(e) => handleOpenAppOptions(e, header.AD_No)}
                className="p-1 transition-colors rounded-full hover:bg-gray-100"
              >
                <MoreHorizIcon />
              </button>
            )}
          </div>

        {/* Items section */}
        {viewItems[header.AD_No] && (
          <div className='flex flex-col text-sm'>
            {items.length > 0 ? (
              items.map((item, index) => (
                <div key={item.ID || index} className='flex flex-col gap-1 p-2 '>
                  <span
                    onClick={(e) => handleShowItems(item, e)} 
                    className='text-blue-600 hover:text-blue-800 hover:underline'
                  >
                    {item.FAC_name}
                  </span>   
                  {item.workDet && (
                    <span className='text-gray-600'>
                      {item.workDet}
                    </span>
                  )}                                     
                </div>
              ))
            ) : (
              <div className='text-sm italic text-center text-gray-500'>
                No items found for this job order.
              </div>
            )}
          </div>
        )}
            
        {/* Show approval logs */}
        {viewApprovers[header.AD_No] && logs.length > 0 &&
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

        {/* Individual Approval Modal  */}
        {openAppOptions[header.AD_No] && ReactDOM.createPortal(
          <div className='fixed inset-0 bg-black bg-opacity-50 flex items-end z-[99999] animate-fade-in'>
            <div 
              className='w-full bg-white shadow-xl rounded-t-2xl animate-slide-up'
              onClick={(e) => e.stopPropagation()}
            >
              <div className='sticky top-0 px-6 py-4 bg-white border-b rounded-t-2xl'>
                <div className='flex items-center justify-between'>
                  <div>
                    <h3 className='text-lg font-semibold text-gray-900'>Disposal Form Approval</h3>
                    <p className='text-sm text-gray-500'>{header.AD_No}</p>
                    {nextLevel && (
                        <p className='mt-1 text-xs text-blue-600'>
                            Level {nextLevel} of {totalLevels} Approval
                        </p>
                    )}
                  </div>
                  <button 
                    onClick={() => handleCloseAppOptions(header.AD_No)}
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
                    value={remarks[header.AD_No] || ''}
                    onChange={(e) => updateRemarks(header.AD_No, e.target.value)}
                    disabled={processingAD === header.AD_No}
                    autoFocus
                  />
                </div>
                
                <div className='flex flex-col gap-3'>
                  <button 
                    className='flex-1 py-3 tracking-wide text-white transition-colors bg-green-600 rounded-full shadow-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed'
                    onClick={() => handleApproveReject(header.AD_No, 'approve', remarks[header.AD_No] || '', getDocData(header.AD_No))}
                    disabled={processingAD === header.AD_No}
                  >
                    {processingAD === header.AD_No ? (
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
                    onClick={() => handleApproveReject(header.AD_No, 'reject', remarks[header.AD_No] || '', getDocData(header.AD_No))}
                    disabled={processingAD === header.AD_No}
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
                
                   {/* Quantity and Target Date */}
                  <div className="grid grid-cols-2 gap-2 text-sm">                    
                    <div>
                      <div className="text-gray-400">TR NO:</div>
                      <div >{selectedDetails.AD_No}</div>
                    </div>
                    <div>
                      <div className="text-gray-400 ">Quantity</div>
                      <div >{selectedDetails.qty}</div>
                    </div>
                    <div>
                      <div className="text-gray-400 ">UOM</div>
                      <div >{selectedDetails.UOM}</div>
                    </div>
                    <div>
                      <div className="text-gray-400 ">Disposal Type</div>
                      <div >{selectedDetails.Disposal_Type}</div>
                    </div>

                    {selectedDetails.brand &&
                      <div>
                        <div className="text-sm text-gray-400">Brand:</div>
                        <div >{selectedDetails.brand}</div>
                      </div>
                    }
                    {selectedDetails.serialno &&
                    <>
                      <div>
                        <div className="text-sm text-gray-400">Serial No:</div>
                        <div >{selectedDetails.serialno}</div>
                      </div>
                    </>
                    }                      
                  </div>
                </div>
              </div>
            </div>,
            document.body
        )}
        </div>            
      )})
    )}
    </>
  );
}

export default MvADForm;