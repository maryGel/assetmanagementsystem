import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom'; 

// MUI Components
import { Box, Autocomplete, TextField, ThemeProvider , Dialog, Snackbar, Alert, TextareaAutosize } from '@mui/material';


// Components
import JobOrderTabs from '../jobOrder/jobOrderTabs';

// Custom Utils
import { getAutocompleteSx } from '../../../Utils/autocompleteStyles';  
import { customTheme } from '../../../Utils/customTable';
import { CustomBtn, getButtonConfig } from '../../../Utils/groupbtns';
import { CustomDialog } from '../../../Utils/customDialog'
import DateDisplay from '../../../Utils/formatDateForInput';


// Custom Hooks
import { useJO_h} from '../../../hooks/useJO_h';
import { useRefDepartment } from '../../../hooks/refDepartment'; 
import { useSections } from '../../../hooks/refSection';
import { useJOData } from '../../../hooks/useJO_reducer';
import { useCompanyConfig } from '../../../hooks/useCompanyConfig';
import { useJobOrderApproval } from '../../../hooks/useJobOrderApproval';
import { useApprovalActions } from '../../../Utils/approvalActionHandler';
import { useUsers } from '../../../hooks/useUsers';

export default function JOFormPage(useProps) {

  const { selectedUser, setSelectedUser } = useUsers();
  // In JOFormPage.jsx - modify the userInfo
  const userName = localStorage.getItem('username') || 'User';
  const rawUserId = localStorage.getItem('userId') || userName;

  useEffect(() => {
    if (userName && userName !== 'User') {
        console.log('Setting selected user:', userName);
        setSelectedUser(userName);
    }
  }, [userName, setSelectedUser]);

  // Clean the userId
  const cleanUserId = String(rawUserId).replace(/\s*-\s*$/, '').trim();
    const userInfo = {
      // userId: cleanUserId,
      user: cleanUserId,
      fname: selectedUser?.fname || '',
      lname: selectedUser?.lname || '',
      multiApp: selectedUser?.multiApp || []
    };

  console.log('User Info:', userInfo);
  
  const {
    state,
    getJOData,
    forceRefreshJO,

    startCreate,
    startEdit,
    cancelEditCreate,

    addDetailRow,
    updateHeaderField,
    updateDetailRow,  
    removeDetailRow,

    openSaveDialog,      
    closeSaveDialog,     
    openCancelDialog,    
    closeCancelDialog,  
    openDeleteDialog,
    closeDeleteDialog,

    confirmSave,         
    confirmCancel, 
    confirmDelete,
 
    hideSnackbar,     

  } = useJOData();

  const { 
    postJobOrder, 
    canPost, 
    approveJobOrder,
    rejectJobOrder,
    canApprove,
    getTotalLevels,
    loading: approvalLoading 
  } = useJobOrderApproval();

  // Add state for post dialog
  const [postDialogOpen, setPostDialogOpen] = useState(false);
  const [rowToDelete, setRowToDelete] = useState(null)
  const [totalLevels, setTotalLevels] = useState(3);
  const [refreshKey, setRefreshKey] = useState(0); // Used to trigger refresh
  
  // Add this with your other state declarations
  const [localSnackbar, setLocalSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });

  // reference data for dropdowns
  const {joHeaders} = useJO_h();
  const { refDeptData } = useRefDepartment();
  const { refSections } = useSections();
  const departments = refDeptData.map(item => item.Department);
  const sections = refSections.map(item => item.xdesc);

  // get JO data if copyDocNo exists in URL
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const copyDocNo = searchParams.get('docId');
  const isCreatingRef = useRef(false);


    // Fetch total levels
  useEffect(() => {
    let isMounted = true;
    const fetchTotalLevels = async () => {
      try {
        const result = await getTotalLevels();
        if (isMounted && result?.success) {
          setTotalLevels(result.totalLevels);
        }
      } catch (err) {
        console.error('Error fetching total levels:', err);
        if (isMounted) setTotalLevels(3);
      }
    };
    fetchTotalLevels();
    return () => { isMounted = false; };
  }, [getTotalLevels]);

  const showToast = useCallback((message, severity = 'info') => {
    setLocalSnackbar({ open: true, message, severity });
  }, []);

  const loadTRData = useCallback(async () => {
    if (!copyDocNo || isCreatingRef.current) return;
    await getJOData(copyDocNo);
  }, [copyDocNo, getJOData]);

  useEffect(() => {
    loadTRData();
  }, [copyDocNo, loadTRData]);

