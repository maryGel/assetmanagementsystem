import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  TextField,
  IconButton,
  CircularProgress,
  Alert,
  Box,
  Typography,
  Snackbar,
  Autocomplete,
  Link,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

// Reusable grid (search, sort, resize, frozen columns, groups, add row)
import LineItemsTable from '../../../components/LineItemsTable';
// Hooks
import { useAssetMasterData } from '../../../hooks/assetMasterHooks';

// ----------------------------------------------
// Job Order specifics
// ----------------------------------------------

// Fields covered by the search box
const SEARCH_FIELDS = ['FAC_NO', 'FAC_name', 'Description', 'workDet', 'eval_remarks', 'Main_Remarks', 'serialno', 'brand', 'ItemLocation', 'Holder'];
// Columns frozen on the left while scrolling sideways
const FROZEN_COLS = ['no', 'action', 'FAC_name'];
// Optional column groups (hidden by default)
const GROUPS = [
  { key: 'evaluation', label: 'Evaluation details' },
  { key: 'maintenance', label: 'Maintenance details' },
];

// An asset can only be added while its itemlist status is ACTIVE
// (anything else means it still has a pending transaction)
const PENDING_TRANSACTION_MSG = 'cannot add with pending transaction';
const DUPLICATE_ASSET_MSG = 'Asset No. is already on another line';
const getXStatus = (asset) => String(asset?.xxStats ?? '').trim().toUpperCase();
const isActiveAsset = (asset) => getXStatus(asset) === '';

