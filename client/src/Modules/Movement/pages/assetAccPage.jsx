import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom'; 

// MUI Components
import { Box, Autocomplete, TextField, ThemeProvider, Dialog, Snackbar, Alert, TextareaAutosize } from '@mui/material';

// Components
import AssetAccTabs from '../aaccountability/assetAccTabs';

// Custom Utils
import { getAutocompleteSx } from '../../../Utils/autocompleteStyles';  
import { customTheme } from '../../../Utils/customTable';
import { CustomBtn, getButtonConfig } from '../../../Utils/groupbtns';
import { CustomDialog } from '../../../Utils/customDialog'

// Custom Hooks
import { useAD_h } from '../../../hooks/useAD_h';
import { useRefDepartment } from '../../../hooks/refDepartment'; 
import { userRefEmployee } from '../../../hooks/refEmployee'; 
import { useRefLocation } from '../../../hooks/refLocation'; 
import { useSections } from '../../../hooks/refSection';
import { useAAData } from '../../../hooks/useAssetAcc_reducer';
import { useCompanyConfig } from '../../../hooks/useCompanyConfig';
import { useAssetAccApproval } from '../../../hooks/useAssetAccApproval';
import { useApprovalActions } from '../../../Utils/approvalActionHandler';
import { useUsers } from '../../../hooks/useUsers';

export default function AAFormPage(useProps) {
  const { selectedUser, setSelectedUser } = useUsers();
  const userName = localStorage.getItem('username') || 'User';
  const rawUserId = localStorage.getItem('userId') || userName;

  useEffect(() => {
    if (userName && userName !== 'User') {
      setSelectedUser(userName);
    }
  }, [userName, setSelectedUser]);

  const cleanUserId = String(rawUserId).replace(/\s*-\s*$/, '').trim();
  const userInfo = {
    user: cleanUserId,
    fname: selectedUser?.fname || '',
    lname: selectedUser?.lname || '',
    multiApp: selectedUser?.multiApp || []
  };

  const {
    state,
    assetAccHeaders,
    assetAccDetails,

    getAAData,
    forceRefreshAA,

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
  } = useAAData();

  const { 
    postAssetAcc, 
    canPost, 
    approveAssetAcc,
    rejectAssetAcc,
    canApprove,
    getTotalLevels,
    loading: approvalLoading 
  } = useAssetAccApproval();

  const [postDialogOpen, setPostDialogOpen] = useState(false);
  const [rowToDelete, setRowToDelete] = useState(null);
  const [totalLevels, setTotalLevels] = useState(3);
  const [localSnackbar, setLocalSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });

  // Reference data
  const { refDeptData } = useRefDepartment();
  const { refEmployeeData } = userRefEmployee();
  const { refLocData } = useRefLocation();
  const { refSections } = useSections();
  const departments = refDeptData.map(item => item.Department);
  const employees = refEmployeeData.map(item => item.Emp_No + ' - ' + item.Emp_FName + ' ' + item.Emp_LName);
  const locations = refLocData.map(item => item.LocationName);
  const sections = refSections.map(item => item.xdesc);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

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

  const loadAAData = useCallback(async () => {
    if (!copyDocNo || isCreatingRef.current) return;
    await getAAData(copyDocNo);
  }, [copyDocNo, getAAData]);

  useEffect(() => {
    loadAAData();
  }, [copyDocNo, loadAAData]);