const refreshData = useCallback(async () => {
  if (!copyDocNo) return;
   
  // Reload the data
  await forceRefreshJO(copyDocNo);
  // Increment refresh trigger to force re-renders of child components if needed
  setRefreshTrigger(prev => prev + 1);
}, [copyDocNo, getJOData, forceRefreshJO]);

  // Get approval level for the document
  const getApprovalLevel = useCallback((header, forApproval = true) => {
    if (!header) return 1;
    
    if (header.xpost === 3) {
      return 1; // First approval
    } else if (header.xpost === 2 && header.appStat) {
      // Parse appStat safely - handle both string and number
      let approvedLevels = [];
      const appStatStr = String(header.appStat);
      if (appStatStr.includes(',')) {
        approvedLevels = appStatStr.split(',').map(l => parseInt(l.trim()));
      } else {
        approvedLevels = [parseInt(appStatStr)];
      }
      const nextLevel = approvedLevels.length + 1;
      return forApproval ? nextLevel : nextLevel;
    }
    return 1;
  }, []);


  // ===== APPROVAL ACTIONS HOOK - Define AFTER refreshData =====
  const {
    processingItem,
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
    onApprove: approveJobOrder,
    onReject: rejectJobOrder,
    onRefresh: refreshData,
    showToast,
    getUserInfo: () => userInfo
  });

    // Get next level for display
  const getNextLevel = useCallback((header) => {
    if (!header || !header.xpost) return null;
    if (header.xpost === 3) return 1;
    if (header.xpost === 2 && header.appStat) {
      const appStatStr = String(header.appStat);
      const approvedLevels = appStatStr.includes(',') 
        ? appStatStr.split(',').length 
        : 1;
      return approvedLevels + 1;
    }
    return null;
  }, []);

  // Status mapping function
  const docStatus = (status) => {
    switch (status) {
      case 0: return 'Draft';
      case 1: return 'Fully Approved';
      case 2: return 'Partially Approved';
      case 3: return 'For Approval';
      case 4: return 'Rejected';
      default: return 'Draft';
    }
  }

  const baseHeader = state.selectedJO;
  const currentHeader = state.isCreating || state.isEditing
          ? state.createJOHeader
          : state.selectedJO;

  const currentJOItems = state.isCreating || state.isEditing
          ? state.createJODetails
          : state.joDetails;

  const canEditDocument = state.isCreating || (state.isEditing && baseHeader?.xpost === 0);
  const isReadOnly = !canEditDocument;
  const nextLevel = getNextLevel(baseHeader);

  // Generate Auto JO number based on the company config (db table: user0002inv)
  const { companyConfig, refreshCompanyConfig } = useCompanyConfig(useProps);
  
  const handleHeaderChange = (field, value) => {
    updateHeaderField(field,value)
  };

  const handleCreate = () => {
    isCreatingRef.current = true;
    const config = Array.isArray(companyConfig) ? companyConfig[0] : companyConfig;
    console.log('Correct config:', config);
    startCreate(config, userName);
    
  };
  
  const handleEdit = () => {
    if (!copyDocNo) return;
    startEdit(copyDocNo);
  };

  const handleCancel = () => {
    // Check if there are unsaved changes
    if (state.hasUnsavedChanges) {
      openCancelDialog(); // Open confirmation dialog
    } else {
      cancelEditCreate(); // Cancel directly
    }
  };
  
  const handleSave = async () => {
    // Validate header fields
    if (!state.createJOHeader?.JO_No) {
      alert('Job Order number is required');
      return;
    }
    
    if (!state.createJOHeader?.Department && !state.createJOHeader?.Department_Code) {
      alert('Please select a department');
      return;
    }
    
    if (!state.createJOHeader?.Sector_name) {
      alert('Please select a maintenance service');
      return;
    }
    
    // Validate details
    if (!state.createJODetails || state.createJODetails.length === 0) {
      alert('Please add at least one item');
      return;
    }
    
    if (!state.createJODetails?.find(item => item.TargetDate )) {
      alert('Please provide Target Date for all items');
      return;
    }
    
    if (!state.createJODetails?.find(item => item.workDet )) {
      alert('Please provide work details for all items');
      return;
    }

    // Check for empty required fields in details
    const invalidRows = state.createJODetails.filter(row => !row.FAC_NO);
    if (invalidRows.length > 0) {
      alert(`Please select assets for all rows (${invalidRows.length} row(s) missing asset)`);
      return;
    }
    
    // If validation passes, open save confirmation dialog
    openSaveDialog();
  };

  // function to handle successful creation
  const handleSuccessfulCreate = useCallback(async (newJONo) => {
    console.log('Successfully created JO:', newJONo);

    await refreshCompanyConfig();
    
    setSearchParams({ docId: newJONo });
    isCreatingRef.current = false; // Reset the creating flag
  }, [setSearchParams, refreshCompanyConfig]);


  const handleConfirmSave = async () => {
    // Capture the JO number before saving
    const newJONo = state.createJOHeader?.JO_No;
    const wasCreating = state.isCreating;
    
    // Call the original confirmSave (which calls createJO)
    await confirmSave();
    
    // If this was a creation and we have a JO number, update the URL
    if (wasCreating && newJONo) {
      handleSuccessfulCreate(newJONo);
    }
  };

  const handleSnackbarClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    hideSnackbar();
  };

  // Open post confirmation dialog
  const openPostDialog = () => {
    setPostDialogOpen(true);
  };

  // Close post confirmation dialog
  const closePostDialog = () => {
    setPostDialogOpen(false);
  };

  // Handle the actual post action
  const handleConfirmPost = async () => {
    closePostDialog();
    
    if (!copyDocNo && !baseHeader?.JO_No) {
      showToast('No document to post', 'error');
      return;
    }

    const docNo = copyDocNo || baseHeader?.JO_No;
    const postCheck = canPost({ xpost: baseHeader?.xpost, disapproved: baseHeader?.disapproved });
    
    if (!postCheck.canPost) {
      showToast(postCheck.reason, 'error');
      return;
    }

    const result = await postJobOrder(docNo);
      
    if (result.success) {
      showToast(result.message, 'success');
      
      // Wait a moment for the database to update
      setTimeout(async () => {
        // Force refresh the data
        await refreshData();
        
        // Also refresh the JO headers list if needed
        if (window.refreshJOData) {
          await window.refreshJOData();
        }
      }, 500);
      
    } else {
      showToast('Failed to post: ' + result.error, 'error');
    }
  };

  // Handle approval with dialog
  const handleApproveClick = () => {
    if (!copyDocNo && !baseHeader?.JO_No) {
      showToast('No document to approve', 'error');
      return;
    }

    const docNo = copyDocNo || baseHeader?.JO_No;
    const approvalCheck = canApprove({ 
      xpost: baseHeader?.xpost, 
      disapproved: baseHeader?.disapproved 
    });
    
    if (!approvalCheck.canApprove) {
      showToast(approvalCheck.reason, 'error');
      return;
    }

    // Open bulk dialog for single approval
    openBulkDialog('approve');
    // Store the current item ID for the bulk action
    window.currentApprovalItem = docNo;
  };

  // Handle rejection with dialog
  const handleRejectClick = () => {
    if (!copyDocNo && !baseHeader?.JO_No) {
      showToast('No document to reject', 'error');
      return;
    }

    const docNo = copyDocNo || baseHeader?.JO_No;
    
    // Open bulk dialog for single rejection
    openBulkDialog('reject');
    // Store the current item ID for the bulk action
    window.currentApprovalItem = docNo;
  };

  // Handle single item action - FIXED to pass the correct level
  const handleSingleItemAction = async () => {
    if (!window.currentApprovalItem) return;
    
    const currentHeader = baseHeader;
    const currentLevel = getApprovalLevel(currentHeader, bulkActionType === 'approve');
    
    const result = await handleIndividualAction(
      window.currentApprovalItem,
      bulkActionType,
      bulkRemarks,
      currentHeader,
      userInfo,
      currentLevel // Pass the level explicitly
    );
    
    if (result?.success) {
      closeBulkDialog();
      setBulkRemarks('');
      window.currentApprovalItem = null;
      
      if (bulkActionType === 'approve') {
        if (result.data?.isFinalApproval) {
          showToast(`Transfer Form fully approved!`, 'success');
        } else {
          showToast(`Level ${currentLevel} approved successfully. ${currentLevel} of ${totalLevels} levels completed.`, 'success');
        }
      } else {
        showToast(`Transfer Form rejected successfully`, 'success');
      }
      
    // Force refresh the data
    await refreshData();
    
    // Also refresh the parent component's data if needed
    setTimeout(async () => {
      await refreshData(); // Double refresh to ensure data is updated
    }, 500);

    } else if (result?.error) {
      showToast(`Action failed: ${result.error}`, 'error');
    }
  };

  const handleDeleteClick = (rowId) => {
    if (currentJOItems.length === 1) {
      // Show snackbar or alert that at least one row is required
      showToast('At least one row is required', 'warning');
      return;
    }
    setRowToDelete(rowId);
    openDeleteDialog();
  };

  const handleConfirmDelete = () => {
    if (rowToDelete) {
      confirmDelete(rowToDelete);
      setRowToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setRowToDelete(null);
    closeDeleteDialog();
  };

  // Add local snackbar close handler
  const handleLocalSnackbarClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setLocalSnackbar(prev => ({ ...prev, open: false }));
  };

  const buttonConfig = getButtonConfig(state, baseHeader, canApprove);

  // warn users if they try to leave with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (state.hasUnsavedChanges && (state.isCreating || state.isEditing)) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [state.hasUnsavedChanges, state.isCreating, state.isEditing]);

  console.log('Current status:', baseHeader?.xpost);
  console.log('Button config:', buttonConfig);
    
  return (
    <>
      {/* Save Confirmation Dialog */}
      <Dialog open={state.saveDialogOpen} onClose={closeSaveDialog}>
        <CustomDialog
          title="Confirm Save"
          text="Are you sure you want to save this Job Order? Please review all information before saving."
          cancelText="Cancel"
          confirmText="Save"
          cancel={closeSaveDialog}
          confirm={handleConfirmSave}
        />
      </Dialog>

      {/* Delete JO line items Confirmation Dialog */}
      <Dialog open={state.deleteDialogOpen} onClose={closeDeleteDialog}>
        <CustomDialog
          title="Confirm Delete"
          text="Are you sure you want to delete this item? This action cannot be undone."
          cancelText="Cancel"
          confirmText="Delete"
          cancel={closeDeleteDialog}
          confirm={handleConfirmDelete}
        />
      </Dialog>

      <Dialog open={state.cancelDialogOpen} onClose={closeCancelDialog}>
        <CustomDialog
          title="Confirm Cancel"
          text="Are you sure you want to cancel? All unsaved changes will be lost."
          cancelText="Keep Editing"
          confirmText="Discard Changes"
          cancel={closeCancelDialog}
          confirm={confirmCancel}
        />
      </Dialog>

      {/* Post Confirmation Dialog */}
      <Dialog open={postDialogOpen} onClose={closePostDialog}>
        <CustomDialog
          title="Confirm Post"
          text="Would you like to post this Job Order now? Once posted, it will be sent for approval."
          cancelText="Cancel"
          confirmText="Post"
          cancel={closePostDialog}
          confirm={handleConfirmPost}
        />
      </Dialog>

      {/* Bulk Action Dialog (used for both single and bulk approval/rejection) */}
      {bulkDialogOpen && (
        <Dialog open={bulkDialogOpen} onClose={closeBulkDialog} maxWidth="sm" fullWidth>
          <Box sx={{ p: 3 }}>
            <h2 className="mb-4 text-xl font-bold">
              {bulkActionType === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
            </h2>
            <p className="mb-4 text-gray-600">
              {nextLevel && (
                <span className='block mt-1 text-xs text-blue-600'>
                  Level {nextLevel} of {totalLevels} Approval
                </span>
              )}
              {bulkActionType === 'approve' 
                ? `Are you sure you want to approve this Transfer Form?` 
                : `Are you sure you want to reject this Transfer Form? This action cannot be undone.`
              }
            </p>
            <div className="mb-4">
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Remarks <span className="text-red-500">*</span>
              </label>
              <TextareaAutosize
                minRows={3}
                placeholder={bulkActionType === 'reject' ? "Please provide a reason for rejection..." : "Please enter approval remarks..."}
                value={bulkRemarks}
                onChange={(e) => setBulkRemarks(e.target.value)}
                autoFocus
                style={{
                  width: '100%',
                  padding: '10px',
                  fontSize: '14px',
                  borderRadius: '4px',
                  border: '1px solid #ccc',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
              />
            </div>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              <CustomBtn
                variant="cancelBtn"
                onClick={closeBulkDialog}
                disabled={bulkLoading}
              >
                Cancel
              </CustomBtn>
              <CustomBtn
                variant={bulkActionType === 'approve' ? 'saveBtn' : 'rejectBtn'}
                onClick={handleSingleItemAction}
                disabled={bulkLoading || (!bulkRemarks.trim())}
              >
                {bulkLoading ? 'Processing...' : (bulkActionType === 'approve' ? 'Confirm Approval' : 'Confirm Rejection')}
              </CustomBtn>
            </Box>
          </Box>
        </Dialog>
      )}

      <Snackbar
        open={state.snackbar.open}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={state.snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {state.snackbar.message}
        </Alert>
      </Snackbar>

      {/* Local Snackbar for post/approval/rejection operations */}
      <Snackbar
        open={localSnackbar.open}
        autoHideDuration={4000}
        onClose={handleLocalSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleLocalSnackbarClose}
          severity={localSnackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {localSnackbar.message}
        </Alert>
      </Snackbar>

      {/* Buttons Section */}
      <div className='flex justify-end gap-3 my-4 mx-14'>
        
        {/* Save Button */}
        {(state.isCreating || state.isEditing) && (
          <CustomBtn
            variant='saveBtn'
            iconType='save'
            onClick={handleSave}
            title='Save changes made in this Job Order'
          >
            {state.saving ? 'Saving...' : 'Save'}
          </CustomBtn>
        )}
        
        {/* Edit Button */}
        {!state.isEditing && !state.isCreating && copyDocNo && (
          <CustomBtn
            variant='editBtn'
            iconType='edit'
            onClick={handleEdit}
            title='Edit this Job Order'
          >
            Edit
          </CustomBtn>       
        )}
        
        {/* Create Button */}
        {!state.isEditing && !state.isCreating && (
          <CustomBtn
            variant='createBtn'
            iconType='add'
            onClick={handleCreate}
            title='Create new Job Order'
          >
            Create
          </CustomBtn>
        )}
        
        {/* Cancel Button */}
        {(state.isEditing || state.isCreating) && (
          <CustomBtn
            variant='cancelBtn'
            iconType='cancel'
            onClick={handleCancel}
            title='Cancel & Discard Changes'
          >
            Cancel
          </CustomBtn>
        )}

        {/* Post Button - for draft documents */}
        {buttonConfig.showPost && (
          <CustomBtn
            variant='postBtn'
            iconType='post'
            title='Post this document for approval'
            onClick={openPostDialog}
            disabled={approvalLoading}
          >
            {buttonConfig.postText || 'Post'}
          </CustomBtn>
        )}

        {/* Approve Button - for documents pending approval */}
        {buttonConfig.showApprove && (
          <CustomBtn
            variant='saveBtn'
            iconType='save'
            title='Approve this document'
            onClick={handleApproveClick}
            disabled={state.isEditing ||approvalLoading || processingItem === copyDocNo}
          >
            {processingItem === copyDocNo ? 'Approving...' : (buttonConfig.approveText || 'Approve')}
          </CustomBtn>
        )}

        {/* Reject Button - for documents pending approval */}
        {buttonConfig.showReject && (
          <CustomBtn
            variant='rejectBtn'
            iconType='reject'
            title='Reject this document'
            onClick={handleRejectClick}
            disabled={approvalLoading || processingItem === copyDocNo}
          >
            {processingItem === copyDocNo ? 'Rejecting...' : (buttonConfig.rejectText || 'Reject')}
          </CustomBtn>
        )}

        {/* Print Button - always show for existing documents */}
        {copyDocNo && (
          <CustomBtn
            variant='printBtn'
            iconType='print'
            title='Preview and Print'
          >
            Preview
          </CustomBtn>
        )}
      </div>
          
      <div className='p-6 my-4 bg-gray-100 rounded-lg shadow-lg mx-14'>
        <Box className='flex justify-between w-full h-full gap-1'>
          <h1 className='text-sm font-bold text-gray-800 '>{
            state.isCreating ? 'Creating Job Order' : state.isEditing ? 'Editing Job Order' : 'Display Job Order'
          }
          </h1>
          <div className='flex gap-2'>
            <text className='text-xs text-gray-500'>Last JO created :</text>
            <text className='text-xs text-gray-500'>
                  {/* Get the latest JO from joHeaders */}
                  {joHeaders && joHeaders.length > 0 
                    ? [...joHeaders].sort((a, b) => {
                        const numA = parseInt(String(a.JO_No).split('-').pop() || 0);
                        const numB = parseInt(String(b.JO_No).split('-').pop() || 0);
                        return numB - numA;
                      })[0]?.JO_No 
                    : '---'}

            </text>
            <text className='text-xs text-gray-500'>Created on:</text>
            <text className='text-xs text-gray-500'>
                    {joHeaders && joHeaders.length > 0 
                    ? (() => {
                        const latest = [...joHeaders].sort((a, b) => {
                          const numA = parseInt(String(a.JO_No).split('-').pop() || 0);
                          const numB = parseInt(String(b.JO_No).split('-').pop() || 0);
                          return numB - numA;
                        })[0];
                        return latest?.xDate ? new Date(latest.xDate).toLocaleDateString() : '---';
                      })()
                    : '---'}

            </text>
          </div>
        </Box>
        <form className='mt-8'>
            <label className='text-base font-normal text-gray-500 '>Job Order No : </label>
            <label className='pl-3 text-base font-semibold text-gray-800 '>{currentHeader?.JO_No || ''}</label> 
            <label className='pl-10 text-base font-normal text-gray-500'>Created on : </label>
            <input 
              className={`ml-5 p-2 text-base font-semibold text-gray-800 rounded-sm ${!state.isEditing && !state.isCreating ? '' : ' bg-white'} border border-gray-300`}
              type='date' 
              value={currentHeader?.xDate ? currentHeader.xDate.slice(0,10): ""} 
              disabled={isReadOnly}
              onChange={(e) => {  
                if (!isReadOnly) {
                  updateHeaderField('xDate', e.target.value);
                }
              }}
            /> 
            <br/>
            <label className='text-base font-normal text-gray-500 '>Status : </label>
            <label className='pl-3 text-base font-semibold text-gray-800 '>{docStatus(currentHeader?.xpost)}</label>
              {nextLevel && currentHeader?.xpost === 2 && (
                <label className='pl-3 text-sm text-blue-600'>
                  (Next approval level {nextLevel}/{totalLevels})
                </label>
              )}
            <Box className='mt-2 '>
              <div className='flex items-center justify-start w-full gap-10 mt-4'>
                <label className='text-base font-normal text-gray-500 w-28 '>Department :</label>
                <Autocomplete
                  variant='body2'
                  disabled={isReadOnly}
                  className={`rounded-sm ${!state.isEditing && !state.isCreating ? 'border' : 'border-none bg-white'} border-gray-300 w-80`}
                  size = 'small'
                  options= {departments} 
                  value={currentHeader?.Department_Code || currentHeader?.Department  || '' }
                  onChange={(e, newValue) => handleHeaderChange('Department_Code', newValue)}
                  renderInput={(params) => (
                    <TextField {...params} 
                      sx={getAutocompleteSx(state.isEditing || state.isCreating)}
                    />              
                  )} 
                />
                <label className='text-base font-normal text-gray-500 w-38 '>Maintenance Service :</label>
                <Autocomplete 
                  disabled={isReadOnly}
                  className={`rounded-sm  ${!state.isEditing && !state.isCreating ? 'border' : 'border-none bg-white'} border-gray-300 w-72`}
                  size = 'small'
                  options= {sections} 
                  value={currentHeader?.Sector_name || ''}
                  onChange={(e, newValue) => handleHeaderChange('Sector_name', newValue)}
                  renderInput={(params) => (
                    <TextField {...params} 
                      sx={getAutocompleteSx(state.isEditing || state.isCreating)}
                    />              
                  )} 
                />
                <label className='text-base font-normal text-gray-500 w-28 '>Requested by : </label>
                  <input
                    type="text"
                    disabled
                    className="text-base font-semibold text-gray-500"
                    value={currentHeader?.requested_by || userName}
                    onChange={(e) => handleHeaderChange('requested_by', e.target.value)}
                  />
              </div>

              <div className='flex items-start justify-start w-full gap-10 mt-4'>
                <label className={`pt-2 text-base text-gray-500 w-28 font-normal`}>Remarks : </label>
                <textarea
                  id = "remarks"
                  disabled={!state.isEditing && !state.isCreating}
                  aria-label = "minimum height"
                  minRows={2}
                  value={currentHeader?.Remarks || ''}
                  onChange={(e) => handleHeaderChange('Remarks', e.target.value)}
                  className={`${!state.isEditing && !state.isCreating? 'text-gray-400' : 'text-black'} rounded-sm border-gray-300 `}
                  style={{ 
                    width: '50rem',
                    resize: 'both',
                    padding: '.5rem',
                    border: '1px solid #ccc',
                    marginTop: '.5rem'
                  }}   
                />
              </div>
              
            </Box>
        </form>
      </div>    
      <ThemeProvider theme={customTheme}>
        <div className='my-4 bg-gray-100 rounded-lg shadow-lg mx-14'>
          <JobOrderTabs
            state={state}
            isCreating={state.isCreating}
            isEditing={state.isEditing}
            setIsEditing={state.setIsEditing}
            docStatus={docStatus}
            isReadOnly={isReadOnly}
            copyDocNo={copyDocNo}
            currentHeader={currentHeader}
            currentJOItems={currentJOItems}
            updateDetailRow={updateDetailRow}
            addDetailRow={addDetailRow}
            removeDetailRow={removeDetailRow}
            handleDeleteClick={handleDeleteClick}
            handleConfirmDelete={handleConfirmDelete}
            handleCancelDelete={handleCancelDelete}
          />
        </div>
      </ThemeProvider>

    </>
  )
}