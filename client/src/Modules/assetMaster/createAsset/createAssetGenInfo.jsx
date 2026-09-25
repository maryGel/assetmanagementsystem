import { useState, useEffect, useMemo } from 'react';
import {
  Typography,
  Box,
  TextField,
  TextareaAutosize,
  Autocomplete,
  Alert,
  CircularProgress
} from '@mui/material';
// Custom hooks
import { useRefBrand } from '../../../hooks/refBrand';
import { useColors } from '../../../hooks/refColor';
import { useSuppliers } from '../../../hooks/refSupp';
/* --------------------------------------------------
   G E N E R A L   I N F O   C O M P O N E N T
---------------------------------------------------- */

export default function CreateAssetGenInfo({
  asset,
  updateAssetData,
  loading,
  error
}) {
  const { refBrandData } = useRefBrand();
  const { refColors } = useColors(); 
  const { refSuppliers } = useSuppliers();
  const [brandOptions, setBrandOptions] = useState([]);

  useEffect(() => {
    if (refBrandData && Array.isArray(refBrandData)) {
      setBrandOptions(refBrandData.map((item) => item.BrandName).filter(Boolean));
    }
  }, [refBrandData]);


  const colorOptions = useMemo(() => {
    const names = Array.isArray(refColors)
      ? refColors.map((c) => c.ColName).filter(Boolean)
      : [];
    return asset.Color && !names.includes(asset.Color) ? [asset.Color, ...names] : names;
  }, [refColors, asset.Color]);

  const supplierOptions = useMemo(() => {
    const names = Array.isArray(refSuppliers)
      ? refSuppliers.map((s) => s.suppName).filter(Boolean)
      : [];
    return asset.suppName && !names.includes(asset.suppName) ? [asset.suppName, ...names] : names;
  }, [refSuppliers, asset.suppName]);

  if (loading) return (
    <Box className='flex justify-center p-5'>
      <CircularProgress />
      <Typography className="p-5">Loading asset data...</Typography>
    </Box>
  );

  if (error) return (
    <Box className='p-5'>
      <Alert severity="error">Error loading asset data: {error}</Alert>
    </Box>
  );

  const handleInputChange = (field, value) => {
    updateAssetData({ [field]: value });
  };

  return (
    <Box className='flex justify-center p-4 m-4'>
      <Box className='grid mt-10 '>
        <Typography variant="h6" gutterBottom>
          General Information
        </Typography>

        {/* ... Asset Name, and Description ... */}
        <TextField
          label={'Asset Name'}
          sx={{ width: '60rem' }}
          margin="normal"
          value={asset.FacName || ''}
          onChange={(e) => handleInputChange('FacName', e.target.value)}
          required
        />
        <label className='pt-4 pl-3 text-gray-500' htmlFor="asset-description">Asset Description * </label>
        <TextareaAutosize
          id="asset-description"
          aria-label="minimum height"
          minRows={2}
          value={asset.Description || ''}
          onChange={(e) => handleInputChange('Description', e.target.value)}
          style={{
            width: '60rem',
            resize: 'both',
            color: 'black',
            padding: '1rem',
            border: '1px solid #ccc',
            marginTop: '.5rem'
          }}
        />

        {/* ... Serial Number and Brand ... */}
        <Box className="flex gap-2">
          <TextField
            label={'Serial Number'}
            sx={{ width: '30rem' }}
            margin="normal"
            value={asset.serialNo || ''}
            onChange={(e) => handleInputChange('serialNo', e.target.value)}
          />

          <Autocomplete
            key="Brand"
            sx={{ width: '25rem', marginTop: '1rem' }}
            options={brandOptions}
            value={asset.Brand || null}
            onChange={(event, newValue) => handleInputChange('Brand', newValue || '')}
            renderInput={(params) => (
              <TextField {...params} label="Brand" placeholder="Brand" />
            )}
          />
        </Box>

        {/* ... Supplier and Reference ... */}
        <Autocomplete
          key="Supplier"
          id="supplier-autocomplete"
          label={'Supplier'}
          sx={{ width: '60rem' }}
          options={supplierOptions}
          margin="normal"
          value={asset.suppName || ''}
          onChange={(e) => handleInputChange('suppName', e.target.value)}
          renderInput={(params) => (
              <TextField {...params} label="Supplier" placeholder="Supplier" />
            )}
        />

        <TextField
          label="Reference No."
          sx={{ width: '60rem' }}
          margin="normal"
          value={asset.ReferenceNo || ''}
          onChange={(e) => handleInputChange('ReferenceNo', e.target.value)}
          required
        />

        {/* ... Color and Warranty Dates ... */}
        <Box className='flex gap-2'>
          <Autocomplete
            key="Color"
            sx={{ width: '14rem', marginTop: '1rem' }}
            options={colorOptions}
            value={asset.Color || null}
            onChange={(event, newValue) => handleInputChange('Color', newValue || '')}
            renderInput={(params) => (
              <TextField {...params} label="Color" placeholder="Color" />
            )}
          />
          <TextField
            label="Warranty Start date"
            sx={{
              width: '16rem',
              color: 'gray',
              '& .MuiInputBase-input': { color: 'gray' }
            }}
            type="date"
            margin="normal"
            value={asset.StartDate || ''}
            onChange={(e) => handleInputChange('StartDate', e.target.value)}
            InputLabelProps={{ shrink: true }}
          />

          <TextField
            label="Warranty End date"
            sx={{
              width: '16rem',
              color: 'gray',
              '& .MuiInputBase-input': { color: 'gray' }
            }}
            type="date"
            margin="normal"
            value={asset.EndDate || ''}
            onChange={(e) => handleInputChange('EndDate', e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        </Box>
      </Box>
    </Box>
  );
}