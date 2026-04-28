import { useState, useEffect, useRef } from 'react';
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
import { useAssetMasterData } from '../../../hooks/assetMasterHooks';

const EnhancedEditableTable = ({
  isEditing,
  setEditing
}) => {
  const { fetchAssetByFacN0, assets, fetchAssets, isLoading, createAsset, updateAsset } = useAssetMasterData();
  
  // Initialize with ONE empty row directly
  const [rows, setRows] = useState([{
    id: Date.now(),
    assetNum: '',
    assetName: '',
    qty: '',
    workDetails: '',
    targetDate: '',
    status: 'OPEN',
    brand: '',
    serialNo: '',
    location: '',
    warrantyStartDate: '',
    warrantyEndDate: ''
  }]);
  
  const [loadingRows, setLoadingRows] = useState({});
  const [errors, setErrors] = useState({});
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [assetOptions, setAssetOptions] = useState([]);
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  const fetchAttempted = useRef(false);


  // Fetch assets for autocomplete suggestions - only once
  useEffect(() => {
    if (!fetchAttempted.current && !assetsLoaded) {
      fetchAttempted.current = true;
      const loadAssets = async () => {
        try {
          await fetchAssets();
          setAssetsLoaded(true);
        } catch (error) {
          console.error('Failed to fetch assets:', error);
          setSnackbar({
            open: true,
            message: 'Failed to load asset list',
            severity: 'error'
          });
        }
      };
      loadAssets();
    }
  }, [fetchAssets, assetsLoaded]);

  // Prepare asset options for autocomplete (for FacName field)
  useEffect(() => {
    if (assets && assets.length > 0) {
      setAssetOptions(assets);
    }
  }, [assets]);

  // REMOVED the useEffect that automatically adds a new row

  const addNewRow = () => {
    const newRow = {
      id: Date.now(),
      assetNum: '',
      assetName: '',
      qty: '',
      workDetails: '',
      targetDate: '',
      status: 'OPEN',
      brand: '',
      serialNo: '',
      location: '',
      warrantyStartDate: '',
      warrantyEndDate: ''
    };
    setRows(prev => [...prev, newRow]);
  };

  // // Auto-populate from FacNO
  // const handleAssetNumChange = async (rowId, value) => {
  //   // Update the assetNum field
  //   setRows(prev => prev.map(row => 
  //     row.id === rowId ? { ...row, assetName: value } : row
  //   ));

  //   if (value && value.trim()) {
  //     setLoadingRows(prev => ({ ...prev, [rowId]: true }));
  //     setErrors(prev => ({ ...prev, [rowId]: null }));
      
  //     try {
  //       const assetData = await fetchAssetByFacN0(value);
        
  //       if (assetData) {
  //         // Auto-populate all fields including FacName
  //         setRows(prev => prev.map(row => 
  //           row.id === rowId ? {
  //             ...row,
  //             assetName: assetData.FacName || '',
  //             qty: assetData.balance_unit || '',
  //             brand: assetData.Brand || '',
  //             serialNo: assetData.serialNo || '',
  //             location: assetData.ItemLocation || '',
  //             warrantyStartDate: assetData.StartDate || '',
  //             warrantyEndDate: assetData.EndDate || ''
  //           } : row
  //         ));
  //         setSnackbar({
  //           open: true,
  //           message: 'Asset loaded successfully',
  //           severity: 'success'
  //         });
  //       } else {
  //         setErrors(prev => ({ 
  //           ...prev, 
  //           [rowId]: 'Asset number not found' 
  //         }));
  //       }
  //     } catch (error) {
  //       setErrors(prev => ({ 
  //         ...prev, 
  //         [rowId]: error.message || 'Failed to fetch asset' 
  //       }));
  //     } finally {
  //       setLoadingRows(prev => ({ ...prev, [rowId]: false }));
  //     }
  //   } else if (!value) {
  //     // Clear all fields if FacNO is cleared
  //     setRows(prev => prev.map(row => 
  //       row.id === rowId ? {
  //         ...row,
  //         assetNum: '',
  //         assetName: '',
  //         brand: '',
  //         serialNo: '',
  //         location: '',
  //         warrantyStartDate: '',
  //         warrantyEndDate: ''
  //       } : row
  //     ));
  //   }
  // };

  // Auto-populate from FacName (when user selects from dropdown)
  const handleAssetNameSelect = (rowId, selectedAsset) => {
    if (selectedAsset) {
      // Auto-populate all fields including FacNO
      setRows(prev => prev.map(row => 
        row.id === rowId ? {
          ...row,
          assetNum: selectedAsset.FacNO || '',
          assetName: selectedAsset.FacName || '',
          qty: selectedAsset.balance_unit || '',
          brand: selectedAsset.Brand || '',
          serialNo: selectedAsset.serialNo || '',
          location: selectedAsset.ItemLocation || '',
          warrantyStartDate: selectedAsset.StartDate || '',
          warrantyEndDate: selectedAsset.EndDate || ''
        } : row
      ));
      setErrors(prev => ({ ...prev, [rowId]: null }));
      setSnackbar({
        open: true,
        message: 'Asset loaded successfully',
        severity: 'success'
      });
    }
  };

  // Handle manual typing in FacName field
  const handleAssetNameInput = (rowId, value) => {
    setRows(prev => prev.map(row => 
      row.id === rowId ? { ...row, assetNum: value } : row
    ));
  };

  const handleRowFieldChange = (rowId, field, value) => {
    setRows(prev => prev.map(row => 
      row.id === rowId ? { ...row, [field]: value } : row
    ));
    
    // Auto-adjust row height for workDetails
    if (field === 'workDetails') {
      adjustRowHeight(rowId);
    }
  };

  const adjustRowHeight = (rowId) => {
    const textarea = document.getElementById(`workDetails-${rowId}`);
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  };

  const handleDeleteRow = (rowId) => {
    // Prevent deleting the last row
    if (rows.length === 1) {
      setSnackbar({
        open: true,
        message: 'Cannot delete the last row. At least one row is required.',
        severity: 'warning'
      });
      return;
    }
    
    setRows(prev => prev.filter(row => row.id !== rowId));
    setLoadingRows(prev => {
      const newState = { ...prev };
      delete newState[rowId];
      return newState;
    });
    setErrors(prev => {
      const newState = { ...prev };
      delete newState[rowId];
      return newState;
    });
  };

  const handleSaveRow = async (row) => {
    if (!row.assetNum || !row.assetNum.trim()) {
      setErrors(prev => ({ 
        ...prev, 
        [row.id]: 'FacNO is required' 
      }));
      return;
    }

    setLoadingRows(prev => ({ ...prev, [row.id]: true }));
    
    try {
      const payload = {
        FacNO: row.assetNum,
        FacName: row.assetName,
        balance_unit: row.qty,
        workDet: row.workDetails,
        TargetDate: row.targetDate,
        status: row.status,
        brand: row.brand,
        serialNo: row.serialNo,
        ItemLocation: row.location,
        StartDate: row.warrantyStartDate,
        EndDate: row.warrantyEndDate
      };

      const isNew = !row.saved;
      
      if (isNew) {
        await createAsset(payload);
        setSnackbar({
          open: true,
          message: 'Item created successfully',
          severity: 'success'
        });
      } else {
        await updateAsset(row.assetNum, payload);
        setSnackbar({
          open: true,
          message: 'Item updated successfully',
          severity: 'success'
        });
      }

      setRows(prev => prev.map(r => 
        r.id === row.id ? { ...r, saved: true } : r
      ));
      setErrors(prev => ({ ...prev, [row.id]: null }));
      
    } catch (error) {
      setErrors(prev => ({ 
        ...prev, 
        [row.id]: error.message || 'Failed to save item' 
      }));
      setSnackbar({
        open: true,
        message: 'Failed to save item',
        severity: 'error'
      });
    } finally {
      setLoadingRows(prev => ({ ...prev, [row.id]: false }));
    }
  };

  const handleSaveAll = async () => {
    for (const row of rows) {
      if (row.assetNum && row.assetNum.trim() && !row.saved) {
        await handleSaveRow(row);
      }
    }
  };

  // Filter options based on input - search by both Asset Name and Asset Number
  const filterOptions = (options, { inputValue }) => {
    if (!inputValue) return options.slice(0, 20);
    
    const searchTerm = inputValue.toLowerCase();
    return options.filter(option => 
      option.FacName?.toLowerCase().includes(searchTerm) ||
      option.FacNO?.toLowerCase().includes(searchTerm)
    ).slice(0, 20);
  };

  // Custom popper for autocomplete dropdown
  const CustomPopper = (props) => {
    return (
      <Popper {...props} placement="bottom-start" style={{ width: '100%', zIndex: 1300 }} />
    );
  };

  return (
    <Box sx={{ p: 2 }}>      
      {!assetsLoaded && isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>Loading assets...</Typography>
        </Box>
      )}
      
      {/* Table Container with horizontal scroll */}
      <TableContainer 
        component={Paper} 
        sx={{ 
          maxHeight: '70vh',
          overflowX: 'auto',  // Enable horizontal scrolling
          overflowY: 'auto',   // Enable vertical scrolling
          '& .MuiTable-root': {
            minWidth: 1600,    // Force horizontal scroll
          }
        }}
      >
        <Table 
          stickyHeader 
          sx={{ 
            minWidth: 1600,
            borderCollapse: 'separate',
            '& .MuiTableCell-root': {
              padding: '6px 8px',  // Denser padding
              fontSize: '0.875rem', // Smaller font size
            },
            '& .MuiTableCell-head': {
              backgroundColor: '#f5f5f5',
              fontWeight: 'bold',
              padding: '8px 8px',  // Denser header
            }
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell sx={{ minWidth: '60px' }}>Actions</TableCell>
              <TableCell sx={{ minWidth: '16rem' }}>Asset No.</TableCell>
              <TableCell sx={{ minWidth: '21rem' }}>Asset Name</TableCell>
              <TableCell sx={{ minWidth: '80px' }}>Qty</TableCell>
              <TableCell sx={{ minWidth: '300px' }}>Work Details</TableCell>
              <TableCell sx={{ minWidth: '130px' }}>Target Date</TableCell>
              <TableCell sx={{ minWidth: '80px' }}>Status</TableCell>
              <TableCell sx={{ minWidth: '150px' }}>Brand</TableCell>
              <TableCell sx={{ minWidth: '150px' }}>Serial No</TableCell>
              <TableCell sx={{ minWidth: '150px' }}>Location</TableCell>
              <TableCell sx={{ minWidth: '130px' }}>Warranty Start</TableCell>
              <TableCell sx={{ minWidth: '130px' }}>Warranty End</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow 
                key={row.id} 
                hover
                sx={{ '&:hover': { backgroundColor: '#fafafa' } }}
              >
                <TableCell>
                  <IconButton
                    onClick={() => handleDeleteRow(row.id)}
                    color="error"
                    size="small"
                    disabled={!isEditing}
                    sx={{ padding: '4px' }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
                              
                {/* FacName Field */}
                <TableCell>
                  <Autocomplete
                    options={assetOptions}
                    loading={!assetsLoaded && isLoading}
                    value={null}
                    inputValue={row.assetNum || ''}
                    onInputChange={(event, newInputValue) => {
                      handleAssetNameInput(row.id, newInputValue);
                    }}
                    onChange={(event, newValue) => {
                      handleAssetNameSelect(row.id, newValue);
                    }}
                    getOptionLabel={(option) => {
                      if (typeof option === 'string') return option;
                      return `${option.FacName} (${option.FacNO})`;
                    }}
                    isOptionEqualToValue={(option, value) => {
                      return option?.FacNO === value?.FacNO;
                    }}
                    filterOptions={filterOptions}
                    renderOption={(props, option) => (
                      <li {...props}>
                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                          <Typography variant="body2" component="span">
                            <strong>{option.FacName}</strong>
                          </Typography>
                          <Typography variant="caption" color="textSecondary" component="span">
                            {option.FacNO}
                          </Typography>
                        </Box>
                      </li>
                    )}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        size="small"
                        placeholder="Type asset name or number..."
                        variant="outlined"
                        sx={{ '& .MuiInputBase-root': { fontSize: '0.875rem', backgroundColor: 'background.paper', backgroundColor: isEditing ? 'white' : '#f3f4f6',   } }}
                        InputProps={{
                          ...params.InputProps,
                          endAdornment: (
                            <>
                              {(!assetsLoaded && isLoading) ? <CircularProgress size={16} /> : null}
                              {params.InputProps.endAdornment}
                            </>
                          ),
                        }}
                      />
                    )}
                    disabled={!isEditing}
                    fullWidth
                    selectOnFocus
                    clearOnBlur={false}
                    handleHomeEndKeys
                  />
                </TableCell>

                {/* FacName Field */}
                <TableCell>
                  <TextField
                    size="small"
                    value={row.assetName}
                    // onChange={(e) => handleAssetNumChange(row.id, e.target.value)}
                    // placeholder="Enter asset number.."
                    // disabled={loadingRows[row.id]}
                    disabled
                    error={!!errors[row.id]}
                    helperText={errors[row.id]}
                    fullWidth
                    variant="outlined"
                    sx={{ '& .MuiInputBase-root': { fontSize: '0.875rem', padding: 1, backgroundColor: isEditing ? 'white' : '#f3f4f6',   } }}
                  />
                  {/* {loadingRows[row.id] && <CircularProgress size={16} sx={{ mt: 0.5 }} />} */}
                </TableCell>
                
                {/* Qty Field */}
                <TableCell>
                  <TextField
                    size="small"
                    value={row.qty || ''}
                    onChange={(e) => handleRowFieldChange(row.id, 'qty', e.target.value)}
                    placeholder="Qty"
                    disabled={!isEditing}
                    type="number"
                    fullWidth
                    variant="outlined"
                    sx={{ '& .MuiInputBase-root': { fontSize: '0.875rem', padding: 1, backgroundColor: isEditing ? 'white' : '#f3f4f6', } }}
                  />
                </TableCell>
                
                {/* Work Details - Resizable Textarea */}
                <TableCell>
                  <textarea
                    id={`workDetails-${row.id}`}
                    value={row.workDetails || ''}
                    onChange={(e) => handleRowFieldChange(row.id, 'workDetails', e.target.value)}
                    // className={`${!isEditing ? 'text-gray-400 border-gray-300' : 'text-black bg-white'}`}
                    placeholder="Enter work details..."
                    disabled={!isEditing}
                    style={{
                      width: '100%',
                      minHeight: '60px',
                      padding: '8px',
                      fontSize: '0.875rem',
                      fontFamily: 'inherit',
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                      resize: 'vertical',  // Allow vertical resizing
                      boxSizing: 'border-box',
                      backgroundColor: isEditing ? 'white' : '#f3f4f6', 
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#1976d2';
                      e.target.style.outline = 'none';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#ccc';
                    }}
                  />
                </TableCell>
                
                {/* Target Date */}
                <TableCell>
                  <TextField
                    size="small"
                    value={row.targetDate}
                    onChange={(e) => handleRowFieldChange(row.id, 'targetDate', e.target.value)}
                    disabled={!isEditing}
                    type="date"
                    fullWidth
                    variant="outlined"
                    sx={{ '& .MuiInputBase-root': { fontSize: '0.875rem', padding: 1, backgroundColor: 'background.paper', backgroundColor: isEditing ? 'white' : '#f3f4f6',   } }}
                    InputLabelProps={{ shrink: true }}
                  />
                </TableCell>
                
                {/* Status */}
                <TableCell>
                  <TextField
                    size="small"
                    value={row.status}
                    disabled
                    fullWidth
                    variant="outlined"
                    sx={{ '& .MuiInputBase-root': { fontSize: '0.875rem', padding: 1, backgroundColor: isEditing ? 'white' : '#f3f4f6',  } }}
                  />
                </TableCell>
                
                {/* brand - Read Only */}
                <TableCell>
                  <TextField
                    size="small"
                    value={row.brand}
                    disabled
                    fullWidth
                    variant="outlined"
                    sx={{ '& .MuiInputBase-root': { fontSize: '0.875rem', padding: 1, backgroundColor: '#f3f4f6',  } }}
                  />
                </TableCell>
                
                {/* Serial No - Read Only */}
                <TableCell>
                  <TextField
                    size="small"
                    value={row.serialNo}
                    disabled
                    fullWidth
                    variant="outlined"
                    sx={{ '& .MuiInputBase-root': { fontSize: '0.875rem', padding: 1, backgroundColor: '#f3f4f6',  } }}
                  />
                </TableCell>
                
                {/* Location - Read Only */}
                <TableCell>
                  <TextField
                    size="small"
                    value={row.location}
                    disabled
                    fullWidth
                    variant="outlined"
                    sx={{ '& .MuiInputBase-root': { fontSize: '0.875rem', padding: 1, backgroundColor: '#f3f4f6',  } }}
                  />
                </TableCell>
                
                {/* Warranty Start Date - Read Only */}
                <TableCell>
                  <TextField
                    size="small"
                    value={row.warrantyStartDate}
                    disabled
                    fullWidth
                    variant="outlined"
                    sx={{ '& .MuiInputBase-root': { fontSize: '0.875rem', padding: 1, backgroundColor:  '#f3f4f6',  } }}
                  />
                </TableCell>
                
                {/* Warranty End Date - Read Only */}
                <TableCell>
                  <TextField
                    size="small"
                    value={row.warrantyEndDate}
                    disabled
                    fullWidth
                    variant="outlined"
                    sx={{ '& .MuiInputBase-root': { fontSize: '0.875rem', padding: 1, backgroundColor: '#f3f4f6',  } }}
                  />
                </TableCell>
                
                {/* Save Button */}
                {/* <TableCell>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => handleSaveRow(row)}
                    disabled={loadingRows[row.id] || !row.assetNum}
                    fullWidth
                    sx={{ 
                      padding: '4px 8px',
                      fontSize: '0.75rem',
                      minWidth: '60px'
                    }}
                  >
                    {loadingRows[row.id] ? <CircularProgress size={16} /> : 'Save'}
                  </Button>
                </TableCell> */}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      
      {/* Buttons Container */}
      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', gap: 2 }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={addNewRow}
          size="small"
          disabled={!isEditing}
        >
          Add Row
        </Button>
        
        <Button
          variant="contained"
          color="secondary"
          onClick={handleSaveAll}
          disabled={!isEditing}
          size="small"
        >
          Save All
        </Button>
      </Box>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default EnhancedEditableTable;