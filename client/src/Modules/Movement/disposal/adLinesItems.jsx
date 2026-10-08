import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Link as RouterLink } from "react-router-dom";
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
  FormControlLabel,
  Dialog,
  DialogContent
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import UploadFileIcon from '@mui/icons-material/UploadFile';
// Axios Instance
import { api } from '../../../api/axios';
// Hooks
import { useAssetMasterData } from '../../../hooks/assetMasterHooks';
// Custom Utils
import { tableFieldFormat } from '../custom Utils/customLayout';


// Component
import MaintenanceDisposalDialog from './maintenanceDialog';


// COLUMN CONFIG (width = default px width, resizable)
const MIN_COL_WIDTH = 50;
const COLUMNS = [
  { id: 'no',       label: 'No',      width: 60,  sortable: false },
  { id: 'action',       label: 'Action',      width: 70,  sortable: false },
  { id: 'FAC_name',     label: 'Asset Name',  width: 300, type: 'string' },
  { id: 'FAC_NO',       label: 'Asset No.',   width: 300, type: 'string' },
  { id: 'qty',          label: 'Qty',         width: 80,  type: 'number' },
  { id: 'UOM',          label: 'UOM',         width: 110,  type: 'string' },
  { id: 'workDet',      label: 'Reason for Disposal',width: 400, type: 'string' },
  { id: 'Disposal_Type',   label: 'Disposal Type', width: 170, type: 'date' },
  { id: 'salvage_amount',   label: 'Salvage Amount', width: 170, type: 'date' },
  { id: 'brand',        label: 'Brand',       width: 180, type: 'string' },
  { id: 'serialno',     label: 'Serial No',   width: 180, type: 'string' },
  { id: 'imgTitle',     label: 'Image',       width: 240, type: 'string' },
];

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB (same limit as the server)

// Standard disposal picture: max 2 in x 2 in (600 x 600 px at 300 dpi).
const IMAGE_MAX_PX = 600;

// Scales the picture down to fit inside the 2 x 2 in box (never up) and places it on a
// square white canvas, so the whole picture is kept - nothing is cropped or cut off -
// and the uploaded file is always small and square. Output is a JPEG.
const normalizeImage = async (file) => {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(IMAGE_MAX_PX / bitmap.width, IMAGE_MAX_PX / bitmap.height, 1);
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const side = Math.max(w, h);

  const canvas = document.createElement('canvas');
  canvas.width = side;
  canvas.height = side;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, side, side);
  ctx.drawImage(bitmap, Math.round((side - w) / 2), Math.round((side - h) / 2), w, h);
  if (bitmap.close) bitmap.close();

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
  if (!blob) throw new Error('Could not process image');
  return new File([blob], `${file.name.replace(/\.[^.]+$/, '')}.jpg`, { type: 'image/jpeg' });
};

// Fields covered by the search box
const SEARCH_FIELDS = ['FAC_NO', 'FAC_name', 'Description', 'workDet', 'serialno', 'brand'];

// Columns frozen on the left while scrolling sideways
const FROZEN_COLS = ['no', 'action', 'FAC_name'];

// Line fields that come from the selected asset. They are all cleared when the
// line's From Department is changed or removed.
// const ROW_ASSET_FIELDS = [
//   'FAC_NO', 'FAC_name', 'qty', 'UOM', 'brand',
//   'serialNo', 'serialno', 'Date_Aq', 'Amount_aq', 'Holder', 'location',
// ];

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

// -----------------------------------
// Disposal Line items component
// -----------------------------------

