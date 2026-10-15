
import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { NumericFormat } from 'react-number-format';
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
  Select,
  MenuItem,
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
import formatWithCommas from '../../../Utils/formatWithCommas';
// import { getAutocompleteSx } from '../../../Utils/autocompleteStyles';  

// COLUMN CONFIG (width = default px width, resizable)
const MIN_COL_WIDTH = 50;
const COLUMNS = [
  { id: 'no',       label: 'No',      width: 60,  sortable: false },
  { id: 'action',       label: 'Action',      width: 70,  sortable: false },
  { id: 'ItemName',     label: 'Asset Name',  width: 300, type: 'string' },
  { id: 'ItemNo',       label: 'Asset No.',   width: 300, type: 'string' },
  { id: 'qty',          label: 'Qty',         width: 80,  type: 'number' },
  { id: 'Units',          label: 'UOM',         width: 110,  type: 'string' },
  { id: 'DteAqui',      label: 'Acquired Date',width: 150, type: 'date' },
  { id: 'unitcost',   label: 'Unit Cost', width: 170, type: 'number' },
  { id: 'Supplier',   label: 'Supplier', width: 200, type: 'string' },
  { id: 'serial',     label: 'Serial No',   width: 180, type: 'string' },
  { id: 'location',     label: 'Location',       width: 240, type: 'string' },
];

// Fields covered by the search box
const SEARCH_FIELDS = ['FAC_NO', 'FAC_name', 'Description'];

// Columns frozen on the left while scrolling sideways
const FROZEN_COLS = ['no', 'action', 'ItemName'];


const money = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

// An asset can only be added to a transfer while its itemlist status is ACTIVE
// (anything else means it still has a pending transaction)
const PENDING_TRANSACTION_MSG = 'cannot add with pending transaction';
const DUPLICATE_ASSET_MSG = 'Asset No. is already on another line';
// Reads the status field regardless of casing (xStatus / xstatus / XSTATUS ...)
const getXStatus = (asset) => {
  if (!asset) return '';
  const key = Object.keys(asset).find(k => k.toLowerCase() === 'xxstats');
  return key ? String(asset[key] ?? '').trim().toUpperCase() : '';
};
// Reads a field regardless of casing (SuppName / suppName / SUPPNAME ...)
const getField = (obj, name) => {
  if (!obj) return '';
  const key = Object.keys(obj).find(k => k.toLowerCase() === name.toLowerCase());
  return key ? obj[key] ?? '' : '';
};

const isActiveAsset = (asset) => getXStatus(asset) === '';

// Vertical scroll: show at most this many line items before the table scrolls
const MAX_VISIBLE_ROWS = 10;
const ROW_HEIGHT = 56;      // px, fixed body row height
const HEADER_HEIGHT = 56;   // px, header row height
// Extra space so the scrollbars never sit on top of the last column / last row
const SCROLLBAR_PADDING = 24;

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

