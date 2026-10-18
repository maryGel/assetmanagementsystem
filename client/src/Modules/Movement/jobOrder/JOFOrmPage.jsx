import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom'; 

// MUI Components
import { Box, Autocomplete, TextField, ThemeProvider , Dialog, Snackbar, Alert, TextareaAutosize } from '@mui/material';


// Components
import JobOrderTabs from '../jobOrder/jobOrderTabs';
import { FormField, FormGrid, FieldInput, FieldAutocomplete, FieldValue } from '../../../components/FormField';
import TagIcon from '@mui/icons-material/Tag';
import EventIcon from '@mui/icons-material/Event';
import FlagIcon from '@mui/icons-material/Flag';
import PersonIcon from '@mui/icons-material/Person';
import ApartmentIcon from '@mui/icons-material/Apartment';
import BuildIcon from '@mui/icons-material/Build';
import NotesIcon from '@mui/icons-material/Notes';

// Custom Utils
import { getAutocompleteSx,   
  fieldClass,
  staticFieldClass,
  staticTextClass,
  fieldLabelClass } from '../../../Utils/autocompleteStyles';  
import { customTheme } from '../../../Utils/customTable';
import { CustomBtn, getButtonConfig } from '../../../Utils/groupbtns';
import { CustomDialog } from '../../../Utils/customDialog'
import { getCurrentLevel } from '../../../Utils/approvalLevelUtils'



// Custom Hooks
import { useJO_h} from '../../../hooks/useJO_h';
import { useRefDepartment } from '../../../hooks/refDepartment'; 
import { useSections } from '../../../hooks/refSection';
import { useJOData } from '../../../hooks/useJO_reducer';
import { useCompanyConfig } from '../../../hooks/useCompanyConfig';
import { useJobOrderApproval } from '../../../hooks/useJobOrderApproval';
import { useApprovalActions } from '../../../Utils/approvalActionHandler';
import { useUsers } from '../../../hooks/useUsers';
import { useApprovalLogs } from '../../../hooks/useApprovalLogs';

// Print utility
import { openJOPrintPreview } from '../../../Utils/printJobOrder';

/**
 * JOFormPage
 * - Standalone route: reads ?docId= from the URL (unchanged behaviour).
 * - Embedded (inside JobOrderDialog): pass the props below.
 *
 * @param {string|null}  docNo          Controlled JO number to display (overrides ?docId=)
 * @param {boolean}      startInCreate  Open directly in Create mode
 * @param {boolean}      embedded       Tighter spacing for dialog use
 * @param {function}     onDocNoChange  Called with the new JO_No after a successful create
 * @param {function}     onModeChange   Called with { isEditing, hasUnsavedChanges }
 * @param {function}     onDataChanged  Called after save / post / approve / reject
 */
