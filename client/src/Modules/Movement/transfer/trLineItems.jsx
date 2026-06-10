
import { useEffect, useRef, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Button,
  IconButton,
  CircularProgress,
  Alert,
  Box,
  Typography,
  Snackbar,
  Autocomplete,
  Popper
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
// Hooks
import { useAssetMasterData } from '../../../hooks/assetMasterHooks';
// Custom Utils
import { tableFieldFormat } from '../custom Utils/customLayout';
import formatWithCommas from '../../../Utils/formatWithCommas';
// import { getAutocompleteSx } from '../../../Utils/autocompleteStyles';  

const TRLineItems = ({
  state,
  rows = [],
  // dispatch,
  docStatus,
  isReadOnly,
  currentHeader,
  currentTRItems,
  updateDetailRow,
  addDetailRow,
  removeDetailRow,
  handleDeleteClick
}) => {
  const {
    allAssets,
    fetchAssets,
    isLoading
  } = useAssetMasterData();
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  const [assetOptions, setAssetOptions] = useState([]);
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  const fetchAttempted = useRef(false);

  // LOAD ASSETS
  useEffect(() => {
    if (!fetchAttempted.current && !assetsLoaded) {
      fetchAttempted.current = true;
      const loadAssets = async () => {
        try {
          await fetchAssets();
          setAssetsLoaded(true);
        } catch (error) {
          console.error(error);
          setSnackbar({
            open: true,
            message: 'Failed to load assets',
            severity: 'error'
          });
        }
      };
      loadAssets();
    }
  }, [fetchAssets, assetsLoaded]);
  // SET ASSET OPTIONS
  useEffect(() => {
    if (allAssets?.length > 0) {
      setAssetOptions(
        allAssets.map(a => ({
          ...a,
          FacNO: String(a.FacNO ?? '').trim(),
        }))
      );
    }
  }, [allAssets]);
  
  useEffect(() => {
    console.log("CURRENT ROWS", currentTRItems);
  }, [currentTRItems]);
  
  // ADD ROW
  const handleAddRow = () => {
    addDetailRow();
    // updateDetailRow(rowId, field, value);
  };

  // UPDATE FIELD
  const handleRowFieldChange = (
    rowId,
    field,
    value
  ) => {
    updateDetailRow(rowId, field, value);
  };
  // ASSET SELECT

  const handleAssetSelect = (rowId, selectedAsset) => {
    if (!selectedAsset) return;
    
    console.log('Selected asset for row:', rowId, selectedAsset);
    
    const updates = {
      FAC_NO: selectedAsset.FacNO || 'n ',
      FAC_name: selectedAsset.FacName || '',
      qty: selectedAsset.balance_unit || 1,
      UOM: selectedAsset.Unit || '',
      brand: selectedAsset.Brand || '',
      serialNo: selectedAsset.serialNo || '',
      location: selectedAsset.ItemLocation || '',
      Date_Aq: selectedAsset.Adate || '',
      Amount_aq: selectedAsset.AAmount || '',
      Holder: selectedAsset.Holder || '',
    };
    
    // Update each field individually
    Object.entries(updates).forEach(([field, value]) => {
      updateDetailRow(rowId, field, value);
    });
  };
  
  // FILTER OPTIONS
  const filterOptions = (options, { inputValue }) => {
    if (!inputValue) {
      return options.slice(0, 20);
    }
    const search = inputValue.toLowerCase();
    return options.filter(option =>
      option.FacName?.toLowerCase().includes(search) ||
      option.FacNO?.toLowerCase().includes(search)
    ).slice(0, 20);
  };


  return (

    
    <Box sx={{ p: 2 }}>
      {!assetsLoaded && isLoading && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            my: 2
          }}
        >
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>
            Loading assets...
          </Typography>
        </Box>
      )}
      <TableContainer
        component={Paper}
        sx={{
          maxHeight: '72vh',
          overflowX: 'auto',
          overflowY: 'auto',
          '& .MuiTable-root': {
            minWidth: 1800
          }
        }}
      >
        <Table
          stickyHeader
          sx={{
            minWidth: 1600,
            '& .MuiTableCell-root': {
              padding: '4px 8px',
              fontSize: '0.875rem'
            },
            '& .MuiTableCell-head': {
              backgroundColor: '#f5f5f5',
              fontWeight: 'bold'
            }
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell>Action</TableCell>
              <TableCell>Asset No.</TableCell>
              <TableCell>Asset Name</TableCell>
              <TableCell>Qty</TableCell>
              <TableCell>UOM</TableCell>
              <TableCell>Brand</TableCell>
              <TableCell>Serial No.</TableCell>
              <TableCell>Acquired Date</TableCell>
              <TableCell>Acquired Cost</TableCell>
              <TableCell>Holder</TableCell>
              <TableCell>Location</TableCell>
              {/* <TableCell>Original Dept.</TableCell>
              <TableCell>New Holder</TableCell>
              <TableCell>New Location</TableCell> */}
            </TableRow>
          </TableHead>
          <TableBody>
            {currentTRItems.map((row) => (
              
              <TableRow
                key={row.id}
                hover
              >
                {/* DELETE */}
                <TableCell>
                  <IconButton
                    color="error"
                    size="small"
                    disabled={isReadOnly}
                    onClick={() =>handleDeleteClick(row.id)}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
                {/* ASSET NO */}
                <TableCell sx={{ minWidth: 300 }}>
                  <Autocomplete
                    options={assetOptions}
                    loading={!assetsLoaded && isLoading}
                    filterOptions={filterOptions}
                    value={
                      // FIX: Find the full asset object from options
                      // assetOptions.find(opt => opt.FacNO === row.FAC_NO) || null
                      row.FAC_NO
                    }
                    onChange={(event, newValue) => {
                      handleAssetSelect(row.id, newValue);
                    }}
                    getOptionLabel={(option) => {
                      if (!option) return '';
                      if (typeof option === 'string') return option;
                      return `${option.FacNO} - ${option.FacName}`;
                    }}
                    isOptionEqualToValue={(option, value) => {
                      // FIX: Properly compare both cases
                      if (!value) return false;
                      const optionFacNO = String(option?.FacNO || '');
                      const valueFacNO = String(value?.FacNO || value || '');
                      return optionFacNO === valueFacNO;
                    }}
                    renderOption={(props, option) => (
                      <li {...props}>
                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                          <Typography variant="body2">
                            <strong>{option.FacName}</strong>
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {option.FacNO}
                          </Typography>
                        </Box>
                      </li>
                    )}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        size="small"
                        placeholder="Search Asset..."
                        sx={{
                          '& .MuiInputBase-root': tableFieldFormat(!isReadOnly),
                        }}
                        InputProps={{
                          ...params.InputProps,
                          endAdornment: (
                            <>
                              {!assetsLoaded && isLoading && (
                                <CircularProgress size={16} />
                              )}
                              {params.InputProps.endAdornment}
                            </>
                          )
                        }}
                      />
                    )}
                    disabled={isReadOnly}
                  />
                </TableCell>
                {/* ASSET NAME */}
                <TableCell>
                  <TextField
                    size="small"
                    value={row.FAC_name || ''}
                    disabled
                    fullWidth
                    sx={{
                      '& .MuiInputBase-root': tableFieldFormat(!isReadOnly),
                      width: 300
                    }}
                  />
                </TableCell>
                {/* QTY */}
                <TableCell>
                  <TextField
                    size="small"
                    type="number"
                    value={row.qty || ''}
                    onChange={(e) =>
                      handleRowFieldChange(
                        row.id,
                        'qty',
                        e.target.value
                      )
                    }
                    disabled={isReadOnly}
                    fullWidth
                    sx={{
                      '& .MuiInputBase-root': tableFieldFormat(!isReadOnly),
                      width: 50
                    }}
                  />
                </TableCell>
                {/* UOM */}
                <TableCell>
                  <TextField
                    size="small"
                    value={row.UOM || ''}
                    disabled
                    fullWidth
                    sx={{
                      '& .MuiInputBase-root':
                        tableFieldFormat(state.isEditing), width: 60
                    }}
                  />
                </TableCell>
                {/* BRAND */}
                <TableCell>
                  <TextField
                    size="small"
                    value={row.Brand || ''}
                    fullWidth
                    disabled
                    sx={{
                        '& .MuiInputBase-root': tableFieldFormat(!isReadOnly),
                        width: 150
                    }}
                  />
                </TableCell>
                {/* Serial No */}
                <TableCell>
                  <TextField
                    size="small"
                    value={row.serial_no || ''}
                    fullWidth
                    disabled
                    sx={{
                        '& .MuiInputBase-root': tableFieldFormat(!isReadOnly),
                        width: 150
                    }}
                  />
                </TableCell>
                {/* Date Acquired */}
                <TableCell>
                  <TextField
                    size="small"
                    type="date"
                    value={
                    row.Date_Aq 
                      ? (() => {
                          const d = new Date(row.Date_Aq)
                          return `${d.getFullYear()}-${String(
                            d.getMonth() + 1
                          ).padStart(2, '0')}-${String(
                            d.getDate()
                          ).padStart(2, '0')}`
                        })()
                      : ''
                    }
                    onChange={(e) => handleRowFieldChange( row.id, 'Date_Aq', e.target.value)}
                    disabled
                    fullWidth
                    InputLabelProps={{
                      shrink: true
                    }}
                    sx={{
                      '& .MuiInputBase-root':
                        tableFieldFormat(!isReadOnly)
                    }}
                  />
                </TableCell>
                {/* Amount Acquired */}
                <TableCell>
                  <TextField
                    size="small"
                    value={formatWithCommas(row.Amount_aq) || ''}
                    disabled
                    fullWidth
                    sx={{
                      '& .MuiInputBase-root':
                        tableFieldFormat(state.isEditing), width: 150
                    }}
                  />
                </TableCell>
                {/* HOLDER */}
                <TableCell>
                  <TextField
                    size="small"
                    value={row.Holder || ''}
                    disabled
                    fullWidth
                    sx={{
                      '& .MuiInputBase-root':
                        tableFieldFormat(state.isEditing), width: 200
                    }}
                  />
                </TableCell>
                {/* Location */}
                <TableCell>
                  <TextField
                    size="small"
                    value={row.location || ''}
                    disabled
                    fullWidth
                    sx={{
                      '& .MuiInputBase-root':
                        tableFieldFormat(state.isEditing), width: 200
                    }}
                />
                </TableCell>            
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* BUTTONS */}
      <Box
        sx={{
          mt: 2,
          display: 'flex',
          justifyContent: 'space-between'
        }}
      >
        <Button
          variant="body2"
          startIcon={<AddIcon />}
          onClick={handleAddRow}
          disabled={isReadOnly}
        >
          Add Row
        </Button>
      </Box>
      {/* SNACKBAR */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() =>
          setSnackbar(prev => ({
            ...prev,
            open: false
          }))
        }
      >
        <Alert
          severity={snackbar.severity}
          onClose={() =>
            setSnackbar(prev => ({
              ...prev,
              open: false
            }))
          }
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};
export default TRLineItems;