const ADLineItems = ({
  state,
  rows = [],
  docStatus,
  isReadOnly,
  currentHeader,
  currentADItems,
  updateDetailRow,
  addDetailRow,
  removeDetailRow,
  handleDeleteClick,
  addDetailRowsFromMaintenance,
  onUploadingChange
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
  // FacNOs the server reported as not ACTIVE when picked (the cached list can be stale)
  const [blockedFacNOs, setBlockedFacNOs] = useState({});
  // Text typed in each row's Asset No. box (used to explain why nothing can be picked)
  const [assetInputs, setAssetInputs] = useState({});
  const [maintOpen, setMaintOpen] = useState(false);

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
  
  // Department currently selected in the AD header
    const selectedDept = String(
      currentHeader?.Department_Code || currentHeader?.Department || ''
    ).trim().toLowerCase();

    console.log(`selectedDept: ${selectedDept}`)
    console.log(currentHeader?.Department_Code, currentHeader?.Department)
  
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
        (Array.isArray(currentADItems) ? currentADItems : [])
          .filter(r => r.id !== rowId && r.FAC_NO)
          .map(r => String(r.FAC_NO).trim())
      );
  
    // Per-row options: the filtered list, plus the row's current asset if it falls outside
    // the filter (e.g. loading an old JO), so MUI doesn't warn and the value still displays.
    // JO lines have no From Department, so assets are filtered by the JO header's department.
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
      let items = Array.isArray(currentADItems) ? [...currentADItems] : [];
  
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
    }, [currentADItems, searchText, sortConfig]);

  // ADD ROW
  const handleAddRow = () => {
    addDetailRow();
    // updateDetailRow(rowId, field, value);
  };

  // Appends one new row per picked asset, filled with the data from the dialog
  // const addDetailRowsFromMaintenance = (picked) => {
  //   picked.forEach((r) =>
  //     addDetailRow({
  //       FAC_NO: r.FAC_NO,
  //       FAC_name: r.FAC_name,
  //       qty: r.qty,
  //       UOM: r.UOM,
  //       workDet: r.workDet,
  //       JO_No: r.JO_No,
  //     })
  //   );
  // };

  // Line number = position in the full list, so it stays stable while searching/sorting
  const getLineNo = (row) => {
    const idx = Array.isArray(currentADItems)
      ? currentADItems.findIndex(r => r.id === row.id)
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
  
  // IMAGE UPLOAD
  const [uploadingRows, setUploadingRows] = useState({});
  const [uploadProgress, setUploadProgress] = useState({}); // rowId -> 0..100
  const [previewImg, setPreviewImg] = useState(null);       // { src, title } for the full-size viewer

  // Tell the parent whether any image is still uploading (so Save can wait)
  useEffect(() => {
    onUploadingChange?.(Object.values(uploadingRows).some(Boolean));
  }, [uploadingRows, onUploadingChange]);

  const handleImageChange = async (rowId, e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow picking the same file again
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setSnackbar({ open: true, message: 'Please select an image file', severity: 'warning' });
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setSnackbar({ open: true, message: 'Image must be 5 MB or smaller', severity: 'warning' });
      return;
    }

    setUploadingRows(prev => ({ ...prev, [rowId]: true }));
    setUploadProgress(prev => ({ ...prev, [rowId]: 0 }));
    try {
      // fit inside 2 x 2 in before sending; fall back to the original file if the browser can't process it
      let toUpload = file;
      try {
        toUpload = await normalizeImage(file);
      } catch (resizeErr) {
        console.warn('Image resize skipped:', resizeErr);
      }
      const formData = new FormData();
      formData.append('image', toUpload);
      const res = await api.post('/ad_dRoute/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (ev) => {
          if (ev.total) {
            setUploadProgress(prev => ({ ...prev, [rowId]: Math.round((ev.loaded * 100) / ev.total) }));
          }
        },
      });
      // imgTitle = saved file name, imgItem = image data (for preview)
      updateDetailRow(rowId, 'imgTitle', res.data.imgTitle);
      updateDetailRow(rowId, 'imgItem', res.data.imgItem);
    } catch (err) {
      console.error('Image upload failed:', err);
      setSnackbar({
        open: true,
        message: err.response?.data?.error || 'Failed to upload image',
        severity: 'error',
      });
    } finally {
      setUploadingRows(prev => ({ ...prev, [rowId]: false }));
      setUploadProgress(prev => { const { [rowId]: _done, ...rest } = prev; return rest; });
    }
  };

  const handleImageRemove = (rowId) => {
    updateDetailRow(rowId, 'imgTitle', '');
    updateDetailRow(rowId, 'imgItem', '');
  };

  // ASSET SELECT

  // Pulls the asset record out of whatever shape GET /itemlist/:facNo returns
  const extractAssetRecord = (res) => {
    if (!res) return null;
    if (Array.isArray(res)) return res[0] || null;
    if (Array.isArray(res.data)) return res.data[0] || null;
    return res.data || res.asset || res;
  };

  const handleAssetSelect = async (rowId, selectedAsset) => {
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

    console.log('Selected asset for row:', rowId, selectedAsset);

    // Cached list row + the full record from the server (non-empty values win),
    // so fields missing from the dropdown list (balance_unit...) still fill in
    const src = {
      ...selectedAsset,
      ...Object.fromEntries(
        Object.entries(fullRecord || {}).filter(([, v]) => v !== null && v !== undefined && v !== '')
      ),
    };
    
    const updates = {
      FAC_NO: selectedAsset.FacNO || '',
      FAC_name: selectedAsset.FacName || '',
      qty: selectedAsset.balance_unit || 1,
      UOM: selectedAsset.Unit || '',
      brand: selectedAsset.Brand || '',
      serialno: selectedAsset.serialNo || '',
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
          placeholder="Search details..."
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
            Showing {displayedItems.length} of {currentADItems?.length || 0}
          </Typography>
        )}
      </Box>

      <TableContainer
        component={Paper}
        sx={{
          width: '100%',
          // header + 10 rows; anything beyond scrolls vertically
          maxHeight: HEADER_HEIGHT + ROW_HEIGHT * MAX_VISIBLE_ROWS,
          overflowX: 'auto',
          overflowY: 'auto',
          scrollbarGutter: 'stable',
          '& .MuiTable-root': {
            minWidth: { xs: 1800, xl: '100%' }
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
              <TableCell sx={getFrozenSx('FAC_name')}>
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
              {/* ASSET NO */}
              <TableCell >
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
                    row.FAC_NO
                      ? assetOptions.find(opt => opt.FacNO === row.FAC_NO) || null
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
                {/* Reason for Disposal */}
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

              {/* Disposal Type */}
              <TableCell>
                <Select
                  size="small"
                  value={row.Disposal_Type || ''}
                  fullWidth
                  disabled={isReadOnly}
                  onChange={(e) => {
                    handleRowFieldChange(row.id, 'Disposal_Type', e.target.value);
                    if (e.target.value === 'Dispose') {
                      handleRowFieldChange(row.id, 'salvage_amount', '');
                    }
                  }}
                  sx={{
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
                  displayEmpty
                  renderValue={(selected) =>
                    !selected ? <span style={{ color: '#666' }}>Select Type</span> : selected
                  }
                >
                  <MenuItem value="Selling">Selling</MenuItem>
                  <MenuItem value="Dispose">Dispose</MenuItem>
                </Select>
              </TableCell>

              {/* Salvage Amount with 2 decimal places */}
              <TableCell>
                <NumericFormat
                  customInput={TextField}
                  size="small"
                  value={row.salvage_amount || ''}
                  disabled={isReadOnly || row.Disposal_Type !== 'Selling'}
                  fullWidth
                  placeholder={row.Disposal_Type === 'Selling' ? "Enter amount" : "Select 'Selling' to enable"}
                  thousandSeparator={true}
                  decimalScale={2}
                  fixedDecimalScale={true}
                  allowNegative={false}
                  onValueChange={(values) => {
                    const { floatValue } = values;
                    handleRowFieldChange(row.id, 'salvage_amount', floatValue || '');
                  }}
                  sx={{
                    bgcolor: (isReadOnly)? '' : '#fff',
                    '.MuiTableRow-root:hover &': { bgcolor: (isReadOnly || row.Disposal_Type !== 'Selling') ? 'grey.100' : '#fff',
                  },
                      '& .MuiInputBase-root': tableFieldFormat(!isReadOnly),
                      width: '100%'
                  }}
                />
              </TableCell>
              
              {/* BRAND */}
              <TableCell>
                <TextField
                  size="small"
                  value={row.brand ?? row.Brand ?? ''}
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
                  value={row.serialno || ''}
                  fullWidth
                  disabled
                  sx={{
                      '& .MuiInputBase-root': tableFieldFormat(!isReadOnly),
                      width: '100%'
                  }}
                />
              </TableCell>     

              {/* IMAGE */}
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {uploadingRows[row.id] ? (
                    <Box
                      sx={{
                        width: 44, height: 44, flexShrink: 0, position: 'relative',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        border: '1px dashed rgba(0,0,0,0.3)', borderRadius: '4px', bgcolor: '#fafafa',
                      }}
                    >
                      <CircularProgress
                        size={30}
                        variant={uploadProgress[row.id] > 0 && uploadProgress[row.id] < 100 ? 'determinate' : 'indeterminate'}
                        value={uploadProgress[row.id] || 0}
                      />
                      {uploadProgress[row.id] > 0 && uploadProgress[row.id] < 100 && (
                        <Typography variant="caption" sx={{ position: 'absolute', fontSize: 9, fontWeight: 600 }}>
                          {uploadProgress[row.id]}%
                        </Typography>
                      )}
                    </Box>
                  ) : row.imgItem ? (
                    <Box
                      component="img"
                      src={row.imgItem}
                      alt={row.imgTitle || 'Asset'}
                      onClick={() => setPreviewImg({ src: row.imgItem, title: row.imgTitle || 'Asset image' })}
                      sx={{
                        width: 44,
                        height: 44,
                        objectFit: 'contain',   // show the whole picture, never crop it
                        bgcolor: '#fafafa',
                        borderRadius: '4px',
                        border: '1px solid rgba(0,0,0,0.23)',
                        cursor: 'zoom-in',
                        flexShrink: 0,
                      }}
                    />
                  ) : null}

                  <Typography
                    variant="body2"
                    noWrap
                    title={row.imgTitle || ''}
                    sx={{ flex: 1, minWidth: 0 }}
                  >
                    {uploadingRows[row.id]
                      ? (uploadProgress[row.id] >= 100 ? 'Processing image…' : 'Uploading image…')
                      : (row.imgTitle || (isReadOnly ? '' : 'No image'))}
                  </Typography>

                  {!isReadOnly && (
                    <>
                      <IconButton
                        size="small"
                        component="label"
                        disabled={!!uploadingRows[row.id]}
                        aria-label="Upload image"
                      >
                        <UploadFileIcon fontSize="small" />
                        <input
                          type="file"
                          hidden
                          accept="image/*"
                          onChange={(e) => handleImageChange(row.id, e)}
                        />
                      </IconButton>
                      {row.imgTitle && !uploadingRows[row.id] && (
                        <IconButton
                          size="small"
                          aria-label="Remove image"
                          onClick={() => handleImageRemove(row.id)}
                        >
                          <ClearIcon fontSize="small" />
                        </IconButton>
                      )}
                    </>
                  )}
                </Box>
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
          // justifyContent: 'space-betwee'
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
      {/* Maintenance button */}
        <Button variant="contained" size="small"
          onClick={() => setMaintOpen(true)}
          disabled={isReadOnly || !currentHeader?.Department_Code}>
          Maintenance
        </Button>
      </Box>



      <MaintenanceDisposalDialog
        open={maintOpen}
        onClose={() => setMaintOpen(false)}
        departmentCode={currentHeader?.Department_Code}
        department={currentHeader?.Department}
        existingAssets={(currentADItems || []).map(i => i.FAC_NO)}
        onAdd={addDetailRowsFromMaintenance}
      />

      {/* FULL-SIZE IMAGE VIEWER */}
      <Dialog open={!!previewImg} onClose={() => setPreviewImg(null)} maxWidth="lg">
        <DialogContent sx={{ p: 1, textAlign: 'center' }}>
          {previewImg && (
            <Box
              component="img"
              src={previewImg.src}
              alt={previewImg.title}
              sx={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' }}
            />
          )}
        </DialogContent>
      </Dialog>

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
export default ADLineItems;