export default function JOFormPage({
  docNo: docNoProp,
  startInCreate = false,
  embedded = false,
  onDocNoChange,
  onModeChange,
  onDataChanged,
  ...useProps
}) {

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
    joHeaders, 
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
  // const {joHeaders} = useJO_h();
  const { refDeptData } = useRefDepartment();
  const { refSections } = useSections();
  const departments = refDeptData.map(item => item.Department);
  const sections = refSections.map(item => item.xdesc);

  // get JO data if copyDocNo exists in URL
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const copyDocNo = docNoProp !== undefined ? docNoProp : searchParams.get('docId');
  const isCreatingRef = useRef(false);

  // Approval logs for this JO (used to populate the printable JO's approval/signature section)
  const { approvalLogs } = useApprovalLogs(useProps);
  const joApprovalLogs = (approvalLogs || []).filter(
    (log) =>
      log.TRNO === copyDocNo &&
      (log.Module === 'Job Order' ||
        log.Module === 'Internal Transfer' ||
        log.Module === 'Disposal' ||
        log.Module === 'Asset Accountability' ||
        log.Module === 'Lost Asset')
  );

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
  setRefreshKey(prev => prev + 1);
}, [copyDocNo, forceRefreshJO]);

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
  const currentLevel = getCurrentLevel(baseHeader);

  // Most recent JO (shown as "Last JO created")
  const latestJO = (joHeaders || []).length
    ? [...joHeaders].sort(
        (a, b) =>
          parseInt(String(b.JO_No).split('-').pop() || 0) - parseInt(String(a.JO_No).split('-').pop() || 0)
      )[0]
    : null;


  // Generate Auto JO number based on the company config (db table: user0002inv)
  const { companyConfig, refreshCompanyConfig } = useCompanyConfig(useProps);
  
  const handleHeaderChange = (field, value) => {
    if (field === 'Department_Code') {
      const prev = currentHeader?.Department_Code || currentHeader?.Department || '';
      const hasAssets = (currentJOItems || []).some(r => r.FAC_NO);

      if (prev && prev !== value && hasAssets) {
        const ok = window.confirm(
          'Changing the department will clear the selected assets. Continue?'
          
        );
        if (ok) {
          showToast('Department changed. All selected assets have been cleared.', 'info');
        } else return;

        (currentJOItems || []).forEach(row => {
          ['FAC_NO','FAC_name','qty','UOM','brand','serialno',
          'ItemLocation','StartDate','EndDate'].forEach(f =>
            updateDetailRow(row.id, f, '')
          );
        });
      }
    }
    updateHeaderField(field, value);
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

  // After cancelling, go back to Display mode and reload the shown JO (if any)
  const backToDisplay = useCallback(() => {
    isCreatingRef.current = false;
    if (copyDocNo) getJOData(copyDocNo);
  }, [copyDocNo, getJOData]);

  const handleCancel = () => {
    // Check if there are unsaved changes
    if (state.hasUnsavedChanges) {
      openCancelDialog(); // Open confirmation dialog
    } else {
      cancelEditCreate(); // Cancel directly
      backToDisplay();
    }
  };

  const handleConfirmCancel = () => {
    confirmCancel();
    backToDisplay();
  };
  
  const handleSave = async () => {
    // Validate header fields
    if (!state.createJOHeader?.JO_No) {
      showToast('Job Order number is required');
      return;
    }
    
    if (!state.createJOHeader?.Department && !state.createJOHeader?.Department_Code) {
      showToast('Please select a department');
      return;
    }
    
    if (!state.createJOHeader?.Sector_name) {
      showToast('Please select a maintenance service');
      return;
    }

    if (!state.createJOHeader?.Remarks) {  
      showToast('Remarks field is required');
      return;
    }
    
    // Validate details
    if (!state.createJODetails?.find(item => item.FAC_NO )) {
      showToast('Please select an asset number');
      return;
    }

    if (!state.createJODetails || state.createJODetails.length === 0) {
      showToast('Please add at least one item');
      return;
    }

    if (!state.createJODetails?.find(item => item.workDet )) {
      showToast('Please provide work details for all items');
      return;
    }
    
    if (!state.createJODetails?.find(item => item.TargetDate )) {
      showToast('Please provide Target Date for all items');
      return;
    }
    


  const rows = state.createJODetails || [];
  if (rows.length === 0) {
    showToast('Please add at least one item');
    return;
  }

  // Validate every row, collecting what is missing on each
  const problems = [];
  rows.forEach((row, idx) => {
    const missing = [];
    if (!row.FAC_NO) missing.push('asset');
    if (!row.qty || Number(row.qty) <= 0) missing.push('quantity');
    if (!String(row.workDet || '').trim()) missing.push('work details');
    if (!String(row.TargetDate || '').trim()) missing.push('target date');
    
    if (missing.length) problems.push(`Row ${idx + 1}: ${missing.join(', ')}`);
  });

  if (problems.length > 0) {
    const shown = problems.slice(0, 3).join(' | ');
    const more = problems.length > 3 ? ` (+${problems.length - 3} more rows)` : '';
    showToast(`Please complete: ${shown}${more}`, 'warning');
    return;
  }
    
    // If validation passes, open save confirmation dialog
    openSaveDialog();
  };

  // function to handle successful creation
  const handleSuccessfulCreate = useCallback(async (newJONo) => {
    console.log('Successfully created JO:', newJONo);

    await refreshCompanyConfig();

    isCreatingRef.current = false; // Reset BEFORE switching docNo so it loads
    if (onDocNoChange) {
      onDocNoChange(newJONo);      // dialog mode: parent owns the docNo
    } else {
      setSearchParams({ docId: newJONo });
    }
  }, [setSearchParams, refreshCompanyConfig, onDocNoChange]);


  const handleConfirmSave = async () => {
    // Capture the JO number before saving
    const newJONo = state.createJOHeader?.JO_No;
    const wasCreating = state.isCreating;
    
    // Call the original confirmSave (which calls createJO)
    const saved = await confirmSave();
    
    // If this was a creation and we have a JO number, update the URL
    if (wasCreating && saved && newJONo) {
      await handleSuccessfulCreate(newJONo);
    }
    if (saved) onDataChanged?.();
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
        onDataChanged?.();
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
          showToast(`Job Order Form ${baseHeader.JO_No} is fully approved!`, 'success');
        } else {
          showToast(`Level ${currentLevel} approved successfully. ${currentLevel} of ${totalLevels} levels completed.`, 'success');
        }
      } else {
        showToast(`Job Order ${baseHeader.JO_No} is rejected`, 'error');
      }
      
    // Force refresh the data
    await refreshData();
    
    // Also refresh the parent component's data if needed
    setTimeout(async () => {
      await refreshData(); // Double refresh to ensure data is updated
      onDataChanged?.();
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

  // Open a professional, printable version of this Job Order in a new tab
  const handlePreviewPrint = () => {
    openJOPrintPreview({
      currentHeader,
      currentJOItems,
      docStatus,
      companyConfig,
      userName,
      totalLevels,
      approvalLogs: joApprovalLogs,
    });
  };

  // Dialog: open straight into Create mode once company config is loaded
  const autoCreatedRef = useRef(false);
  useEffect(() => {
    if (!startInCreate || autoCreatedRef.current) return;
    const config = Array.isArray(companyConfig) ? companyConfig[0] : companyConfig;
    if (!config) return; // wait for config (needed for the auto JO number)
    autoCreatedRef.current = true;
    handleCreate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startInCreate, companyConfig]);

  // Let the parent (dialog) know whether we're editing, so it can lock the
  // JO No. selector and warn before closing.
  useEffect(() => {
    onModeChange?.({
      isEditing: !!(state.isCreating || state.isEditing),
      hasUnsavedChanges: !!state.hasUnsavedChanges,
    });
  }, [state.isCreating, state.isEditing, state.hasUnsavedChanges, onModeChange]);

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
    <div className={`w-full min-w-0 mx-auto ${embedded ? 'p-0' : 'p-3'}`}>
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
          confirm={handleConfirmCancel}
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
                ? `Are you sure you want to approve this Job Order: ${baseHeader?.JO_No} ?` 
                : `Are you sure you want to reject this Job Order: ${baseHeader?.JO_No} ? This action cannot be undone.`
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
      <div className={`flex flex-wrap justify-end gap-2 ${embedded ? 'mt-0' : 'mx-2 md:mx-6 lg:mx-16 mt-4 lg:mt-8'}`}>
        
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
        {!state.isEditing && !state.isCreating && currentHeader?.xpost === 0 && (
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
            onClick={handlePreviewPrint}
          >
            Preview
          </CustomBtn>
        )}
      </div>
          
      <div className={`bg-gray-100 rounded-lg shadow ${embedded ? 'p-3 md:p-4 my-2' : 'p-4 md:p-6 lg:p-8 my-4 lg:mx-10'}`}>
        <Box className='flex flex-wrap items-center justify-between w-full gap-2'>
          <h1 className='text-sm font-bold text-gray-800 xl:text-base'>
            {state.isCreating ? 'Creating Job Order' : state.isEditing ? 'Editing Job Order' : 'Display Job Order'}
          </h1>
          <div className='flex flex-wrap text-xs text-gray-500 gap-x-2 md:text-sm'>
            <span>Last JO created :</span>
            <span>{latestJO?.JO_No || '---'}</span>
            <span className='ml-2'>Document Date:</span>
            <span>{latestJO?.xDate ? new Date(latestJO.xDate).toLocaleDateString() : '---'}</span>
          </div>
        </Box>

        {/* Header fields (reusable FormField set): 1 col phone, 2 tablet/laptop, 3 from 1280px */}
        <form className='mt-3' onSubmit={(e) => e.preventDefault()}>
          <FormGrid>
            <FormField label='Job Order No' icon={TagIcon}>
              <FieldValue bold>{currentHeader?.JO_No}</FieldValue>
            </FormField>

            <FormField label='Document Date' icon={EventIcon}>
              <FieldInput
                type='date'
                value={currentHeader?.xDate ? currentHeader.xDate.slice(0, 10) : ''}
                disabled={isReadOnly}
                onChange={(v) => !isReadOnly && updateHeaderField('xDate', v)}
              />
            </FormField>

            <FormField label='Status' icon={FlagIcon}>
              <FieldValue
                bold
                hint={
                  nextLevel && (currentHeader?.xpost === 2 || currentHeader?.xpost === 3)
                    ? `(Level ${currentLevel}/${totalLevels})`
                    : null
                }
              >
                {docStatus(currentHeader?.xpost)}
              </FieldValue>
            </FormField>

            <FormField label='Requested by' icon={PersonIcon}>
              <FieldValue>{currentHeader?.requested_by || userName}</FieldValue>
            </FormField>

            <FormField label='Department' icon={ApartmentIcon} required={!isReadOnly}>
              <FieldAutocomplete
                options={departments}
                value={currentHeader?.Department_Code || currentHeader?.Department || null}
                onChange={(v) => handleHeaderChange('Department_Code', v)}
                disabled={isReadOnly}
                placeholder='Select department'
              />
            </FormField>

            <FormField label='Maintenance' icon={BuildIcon} required={!isReadOnly}>
              <FieldAutocomplete
                options={sections}
                value={currentHeader?.Sector_name || null}
                onChange={(v) => handleHeaderChange('Sector_name', v)}
                disabled={isReadOnly}
                placeholder='Select maintenance service'
              />
            </FormField>

            <FormField label='Remarks' icon={NotesIcon} fullWidth alignTop required={!isReadOnly}>
              <FieldInput
                multiline
                minRows={2}
                maxRows={5}
                value={currentHeader?.Remarks || ''}
                onChange={(v) => handleHeaderChange('Remarks', v)}
                disabled={isReadOnly}
                placeholder='Describe the issue / request'
              />
            </FormField>
          </FormGrid>
        </form>
      </div>
      <ThemeProvider theme={customTheme}>
        <div className={`w-full m-auto rounded-lg ${embedded ? '' : 'px-0 lg:px-10'}`}>
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

    </div>
  )
}