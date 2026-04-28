import { useState } from 'react';

// MUI Components
import { Box, Autocomplete, TextField, TextareaAutosize, ThemeProvider } from '@mui/material';

// Components
import AssetMoveTabs from '../custom Utils/assetMoveTabs';

// Custom Utils
import { getAutocompleteSx } from '../../../Utils/autocompleteStyles';  
import { customTheme } from '../../../Utils/customTable';
import { CustomBtn } from '../../../Utils/groupbtns';

// Custom Hooks
import { useRefDepartment } from '../../../hooks/refDepartment'; 
import { useSections } from '../../../hooks/refSection';
import { useJO_h } from '../../../hooks/useJO_h';
import { useJO_d } from '../../../hooks/useJO_d';
import { useApprovalLogs } from '../../../hooks/useApprovalLogs';

export default function JOFormPage(useProps) {
  const { refDeptData } = useRefDepartment();  
  const { refSections } = useSections();
  const { approvalLogs } = useApprovalLogs(useProps);


  const [ department, setDepartment ] = useState('');
  const [ section, setSection ] = useState('');
  const [ remarks, setRemarks ] = useState('');
  const [ isEditing, setIsEditing ] = useState(false);
  const [ viewApprovers, setViewApprovers] = useState({});

  const handleEditButton = () => {
    setIsEditing(prev => !prev)
  }

  const departments = refDeptData.map(item => item.Department);
  const sections = refSections.map(item => item.xdesc);

  const handleChange = (field, value) => {
    if (field === 'Department') {
      setDepartment(value);
    } else if (field === 'Section') {
      setSection(value);
    } else if (field === 'Remarks') {
      setRemarks(value);
    }
  }

  return (
    <>
      {/* ... B u t t o n s ... */}     
      {/* Edit */}          
      <div className='flex justify-end gap-3 mx-20 my-4'>
        
        {/* Save */}
        {isEditing && (
          <CustomBtn
            variant='saveBtn'
            iconType='save'
            title='Save Changes'
            // onClick={handleSave}
          >
            Save
          </CustomBtn>
        )}
        
        {/* Edit and Cancel */}
          <CustomBtn
            variant= {`${isEditing? 'cancelBtn' : 'editBtn' }`}
            iconType={`${isEditing? 'cancel' : 'edit'}`}
            title={isEditing? 'Cancel Edit' : 'Enable Edit'}
            onClick={handleEditButton}
          >
            {isEditing ? 
              <><span>Cancel </span></>:
              <><span>Edit</span></>
            }
          </CustomBtn>
          {/*  Create , Post, and Preview */}
          <CustomBtn
            variant='createBtn'
            iconType='add'
            title='Create New JO'
            onClick={handleEditButton}   
            disabled={isEditing}         
          >           
            Create
          </CustomBtn>
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
            <label className='text-base font-semibold text-gray-800 '>NNN-JO-0000014</label>
            <br/>
            <label className='text-base font-normal text-gray-500 '>Status : </label>
            <label className='text-base font-semibold text-gray-800 '>Posted - For Approval</label>
            
            <Box className='mt-2 '>


              <div className='flex items-center justify-start w-full gap-10 mt-4'>
                <label className='text-base font-normal text-gray-500 w-28 '>Department :</label>
                <Autocomplete 
                  disabled={!isEditing} 
                  className={`rounded-sm ${!isEditing ? 'border' : 'border-none' } border-gray-300 w-48`}
                  size = 'small'
                  options= {departments} 
                  value={department || ''}  
                  onChange={(e, newValue) => handleChange('Department', newValue)}
                  renderInput={(params) => (
                    <TextField {...params} 
                      sx={getAutocompleteSx(isEditing)}
                    />              
                  )} 
                />
                <label className='text-base font-normal text-gray-500 w-38 '>Maintenance Service :</label>
                <Autocomplete 
                  disabled={!isEditing} 
                  className={`rounded-sm ${!isEditing ? 'border' : 'border-none' } border-gray-300 w-72`}
                  size = 'small'
                  options= {sections} 
                  value={section || ''}
                  onChange={(e, newValue) => handleChange('Section', newValue)}
                  renderInput={(params) => (
                    <TextField {...params} 
                      sx={getAutocompleteSx(isEditing)}
                    />              
                  )} 
                />
                <label className='text-base font-normal text-gray-500 w-28 '>Requested by : </label>
                <label className='text-base font-semibold text-gray-500 '>mcagulada</label>
              </div>

              <div className='flex items-start justify-start w-full gap-10 mt-4'>
                <label className='pt-2 text-base text-gray-500 w-28 font-nornal '>Remarks : </label>
                <textarea
                  id = "remarks"
                  disabled={!isEditing} 
                  aria-label = "minimum height"
                  minRows={2}
                  value={remarks || ''}
                  onChange={(e) => handleChange('Remarks', e.target.value)}
                  className={`${!isEditing ? 'text-gray-400' : 'text-black'} rounded-sm border-gray-300 `}
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
          <AssetMoveTabs
            isEditing={isEditing}
            setIsEditing={setIsEditing}
          />
        </div>
      </ThemeProvider>

    </>
  )
}