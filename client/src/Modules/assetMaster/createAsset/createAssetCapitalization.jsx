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
import { useRefLocation } from '../../../hooks/refLocation';
import { useRefDepartment } from '../../../hooks/refDepartment';
import { getResidualValueError } from './assetMasterFields';

// Builds a clean option list from a reference table
const toOptions = (data, key) =>
  Array.isArray(data) ? data.map((item) => item[key]).filter(Boolean) : [];

export default function CreateAssetCapitalization({
  asset,
  updateAssetData,
  loading,
  error,
}) {
  const { uomData } = useRefUom();
  const { refDeptData } = useRefDepartment();
  const { refLocData } = useRefLocation();

  const uomOptions = useMemo(() => toOptions(uomData, 'Unit'), [uomData]);

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

  // Shown live, before the user clicks Next
  const residualError = getResidualValueError(asset);


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

        <Box sx={{ width: '18rem' }}>
          <NumericFormat
            customInput={TextField}
            label="Residual Value"
            sx={{ width: '100%' }}
            margin="normal"
            thousandSeparator=","
            allowNegative={false}
            decimalScale={2}
            value={asset.Abre ?? ''}
            onValueChange={handleNumberChange('Abre')}
            error={Boolean(residualError)}
          />
          {residualError && (
            <span
              role="alert"
              style={{ display: 'block', color: '#d32f2f', fontSize: '0.75rem', marginTop: '-4px' }}
            >
              {residualError}
            </span>
          )}
        </Box>

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

      <Box className="flex justify-start gap-2">
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
      
    </div>
  );
}