import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';  

// MUI Components
import { Box, Autocomplete, TextField, ThemeProvider , Dialog, Snackbar, Alert} from '@mui/material';

// Components
import DocumentTabs from '../custom Utils/assetMoveTabs';

// Custom Utils
import { getAutocompleteSx } from '../../../Utils/autocompleteStyles';  
import { customTheme } from '../../../Utils/customTable';
import { CustomBtn } from '../../../Utils/groupbtns';
import { CustomDialog } from '../../../Utils/customDialog'

// Custom Hooks
import { useRefDepartment } from '../../../hooks/refDepartment'; 
import { useSections } from '../../../hooks/refSection';
import { useJOData } from '../../../hooks/useJO_reducer';
import { useCompanyConfig } from '../../../hooks/useCompanyConfig';


export default function JOFormPage(useProps) {
  const {
    state,
    getJOData,

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
    confirmSave,         
    confirmCancel,   
    hideSnackbar,     

  } = useJOData();


  // reference data for dropdowns
  const { refDeptData } = useRefDepartment();
  const { refSections } = useSections();
  const departments = refDeptData.map(item => item.Department);
  const sections = refSections.map(item => item.xdesc);

  // get JO data if copyDocNo exists in URL
  const navigate = useNavigate(); // Add this
  const [searchParams, setSearchParams] = useSearchParams();
  const copyDocNo = searchParams.get('docId');
  const isCreatingRef = useRef(false);

  useEffect(() => {
    if (!copyDocNo) return;
    // Don't fetch if we're in the middle of creating a new JO
    if (isCreatingRef.current) return;
    getJOData(copyDocNo);    
  }, [copyDocNo, getJOData]);

  // Status mapping function
  const docStatus = (status) => {
    switch (status) {
      case 0: return 'Draft';
      case 1: return 'Fully Approved';
      case 2: return 'Partially Approved';
      case 3: return 'For Approval';
      case 4: return 'Rejected';
      default: return 'Draft'; // Good practice to handle unexpected values
    }
  }

  const baseHeader = state.selectedJO; // ALWAYS source of truth for status
  // const hidePostBtn =  baseHeader.find(jo => jo.xpost === 4  || (jo.TRNO === copyDocNo && jo.xpost === 0) || jo.xpost === 1)

  const currentHeader = state.isCreating || state.isEditing
          ? state.createJOHeader
          : state.selectedJO;

  const currentJOItems = state.isCreating || state.isEditing
          ? state.createJODetails
          : state.joDetails;

  console.log(`currentHeader`, currentHeader)
  console.log(`currentJOItems`, currentJOItems)
  const canEditDocument = state.isCreating || (state.isEditing && baseHeader?.xpost === 0);

  const isReadOnly = !canEditDocument;

  // Generate Auto JO number based on the company config (db table: user0002inv)
  const { companyConfig, refreshCompanyConfig } = useCompanyConfig(useProps);
  console.log(`companyConfig:`, companyConfig,)
  
  const handleHeaderChange = (field, value) => {
    updateHeaderField(field,value)
  };

  const handleCreate = () => {
    isCreatingRef.current = true;
    const config = Array.isArray(companyConfig) ? companyConfig[0] : companyConfig;
    console.log('Correct config:', config);
    startCreate(config);
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
    
    // Check for empty required fields in details
    const invalidRows = state.createJODetails.filter(row => !row.FAC_NO);
    if (invalidRows.length > 0) {
      alert(`Please select assets for all rows (${invalidRows.length} row(s) missing asset)`);
      return;
    }
    
      // If validation passes, open save confirmation dialog
    openSaveDialog();
  };

   // Add a function to handle successful creation
  const handleSuccessfulCreate = useCallback(async (newJONo) => {
    console.log('Successfully created JO:', newJONo);

    await refreshCompanyConfig();
    
    setSearchParams({ docId: newJONo });
    isCreatingRef.current = false; // Reset the creating flag
  }, [setSearchParams, refreshCompanyConfig]);

  // Modify your confirmSave to handle the new JO number
  const originalConfirmSave = confirmSave;

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
    // Dispatch hide snackbar action
    // You'll need to add this to your hook or directly call hideSnackbar
    hideSnackbar();
  };

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

    console.log(`baseHeader ${baseHeader}`)
    
  return (
    <>
      {/* Dialogs */}
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

      {/* ... B u t t o n s ... */}     
      {/* Edit */}          
      <div className='flex justify-end gap-3 mx-20 my-4'>
        
        {/* Save */}
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
        
        {/* Edit and Cancel */}
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
          {state.isCreating || state.isEditing || !copyDocNo || baseHeader?.xpost === 4 || baseHeader?.xpost !== 1 &&
            <CustomBtn
            variant='postBtn'
            iconType='post'
            title='Post/Approve this document'
            >           
              {baseHeader?.xpost === 0 ? 'Post' : 'Approve'}
            </CustomBtn>
          }
          <CustomBtn
            variant='printBtn'
            iconType='print'
            title='Preview and Print'
          >           
            Preview
          </CustomBtn>
      </div>
          
      <div className='p-6 my-4 bg-gray-100 rounded-lg shadow-lg mx-14'>
        <Box className='flex justify-between w-full h-full gap-1'>
          <h1 className='text-sm font-bold text-gray-800 '>{
            state.isCreating ? 'Creating Job Order' : state.isEditing ? 'Editing Job Order' : 'Display Job Order'
          }
          </h1>
          <div className='flex gap-2'>
            <text className='text-xs text-gray-500'>Last JO created :</text>
            <text className='text-xs text-gray-500'>NNN-JO-0000014</text>
            <text className='text-xs text-gray-500'>Created on:</text>
            <text className='text-xs text-gray-500'>12/23/2026</text>
          </div>
        </Box>
        <form className='mt-8'>
            <label className='text-base font-normal text-gray-500 '>Job Order No : </label>
            <label className='text-base font-semibold text-gray-800 '>{currentHeader?.JO_No || ''}</label> 
            <br/>
            <label className='text-base font-normal text-gray-500 '>Status : </label>
            <label className='text-base font-semibold text-gray-800 '>{docStatus(currentHeader?.xpost)}</label>
            
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
                <label className='text-base font-semibold text-gray-500 '>{currentHeader?.requested_by || ''}</label>
              </div>

              <div className='flex items-start justify-start w-full gap-10 mt-4'>
                <label className='pt-2 text-base text-gray-500 w-28 font-nornal '>Remarks : </label>
                <textarea
                  id = "remarks"
                  disabled={!state.isEditing && !state.isCreating}
                  aria-label = "minimum height"
                  minRows={2}
                  value={currentHeader?.Remarks || ''}
                  onChange={(e) => handleHeaderChange('Remarks', e.target.value)}
                  className={`${!state.isEditing ? 'text-gray-400' : 'text-black'} rounded-sm border-gray-300 `}
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
          <DocumentTabs
            state={state}
            isCreating={state.isCreating}
            isEditing={state.isEditing}
            setIsEditing={state.setIsEditing}
            docStatus={docStatus}
            isReadOnly={isReadOnly}
            currentHeader={currentHeader}
            currentJOItems={currentJOItems}
            updateDetailRow={updateDetailRow}
            addDetailRow={addDetailRow}
          />
        </div>
      </ThemeProvider>

    </>
  )
}