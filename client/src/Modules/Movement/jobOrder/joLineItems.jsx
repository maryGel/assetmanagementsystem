import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Link as RouterLink } from "react-router-dom";
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
  Popper,
  Link,
  InputAdornment,
  TableSortLabel,
  Checkbox,
  FormControlLabel
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
// Hooks
import { useAssetMasterData } from '../../../hooks/assetMasterHooks';
// Custom Utils
import { tableFieldFormat } from '../custom Utils/customLayout';

// import { getAutocompleteSx } from '../../../Utils/autocompleteStyles';  

// COLUMN CONFIG (width = default px width, resizable)
const MIN_COL_WIDTH = 50;
const COLUMNS = [
  { id: 'action',       label: 'Action',      width: 70,  sortable: false },
  { id: 'FAC_NO',       label: 'Asset No.',   width: 300, type: 'string' },
  { id: 'FAC_name',     label: 'Asset Name',  width: 300, type: 'string' },
  { id: 'qty',          label: 'Qty',         width: 80,  type: 'number' },
  { id: 'UOM',          label: 'UOM',         width: 90,  type: 'string' },
  { id: 'workDet',      label: 'Work Details',width: 400, type: 'string' },
  { id: 'TargetDate',   label: 'Target Date', width: 170, type: 'date' },
  { id: 'brand',        label: 'Brand',       width: 140, type: 'string' },
  { id: 'serialno',     label: 'Serial No',   width: 160, type: 'string' },
  { id: 'ItemLocation', label: 'Location',    width: 160, type: 'string' },
  { id: 'StartDate',    label: 'Warranty From', width: 170, type: 'date' },
  { id: 'EndDate',      label: 'Warranty To',   width: 170, type: 'date' },
  // Evaluation details (optional group)
  { id: 'eval_status',  label: 'Evaluation Status',     width: 200, type: 'string', group: 'evaluation' },
  { id: 'eval_remarks', label: 'Evaluation Remarks',  width: 300, type: 'string', group: 'evaluation' },

  // Maintenance details (optional group)
  { id: 'Main_Status',  label: 'Maintenance Status',    width: 160, type: 'string', group: 'maintenance' },
  { id: 'Main_Remarks', label: 'Maintenance Remarks',  width: 300, type: 'string', group: 'maintenance' },
];

// Fields covered by the search box
const SEARCH_FIELDS = ['FAC_NO', 'FAC_name', 'Description', 'workDet', 'eval_remarks', 'Main_Remarks'];

// Columns frozen on the left while scrolling sideways
const FROZEN_COLS = ['action', 'FAC_NO'];

