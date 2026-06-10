import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom'; 

// MUI Components
import { Box, Autocomplete, TextField, ThemeProvider , Dialog, Snackbar, Alert, TextareaAutosize } from '@mui/material';


// Components
import TransferTabs from '../transfer/transferTabs';

// Custom Utils
import { getAutocompleteSx } from '../../../Utils/autocompleteStyles';  
import { customTheme } from '../../../Utils/customTable';
import { CustomBtn, getButtonConfig } from '../../../Utils/groupbtns';
import { CustomDialog } from '../../../Utils/customDialog'
import DateDisplay from '../../../Utils/formatDateForInput';


// Custom Hooks
import { useTR_h} from '../../../hooks/useTR_h';
import { useRefDepartment } from '../../../hooks/refDepartment'; 
import { userRefEmployee } from '../../../hooks/refEmployee'; 
import { useRefLocation } from '../../../hooks/refLocation'; 
import { useSections } from '../../../hooks/refSection';
import { useTRData } from '../../../hooks/useTR_reducer';
import { useCompanyConfig } from '../../../hooks/useCompanyConfig';
import { useTRApproval  } from '../../../hooks/useTRApproval';
import { useApprovalActions } from '../../../Utils/approvalActionHandler';
import { useUsers } from '../../../hooks/useUsers';

