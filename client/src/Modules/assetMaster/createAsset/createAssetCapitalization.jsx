import Reac, {useState, useEffect} from 'react';
import { NumericFormat } from 'react-number-format';
import {
  Typography,
  TextField, 
  Autocomplete,
  Box,
  Checkbox,
  FormControlLabel, 
  Alert,
  CircularProgress  
} from '@mui/material';

//Custom Hooks
import { useRefUom } from '../../../hooks/refUom'; // import the refUnit data
import { useRefCategory } from '../../../hooks/refCategory';
import { useRefItemClass } from '../../../hooks/refClass';
import { useRefLocation } from '../../../hooks/refLocation'; 
import { useRefDepartment } from '../../../hooks/refDepartment'; 
import formatWithCommas from '../../../Utils/formatWithCommas';
import formatDateForInput from '../../../Utils/formatDateForInput';

export default function CreateAssetCapitalization({
  asset,
  updateAssetData,
  originalAsset,
  loading,
  error
}) {
  const { uomData } = useRefUom();
  const {refCategoryData} = useRefCategory();
  const {refItemClassData} = useRefItemClass();
  const {refDeptData} = useRefDepartment();
  const {refLocData} = useRefLocation();

  const [uomOptions, setUomOptions] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [itemClassOptions, setItemClassOptions] = useState([]);
  const [locationOptions, setLocationOptions] = useState([]);
  const [departmentOptions, setDepartmentOptions] = useState([]);
  

  useEffect(() => {
    if (uomData && Array.isArray(uomData)){
      setUomOptions(uomData.map(item => item.Unit).filter(Boolean));
    }
  }, [uomData]);


  useEffect(() => {
    if (refCategoryData && Array.isArray(refCategoryData)) {
      setCategoryOptions(refCategoryData.map(item => item.category).filter(Boolean));
    }
  }, [refCategoryData]);

  useEffect(() => {
    if (refItemClassData && Array.isArray(refItemClassData)) {
      setItemClassOptions(refItemClassData.map(item => item.itemClass).filter(Boolean));
    }
  }, [refItemClassData]);

  useEffect(() => {
    if (refLocData && Array.isArray(refLocData)) {
      setLocationOptions(refLocData.map(item => item.LocationName).filter(Boolean));
    }
  }, [refLocData]);

  useEffect(() => {
    if (refDeptData && Array.isArray(refDeptData)) {
      setDepartmentOptions(refDeptData.map(item => item.Department).filter(Boolean));
    }
  }, [refDeptData]);

  if (loading) return (
    <Box className='flex justify-center p-5'>
      <CircularProgress />
      <Typography className="p-5">Loading reference data...</Typography>
    </Box>
  );

  if (error) return (
    <Box className='p-5'>
      <Alert severity="error">Error loading data: {error}</Alert>
    </Box>
  );

  const handleInputChange = (field, value) => {
    updateAssetData({ [field]: value });
  };

  return (
    <div className='grid justify-center gap-2 mt-10'>
      <Typography variant="h6" gutterBottom>
        Asset Capitalization 
      </Typography>

      {/* ... Asset Class and Category ... */}
      <Autocomplete
        key = {`Asset Category`}
        sx={{ width: '50rem', marginTop: '1rem'}}
        margin="normal" 
        options = {categoryOptions}  
        value = {asset.CATEGORY || ''}       
        onChange={(event, newValue) => handleInputChange('CATEGORY', newValue)}
        renderInput={(params) => (
          <TextField 
            {...params} 
            label="Category" 
            placeholder="Select Category" 
            sx ={{'& .MuiInputBase-input': { fontSize: '.9rem'}}}
            required
          />              
        )}       
        freeSolo   
      />

      <Autocomplete
        key = {`Asset Class`}
        sx={{ width: '50rem', marginTop: '1rem'}}
        margin="normal" 
        options = {itemClassOptions}  
        value = {asset.ItemClass || ''}       
        onChange={(event, newValue) => handleInputChange('ItemClass', newValue)}
        renderInput={(params) => (
          <TextField {...params} 
            label="Asset Class" 
            placeholder="Asset Class" 
            sx ={{'& .MuiInputBase-input': { fontSize: '.9rem'}}}
            required
          />              
        )} 
        freeSolo
      />

      {/*  ... Acquired Date, UOM, and Quantity ... */}

      <Box className="flex justify-start gap-2">
        <TextField
          label="Acquisition Date"
          sx={{ 
            width: '16rem',
            color: 'gray',
            "& .MuiInputBase-input": {
            color: "gray",
            }
          }}
          type="date"
          margin="normal" 
          value={asset.Adate || ''}  //TODO: update the dataformat
          onChange={(e) => handleInputChange('Adate', e.target.value)}
          InputLabelProps={{ shrink: true }}   
          required         
        />

        <Autocomplete
          key = {`Unit of Measure`}
          sx={{ width: '10rem', marginTop: '1rem'}}
          margin="normal" 
          options = {uomOptions}  
          value = {asset.Unit || []}      
          onChange={(e, newValue) => handleInputChange('Unit', newValue)}
          renderInput={(params) => (
            <TextField {...params} 
              label="UOM" 
              placeholder="UOM" 
              sx ={{'& .MuiInputBase-input': { fontSize: '14px'}}}
            />              
          )}          
        />

        <TextField
          label="Quantity"
          sx={{ width: '15rem' }}
          margin="normal" 
          value={asset.balance_unit || 1}
          onChange={(e) => handleInputChange('balance_unit', e.target.value)} 
          InputProps={{ inputProps: { min: 1 } }}
        />

        <FormControlLabel
          control={
            <Checkbox
              // checked={asset.splitAsset || 0}
              // onChange={(e) => handleInputChange('splitAsset',e.target.checked ? 1 : 0)}
              sx={{ color: 'gray' }}
            />
          }
          label="Split Asset"
          sx={{ color: 'gray' }}
        />
      </Box>

      {/* ... Acquired Value, Residual Value, and Life in Years ... */}

      <Box className="flex justify-start gap-2">
        <NumericFormat
          customInput={TextField}
          label="Acquired Value"
          sx={{ width: '18rem' }}
          margin="normal" 
          thousandSeparator=","
          allowNegative={false}
          decimalScale={2}
          value={asset.AAmount || ''}
          onChange={(e) => handleInputChange('AAmount', e.target.value)} 
          InputProps={{ inputProps: { min: 1 } }}
          required
        />

        <NumericFormat
          customInput={TextField}
          label="Residual Value"
          sx={{ width: '18rem' }}
          margin="normal" 
          thousandSeparator=","
          allowNegative={false}
          decimalScale={2}
          value={asset.Abre || ''}
          onChange={(e) => handleInputChange('Abre', e.target.value)} 
          InputProps={{ inputProps: { min: 1 } }}
        />

        <NumericFormat
          customInput={TextField}
          label="Life in years"
          sx={{ width: '10rem' }}
          margin="normal" 
          thousandSeparator=","
          allowNegative={false}
          decimalScale={2}
          value={asset.Percent || 1}
          onChange={(e) => handleInputChange('Percent', e.target.value)} 
          InputProps={{ inputProps: { min: 1 } }}
          required
        />
      </Box>

      {/*  ... Department and Locations ... */}
      <Autocomplete
        key = {`Department`}
        sx={{ width: '50rem', marginTop: '1rem'}}
        margin="normal" 
        options = {departmentOptions}  
        value = {asset.Department || ''}       
        onChange={(event, newValue) => handleInputChange('Department', newValue)}
        renderInput={(params) => (
          <TextField {...params} 
            label="Department" 
            placeholder="Department" 
            sx ={{'& .MuiInputBase-input': { fontSize: '.9rem'}}}
          />              
        )}          
      />

      <Autocomplete
        key = {`Location`}
        sx={{ width: '50rem', marginTop: '1rem'}}
        margin="normal" 
        options = {(locationOptions)}  
        value = {asset.ItemLocation || ''}    
        onChange={(event, newValue) => handleInputChange('ItemLocation', newValue)}        
        renderInput={(params) => (
          <TextField {...params} 
            label="Location" 
            placeholder="Location" 
            sx ={{'& .MuiInputBase-input': { fontSize: '.9rem'}}}
          />              
        )}      
      />
    </div>
  );
}