// Normalise any date value to YYYY-MM-DD (local), or '' if empty/invalid
const toDateStr = (value) => {
  if (!value) return '';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const getSortValue = (row, col) => {
  const raw = col.id === 'Status' ? (row.Status || 'OPEN') : row[col.id];
  if (raw === null || raw === undefined || raw === '') return null;
  if (col.type === 'number') {
    const n = Number(raw);
    return Number.isNaN(n) ? null : n;
  }
  if (col.type === 'date') {
    const t = new Date(raw).getTime();
    return Number.isNaN(t) ? null : t;
  }
  return String(raw).toLowerCase();
};



// ----------------------------------------------
// JOLineItems Component
// ----------------------------------------------

const JOLineItems = ({
  state,
  rows = [],
  // dispatch,
  docStatus,
  isReadOnly,
  currentHeader,
  currentJOItems,
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

  // Department currently selected in the JO header
  const selectedDept = String(
    currentHeader?.Department_Code || currentHeader?.Department || ''
  ).trim().toLowerCase();
  
  // Only assets that belong to the selected department
  const deptAssetOptions = useMemo(() => {
    if (!selectedDept) return [];   // force the user to pick a department first
    return assetOptions.filter(
      a => String(a.Department ?? '').trim().toLowerCase() === selectedDept
    );
  }, [assetOptions, selectedDept]);

  // Per-row options: the filtered list, plus the row's current asset if it falls outside
  // the filter (e.g. loading an old JO), so MUI doesn't warn and the value still displays.
  const getRowOptions = (row) => {
    const current = assetOptions.find(opt => opt.FacNO === row.FAC_NO);
    if (current && !deptAssetOptions.includes(current)) {
      return [current, ...deptAssetOptions];
    }
    return deptAssetOptions;
  };
  
  // SEARCH / SORT / RESIZE STATE
  const [searchText, setSearchText] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null }); // 'asc' | 'desc' | null
  const [colWidths, setColWidths] = useState(() =>
    COLUMNS.reduce((acc, c) => ({ ...acc, [c.id]: c.width }), {})
  );

  // Optional column groups (hidden by default)
  const [visibleGroups, setVisibleGroups] = useState({
    evaluation: false,
    maintenance: false,
  });

  const toggleGroup = (group) =>
    setVisibleGroups(prev => ({ ...prev, [group]: !prev[group] }));

  const visibleColumns = useMemo(
    () => COLUMNS.filter(c => !c.group || visibleGroups[c.group]),
    [visibleGroups]
  );

  
  // SORT: click cycles asc -> desc -> off
  const handleSort = (colId) => {
    setSortConfig(prev => {
      if (prev.key !== colId) return { key: colId, direction: 'asc' };
      if (prev.direction === 'asc') return { key: colId, direction: 'desc' };
      return { key: null, direction: null };
    });
  };

  // RESIZE
  const startResize = useCallback((e, colId) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = colWidths[colId];

    const onMove = (ev) => {
      const next = Math.max(MIN_COL_WIDTH, startWidth + (ev.clientX - startX));
      setColWidths(prev => ({ ...prev, [colId]: next }));
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [colWidths]);

  const totalWidth = useMemo(
    () => visibleColumns.reduce((sum, c) => sum + (colWidths[c.id] || c.width), 0),
    [visibleColumns, colWidths]
  );

  // Sticky styles for frozen columns. `left` is the combined width of the frozen
  // columns before it, so it still works after the user resizes a column.
  const getFrozenSx = (colId, isHead = false) => {
    if (!FROZEN_COLS.includes(colId)) return {};
    const left = FROZEN_COLS
      .slice(0, FROZEN_COLS.indexOf(colId))
      .reduce((sum, id) => sum + (colWidths[id] || 0), 0);
    const isLastFrozen = colId === FROZEN_COLS[FROZEN_COLS.length - 1];
    return {
      position: 'sticky',
      left,
      ...(isHead && { top: 0 }), 
      zIndex: isHead ? 4 : 4,                       // header cells must sit above body cells
      backgroundColor: isHead ? '#f5f5f5' : '#fff', // opaque, so scrolled content doesn't show through
      ...(isLastFrozen && { boxShadow: '2px 0 4px -2px rgba(0,0,0,0.25)' }),
    };
  };

  // FILTER + SORT (works in both edit and read-only mode)
  const displayedItems = useMemo(() => {
    let items = Array.isArray(currentJOItems) ? [...currentJOItems] : [];

    const q = searchText.trim().toLowerCase();
    if (q) {
      items = items.filter(row =>
        SEARCH_FIELDS.some(f =>
          String(row[f] ?? '').toLowerCase().includes(q)
        )
      );
    }

    if (sortConfig.key && sortConfig.direction) {
      const col = COLUMNS.find(c => c.id === sortConfig.key);
      const dir = sortConfig.direction === 'asc' ? 1 : -1;
      items.sort((a, b) => {
        const va = getSortValue(a, col);
        const vb = getSortValue(b, col);
        // empty values always go to the bottom
        if (va === null && vb === null) return 0;
        if (va === null) return 1;
        if (vb === null) return -1;
        if (typeof va === 'string') {
          return va.localeCompare(vb, undefined, { numeric: true }) * dir;
        }
        return (va - vb) * dir;
      });
    }
    return items;
  }, [currentJOItems, searchText, sortConfig]);

  // ADD ROW
  const handleAddRow = () => {
    addDetailRow();
    // updateDetailRow(rowId, field, value);
  };

  const handleSelectItem = (facNo) => {
    const path = `/assetFolder/assetMasterDisplay?copyFrom=${facNo}`;

    window.open(path, "_blank");
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
    
    // itemlist -> jo_d mapping: Unit->UOM, Brand->brand, StartDate, EndDate
    const updates = {
      FAC_NO: selectedAsset.FacNO || 'n ',
      FAC_name: selectedAsset.FacName || '',
      qty: selectedAsset.balance_unit || 1,
      UOM: selectedAsset.Unit || '',
      brand: selectedAsset.Brand || '',
      serialno: selectedAsset.serialNo || '',
      ItemLocation: selectedAsset.ItemLocation || '',
      StartDate: toDateStr(selectedAsset.StartDate),
      EndDate: toDateStr(selectedAsset.EndDate)
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

    
    <Box sx={{ p: 2, width: '100%' }}>
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
      {/* SEARCH (always enabled) */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 1.5 }}>
        <TextField
          size="small"
          placeholder="Search asset details..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          sx={{ 
            // Responsive widths based on screen sizes
            width: {
              xs: '100%',      // Mobile screens
              sm: 350,         // Tablets (iPad)
              md: 450,         // Laptops / Desktops
              lg: 450,         // Large monitors
            },
            maxWidth: '100%',
            '& .MuiInputBase-input': {
              padding: '12px 14px',
            }
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="medium" />
              </InputAdornment>
            ),
            endAdornment: searchText ? (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  aria-label="Clear search"
                  onClick={() => setSearchText('')}
                >
                  <ClearIcon fontSize="medium" />
                </IconButton>
              </InputAdornment>
            ) : null
          }}
        />


        {searchText.trim() && (
          <Typography variant="body2" color="text.secondary">
            Showing {displayedItems.length} of {currentJOItems?.length || 0}
          </Typography>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', ml: { md: 1 } }}>
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={visibleGroups.evaluation}
                onChange={() => toggleGroup('evaluation')}
              />
            }
            label="Evaluation details"
          />
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={visibleGroups.maintenance}
                onChange={() => toggleGroup('maintenance')}
              />
            }
            label="Maintenance details"
          />
        </Box>
      </Box>
      <TableContainer
        component={Paper}
        sx={{
          width: '100%',
          maxHeight: '72vh',
          overflowX: 'auto',
          overflowY: 'auto'
        }}
      >
        <Table
          stickyHeader
          sx={{
            tableLayout: 'fixed',
            width: totalWidth,
            minWidth: '100%',
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
              {visibleColumns.map((col) => {
                const isActive = sortConfig.key === col.id;
                return (
                  <TableCell
                    key={col.id}
                    sx={{
                      width: colWidths[col.id],
                      position: 'sticky',        // was: 'relative'
                      top: 0,
                      zIndex: 3,
                      backgroundColor: '#f5f5f5',
                      overflow: 'hidden',
                      whiteSpace: 'wrap',
                      userSelect: 'none',
                      ...getFrozenSx(col.id, true),   // Action + Asset No. get left + higher z-index
                    }}
                    sortDirection={isActive ? sortConfig.direction : false}
                  >
                    {col.sortable === false ? (
                      col.label
                    ) : (
                      <TableSortLabel
                        active={isActive}
                        direction={isActive ? sortConfig.direction : 'asc'}
                        onClick={() => handleSort(col.id)}
                      >
                        {col.label}
                      </TableSortLabel>
                    )}
                    {/* RESIZE HANDLE */}
                    <Box
                      onMouseDown={(e) => startResize(e, col.id)}
                      onClick={(e) => e.stopPropagation()}
                      sx={{
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        bottom: 0,
                        width: 8,
                        cursor: 'col-resize',
                        zIndex: 1,
                        '&::after': {
                          content: '""',
                          position: 'absolute',
                          top: '20%',
                          bottom: '20%',
                          right: 3,
                          width: '2px',
                          backgroundColor: 'rgba(0,0,0,0.2)'
                        },
                        '&:hover::after': {
                          backgroundColor: 'primary.main'
                        }
                      }}
                    />
                  </TableCell>
                );
              })}
            </TableRow>
          </TableHead>
          <TableBody>
            {displayedItems.length === 0 && (
              <TableRow>
                <TableCell colSpan={visibleColumns.length} align="center" sx={{ py: 3 }}>
                  <Typography variant="body2" color="text.secondary">
                    {searchText.trim() ? 'No items match your search.' : 'No items.'}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {displayedItems.map((row) => (
              
              <TableRow
                key={row.id}
                hover
              >
                {/* DELETE */}
                <TableCell sx={getFrozenSx('action')}>
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
                <TableCell sx={getFrozenSx('FAC_NO')}>
                  {(isReadOnly) ? (
                    <Box
                      sx={{
                        border: '1px solid rgba(0, 0, 0, 0.23)',
                        borderRadius: '4px',
                        padding: '8.5px 14px',
                        backgroundColor: '#f5f5f5',
                        minHeight: '40px',
                        width: '100%',
                        boxSizing: 'border-box',
                        display: 'flex',
                        alignItems: 'center',
                        cursor: 'pointer',
                        '&:hover': {
                          borderColor: 'rgba(0, 0, 0, 0.23)',
                        },
                      }}
                    >
                      <Link       
                        component="button"
                        underline="hover"
                        onClick={() => handleSelectItem(row.FAC_NO)}
                        sx={{
                          textAlign: "left",
                          fontWeight: 500,
                          maxWidth: '100%',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {row.FAC_NO}
                      </Link>
                    </Box>
                  ) : (
                    <Autocomplete   
                      fullWidth
                      options={getRowOptions(row)} 
                      noOptionsText={selectedDept ? 'No assets for this department' : 'Select a department first'}
                      loading={!assetsLoaded && isLoading}
                      filterOptions={filterOptions}
                      value={
                        assetOptions.find(opt => opt.FacNO === row.FAC_NO) || null
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
                            width: '100%'
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
                  )}
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
                      width: '100%'
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
                      width: '100%'
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
                        tableFieldFormat(state.isEditing), width: '100%'
                    }}
                  />
                </TableCell>
                {/* WORK DETAILS */}
                <TableCell>
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
                {/* BRAND */}
                <TableCell>
                  <TextField
                    size="small"
                    value={row.brand || ''}
                    disabled
                    sx={{
                      '& .MuiInputBase-root':
                        tableFieldFormat(state.isEditing), width: '100%',
                    }}
                  />
                </TableCell>
                {/* SERIAL */}
                <TableCell>
                  <TextField
                    size="small"
                    value={row.serialno || ''}
                    disabled
                    sx={{
                      '& .MuiInputBase-root':
                        tableFieldFormat(state.isEditing), width: '100%',
                    }}
                  />
                </TableCell>
                {/* LOCATION */}
                <TableCell>
                  <TextField
                    size="small"
                    value={row.ItemLocation || ''}
                    disabled
                    sx={{
                      '& .MuiInputBase-root':
                        tableFieldFormat(state.isEditing), width: '100%',
                    }}
                  />
                </TableCell>
                {/* Warranty Start Date */}
                <TableCell>
                  <TextField
                    size="small"
                    value={row.StartDate || ''}
                    disabled
                    fullWidth
                    sx={{
                      '& .MuiInputBase-root': tableFieldFormat(!isReadOnly),
                      width: '100%'
                    }}
                  />
                </TableCell>
                {/* Warranty End Date */}
                <TableCell>
                  <TextField
                    size="small"
                    value={row.EndDate || ''}
                    disabled
                    fullWidth
                    sx={{
                      '& .MuiInputBase-root': tableFieldFormat(!isReadOnly),
                      width: '100%'
                    }}
                  />
                </TableCell>
                {/* EVALUATION DETAILS */}
                {visibleGroups.evaluation && (
                  <>
                    <TableCell>
                      <TextField
                        size="small"
                        value={row.eval_status || 'Not started'}
                        disabled
                        fullWidth
                        sx={{ '& .MuiInputBase-root': tableFieldFormat(!isReadOnly), width: '100%' }}
                      />
                    </TableCell>
                    <TableCell>
                      <textarea
                        value={row.eval_remarks || ''}
                        disabled
                        className="w-full p-2 text-gray-400 bg-gray-100 border border-gray-300 rounded-md"
                      />
                    </TableCell>
                  </>
                )}

                {/* MAINTENANCE DETAILS */}
                {visibleGroups.maintenance && (
                  <>
                    <TableCell>
                      <TextField
                        size="small"
                        value={row.Main_Status || 'OPEN'}
                        disabled
                        fullWidth
                        sx={{ '& .MuiInputBase-root': tableFieldFormat(!isReadOnly), width: '100%' }}
                      />
                    </TableCell>
                    <TableCell>
                      <textarea
                        value={row.Main_Remarks || ''}
                        disabled
                        className="w-full p-2 text-gray-400 bg-gray-100 border border-gray-300 rounded-md"
                      />
                    </TableCell>
                  </>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* BUTTONS */}
      <Box
        sx={{
          mt: 2,
          width: '100%',
          display: 'flex',
          flexWrap: 'wrap',
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