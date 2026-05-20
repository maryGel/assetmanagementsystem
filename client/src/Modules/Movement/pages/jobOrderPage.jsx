import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

// MUI Components
import { Box, Autocomplete, TextField, TextareaAutosize, ThemeProvider } from '@mui/material';

// Components
import DocumentTabs from '../custom Utils/assetMoveTabs';

// Custom Utils
import { getAutocompleteSx } from '../../../Utils/autocompleteStyles';  
import { customTheme } from '../../../Utils/customTable';
import { CustomBtn } from '../../../Utils/groupbtns';

// Custom Hooks
import { useRefDepartment } from '../../../hooks/refDepartment'; 
import { useSections } from '../../../hooks/refSection';
import { useJOData } from '../../../hooks/useJO_reducer';
import { useJO_h } from '../../../hooks/useJO_h';
import { useJO_d } from '../../../hooks/useJO_d';
import { useApprovalLogs } from '../../../hooks/useApprovalLogs';
import { docHeaderFields } from '../custom Utils/docMasterFields';
import { set } from 'date-fns';

export default function JOFormPage(useProps) {
  const {
    state,

    getJOData,
    createJO,

    startCreate,
    startEdit,
    cancelEditCreate,

    addDetailRow,
    updateHeaderField,
    updateDetailRow,  
    removeDetailRow,

  } = useJOData();

  const [searchParams] = useSearchParams();
  const copyDocNo = searchParams.get('docId');
  
  const { refDeptData } = useRefDepartment();
  const { refSections } = useSections();
  const departments = refDeptData.map(item => item.Department);
  const sections = refSections.map(item => item.xdesc);

  console.log(`copyDocNo: ${copyDocNo}`)
  useEffect(() => {
    if (!copyDocNo) return;
    getJOData(copyDocNo);    
  }, [copyDocNo, getJOData]);

  const docStatus = (status) => {
    switch (status) {
      case 0:
        return 'Draft';
      case 1:
        return 'Fully Approved';
      case 2:
        return 'Partially Approved';
      case 3:
        return 'For Approval';
      case 4:
        return 'Rejected';
      default:
        return 'Draft'; // Good practice to handle unexpected values
    }
  }

  const baseHeader = state.selectedJO; // ALWAYS source of truth for status
    // console.log(`parent: baseHeader: ${baseHeader.xpost}`)

  const currentHeader = state.isCreating || state.isEditing
          ? state.createJOHeader
          : state.selectedJO;
  

  const currentJOItems = state.isCreating || state.isEditing
          ? state.createJODetails
          : state.joDetails;
  
  const handleHeaderChange = (field, value) => {
    updateHeaderField(field,value)
  };

  const handleCreate = () => {
   startCreate();
  };
  const handleEdit = () => {
    if (!copyDocNo) return;
    startEdit(copyDocNo);
  };
  const handleCancel = () => {
    cancelEditCreate();
  };
  const handleSave = async () => {
    await createJO(
      state.createJOHeader,
      state.createJODetails
    );
  };

  return (
    <>
      {/* ... B u t t o n s ... */}     
      {/* Edit */}          
      <div className='flex justify-end gap-3 mx-20 my-4'>
        
        {/* Save */}
        {(state.isCreating || state.isEditing) && (
          <CustomBtn
            variant='saveBtn'
            iconType='save'
            onClick={handleSave}
          >
            Save
          </CustomBtn>
        )}
        
        {/* Edit and Cancel */}
        {!state.isEditing && !state.isCreating && copyDocNo && (
            <CustomBtn
              variant='editBtn'
              iconType='edit'
              onClick={handleEdit}
            >
              Edit
            </CustomBtn>       
        )}
        {!state.isEditing && !state.isCreating && (
          <CustomBtn
            variant='createBtn'
            iconType='add'
            onClick={handleCreate}
          >
            Create
          </CustomBtn>
        )}
        
        {(state.isEditing || state.isCreating) && (
          <CustomBtn
            variant='cancelBtn'
            iconType='cancel'
            onClick={handleCancel}
          >
            Cancel
          </CustomBtn>
        )}
          <CustomBtn
            variant='postBtn'
            iconType='post'
            title='Post this document'
          >           
            Post
          </CustomBtn>
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
          <h1 className='text-sm font-bold text-gray-800 '>Display Job Order</h1>
          <div className='flex gap-2'>
            <text className='text-xs text-gray-500'>Last JO created :</text>
            <text className='text-xs text-gray-500'>NNN-JO-0000014</text>
            <text className='text-xs text-gray-500'>Created on:</text>
            <text className='text-xs text-gray-500'>12/23/2026</text>
          </div>
        </Box>
        <form className='mt-8'>
            <label className='text-base font-normal text-gray-500 '>Job Order No : </label>
            <label className='text-base font-semibold text-gray-800 '>{currentHeader?.JO_No}</label> 
            <br/>
            <label className='text-base font-normal text-gray-500 '>Status : </label>
            <label className='text-base font-semibold text-gray-800 '>{docStatus(currentHeader?.xpost)}</label>
            
            <Box className='mt-2 '>


              <div className='flex items-center justify-start w-full gap-10 mt-4'>
                <label className='text-base font-normal text-gray-500 w-28 '>Department :</label>
                <Autocomplete 
                  variant='body2'
                  disabled={!state.isEditing && !state.isCreating}
                  className={`rounded-sm ${!state.isEditing && !state.isCreating ? 'border' : 'border-none bg-white'} border-gray-300 w-80`}
                  size = 'small'
                  options= {departments} 
                  value={currentHeader?.Department_Code || currentHeader?.Department  || '' }
                  onChange={(e, newValue) => handleHeaderChange('Department', newValue)}
                  renderInput={(params) => (
                    <TextField {...params} 
                      sx={getAutocompleteSx(state.isEditing || state.isCreating)}
                    />              
                  )} 
                />
                <label className='text-base font-normal text-gray-500 w-38 '>Maintenance Service :</label>
                <Autocomplete 
                  disabled={!state.isEditing && !state.isCreating}
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
            isEditing={state.isEditing}
            setIsEditing={state.setIsEditing}
            docStatus={docStatus}
            baseHeader={baseHeader}
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