export default function TRFormPage(useProps) {

  const { 
    selectedUser, 
    setSelectedUser, 
  } = useUsers();
  // In TRFormPage.jsx - modify the userInfo
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
    dispatch,

    trDetails,

    getTRData,
    forceRefreshTR,

    startCreate,
    startEdit,
    cancelEditCreate,

    addDetailRow,
    updateHeaderField,
    updateDetailRow,
    removeDetailRow,

    // dialogs
    openSaveDialog,      
    closeSaveDialog,     
    openCancelDialog,    
    closeCancelDialog, 
    openDeleteDialog,
    closeDeleteDialog,

    confirmSave,  
    confirmDelete,   
    confirmCancel,   

    showSnackbar,
    hideSnackbar,    

  } = useTRData();

  const { 
    postTransfer, 
    canPost, 
    approveTR,
    rejectTR,
    canApprove,
    loading: approvalLoading 
  } = useTRApproval ();

  // Add state for post dialog
  const [postDialogOpen, setPostDialogOpen] = useState(false);
  const [rowToDelete, setRowToDelete] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0); // Used to trigger refresh
  
  // Add this with your other state declarations
  const [localSnackbar, setLocalSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });

  // reference data for dropdowns
  const { trHeaders } = useTR_h();
  const { refDeptData } = useRefDepartment();
  const { refEmployeeData } = userRefEmployee();
  const { refLocData } = useRefLocation();
  const { refSections } = useSections();
  const departments = refDeptData.map(item => item.Department);
  const employees = refEmployeeData.map(item => item.Emp_No + ' - ' + item.Emp_FName + ' ' + item.Emp_LName);
  const locations = refLocData.map(item => item.LocationName);
  const sections = refSections.map(item => item.xdesc);

  // get TR data if copyDocNo exists in URL
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const copyDocNo = searchParams.get('docId');
  const isCreatingRef = useRef(false);

  // Function to show toast messages
  const showToast = useCallback((message, severity = 'info') => {
    setLocalSnackbar({
      open: true,
      message,
      severity
    });
  }, []);

  // ===== REFRESH DATA - Define BEFORE useApprovalActions =====
  const refreshData = useCallback(async () => {
    if (!copyDocNo) return;
    
    console.log('🔄 Refreshing data for TR:', copyDocNo);
    try {
      // Force refresh using the hook's method
      await forceRefreshTR(copyDocNo);
      
      // Also call getTRData directly to ensure data is updated
      await getTRData(copyDocNo);
      
      // Increment refresh key to trigger any dependent effects
      setRefreshKey(prev => prev + 1);
      
      console.log('✅ Data refresh completed');
    } catch (error) {
      console.error('❌ Error refreshing data:', error);
    }
  }, [copyDocNo, forceRefreshTR, getTRData]);

  // Function to get item approval level (for multi-level approval)
  const getItemApprovalLevel = useCallback((itemData, isApprove) => {
    if (!itemData) return null;
    
    if (isApprove) {
      return itemData.currentApprovalLevel || 1;
    } else {
      return itemData.currentApprovalLevel || 1;
    }
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
    onApprove: approveTR,
    onReject: rejectTR,
    getItemLevel: getItemApprovalLevel,
    onRefresh: refreshData,
    showToast,
    getUserInfo: () => userInfo
  });

  // Initial data load when copyDocNo changes
  useEffect(() => {
    if (!copyDocNo) return;
    if (isCreatingRef.current) return;
    
    console.log('📥 Loading initial data for TR:', copyDocNo);
    getTRData(copyDocNo);    
  }, [copyDocNo, getTRData]);

  // Refresh data when refreshKey changes (after actions)
  useEffect(() => {
    if (refreshKey > 0 && copyDocNo) {
      console.log('🔄 Refresh triggered by key change');
      getTRData(copyDocNo);
    }
  }, [refreshKey, copyDocNo, getTRData]);

  // Add this in your parent component to debug
  useEffect(() => {
    console.log('Raw userId from localStorage:', localStorage.getItem('userId'));
    console.log('Raw username from localStorage:', localStorage.getItem('username'));
    console.log('Raw firstName:', localStorage.getItem('firstName'));
    console.log('Raw lastName:', localStorage.getItem('lastName'));
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

  const baseHeader = state.selectedTR;
  const currentHeader = state.isCreating || state.isEditing
          ? state.createTRHeader
          : state.selectedTR;

  const currentTRItems = state.isCreating || state.isEditing
          ? state.createTRDetails
          : state.trDetails;

  const canEditDocument = state.isCreating || (state.isEditing && baseHeader?.xpost === 0);
  const isReadOnly = !canEditDocument;

  // Generate Auto TR number based on the company config (db table: user0002inv)
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
    if (!state.createTRHeader?.TR_No) {
      alert('Transfer Form number is required');
      return;
    }
    
    if (!state.createTRHeader?.Department && !state.createTRHeader?.Department_Code) {
      alert('Please select department where asset is transferred to.');
      return;
    }
    
    if (!state.createTRHeader?.Holder) {
      alert('Please select new holder.');
      return;
    }

    if (!state.createTRHeader?.Remarks) {
      alert('Please enter remarks.');
      return;
    }
    
    // Validate details
    if (!state.createTRDetails || state.createTRDetails.length === 0) {
      alert('Please add at least one item');
      return;
    }
    

    // Check for empty required fields in details
    const invalidRows = state.createTRDetails.filter(row => !row.FAC_NO);
    if (invalidRows.length > 0) {
      alert(`Please select assets for all rows (${invalidRows.length} row(s) missing asset)`);
      return;
    }
    
    // If validation passes, open save confirmation dialog
    openSaveDialog();
  };

  // function to handle successful creation
  const handleSuccessfulCreate = useCallback(async (newTRNo) => {
    console.log('Successfully created TR:', newTRNo);

    await refreshCompanyConfig();
    
    setSearchParams({ docId: newTRNo });
    isCreatingRef.current = false; // Reset the creating flag
  }, [setSearchParams, refreshCompanyConfig]);

  const handleConfirmSave = async () => {
    // Capture the TR number before saving
    const newTRNo = state.createTRHeader?.TR_No;
    const wasCreating = state.isCreating;
    
    // Call the original confirmSave (which calls createJO)
    await confirmSave();
    
    // If this was a creation and we have a TR number, update the URL
    if (wasCreating && newTRNo) {
      handleSuccessfulCreate(newTRNo);
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
    
    if (!copyDocNo && !baseHeader?.TR_No) {
      showToast('No document to post', 'error');
      return;
    }

    const docNo = copyDocNo || baseHeader?.TR_No;
    const postCheck = canPost({ xpost: baseHeader?.xpost, disapproved: baseHeader?.disapproved });
    
    if (!postCheck.canPost) {
      showToast(postCheck.reason, 'error');
      return;
    }

    const result = await postTransfer(docNo);
      
    if (result.success) {
      showToast(result.message, 'success');
      
      // Wait a moment for the database to update
      setTimeout(async () => {
        // Force refresh the data
        await refreshData();
        
        // Also refresh the TR headers list if needed
        if (window.refreshJOData) {
          await window.refreshJOData();
        }
      }, 500);
      
    } else {
      showToast('Failed to post: ' + result.error, 'error');
    }
  };


  console.log('Base Header:', baseHeader);
  
  // Handle approval with dialog
  const handleApproveClick = () => {
    if (!copyDocNo && !baseHeader?.TR_No) {
      showToast('No document to approve', 'error');
      return;
    }

    const docNo = copyDocNo || baseHeader?.TR_No;
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
    if (!copyDocNo && !baseHeader?.TR_No) {
      showToast('No document to reject', 'error');
      return;
    }

    const docNo = copyDocNo || baseHeader?.TR_No;
    
    // Open bulk dialog for single rejection
    openBulkDialog('reject');
    // Store the current item ID for the bulk action
    window.currentApprovalItem = docNo;
  };

  // Handle single item action from bulk dialog
  const handleSingleItemAction = async () => {
    if (!window.currentApprovalItem) return;
    
    const result = await handleIndividualAction(
      window.currentApprovalItem,
      bulkActionType,
      bulkRemarks,
      baseHeader,
      userInfo
    );
    
    if (result?.success) {
      closeBulkDialog();
      setBulkRemarks('');
      window.currentApprovalItem = null;
      setRefreshKey(prev => prev + 1);
    }
  };

  const handleDeleteClick = (rowId) => {
    if (currentTRItems.length === 1) {
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
          text="Are you sure you want to save this Transfer Form? Please review all information before saving."
          cancelText="Cancel"
          confirmText="Save"
          cancel={closeSaveDialog}
          confirm={handleConfirmSave}
        />
      </Dialog>

      {/* Delete TR line items Confirmation Dialog */}
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
          text="Would you like to post this Transfer Form now? Once posted, it will be sent for approval."
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
              {bulkActionType === 'approve' 
                ? `Are you sure you want to approve ${window.currentApprovalItem ? 'this Transfer Form' : 'the selected Job Orders'}?` 
                : `Are you sure you want to reject ${window.currentApprovalItem ? 'this Transfer Form' : 'the selected Job Orders'}? This action cannot be undone.`
              }
            </p>
            <div className="mb-4">
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Remarks {<span className="text-red-500">*</span>}
              </label>
              <TextareaAutosize
                minRows={3}
                placeholder={bulkActionType === 'reject' ? "Please provide a reason for rejection..." : "Enter provide approval remarks"}
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
                onClick={window.currentApprovalItem ? handleSingleItemAction : () => {
                  // Handle bulk action here if needed
                  showToast('Bulk action not yet implemented', 'info');
                }}
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
            title='Save changes made in this Transfer Form'
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
            title='Edit this Transfer Form'
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
            title='Create new Transfer Form'
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
            state.isCreating ? 'Creating Transfer Form' : state.isEditing ? 'Editing Transfer Form' : 'Display Transfer Form'
          }
          </h1>
          <div className='flex gap-2'>
            <text className='text-xs text-gray-500'>Last TR created :</text>
            <text className='text-xs text-gray-500'>
                  {/* Get the latest TR from trHeaders */}
                  {trHeaders && trHeaders.length > 0 
                    ? [...trHeaders].sort((a, b) => {
                        const numA = parseInt(String(a.TR_No).split('-').pop() || 0);
                        const numB = parseInt(String(b.TR_No).split('-').pop() || 0);
                        return numB - numA;
                      })[0]?.TR_No 
                    : '---'}

            </text>
            <text className='text-xs text-gray-500'>Created on:</text>
            <text className='text-xs text-gray-500'>
                    {trHeaders && trHeaders.length > 0 
                    ? (() => {
                        const latest = [...trHeaders].sort((a, b) => {
                          const numA = parseInt(String(a.TR_No).split('-').pop() || 0);
                          const numB = parseInt(String(b.TR_No).split('-').pop() || 0);
                          return numB - numA;
                        })[0];
                        return latest?.xDate ? new Date(latest.xDate).toLocaleDateString() : '---';
                      })()
                    : '---'}

            </text>
          </div>
        </Box>
        <form className='mt-8'>
            <label className='text-base font-normal text-gray-500 '>Transfer Form No : </label>
            <label className='pl-3 text-base font-semibold text-gray-800 '>{currentHeader?.TR_No || ''}</label> 
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
            
            <Box className='mt-2 '>
              <div className='flex items-center justify-start w-full gap-10 mt-4'>
                <label className='text-base font-normal text-gray-500 w-28 '>Transfer to :</label>
                <Autocomplete
                  variant='body2'
                  disabled={isReadOnly}
                  className={`rounded-sm ${!state.isEditing && !state.isCreating ? 'border' : 'border-none bg-white'} border-gray-300 w-80`}
                  size = 'small'
                  options= {departments} 
                  value={currentHeader?.Department  || '' }
                  onChange={(e, newValue) => handleHeaderChange('Department', newValue)}
                  renderInput={(params) => (
                    <TextField {...params} 
                      sx={getAutocompleteSx(state.isEditing || state.isCreating)}
                      placeholder="Select Department" 
                    />              
                  )} 
                />
                <label className='text-base font-normal text-gray-500 w-38 '>New Holder:</label>
                <Autocomplete 
                  disabled={isReadOnly}
                  className={`rounded-sm  ${!state.isEditing && !state.isCreating ? 'border' : 'border-none bg-white'} border-gray-300 w-72`}
                  size = 'small'
                  options= {employees} 
                  value={currentHeader?.Holder || ''}
                  onChange={(e, newValue) => handleHeaderChange('Holder', newValue)}
                  renderInput={(params) => (
                    <TextField {...params} 
                      sx={getAutocompleteSx(state.isEditing || state.isCreating)}
                      placeholder="Select Holder" 
                    />              
                  )} 
                />
                <label className='text-base font-normal text-gray-500 w-28 '>Custodian : </label>
                  <input
                    type="text"
                    disabled
                    className="text-base font-semibold text-gray-500"
                    value={currentHeader?.Custodian || userName}
                    onChange={(e) => handleHeaderChange('Custodian', e.target.value)}
                  />
              </div>

              <div className='flex items-center justify-start w-full gap-20 mt-4'>
                <label className='text-base font-normal text-gray-500 w-38 '>Location :</label>
                <Autocomplete 
                  disabled={isReadOnly}
                  className={`rounded-sm ${!state.isEditing && !state.isCreating ? 'border' : 'border-none bg-white'} border-gray-300 w-72`}
                  size = 'small'
                  options= {locations} 
                  value={currentHeader?.Location|| ''}
                  onChange={(e, newValue) => handleHeaderChange('Location', newValue)}
                  renderInput={(params) => (
                    <TextField {...params} 
                      sx={getAutocompleteSx(state.isEditing || state.isCreating)}
                      placeholder="Select Location" 
                    />              
                  )} 
                />
              </div>

              <div className='flex items-start justify-start w-full gap-10 mt-4'>
                <label className={`pt-2 text-base text-gray-500 w-28 font-normal`}>Remarks :</label>
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
          <TransferTabs
            state={state}
            isCreating={state.isCreating}
            isEditing={state.isEditing}
            setIsEditing={state.setIsEditing}
            docStatus={docStatus}
            isReadOnly={isReadOnly}
            copyDocNo={copyDocNo}
            currentHeader={currentHeader}
            currentTRItems={currentTRItems}
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