// Normalise any date value to YYYY-MM-DD (local), or '' if empty/invalid
const toDateStr = (value) => {
  if (!value) return '';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// ---------- One field look for every cell ----------
// Same height, border, radius and font everywhere. Explicitly "outlined" so the
// page's customTheme (which makes TextFields underlined) doesn't change them.
const FIELD_H = 32;
const BORDER = 'rgba(0,0,0,0.18)';

const fieldSx = (readOnly) => ({
  width: '100%',
  '& .MuiInputBase-root': {
    height: FIELD_H,
    fontSize: '0.8125rem',
    borderRadius: '6px',
    backgroundColor: readOnly ? '#f5f5f5' : '#fff',
  },
  '& .MuiInputBase-input': {
    padding: '0 8px !important',
    height: '100%',
    boxSizing: 'border-box',
    fontSize: '0.8125rem',
  },
  '& .MuiOutlinedInput-notchedOutline': { borderColor: BORDER },
  '& .MuiInputBase-input.Mui-disabled': { WebkitTextFillColor: 'rgba(0,0,0,0.6)' },
});
// Read-only display cells (Asset Name, UOM, Brand ...) always look read-only
const displaySx = () => fieldSx(true);
const inputSx = (readOnly) => fieldSx(readOnly);

// Autocomplete needs a few extra overrides to hit the same height
const autocompleteSx = {
  ...fieldSx(false),
  '& .MuiInputBase-root': {
    ...fieldSx(false)['& .MuiInputBase-root'],
    padding: '0 4px 0 0 !important',
  },
  '& .MuiAutocomplete-input': { padding: '0 8px !important' },
};

const LINE_PX = 17;   // one line of 13px text
const MAX_LINES = 3;  // grow up to 3 lines, then scroll inside the box
const PAD_Y = 12;     // top + bottom padding (py-1.5)

const textareaClass = (readOnly) =>
  `block w-full px-2 py-1.5 text-[0.8125rem] leading-[17px] border rounded-md resize-none ${
    readOnly ? 'bg-[#f5f5f5] text-black/60' : 'bg-white text-black'
  }`;
const textareaStyle = { borderColor: BORDER };

// Text box that starts one field tall and grows with its text up to 3 lines.
// Re-measures when the text changes or the column is resized.
function AutoTextarea({ value, ...props }) {
  const ref = useRef(null);
  const fit = () => {
    const el = ref.current;
    if (!el) return;
    const max = LINE_PX * MAX_LINES + PAD_Y + 2; // +2 = borders
    el.style.height = 'auto';
    const needed = el.scrollHeight + 2;
    el.style.height = `${Math.min(Math.max(needed, FIELD_H), max)}px`;
    el.style.overflowY = needed > max ? 'auto' : 'hidden';
  };
  useLayoutEffect(fit, [value]);
  useEffect(() => {
    if (!ref.current || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(fit);
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return <textarea ref={ref} rows={1} value={value} {...props} />;
}

// Pulls the asset record out of whatever shape GET /itemlist/:facNo returns
const extractAssetRecord = (res) => {
  if (!res) return null;
  if (Array.isArray(res)) return res[0] || null;
  if (Array.isArray(res.data)) return res.data[0] || null;
  return res.data || res.asset || res;
};

// ----------------------------------------------
// JOLineItems Component
// ----------------------------------------------
const JOLineItems = ({
  state,
  isReadOnly,
  currentHeader,
  currentJOItems,
  updateDetailRow,
  addDetailRow,
  handleDeleteClick,
}) => {
  const { allAssets, fetchAssets, fetchAssetByFacN0, isLoading } = useAssetMasterData();
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [assetOptions, setAssetOptions] = useState([]);
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  const fetchAttempted = useRef(false);
  // FacNOs the server reported as not ACTIVE when picked (the cached list can be stale)
  const [blockedFacNOs, setBlockedFacNOs] = useState({});
  // Text typed in each row's Asset No. box (used to explain why nothing can be picked)
  const [assetInputs, setAssetInputs] = useState({});

  const items = Array.isArray(currentJOItems) ? currentJOItems : [];

  // LOAD ASSETS (once)
  useEffect(() => {
    if (fetchAttempted.current || assetsLoaded) return;
    fetchAttempted.current = true;
    (async () => {
      try {
        await fetchAssets();
        setAssetsLoaded(true);
      } catch (error) {
        console.error(error);
        setSnackbar({ open: true, message: 'Failed to load assets', severity: 'error' });
      }
    })();
  }, [fetchAssets, assetsLoaded]);

  useEffect(() => {
    if (allAssets?.length > 0) {
      setAssetOptions(allAssets.map((a) => ({ ...a, FacNO: String(a.FacNO ?? '').trim() })));
    }
  }, [allAssets]);

  // Department currently selected in the JO header
  const selectedDept = String(currentHeader?.Department_Code || currentHeader?.Department || '')
    .trim()
    .toLowerCase();

  // Asset Nos already used on the OTHER lines of this job order
  const getUsedFacNOs = (rowId) =>
    new Set(items.filter((r) => r.id !== rowId && r.FAC_NO).map((r) => String(r.FAC_NO).trim()));

  // Per-row options: ACTIVE assets of the header department not used on another line,
  // plus the row's current asset so an existing value still displays.
  const getRowOptions = (row) => {
    const usedElsewhere = getUsedFacNOs(row.id);
    const deptOptions = selectedDept
      ? assetOptions.filter(
          (a) =>
            String(a.Department ?? '').trim().toLowerCase() === selectedDept &&
            isActiveAsset(a) &&
            !blockedFacNOs[a.FacNO] &&
            !usedElsewhere.has(a.FacNO)
        )
      : [];
    const current = assetOptions.find((opt) => opt.FacNO === row.FAC_NO);
    return current && !deptOptions.includes(current) ? [current, ...deptOptions] : deptOptions;
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
      if (assetOptions.some((a) => matches(a) && (!isActiveAsset(a) || blockedFacNOs[a.FacNO])))
        return PENDING_TRANSACTION_MSG;
      const usedElsewhere = getUsedFacNOs(row.id);
      if (assetOptions.some((a) => matches(a) && usedElsewhere.has(a.FacNO))) return DUPLICATE_ASSET_MSG;
    }
    return 'Asset not available';
  };

  const filterOptions = (options, { inputValue }) => {
    if (!inputValue) return options.slice(0, 20);
    const search = inputValue.toLowerCase();
    return options
      .filter((o) => o.FacName?.toLowerCase().includes(search) || o.FacNO?.toLowerCase().includes(search))
      .slice(0, 20);
  };

  const openAsset = (facNo) => window.open(`/assetFolder/assetMasterDisplay?copyFrom=${facNo}`, '_blank');

  // ASSET SELECT — re-checks the live status on the server before accepting
  const handleAssetSelect = async (rowId, selectedAsset) => {
    if (!selectedAsset) return;

    if (getUsedFacNOs(rowId).has(String(selectedAsset.FacNO).trim())) {
      setSnackbar({ open: true, message: DUPLICATE_ASSET_MSG, severity: 'warning' });
      return;
    }

    let latest = selectedAsset;
    let fullRecord = null;
    try {
      const fresh = extractAssetRecord(await fetchAssetByFacN0(selectedAsset.FacNO));
      if (fresh && typeof fresh === 'object') fullRecord = fresh;
      if (fresh && getXStatus(fresh)) latest = fresh;
    } catch (err) {
      console.error('Could not verify asset status, using cached list value:', err);
    }

    if (!isActiveAsset(latest)) {
      setBlockedFacNOs((prev) => ({ ...prev, [selectedAsset.FacNO]: true }));
      setSnackbar({ open: true, message: PENDING_TRANSACTION_MSG, severity: 'warning' });
      return;
    }
    setBlockedFacNOs((prev) => {
      if (!prev[selectedAsset.FacNO]) return prev;
      const { [selectedAsset.FacNO]: _removed, ...rest } = prev;
      return rest;
    });
    setAssetInputs((prev) => ({ ...prev, [rowId]: '' }));

    // Cached list row + full server record (non-empty values win)
    const src = {
      ...selectedAsset,
      ...Object.fromEntries(
        Object.entries(fullRecord || {}).filter(([, v]) => v !== null && v !== undefined && v !== '')
      ),
    };

    // itemlist -> jo_d mapping
    const updates = {
      FAC_NO: selectedAsset.FacNO || 'n ',
      FAC_name: src.FacName || '',
      qty: src.balance_unit || 1,
      UOM: src.Unit || '',
      brand: src.Brand || '',
      serialno: src.serialNo || src.serialno || '',
      ItemLocation: src.ItemLocation || '',
      StartDate: toDateStr(src.StartDate),
      EndDate: toDateStr(src.EndDate),
    };
    Object.entries(updates).forEach(([field, value]) => updateDetailRow(rowId, field, value));
  };

  // ---------- Column definitions (what each cell shows) ----------
  const display = (field) => (row) => (
    <TextField variant="outlined" size="small" value={row[field] || ''} disabled fullWidth sx={displaySx()} />
  );

  // Rebuilt every render so each cell always sees the latest row data and handlers
  const columns = [
      { id: 'no', label: 'No', width: 48, sortable: false },
      {
        id: 'action',
        label: '',
        width: 44,
        sortable: false,
        render: (row) => (
          <IconButton
            color="error"
            size="small"
            disabled={isReadOnly}
            aria-label="Delete line"
            onClick={() => handleDeleteClick(row.id)}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        ),
      },
      { id: 'FAC_name', label: 'Asset Name', width: 240, type: 'string', render: display('FAC_name') },
      {
        id: 'FAC_NO',
        label: 'Asset No.',
        width: 240,
        type: 'string',
        render: (row) =>
          isReadOnly ? (
            <Box
              sx={{
                border: `1px solid ${BORDER}`,
                borderRadius: '6px',
                px: 1,
                backgroundColor: '#f5f5f5',
                display: 'flex',
                alignItems: 'center',
                height: FIELD_H,
                boxSizing: 'border-box',
              }}
            >
              <Link
                component="button"
                underline="hover"
                onClick={() => openAsset(row.FAC_NO)}
                sx={{ textAlign: 'left', fontWeight: 500, fontSize: '0.8125rem', overflow: 'hidden', textOverflow: 'ellipsis' }}
              >
                {row.FAC_NO}
              </Link>
            </Box>
          ) : (
            <Autocomplete
              fullWidth
              size="small"
              options={getRowOptions(row)}
              noOptionsText={getNoOptionsText(row)}
              onInputChange={(e, value, reason) => {
                if (reason === 'input' || reason === 'clear') {
                  setAssetInputs((prev) => ({ ...prev, [row.id]: value }));
                }
              }}
              loading={!assetsLoaded && isLoading}
              filterOptions={filterOptions}
              value={row.FAC_NO ? assetOptions.find((opt) => opt.FacNO === row.FAC_NO) || null : null}
              onChange={(e, newValue) => handleAssetSelect(row.id, newValue)}
              getOptionLabel={(o) => (!o ? '' : typeof o === 'string' ? o : `${o.FacNO} - ${o.FacName}`)}
              isOptionEqualToValue={(o, v) => !!v && String(o?.FacNO || '') === String(v?.FacNO || v || '')}
              renderOption={(props, option) => {
                const { key, ...rest } = props;
                return (
                  <li key={key} {...rest}>
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                      <Typography variant="body2"><strong>{option.FacName}</strong></Typography>
                      <Typography variant="caption" color="text.secondary">{option.FacNO}</Typography>
                    </Box>
                  </li>
                );
              }}
              renderInput={(params) => (
                <TextField variant="outlined"
                  {...params}
                  placeholder={selectedDept ? 'Select Asset' : 'Select a department first'}
                  sx={autocompleteSx}
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {!assetsLoaded && isLoading && <CircularProgress size={14} />}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
          ),
      },
      {
        id: 'qty',
        label: 'Qty',
        width: 72,
        type: 'number',
        render: (row) => (
          <TextField variant="outlined"
            size="small"
            type="number"
            value={row.qty || ''}
            onChange={(e) => updateDetailRow(row.id, 'qty', e.target.value)}
            disabled={isReadOnly}
            fullWidth
            sx={inputSx(isReadOnly)}
          />
        ),
      },
      { id: 'UOM', label: 'UOM', width: 80, type: 'string', render: display('UOM') },
      {
        id: 'workDet',
        label: 'Work Details',
        width: 300,
        type: 'string',
        render: (row) => (
          <AutoTextarea
            value={row.workDet || ''}
            onChange={(e) => updateDetailRow(row.id, 'workDet', e.target.value)}
            disabled={isReadOnly}
            className={textareaClass(isReadOnly)}
            style={textareaStyle}
          />
        ),
      },
      {
        id: 'TargetDate',
        label: 'Target Date',
        width: 150,
        type: 'date',
        render: (row) => (
          <TextField variant="outlined"
            size="small"
            type="date"
            value={toDateStr(row.TargetDate)}
            onChange={(e) => updateDetailRow(row.id, 'TargetDate', e.target.value)}
            disabled={isReadOnly}
            fullWidth
            sx={inputSx(isReadOnly)}
          />
        ),
      },
      { id: 'brand', label: 'Brand', width: 120, type: 'string', render: display('brand') },
      { id: 'serialno', label: 'Serial No', width: 140, type: 'string', render: display('serialno') },
      { id: 'ItemLocation', label: 'Location', width: 140, type: 'string', render: display('ItemLocation') },
      { id: 'StartDate', label: 'Warranty From', width: 130, type: 'date', render: display('StartDate') },
      { id: 'EndDate', label: 'Warranty To', width: 130, type: 'date', render: display('EndDate') },

      // Evaluation details (optional group)
      {
        id: 'eval_status',
        label: 'Evaluation Status',
        width: 160,
        type: 'string',
        group: 'evaluation',
        render: (row) => (
          <TextField variant="outlined" size="small" value={row.eval_status || 'Not started'} disabled fullWidth sx={displaySx()} />
        ),
      },
      {
        id: 'eval_remarks',
        label: 'Evaluation Remarks',
        width: 260,
        type: 'string',
        group: 'evaluation',
        render: (row) => <AutoTextarea value={row.eval_remarks || ''} disabled className={textareaClass(true)} style={textareaStyle} />,
      },

      // Maintenance details (optional group)
      {
        id: 'Main_Status',
        label: 'Maintenance Status',
        width: 150,
        type: 'string',
        group: 'maintenance',
        render: (row) => (
          <TextField variant="outlined" size="small" value={row.Main_Status || 'OPEN'} disabled fullWidth sx={displaySx()} />
        ),
      },
      {
        id: 'Main_Remarks',
        label: 'Maintenance Remarks',
        width: 260,
        type: 'string',
        group: 'maintenance',
        render: (row) => <AutoTextarea value={row.Main_Remarks || ''} disabled className={textareaClass(true)} style={textareaStyle} />,
      },
  ];

  return (
    <Box sx={{ width: '100%' }}>
      {!assetsLoaded && isLoading && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, my: 1 }}>
          <CircularProgress size={18} />
          <Typography variant="body2">Loading assets...</Typography>
        </Box>
      )}

      <LineItemsTable
        rows={items}
        columns={columns}
        searchFields={SEARCH_FIELDS}
        searchPlaceholder="Search asset details..."
        frozenColumns={FROZEN_COLS}
        groups={GROUPS}
        isReadOnly={isReadOnly}
        onAddRow={addDetailRow}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((p) => ({ ...p, open: false }))}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((p) => ({ ...p, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default JOLineItems;