const ALLineItems = ({
  state,
  rows = [],
  // dispatch,
  docStatus,
  isReadOnly,
  currentHeader,
  currentALItems,
  updateDetailRow,
  addDetailRow,
  removeDetailRow,
  handleDeleteClick
}) => {
  const {
    allAssets,
    fetchAssets,
    fetchAssetByFacN0, 
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
  // FacNOs the server reported as not ACTIVE when picked (the cached list can be stale)
  const [blockedFacNOs, setBlockedFacNOs] = useState({});
  // Text typed in each row's Asset No. box (used to explain why nothing can be picked)
  const [assetInputs, setAssetInputs] = useState({});

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
  
  // Department currently selected in the AA header
    const selectedDept = String(
      currentHeader?.Department_Code || currentHeader?.Dep || ''
    ).trim().toLowerCase();
  
    // Only assets that belong to the selected department
    const deptAssetOptions = useMemo(() => {
      if (!selectedDept) return [];   // force the user to pick a department first
      return assetOptions.filter(
        a => String(a.Department ?? '').trim().toLowerCase() === selectedDept
      );
    }, [assetOptions, selectedDept]);
  
    // Asset Nos already used on the OTHER lines of this job order
    const getUsedFacNOs = (rowId) =>
      new Set(
        (Array.isArray(currentALItems) ? currentALItems : [])
          .filter(r => r.id !== rowId && r.FAC_NO)
          .map(r => String(r.FAC_NO).trim())
      );
  
    // Per-row options: the filtered list, plus the row's current asset if it falls outside
    // the filter (e.g. loading an old AA), so MUI doesn't warn and the value still displays.
    // AA lines have no From Department, so assets are filtered by the AA header's department.
    const getRowOptions = (row) => {
      const usedElsewhere = getUsedFacNOs(row.id);
      // only ACTIVE assets of the header department that are not already on another line
      const deptOptions = selectedDept
        ? assetOptions.filter(a =>
            String(a.Department ?? '').trim().toLowerCase() === selectedDept &&
            isActiveAsset(a) && !blockedFacNOs[a.FacNO] &&
            !usedElsewhere.has(a.FacNO)
          )
        : [];
      const current = assetOptions.find(opt => opt.FacNO === row.FAC_NO);
      if (current && !deptOptions.includes(current)) {
        return [current, ...deptOptions];
      }
      return deptOptions;
    };
  
    // Message shown when the Asset No. dropdown has no options for a row
    const getNoOptionsText = (row) => {
      if (!selectedDept) return 'Select a department first';
  
      const q = String(assetInputs[row.id] || '').trim().toLowerCase();
      if (q) {
        const matches = (a) =>
          String(a.Department ?? '').trim().toLowerCase() === selectedDept &&
          (String(a.FacNO ?? '').toLowerCase().includes(q) ||
            String(a.FacName ?? '').toLowerCase().includes(q));
  
        const matchesPending = assetOptions.some(a =>
          matches(a) && (!isActiveAsset(a) || blockedFacNOs[a.FacNO])
        );
        if (matchesPending) return PENDING_TRANSACTION_MSG;
  
        const usedElsewhere = getUsedFacNOs(row.id);
        const matchesDuplicate = assetOptions.some(a =>
          matches(a) && usedElsewhere.has(a.FacNO)
        );
        if (matchesDuplicate) return DUPLICATE_ASSET_MSG;
      }
      return 'Asset not available';
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
        zIndex: isHead ? 5 : 2,                       // header cells must sit above body cells
        backgroundColor: isHead ? '#f5f5f5' : '#fff', // opaque, so scrolled content doesn't show through
        ...(isLastFrozen && { boxShadow: '2px 0 4px -2px rgba(0,0,0,0.25)' }),
      };
    };
  
    // FILTER + SORT (works in both edit and read-only mode)
    const displayedItems = useMemo(() => {
      let items = Array.isArray(currentALItems) ? [...currentALItems] : [];
  
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
    }, [currentALItems, searchText, sortConfig]);
  
  // ADD ROW
  const handleAddRow = () => {
    addDetailRow();
    // updateDetailRow(rowId, field, value);
  };

  // Line number = position in the full list, so it stays stable while searching/sorting
  const getLineNo = (row) => {
    const idx = Array.isArray(currentALItems)
      ? currentALItems.findIndex(r => r.id === row.id)
      : -1;
    return idx + 1;
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

  // Pulls the asset record out of whatever shape GET /itemlist/:facNo returns
  const extractAssetRecord = (res) => {
    if (!res) return null;
    if (Array.isArray(res)) return res[0] || null;
    if (Array.isArray(res.data)) return res.data[0] || null;
    return res.data || res.asset || res;
  };
  const handleAssetSelect =  async (rowId, selectedAsset) => {
    if (!selectedAsset) return;

    // the same Asset No. cannot be on two lines
    if (getUsedFacNOs(rowId).has(String(selectedAsset.FacNO).trim())) {
      setSnackbar({ open: true, message: DUPLICATE_ASSET_MSG, severity: 'warning' });
      return;
    }

    // Check the CURRENT xStatus of the selected FacNO on the server, because the
    // dropdown list is loaded once and can be out of date.
    let latest = selectedAsset;
    let fullRecord = null;   // complete itemlist row (the dropdown list only has a few columns)
    try {
      const fresh = extractAssetRecord(await fetchAssetByFacN0(selectedAsset.FacNO));
      if (fresh && typeof fresh === 'object') fullRecord = fresh;
      if (fresh && getXStatus(fresh)) latest = fresh;
    } catch (err) {
      console.error('Could not verify asset status, using cached list value:', err);
    }

    // DEBUG: shows exactly which record/status the check is looking at
    console.log('[xStatus check]', {
      FacNO: selectedAsset.FacNO,
      cachedXStatus: getXStatus(selectedAsset),
      latestXStatus: getXStatus(latest),
      latestFields: Object.keys(latest),
    });

    // never accept an asset that is not ACTIVE in itemlist
    if (!isActiveAsset(latest)) {
      setBlockedFacNOs(prev => ({ ...prev, [selectedAsset.FacNO]: true }));
      setSnackbar({ open: true, message: PENDING_TRANSACTION_MSG, severity: 'warning' });
      return;
    }
    setBlockedFacNOs(prev => {
      if (!prev[selectedAsset.FacNO]) return prev;
      const { [selectedAsset.FacNO]: _removed, ...rest } = prev;
      return rest;
    });
    setAssetInputs(prev => ({ ...prev, [rowId]: '' }));

    // Cached list row + the full record from the server (non-empty values win),
    // so fields missing from the dropdown list (balance_unit...) still fill in
    const src = {
      ...selectedAsset,
      ...Object.fromEntries(
        Object.entries(fullRecord || {}).filter(([, v]) => v !== null && v !== undefined && v !== '')
      ),
    };


    
    const updates = {
      ItemNo: selectedAsset.FacNO || 'n ',
      ItemName: selectedAsset.FacName || '',
      Qty: selectedAsset.balance_unit || 1,
      Units: selectedAsset.Unit || '',
      DteAqui: toDateStr(src.Adate),  
      Supplier: getField(src, 'SuppName'),
      serial: selectedAsset.serialNo || '',
      unitcost: selectedAsset.AAmount || '',
      location: selectedAsset.ItemLocation || ''
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
            Showing {displayedItems.length} of {currentALItems?.length || 0}
          </Typography>
        )}
      </Box>

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
            tableLayout: 'fixed',
            width: totalWidth,
            minWidth: '100%',
            '& .MuiTableCell-root': {
              padding: '4px 8px',
              fontSize: '0.875rem'
            },
            '& .MuiTableCell-head': {
              backgroundColor: '#f5f5f5',
              fontWeight: 'bold',
              height: HEADER_HEIGHT
            },
            '& .MuiTableBody-root .MuiTableRow-root': {
              height: ROW_HEIGHT
            },
            // padding after the last column so the vertical scrollbar doesn't cover its fields
            '& .MuiTableCell-root:last-of-type': {
              paddingRight: `${SCROLLBAR_PADDING}px`
            },
            // padding under the last row so the horizontal scrollbar doesn't cover its fields
            '& .MuiTableBody-root .MuiTableRow-root:last-of-type .MuiTableCell-root': {
              paddingBottom: `${SCROLLBAR_PADDING}px`
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
                {/* Line No */}
                <TableCell sx={getFrozenSx('no')}>
                  {getLineNo(row)}
                </TableCell>
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
                {/* ASSET NAME */}
                <TableCell sx={getFrozenSx('ItemName')}>
                  <TextField
                    size="small"
                    value={row.ItemName || ''}
                    disabled
                    fullWidth
                    sx={{
                      '& .MuiInputBase-root': tableFieldFormat(!isReadOnly),
                      width: 300
                    }}
                  />
                </TableCell>
                {/* ASSET NO */}
                <TableCell sx={{ minWidth: 300 }}>
                  {(isReadOnly) ? (
                    <Box
                      sx={{
                        border: '1px solid rgba(0, 0, 0, 0.23)',
                        borderRadius: '4px',
                        padding: '8.5px 14px',
                        backgroundColor: '#f5f5f5',
                        minHeight: '40px',
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
                        onClick={() => handleSelectItem(row.ItemNo)}
                        sx={{
                          textAlign: "left",
                          fontWeight: 500,
                          width: '100%',
                        }}
                      >
                        {row.ItemNo}
                      </Link>
                    </Box>
                  ) : (
                    <Autocomplete
                      fullWidth
                      disabled={isReadOnly}
                      options={getRowOptions(row)}
                      noOptionsText={getNoOptionsText(row)}
                      onInputChange={(event, value, reason) => {
                        if (reason === 'input' || reason === 'clear') {
                          setAssetInputs(prev => ({ ...prev, [row.id]: value }));
                        }
                      }}
                      loading={!assetsLoaded && isLoading}
                      filterOptions={filterOptions}
                      value={
                        row.ItemNo
                          ? assetOptions.find(opt => opt.FacNO === row.ItemNo) || null
                          : null
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
                      sx={{
                        borderRadius: 1,
                        backgroundColor: isReadOnly ? '#f5f5f5' : '#fff',
                        color: '#000',
                        '&:hover, .MuiTableRow-root:hover &': {
                          backgroundColor: isReadOnly ? '#f5f5f5' : '#fff',
                        },
                        '& .MuiSelect-select': { color: '#000', WebkitTextFillColor: '#000' },
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: isReadOnly ? 'rgba(0,0,0,0.23)' : 'rgba(0,0,0,0.5)',
                        },
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          size="small"
                          placeholder={selectedDept ? 'Select Asset' : 'Select a department first'}
                          sx={{
                            '& .MuiInputBase-root': {padding: .9},
                            width: '100%', border: 1, borderRadius: 1, 
                            borderColor: 'rgba(0,0,0,0.1)'
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
                    />
                  )}
                </TableCell>

                {/* QTY */}
                <TableCell>
                  <TextField
                    size="small"
                    type="number"
                    value={row.Qty || ''}
                    onChange={(e) =>
                      handleRowFieldChange(
                        row.id,
                        'Qty',
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
                {/* Units */}
                <TableCell>
                  <TextField
                    size="small"
                    value={row.Units || ''}
                    disabled
                    fullWidth
                    sx={{
                      '& .MuiInputBase-root':
                        tableFieldFormat(state.isEditing), width: '100%'
                    }}
                  />
                </TableCell>

               {/* Date Acquired */}
                <TableCell>
                  <TextField
                    size="small"
                    type='date'
                    value={toDateStr(row.DteAqui)}
                    disabled
                    fullWidth
                    sx={{
                      '& .MuiInputBase-root': tableFieldFormat(!isReadOnly),
                      width: '100%'
                    }}
                  />
                </TableCell>

                {/* Amount Acquired */}
                <TableCell>
                    <TextField
                    size="small"
                    value={formatWithCommas(row.unitcost) || ''}
                    disabled
                    fullWidth
                    sx={{
                        '& .MuiInputBase-root':
                        tableFieldFormat(state.isEditing), width: '100%'
                    }}
                    />
                </TableCell>
                
                {/* Supplier */}
                <TableCell>
                  <TextField
                    size="small"
                    value={row.Supplier || ''}
                    fullWidth
                    disabled
                    sx={{
                        '& .MuiInputBase-root': tableFieldFormat(!isReadOnly),
                        width: '100%'
                    }}
                  />
                </TableCell>
                {/* Serial No */}
                <TableCell>
                  <TextField
                    size="small"
                    value={row.serial || ''}
                    fullWidth
                    disabled
                    sx={{
                        '& .MuiInputBase-root': tableFieldFormat(!isReadOnly),
                        width: '100%'
                    }}
                  />
                </TableCell>  
                {/* location */}
                <TableCell>
                  <TextField
                    size="small"
                    value={row.location || ''}
                    fullWidth
                    disabled
                    sx={{
                        '& .MuiInputBase-root': tableFieldFormat(!isReadOnly),
                        width: '100%'
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

export default ALLineItems;
