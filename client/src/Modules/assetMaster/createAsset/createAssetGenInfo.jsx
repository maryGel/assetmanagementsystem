import { useMemo } from 'react';
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
import { useRefCategory } from '../../../hooks/refCategory';
import { useRefItemClass } from '../../../hooks/refClass';


// Builds a clean option list from a reference table
const toOptions = (data, key) =>
  Array.isArray(data) ? data.map((item) => item[key]).filter(Boolean) : [];

/* --------------------------------------------------
   G E N E R A L   I N F O   C O M P O N E N T
---------------------------------------------------- */

export default function CreateAssetGenInfo({
  asset,
  updateAssetData,
  loading,
  error,
  facNOLoading,
  autoNumbering = true
}) {
  const { refBrandData } = useRefBrand();
  const { refColors } = useColors(); 
  const { refSuppliers } = useSuppliers();
    const { refCategoryData } = useRefCategory();
  const { refItemClassData } = useRefItemClass();
  const brandOptions = refBrandData ?? [];
  const supplierOptions = refSuppliers ?? [];

  const categoryOptions = useMemo(() => toOptions(refCategoryData, 'category'), [refCategoryData]);

  const itemClassOptions = useMemo(() => {
  if (!asset.CATEGORY || !Array.isArray(refItemClassData)) return [];
  return refItemClassData
    .filter((item) => item.category === asset.CATEGORY)
    .map((item) => item.itemClass)
    .filter(Boolean);
  }, [refItemClassData, asset.CATEGORY]);


  const colorOptions = useMemo(() => {
    const names = Array.isArray(refColors)
      ? refColors.map((c) => c.ColName).filter(Boolean)
      : [];
    return asset.Color && !names.includes(asset.Color) ? [asset.Color, ...names] : names;
  }, [refColors, asset.Color]);



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

  // Changing the category can orphan the previously chosen class
  // (e.g. switching from "IT Equipment" to "Furniture" while "Laptop" is selected).
  const handleCategoryChange = (newCategory) => {
    const stillValid = refItemClassData?.some(
      (item) => item.category === newCategory && item.itemClass === asset.ItemClass
    );
    updateAssetData({
      CATEGORY: newCategory,
      ItemClass: stillValid ? asset.ItemClass : ''
    });
  };

  const selectSx = { 
    width: '60rem',
    resize: 'both',
    color: 'black',
    marginTop: '1rem' };
    
  const inputSx = { '& .MuiInputBase-input': { fontSize: '.9rem' } };
  
  return (
    <Box className='flex justify-center p-4 m-4'>
      <Box className='grid mt-10 '>
        <Typography variant="h6" gutterBottom>
          General Information
        </Typography>

        {/* ... Category (drives the asset number) and Asset Number ... */}
        <Autocomplete
          key="Asset Category"
          sx={selectSx}
          options={categoryOptions}
          value={asset.CATEGORY || null}
          onChange={(event, newValue) => handleCategoryChange(newValue || '')}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Category"
              placeholder="Select Category"
              sx={inputSx}
              required
            />
          )}
        />
  
        {autoNumbering ? (
          <TextField
            label="Asset Number"
            sx={selectSx}
            value={facNOLoading ? 'Generating...' : asset.FacNO || ''}
            helperText={
              asset.FacNO
                ? 'Generated from the category code'
                : 'Select a category to generate the asset number'
            }
            InputProps={{ readOnly: true }}
            InputLabelProps={{ shrink: true }}
          />
        ) : (
          <TextField
            label="Asset Number"
            sx={selectSx}
            value={asset.FacNO || ''}
            onChange={(e) => handleInputChange('FacNO', e.target.value)}
            helperText="Auto-numbering is off. Enter a unique asset number."
            InputLabelProps={{ shrink: true }}
            required
          />
        )}
  
        <Autocomplete
          key="Asset Class"
          sx={selectSx}
          options={itemClassOptions}
          value={asset.ItemClass || null}
          onChange={(event, newValue) => handleInputChange('ItemClass', newValue || '')}
          disabled={!asset.CATEGORY}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Asset Class"
              placeholder={asset.CATEGORY ? 'Asset Class' : 'Select a category first'}
              helperText={
                asset.CATEGORY && itemClassOptions.length === 0
                  ? 'No asset classes are set up for this category yet'
                  : ' '
              }
              sx={inputSx}
              required
            />
          )}
        />

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
            sx={{ width: '100%' }}
            margin="normal"
            onChange={(e) => handleInputChange('serialNo', e.target.value)}
          />

          <Autocomplete
            key="Brand"
            id="brand-autocomplete"
            options={brandOptions}
            sx={{ width: '100%', marginTop: '1rem' }}
            margin="normal"
            value={brandOptions.find((brand) => brand.BrandName === asset.Brand) ?? null}
            getOptionLabel={(brand) => `${brand.BrandID} - ${brand.BrandName} `}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            onChange={(_, brand) =>
              handleInputChange('Brand', brand?.BrandName ?? '')
            }
            renderInput={(params) => <TextField {...params} label="Brand" />}
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
          getOptionLabel={(supplier) => `${supplier.suppID} - ${supplier.suppName} `}
          value={supplierOptions.find((supplier) => supplier.suppName === asset.suppName) ?? null}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          onChange={(_, supplier) => 
            handleInputChange('suppName', supplier?.suppName ?? '')}
          renderInput={(params) => (
              <TextField {...params} label="Supplier" placeholder="Supplier" />
            )}
        />


        {/* ... Color and Warranty Dates ... */}
        <Box className='flex gap-2'>
          <TextField
            label="Reference No."
            sx={{ width: '100%' }}
            margin="normal"
            value={asset.ReferenceNo || ''}
            onChange={(e) => handleInputChange('ReferenceNo', e.target.value)}
            required
          />

          <Autocomplete
            key="Color"
            sx={{ width: '20rem', marginTop: '1rem' }}
            options={colorOptions}
            value={asset.Color || null}
            onChange={(event, newValue) => handleInputChange('Color', newValue || '')}
            renderInput={(params) => (
              <TextField {...params} label="Color" placeholder="Color" />
            )}
          />
          
        </Box>
      </Box>
    </Box>
  );
}
