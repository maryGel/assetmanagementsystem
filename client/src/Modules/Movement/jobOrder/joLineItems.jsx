
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
// import { getAutocompleteSx } from '../../../Utils/autocompleteStyles';  

const JOLineItems = ({
  state,
  rows = [],
  dispatch,
  docStatus,
  isReadOnly,
  currentHeader,
  currentJOItems,
  updateDetailRow,
  addDetailRow
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
    console.log("CURRENT ROWS", currentJOItems);
  }, [currentJOItems]);
  
  // ADD ROW
  const handleAddRow = () => {
    addDetailRow();
    // updateDetailRow(rowId, field, value);
  };

  // REMOVE ROW
  const handleDeleteRow = (rowId) => {
    if (currentJOItems.length === 1) {
      setSnackbar({
        open: true,
        message: 'At least one row is required',
        severity: 'warning'
      });
      return;
    }
    dispatch({
      type: 'REMOVE_DETAIL_ROW',
      id: rowId
    });
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
  const handleAssetSelect = (
    rowId,
    selectedAsset
  ) => {
    if (!selectedAsset) return;
    const updates = {
      FAC_NO: selectedAsset.FacNO || '',
      FAC_name: selectedAsset.FacName || '',
      qty: selectedAsset.balance_unit || '',
      UOM: selectedAsset.Unit || '',
      brand: selectedAsset.Brand || '',
      serialNo: selectedAsset.serialNo || '',
      ItemLocation: selectedAsset.ItemLocation || '',
    };
      Object.entries(updates).forEach(([field, value]) => {
        updateDetailRow(
          rowId,
          field,
          value
        );
        // startEdit(rowId)
      }
    );
    // setSnackbar({
    //   open: true,
    //   message: 'Asset selected successfully',
    //   severity: 'success'
    // });
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


  
  // const !isReadOnly =
  //   state.isCreating ||
  //   (state.isEditing && baseHeader?.xpost === 0);

  // const isReadOnly = !!isReadOnly;



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
              <TableCell>Work Details</TableCell>
              <TableCell>Target Date</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Brand</TableCell>
              <TableCell>Serial No</TableCell>
              <TableCell>Location</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {currentJOItems.map((row) => (
              
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
                    onClick={() =>
                      handleDeleteRow(row.id)
                    }
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
                      // FIX: Better null check and value matching
                      row.FAC_NO || ''
                    }
                    onChange={(event, newValue) => {
                      handleAssetSelect(row.id, newValue);
                    }}
                    getOptionLabel={(option) =>
                      typeof option === 'string' ? option : option?.FacNO || ''
                    }
                    isOptionEqualToValue={(option, value) =>
                      option.FacNO === value.FacNO
                    }
                    renderOption={(props, option) => (
                      <li {...props}>
                        <Box
                          sx={{
                            display: 'flex',
                            flexDirection: 'column'
                          }}
                        >
                          <Typography variant="body2">
                            <strong>{option.FacName}</strong>
                          </Typography>
                          <Typography
                            variant="caption"
                            color="textSecondary"
                          >
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
                          '& .MuiInputBase-root':
                            tableFieldFormat(!isReadOnly),
                          // backgroundColor: state.isEditing && state.isCreating ? 'white' : 'grey.100',
                          // bgColor: state.isEditing && state.isCreating ? 'white' : 'grey.100'

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
                {/* WORK DETAILS */}
                <TableCell sx={{ minWidth: 400 }}>
                  <textarea
                    value={row.workDet || ''}
                    onChange={(e) =>
                      handleRowFieldChange(
                        row.id,
                        'workDet',
                        e.target.value
                      )
                    }
                    disabled={isReadOnly}
                    className={`
                      w-full
                      border
                      rounded-md
                      p-2
                      border-gray-300
                      ${
                        isReadOnly
                          ? 'bg-gray-100 text-gray-400'
                          : 'bg-white text-black'
                      }
                    `}
                  />
                </TableCell>
                {/* TARGET DATE */}
                <TableCell>
                  <TextField
                    size="small"
                    type="date"
                    value={
                    row.TargetDate
                      ? (() => {
                          const d = new Date(row.TargetDate)
                          return `${d.getFullYear()}-${String(
                            d.getMonth() + 1
                          ).padStart(2, '0')}-${String(
                            d.getDate()
                          ).padStart(2, '0')}`
                        })()
                      : ''
                    }
                    onChange={(e) => handleRowFieldChange( row.id, 'TargetDate', e.target.value)}
                    disabled={isReadOnly}
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
                {/* STATUS */}
                <TableCell>
                  <TextField
                    size="small"
                    value={row.Status || 'OPEN'}
                    disabled
                    fullWidth
                    sx={{
                      '& .MuiInputBase-root':
                        tableFieldFormat(state.isEditing), width: 80
                    }}
                  />
                </TableCell>
                {/* BRAND */}
                <TableCell>
                  <TextField
                    size="small"
                    value={row.brand || ''}
                    disabled
                    fullWidth
                    sx={{
                      '& .MuiInputBase-root':
                        tableFieldFormat(state.isEditing), width: 150
                    }}
                  />
                </TableCell>
                {/* SERIAL */}
                <TableCell>
                  <TextField
                    size="small"
                    value={row.serialNo || ''}
                    disabled
                    fullWidth
                    sx={{
                      '& .MuiInputBase-root':
                        tableFieldFormat(state.isEditing), width: 150
                    }}
                  />
                </TableCell>
                {/* LOCATION */}
                <TableCell>
                  <TextField
                    size="small"
                    value={row.ItemLocation || ''}
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
export default JOLineItems;
