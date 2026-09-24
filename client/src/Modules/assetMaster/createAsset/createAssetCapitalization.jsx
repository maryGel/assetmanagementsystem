import { useMemo } from 'react';
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

// Custom Hooks
import { useRefUom } from '../../../hooks/refUom';
import { useRefCategory } from '../../../hooks/refCategory';
import { useRefItemClass } from '../../../hooks/refClass';
import { useRefLocation } from '../../../hooks/refLocation';
import { useRefDepartment } from '../../../hooks/refDepartment';

// Builds a clean option list from a reference table
const toOptions = (data, key) =>
  Array.isArray(data) ? data.map((item) => item[key]).filter(Boolean) : [];

export default function CreateAssetCapitalization({
  asset,
  updateAssetData,
  loading,
  error,
  facNOLoading,
  autoNumbering = true
}) {
  const { uomData } = useRefUom();
  const { refCategoryData } = useRefCategory();
  const { refItemClassData } = useRefItemClass();
  const { refDeptData } = useRefDepartment();
  const { refLocData } = useRefLocation();

  const uomOptions = useMemo(() => toOptions(uomData, 'Unit'), [uomData]);
  const categoryOptions = useMemo(() => toOptions(refCategoryData, 'category'), [refCategoryData]);

  // Each refItemclass row belongs to exactly one category (see the 'category'
  // column in refItemClass.jsx), so Asset Class options depend on Category.
  const itemClassOptions = useMemo(() => {
    if (!asset.CATEGORY || !Array.isArray(refItemClassData)) return [];
    return refItemClassData
      .filter((item) => item.category === asset.CATEGORY)
      .map((item) => item.itemClass)
      .filter(Boolean);
  }, [refItemClassData, asset.CATEGORY]);

  const locationOptions = useMemo(() => toOptions(refLocData, 'LocationName'), [refLocData]);
  const departmentOptions = useMemo(() => toOptions(refDeptData, 'Department'), [refDeptData]);

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

  // NumericFormat: store the raw number string ("1250.5"), not the display
  // string ("1,250.50"). `source === 'event'` ignores echoes of our own value.
  const handleNumberChange = (field) => (values, sourceInfo) => {
    if (sourceInfo.source === 'event') {
      handleInputChange(field, values.value);
    }
  };

  const selectSx = { width: '50rem', marginTop: '1rem' };
  const inputSx = { '& .MuiInputBase-input': { fontSize: '.9rem' } };

  return (
    <div className='grid justify-center gap-2 mt-10'>
      <Typography variant="h6" gutterBottom>
        Asset Capitalization
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

      {/* ... Acquired Date, UOM, and Quantity ... */}
      <Box className="flex justify-start gap-2">
        <TextField
          label="Acquisition Date"
          sx={{
            width: '16rem',
            color: 'gray',
            '& .MuiInputBase-input': { color: 'gray' }
          }}
          type="date"
          margin="normal"
          value={asset.Adate || ''}
          onChange={(e) => handleInputChange('Adate', e.target.value)}
          InputLabelProps={{ shrink: true }}
          required
        />

        <Autocomplete
          key="Unit of Measure"
          sx={{ width: '10rem', marginTop: '1rem' }}
          options={uomOptions}
          value={asset.Unit || null}
          onChange={(e, newValue) => handleInputChange('Unit', newValue || '')}
          renderInput={(params) => (
            <TextField
              {...params}
              label="UOM"
              placeholder="UOM"
              sx={{ '& .MuiInputBase-input': { fontSize: '14px' } }}
              required
            />
          )}
        />

        <TextField
          label="Quantity"
          type="number"
          sx={{ width: '15rem' }}
          margin="normal"
          value={asset.balance_unit}
          onChange={(e) => handleInputChange('balance_unit', e.target.value)}
          inputProps={{ min: 1 }}
        />

        <FormControlLabel
          control={<Checkbox sx={{ color: 'gray' }} />}
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
          value={asset.AAmount ?? ''}
          onValueChange={handleNumberChange('AAmount')}
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
          value={asset.Abre ?? ''}
          onValueChange={handleNumberChange('Abre')}
        />

        <NumericFormat
          customInput={TextField}
          label="Life in years"
          sx={{ width: '10rem' }}
          margin="normal"
          allowNegative={false}
          decimalScale={2}
          value={asset.Percent ?? ''}
          onValueChange={handleNumberChange('Percent')}
          required
        />
      </Box>

      {/* ... Department and Locations ... */}
      <Autocomplete
        key="Department"
        sx={selectSx}
        options={departmentOptions}
        value={asset.Department || null}
        onChange={(event, newValue) => handleInputChange('Department', newValue || '')}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Department"
            placeholder="Department"
            sx={inputSx}
            required
          />
        )}
      />

      <Autocomplete
        key="Location"
        sx={selectSx}
        options={locationOptions}
        value={asset.ItemLocation || null}
        onChange={(event, newValue) => handleInputChange('ItemLocation', newValue || '')}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Location"
            placeholder="Location"
            sx={inputSx}
            required
          />
        )}
      />
    </div>
  );
}