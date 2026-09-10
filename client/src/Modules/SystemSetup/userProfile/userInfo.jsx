import { useMemo } from 'react';
import { TextField, Checkbox, FormControlLabel, InputAdornment, Autocomplete } from '@mui/material';
import { useRefDepartment  } from '../../../hooks/refDepartment';
import { useSections } from '../../../hooks/refSection';

export default function UserInfo({ 
  userData,           // This comes from formData in the reducer
  isEditing, 
  onUserChange,       // This will be updateForm from the reducer
  isCreating,
}) {

  const {refDeptData} = useRefDepartment();
  const {refSections} = useSections();

  const department = useMemo(() => refDeptData.map(item => item.Department), [refDeptData])
  const sections = useMemo(() => refSections.map(item => item.xdesc), [refSections])
  
  const accessLevel = ['Administrator(full access)', 'User']

  const handleChange = (field, value) => {
    if (!isEditing) return;
    
    const updatedData = { ...userData, [field]: value };
    onUserChange(updatedData);  // Just call onUserChange, no need for setFormData
  };

  // Show empty state when no user is selected and not creating
  if (!userData && !isCreating) {
    return (
      <div className='w-full gap-3 p-2 border border-spacing-1'>
        <h1 className='mb-4 text-base text-gray-700 md:text-xl'>User Information</h1>
        <p className='py-8 text-sm text-center text-gray-500 md:text-base'>Select a user to view details</p>
      </div>    
    );
  }

  // If we're creating, use empty object as fallback
  const displayData = userData || {};

  return (
    <div className='w-full gap-3 p-2'>
      <h1 className='mb-4 text-base text-gray-700 md:mb-8 md:text-xl'>
        User Information 
        {isEditing && !isCreating && (
          <span className='ml-2 text-xs text-blue-500 md:text-sm'>(Editing Mode)</span>
        )}
        {isCreating && (
          <span className='ml-2 text-xs text-green-500 md:text-sm'>(Creating New User)</span>
        )}
      </h1>
      
      <div className='flex flex-col gap-4 mb-4'>
        {/* Username and Password Row */}
        <div className='flex flex-wrap gap-2'>
          <TextField
            label="Username"
            variant="outlined"
            size="small"
            className='w-full sm:w-52'
            value={displayData.user || ''}  // Fixed: was userData.userData
            disabled={!isEditing}
            onChange={(e) => handleChange('user', e.target.value)}  // Fixed: was 'userData'
            required={isCreating}
          />
          <TextField
            label="Password"
            variant="outlined"
            size="small"
            className='w-full sm:w-52'
            type="password"
            value={displayData.password || ''}
            disabled={!isEditing}
            onChange={(e) => handleChange('password', e.target.value)}
            required={isCreating}
            // placeholder={!isCreating && !displayData.password ? "••••••••" : ""}
            InputProps={{
              startAdornment: (!isCreating && !displayData.password ) ? (
                <InputAdornment position="start">
                  <span className='text-gray-400'>••••••••</span>
                </InputAdornment>
              ) : null,
            }}
          />
        </div>

        {/* Name Fields */}
        <div className='flex flex-wrap gap-2'>
          <TextField
            label="First Name"
            variant="outlined"
            size="small"
            className='w-full sm:w-80'
            value={displayData.fname || ''}
            disabled={!isEditing}
            onChange={(e) => handleChange('fname', e.target.value)}
          />
          <TextField
            label="Middle Name"
            variant="outlined"
            size="small"
            className='w-full sm:w-80'
            value={displayData.mname || ''}
            disabled={!isEditing}
            onChange={(e) => handleChange('mname', e.target.value)}
          />
        </div>

        <div className='flex flex-wrap gap-2'>
          <TextField
            label="Last Name"
            variant="outlined"
            size="small"
            className='w-full sm:w-80'
            value={displayData.lname || ''}
            disabled={!isEditing}
            onChange={(e) => handleChange('lname', e.target.value)}
          />
        </div>

        {/* Position and Department */}
        <div className='flex flex-wrap gap-2'>
          <TextField
            label="Position"
            variant="outlined"
            size="small"
            className='w-full sm:w-64'
            value={displayData.xPosi || ''}
            disabled={!isEditing}
            onChange={(e) => handleChange('xPosi', e.target.value)}
          />
          <Autocomplete
            size="small"            
            options={department}  
            value={displayData.xDept || ''}
            onChange={(e, newValue) => handleChange('xDept', newValue)}
            disabled={!isEditing}
            renderInput={(params) => (
              <TextField {...params} label="Department"   placeholder="Department" />
            )}
            sx={{ width: { xs: '100%', sm: '15rem' }, marginRight: { sm: '1rem' } }}
          />
        </div>

        {/* Access Level and Section */}
        <div className='flex flex-wrap gap-2'>
          <Autocomplete
            size="small"           
            options={accessLevel}  
            value={displayData.xlevel || ''}
            onChange={(e, newValue) => handleChange('xlevel', newValue)}
            disabled={!isEditing}
            renderInput={(params) => (
              <TextField {...params} label="Access Level"   placeholder="Access Level" />
            )}
            sx={{ width: { xs: '100%', sm: '20rem' }, marginRight: { sm: '1rem' } }}
          />
          <Autocomplete
            size="small"           
            options={sections}  
            value={displayData.xSection || ''}
            onChange={(e, newValue) => handleChange('xSection', newValue)}
            disabled={!isEditing}
            renderInput={(params) => (
              <TextField {...params} label="Maintenance"   placeholder="Maintenance" />
            )}
            sx={{ width: { xs: '100%', sm: '20rem' }, marginRight: { sm: '1rem' } }}
          />

        </div>

        {/* Checkboxes - Add more if needed */}
        <div className='flex gap-4'>
          <FormControlLabel
            control={
              <Checkbox
                checked={displayData.Approver === 1}
                disabled={!isEditing}
                onChange={(e) => handleChange('Approver', e.target.checked ? 1 : 0)}
              />
            }
            label="Approver"
          />
        </div>
      </div>
    </div>
  );
}