const refreshData = useCallback(async () => {
  if (!copyDocNo) return;
   
  // Reload the data
  await forceRefreshAA(copyDocNo);
  // Increment refresh trigger to force re-renders of child components if needed
  setRefreshTrigger(prev => prev + 1);
}, [copyDocNo, getAAData, forceRefreshAA]);

  // Get approval level for the document (copied from mvTRForm)
  const getApprovalLevel = useCallback((header, forApproval = true) => {
    if (!header) return 1;
    
    if (header.xPosted === 3) {
      return 1; // First approval
    } else if (header.xPosted === 2 && header.appStat) {
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

  // Use approval actions hook (simplified for single document)
  const {
    processingItem,
    remarks,
    bulkDialogOpen,
    bulkActionType,
    bulkRemarks,
    bulkLoading,
    handleIndividualAction,
    openBulkDialog,
    closeBulkDialog,
    updateRemarks,
    setBulkRemarks
  } = useApprovalActions({
    onApprove: approveAssetAcc,
    onReject: rejectAssetAcc,
    onRefresh: refreshData,
    showToast
  });

  // Get next level for display
  const getNextLevel = useCallback((header) => {
    if (!header || !header.xPosted) return null;
    if (header.xPosted === 3) return 1;
    if (header.xPosted === 2 && header.appStat) {
      const appStatStr = String(header.appStat);
      const approvedLevels = appStatStr.includes(',') 
        ? appStatStr.split(',').length 
        : 1;
      return approvedLevels + 1;
    }
    return null;
  }, []);

  const baseHeader = state.selectedAA;
  const currentHeader = state.isCreating || state.isEditing
    ? state.createAAHeader
    : state.selectedAA;
  const currentAAItems = state.isCreating || state.isEditing
    ? state.createAADetails
    : state.assetAccDetails;
  const canEditDocument = state.isCreating || (state.isEditing && baseHeader?.xPosted === 0);
  const isReadOnly = !canEditDocument;
  const nextLevel = getNextLevel(baseHeader);

  const { companyConfig, refreshCompanyConfig } = useCompanyConfig(useProps);

  const handleHeaderChange = (field, value) => {
    updateHeaderField(field, value);
  };

// Add this function to handle employee selection
const handleEmployeeChange = (event, newValue) => {
  if (!newValue) {
    updateHeaderField('EmpID', '');
    updateHeaderField('EmpName', '');
    return;
  }
  
  // Parse the employee value (format: "Emp_No - FirstName LastName")
  const parts = newValue.split(' - ');
  const empNo = parts[0];  // Just the employee number
  const empFullName = parts[1]; // This is "Emp_FName Emp_LName"
  
  // Store EmpID as the full string (for display in autocomplete)
  // Store EmpName as just the name part
  updateHeaderField('EmpID', newValue);
  updateHeaderField('EmpName', empFullName || '');
  
  console.log('Employee selected:', { empNo, empFullName });
};

  const handleCreate = () => {
    isCreatingRef.current = true;
    const config = Array.isArray(companyConfig) ? companyConfig[0] : companyConfig;
    startCreate(config, userName);
  };

  const handleEdit = () => {
    if (!copyDocNo) return;
    startEdit(copyDocNo);
  };

  const handleCancel = () => {
    if (state.hasUnsavedChanges) {
      openCancelDialog();
    } else {
      cancelEditCreate();
    }
  };

  const handleSave = async () => {
    if (!state.createAAHeader?.AAFNo) {
      alert('Asset Accountability number is required');
      return;
    }
    if (!state.createAAHeader?.Dep) {
      alert('Please select department.');
      return;
    }
    if (!state.createAAHeader?.EmpID) {
      alert('Please enter employee.');
      return;
    }
    if (!state.createAADetails || state.createAADetails.length === 0) {
      alert('Please add at least one item');
      return;
    }
    const invalidRows = state.createAADetails.filter(row => !row.ItemNo);
    if (invalidRows.length > 0) {
      alert(`Please select assets for all rows (${invalidRows.length} row(s) missing asset)`);
      return;
    }
    openSaveDialog();
  };

  const handleSuccessfulCreate = useCallback(async (newAANo) => {
    await refreshCompanyConfig();
    setSearchParams({ docId: newAANo });
    isCreatingRef.current = false;
  }, [setSearchParams, refreshCompanyConfig]);

  const handleConfirmSave = async () => {
    const newAANo = state.createAAHeader?.AAFNo;
    const wasCreating = state.isCreating;
    await confirmSave();
    if (wasCreating && newAANo) {
      handleSuccessfulCreate(newAANo);
    }
  };

  const handleSnackbarClose = (event, reason) => {
    if (reason === 'clickaway') return;
    hideSnackbar();
  };

  const openPostDialog = () => setPostDialogOpen(true);
  const closePostDialog = () => setPostDialogOpen(false);

  const handleConfirmPost = async () => {
    closePostDialog();
    const docNo = copyDocNo || baseHeader?.AAFNo;
    if (!docNo) {
      showToast('No document to post', 'error');
      return;
    }

    const postCheck = canPost({ xPosted: baseHeader?.xPosted, disapproved: baseHeader?.disapproved });
    if (!postCheck.canPost) {
      showToast(postCheck.reason, 'error');
      return;
    }

    const result = await postAssetAcc(docNo);
    if (result.success) {
      showToast(result.message, 'success');
      setTimeout(async () => {
        await refreshData();
        if (window.refreshADData) await window.refreshADData();
      }, 500);
    } else {
      showToast('Failed to post: ' + result.error, 'error');
    }
  };

  // Handle approval click
  const handleApproveClick = () => {
    const docNo = copyDocNo || baseHeader?.AAFNo;
    if (!docNo) {
      showToast('No document to approve', 'error');
      return;
    }

    const approvalCheck = canApprove({ 
      xPosted: baseHeader?.xPosted, 
      disapproved: baseHeader?.disapproved 
    });
    
    if (!approvalCheck.canApprove) {
      showToast(approvalCheck.reason, 'error');
      return;
    }

    window.currentApprovalItem = docNo;
    openBulkDialog('approve');
  };

  // Handle rejection click
  const handleRejectClick = () => {
    const docNo = copyDocNo || baseHeader?.AAFNo;
    if (!docNo) {
      showToast('No document to reject', 'error');
      return;
    }

    window.currentApprovalItem = docNo;
    openBulkDialog('reject');
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
          showToast(`Asset Accountability fully approved!`, 'success');
        } else {
          showToast(`Level ${currentLevel} approved successfully. ${currentLevel} of ${totalLevels} levels completed.`, 'success');
        }
      } else {
        showToast(`Asset Accountability rejected successfully`, 'success');
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
    if (currentAAItems.length === 1) {
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

  const handleLocalSnackbarClose = () => {
    setLocalSnackbar(prev => ({ ...prev, open: false }));
  };

  const buttonConfig = getButtonConfig(state, baseHeader, canApprove);

  // Warn about unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (state.hasUnsavedChanges && (state.isCreating || state.isEditing)) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [state.hasUnsavedChanges, state.isCreating, state.isEditing]);

  const docStatus = (status) => {
    switch (status) {
      case 0: return 'Draft';
      case 1: return 'Fully Approved';
      case 2: return 'Partially Approved';
      case 3: return 'For Approval';
      case 4: return 'Rejected';
      default: return 'Draft';
    }
  };

  return (
    <>
      {/* Save Confirmation Dialog */}
      <Dialog open={state.saveDialogOpen} onClose={closeSaveDialog}>
        <CustomDialog
          title="Confirm Save"
          text="Are you sure you want to save this Asset Accountability? Please review all information before saving."
          cancelText="Cancel"
          confirmText="Save"
          cancel={closeSaveDialog}
          confirm={handleConfirmSave}
        />
      </Dialog>

      {/* Delete Dialog */}
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

      {/* Cancel Dialog */}
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

      {/* Post Dialog */}
      <Dialog open={postDialogOpen} onClose={closePostDialog}>
        <CustomDialog
          title="Confirm Post"
          text="Would you like to post this Asset Accountability now? Once posted, it will be sent for approval."
          cancelText="Cancel"
          confirmText="Post"
          cancel={closePostDialog}
          confirm={handleConfirmPost}
        />
      </Dialog>

      {/* Approval/Rejection Dialog - Maintained your existing design */}
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
                ? `Are you sure you want to approve this Asset Accountability?` 
                : `Are you sure you want to reject this Asset Accountability? This action cannot be undone.`
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

      {/* Snackbars */}
      <Snackbar
        open={state.snackbar.open}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleSnackbarClose} severity={state.snackbar.severity} variant="filled">
          {state.snackbar.message}
        </Alert>
      </Snackbar>

      <Snackbar
        open={localSnackbar.open}
        autoHideDuration={4000}
        onClose={handleLocalSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleLocalSnackbarClose} severity={localSnackbar.severity} variant="filled">
          {localSnackbar.message}
        </Alert>
      </Snackbar>

      {/* Buttons Section */}
      <div className='flex justify-end gap-3 my-4 mx-14'>
        {(state.isCreating || state.isEditing) && (
          <CustomBtn variant='saveBtn' iconType='save' onClick={handleSave}>
            {state.saving ? 'Saving...' : 'Save'}
          </CustomBtn>
        )}
        
        {!state.isEditing && !state.isCreating && copyDocNo && (
          <CustomBtn variant='editBtn' iconType='edit' onClick={handleEdit}>
            Edit
          </CustomBtn>       
        )}
        
        {!state.isEditing && !state.isCreating && (
          <CustomBtn variant='createBtn' iconType='add' onClick={handleCreate}>
            Create
          </CustomBtn>
        )}
        
        {(state.isEditing || state.isCreating) && (
          <CustomBtn variant='cancelBtn' iconType='cancel' onClick={handleCancel}>
            Cancel
          </CustomBtn>
        )}

        {buttonConfig.showPost && (
          <CustomBtn variant='postBtn' iconType='post' onClick={openPostDialog} disabled={approvalLoading}>
            {buttonConfig.postText || 'Post'}
          </CustomBtn>
        )}

        {buttonConfig.showApprove && (
          <CustomBtn
            variant='saveBtn'
            iconType='save'
            onClick={handleApproveClick}
            disabled={state.isEditing || approvalLoading || processingItem === copyDocNo}
          >
            {processingItem === copyDocNo ? 'Approving...' : (buttonConfig.approveText || 'Approve')}
          </CustomBtn>
        )}

        {buttonConfig.showReject && (
          <CustomBtn
            variant='rejectBtn'
            iconType='reject'
            onClick={handleRejectClick}
            disabled={approvalLoading || processingItem === copyDocNo}
          >
            {processingItem === copyDocNo ? 'Rejecting...' : (buttonConfig.rejectText || 'Reject')}
          </CustomBtn>
        )}

        {copyDocNo && (
          <CustomBtn variant='printBtn' iconType='print'>
            Preview
          </CustomBtn>
        )}
      </div>
          
      <div className='p-6 my-4 bg-gray-100 rounded-lg shadow-lg mx-14'>
        <Box className='flex justify-between w-full h-full gap-1'>
          <h1 className='text-sm font-bold text-gray-800'>
            {state.isCreating ? 'Creating Asset Accountability' : state.isEditing ? 'Editing Asset Accountability' : 'Display Asset Accountability'}
          </h1>
          <div className='flex gap-2'>
            <span className='text-xs text-gray-500'>Last Asset Accountability created :</span>
            <span className='text-xs text-gray-500'>
              {assetAccHeaders && assetAccHeaders.length > 0 
                ? [...assetAccHeaders].sort((a, b) => {
                    const numA = parseInt(String(a.AAFNo).split('-').pop() || 0);
                    const numB = parseInt(String(b.AAFNo).split('-').pop() || 0);
                    return numB - numA;
                  })[0]?.AAFNo 
                : '---'}
            </span>
            <span className='text-xs text-gray-500'>Created on:</span>
            <span className='text-xs text-gray-500'>
              {assetAccHeaders && assetAccHeaders.length > 0 
                ? (() => {
                    const latest = [...assetAccHeaders].sort((a, b) => {
                      const numA = parseInt(String(a.AAFNo).split('-').pop() || 0);
                      const numB = parseInt(String(b.AAFNo).split('-').pop() || 0);
                      return numB - numA;
                    })[0];
                    return latest?.xDate ? new Date(latest.xDate).toLocaleDateString() : '---';
                  })()
                : '---'}
            </span>
          </div>
        </Box>
        
        <form className='mt-8'>
          <label className='text-base font-normal text-gray-500'>Asset Accountability No : </label>
          <label className='pl-3 text-base font-semibold text-gray-800'>{currentHeader?.AAFNo || ''}</label> 
          <label className='pl-10 text-base font-normal text-gray-500'>Created on : </label>
          <input 
            className={`ml-5 p-2 text-base font-semibold text-gray-800 rounded-sm ${!state.isEditing && !state.isCreating ? '' : 'bg-white'} border border-gray-300`}
            type='date' 
            value={currentHeader?.xDate ? currentHeader.xDate.slice(0,10) : ""} 
            disabled={isReadOnly}
            onChange={(e) => {  
              if (!isReadOnly) {
                updateHeaderField('xDate', e.target.value);
              }
            }}
          /> 
          <br/>
          <label className='text-base font-normal text-gray-500'>Status : </label>
          <label className='pl-3 text-base font-semibold text-gray-800'>{docStatus(currentHeader?.xPosted)}</label>
          {nextLevel && currentHeader?.xPosted === 2 && (
            <label className='pl-3 text-sm text-orange-300'>
              (Level {nextLevel} of {totalLevels} is still pending)
            </label>
          )}
          
          <Box className='mt-2'>
            <div className='flex items-center justify-start w-full gap-10 mt-4'>
              <label className='text-base font-normal text-gray-500 w-28'>Department :</label>
              <Autocomplete
                variant='body2'
                disabled={isReadOnly}
                className={`rounded-sm ${!state.isEditing && !state.isCreating ? 'border' : 'border-none bg-white'} border-gray-300 w-80`}
                size='small'
                options={departments} 
                value={currentHeader?.Dep || ''}
                onChange={(e, newValue) => handleHeaderChange('Dep', newValue)}
                renderInput={(params) => (
                  <TextField {...params} 
                    sx={getAutocompleteSx(state.isEditing || state.isCreating)}
                    placeholder="Select Department" 
                  />              
                )} 
              />

              <label className='text-base font-normal text-gray-500 w-28'>Custodian : </label>
              <input
                type="text"
                disabled
                className="text-base font-semibold text-gray-500"
                value={currentHeader?.Custodian || userName}
                onChange={(e) => handleHeaderChange('Evaluated_By', e.target.value)}
              />
            </div>


            <div className='flex items-start justify-start w-full gap-10 mt-4'>
              <label className='text-base font-normal text-gray-500 w-28'>Employee :</label>
              <Autocomplete
                variant='body2'
                disabled={isReadOnly}
                className={`rounded-sm ${!state.isEditing && !state.isCreating ? 'border' : 'border-none bg-white'} border-gray-300 w-80`}
                size='small'
                options={employees} 
                value={currentHeader?.EmpID || ''}
                onChange={handleEmployeeChange} 
                renderInput={(params) => (
                  <TextField {...params} 
                    sx={getAutocompleteSx(state.isEditing || state.isCreating)}
                    placeholder="Select Employee" 
                  />              
                )} 
              />
            </div>
          </Box>
        </form>
      </div>    
      
      <ThemeProvider theme={customTheme}>
        <div className='my-4 bg-gray-100 rounded-lg shadow-lg mx-14'>
          <AssetAccTabs
            state={state}
            isCreating={state.isCreating}
            isEditing={state.isEditing}
            setIsEditing={state.setIsEditing}
            docStatus={docStatus}
            isReadOnly={isReadOnly}
            copyDocNo={copyDocNo}
            currentHeader={currentHeader}
            currentAAItems={currentAAItems}
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
  );
}