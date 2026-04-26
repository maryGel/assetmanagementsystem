import { useState } from 'react';
import { Autocomplete, TextField } from '@mui/material';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import ChecklistIcon from '@mui/icons-material/Checklist';
import CloseIcon from '@mui/icons-material/Close';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import DescriptionIcon from '@mui/icons-material/Description';
import ChecklistRtlIcon from '@mui/icons-material/ChecklistRtl';


export const statusFilter = [
  {id: 1, status: 'Waiting', icon: <AccessTimeIcon fontSize='small' className='text-slate-400'/>},
  {id: 2, status: 'Fully Approved', icon: <DoneAllIcon fontSize='small' className='text-green-600'/>},
  {id: 3, status: 'Rejected', icon: <CloseIcon fontSize='small' className='text-red-600'/>},
  {id: 4, status: 'All', icon:<ChecklistIcon fontSize='small' className='text-green-600'/> }
]

export const evalStatus = [
  {id: 1, status: 'Pending', icon: <DescriptionIcon fontSize='small'/>},
  {id: 3, status: 'Completed', icon: <ChecklistRtlIcon fontSize='small'/>}
]

export const maintStatus = [
  {id: 1, status: 'Open JOs', icon:  <DescriptionIcon fontSize='small'/>},
  {id: 2, status: 'Completed', icon:  <DoneAllIcon fontSize='small'/>}
]
export const borderColor = (xpost, disapproved) => {

  if (disapproved === 1) return "border-red-600";
  if (xpost === 1) return "border-green-600";
  if (xpost === 3 && xpost === 2) return "border-slate-200";
  return "";
};
  
    
export const docStatus = (xpost, disapproved) => {
    
  if(xpost === 1 && !disapproved) return (
    <div className='flex items-center '>  
      <span className='text-xs tracking-wide text-green-500'>Fully Approved</span>          
    </div>
  );

  if(xpost === 2 && !disapproved) return (
    <div className='flex items-center mx-1'> 
      <span className='text-xs tracking-wide'>Partially Approved</span>          
    </div>
  );

  if(xpost === 3  && !disapproved) return (
    <div className='flex items-center mx-1'>     
      <span className='text-xs tracking-wide text-yellow-600'>Pending</span>          
    </div>
  );

  if(xpost === 3 && disapproved === 1) return (
    <div className='flex items-center mx-1'>     
      <span className='text-xs tracking-wide text-red-600'>Rejected</span>          
    </div>
  );
} 

// Destructure props here for cleaner access
function CustomFilter({ options, value, getOptionLabel, onChange, label }) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <Autocomplete
      multiple
      limitTags={1}
      options={options}
      value={value}
      onChange={onChange}
      getOptionLabel={getOptionLabel}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      size="small"
      // Prevent the dropdown list from being bulky
      ListboxProps={{
        sx: {
          "& .MuiAutocomplete-option": {
            fontSize: "12px",
            minHeight: "28px",
            padding: "4px 8px",
          },
        },
      }}
      // Use ChipProps to ensure the tags don't get too wide
      ChipProps={{ 
        size: "small",
        sx: { fontSize: '11px', height: '20px', maxWidth: isFocused ? '120px' : '80px' }
      }}
      sx={{
        // DYNAMIC WIDTH LOGIC
        width: 'auto', 
        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        backgroundColor: 'white',
        borderRadius: '4px',

        "& .MuiOutlinedInput-root": {
          flexWrap: "nowrap", // Crucial: Keeps chips on one line
          overflow: "auto",
          paddingRight: '30px !important', // Leaves room for the arrow
        },

      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          sx={{
            "& .MuiInputLabel-root": { fontSize: "0.75rem" },
            "& .MuiInputBase-input": { fontSize: "0.8rem" }
          }}
        />
      )}
    />
  );
}

export default CustomFilter;