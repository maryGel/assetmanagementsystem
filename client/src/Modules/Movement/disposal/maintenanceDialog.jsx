import { useState, useMemo, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  Checkbox, TextField, Autocomplete, Button, Box, Typography, CircularProgress, TablePagination
} from '@mui/material';
import InputAdornment from '@mui/material/InputAdornment';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import IconButton from '@mui/material/IconButton';


import { useJO_h } from '../../../hooks/useJO_h';
import { useJO_d } from '../../../hooks/useJO_d';

// Resizable columns (width = default px, drag the header edge to resize)
const MIN_COL_WIDTH = 50;
const SCROLLBAR_PADDING = 24; // px of breathing room before the scrollbars
const COLUMNS = [
  { id: 'no',          label: '#',                   width: 60 },
  { id: 'select',      label: 'Select All',          width: 130 },
  { id: 'JO_No',       label: 'JO No.',              width: 120 },
  { id: 'JO_Date',     label: 'JO Date',             width: 110 },
  { id: 'Sector_name', label: 'Maintenance',         width: 180 },
  { id: 'FAC_NO',      label: 'Asset no.',           width: 220 },
  { id: 'FAC_name',    label: 'Asset Name',          width: 200 },
  { id: 'qty',         label: 'Qty',                 width: 70, align: 'right' },
  { id: 'UOM',         label: 'UOM',                 width: 90 },
  { id: 'workDet',     label: 'Details of Work',     width: 320 },
  { id: 'Main_Status', label: 'Maintenance Status',  width: 160 },
  { id: 'Main_Remarks',label: 'Maintenance Remarks', width: 320 },
];

const wrapSx = { overflowWrap: 'anywhere' }; // long text wraps inside the (resizable) column

const FOR_DISPOSAL = 'for disposal';
const norm = (v) => String(v ?? '').trim().toLowerCase();
// A job order line already tied to a Disposal (jo_d.AD_No has a value) cannot be added again
const hasAdNo = (d) => String(d?.AD_No ?? '').trim() !== '';

/**
 * Dialog for pulling assets from Job Orders whose maintenance status is "For Disposal".
 *
 * Props
 *  - open / onClose
 *  - department: department selected on the Disposal page (jo_h Department / Department_Code)
 *  - existingAssets: array of FAC_NO already in the Disposal item list (to avoid duplicates)
 *  - onAdd(selectedRows): called with the chosen jo_d rows (enriched with JO_No / Sector_name)
 */
export default function MaintenanceDisposalDialog({ open, onClose, department, departmentCode, existingAssets = [], onAdd }) {
  const { joHeaders, isLoading: loadingH, joRefresh } = useJO_h();
  const { joDetails, isLoading: loadingD, joDetailsRefresh } = useJO_d();

  const [maintenance, setMaintenance] = useState([]); // Sector_name filter (multiple)
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState({}); // key -> row
  const [colWidths, setColWidths] = useState(() =>
    COLUMNS.reduce((acc, c) => ({ ...acc, [c.id]: c.width }), {})
  );

  const totalWidth = useMemo(
    () => COLUMNS.reduce((sum, c) => sum + (colWidths[c.id] || c.width), 0),
    [colWidths]
  );

  // Drag the right edge of a header cell to resize that column
  const startResize = useCallback((e, colId) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = colWidths[colId];

    const onMove = (ev) => {
      const next = Math.max(MIN_COL_WIDTH, startWidth + (ev.clientX - startX));
      setColWidths((prev) => ({ ...prev, [colId]: next }));
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

  // Pull fresh data and reset state every time the dialog opens
  useEffect(() => {
    if (open) {
      joRefresh();
      joDetailsRefresh();
      setSelected({});
      setSearch('');
      setMaintenance([]);
      setPage(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // JOs under the department selected in the Disposal page
  const deptJOs = useMemo(() => {
    const wanted = [department, departmentCode].map(norm).filter(Boolean);
    if (wanted.length === 0) return [];
    return (joHeaders || []).filter((h) =>
      [h.Department, h.Department_Code].some((d) => wanted.includes(norm(d)))
    );
  }, [joHeaders, department, departmentCode]);

  const maintenanceOptions = useMemo(
    () => [...new Set(deptJOs.map((h) => h.Sector_name).filter(Boolean))].sort(),
    [deptJOs]
  );

  // Back to the first page whenever the filters change
  useEffect(() => { setPage(0); }, [maintenance, search]);

  const existing = useMemo(() => new Set(existingAssets.map(norm)), [existingAssets]);

  // Line items (jo_d) of those JOs, status = For Disposal
  const rows = useMemo(() => {
    const headerByJO = new Map(deptJOs.map((h) => [h.JO_No, h]));
    const q = norm(search);

    return (joDetails || [])
      .filter((d) => headerByJO.has(d.JO_No))
      .filter((d) => norm(d.Main_Status) === FOR_DISPOSAL)
      .filter((d) => !hasAdNo(d))
      .map((d) => {
        const h = headerByJO.get(d.JO_No);
        return { ...d, Sector_name: h.Sector_name, JO_Date: h.xDate };
      })
      .filter((r) => maintenance.length === 0 || maintenance.includes(r.Sector_name))
      .filter((r) =>
        !q ||
        [r.JO_No, r.Sector_name, r.FAC_NO, r.FAC_name, r.workDet, r.Main_Remarks, r.Main_Remakrs]
          .some((v) => norm(v).includes(q))
      )
      .sort((a, b) => String(a.JO_No).localeCompare(String(b.JO_No)));
  }, [joDetails, deptJOs, maintenance, search]);

  const pagedRows = rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const rowKey = (r) => `${r.JO_No}|${r.FAC_NO}`;
  const isAlreadyAdded = (r) => existing.has(norm(r.FAC_NO));
  const selectableRows = rows.filter((r) => !isAlreadyAdded(r));

  const allSelected = selectableRows.length > 0 && selectableRows.every((r) => selected[rowKey(r)]);
  const someSelected = selectableRows.some((r) => selected[rowKey(r)]);

  const toggleRow = (r) => {
    const k = rowKey(r);
    setSelected((prev) => {
      const next = { ...prev };
      if (next[k]) delete next[k]; else next[k] = r;
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((prev) => {
      const next = { ...prev };
      if (allSelected) {
        selectableRows.forEach((r) => delete next[rowKey(r)]);
      } else {
        selectableRows.forEach((r) => { next[rowKey(r)] = r; });
      }
      return next;
    });
  };

  const selectedCount = Object.keys(selected).length;

  const handleAdd = () => {
    // safety net: never hand back a line that is already on a Disposal
    onAdd(Object.values(selected).filter((r) => !hasAdNo(r)));
    onClose();
  };

  const loading = loadingH || loadingD;
  const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : '');

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xxl" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>
        Select Assets for Disposal
        <Typography color="text.secondary">
          Department: {department || departmentCode || '— select a department first —'}
        </Typography>
      </DialogTitle>

      <DialogContent dividers>
        {/* Filters */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap',  gap: 5, mb: 2, paddingLeft: 3}}>
          <Autocomplete
            size="small"
            multiple
            limitTags={1}
            options={maintenanceOptions}
            value={maintenance}
            onChange={(e, v) => setMaintenance(v)}
            getOptionLabel={(option) => option}
            renderInput={(params) => <TextField {...params} variant="outlined" label="Maintenance" placeholder='Select Maintenance'/>}
            sx={{ minWidth: 360, marginRight: '1rem',   }}
          />
          <TextField
            size="small"
            placeholder="Search details..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            variant="outlined"
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
                padding: '9px 14px',
                }
            }}
            InputProps={{
                startAdornment: (
                <InputAdornment position="start">
                    <SearchIcon fontSize="medium" />
                </InputAdornment>
                ),
                endAdornment: search? (
                <InputAdornment position="end">
                    <IconButton
                    size="small"
                    aria-label="Clear search"
                    onClick={() => setSearch('')}
                    >
                    <ClearIcon fontSize="medium" />
                    </IconButton>
                </InputAdornment>
                ) : null
            }}
            
          />
        </Box>

        {!department && !departmentCode ? (
          <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
            Please select a department in the Disposal page first.
          </Typography>
        ) : loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
        ) : (
          <>
          <TableContainer
            sx={{
              maxHeight: 460,
              overflow: 'auto',
              scrollbarGutter: 'stable',
            }}
          >
            <Table
              size="small"
              stickyHeader
              sx={{
                tableLayout: 'fixed',
                width: totalWidth,
                minWidth: '100%',
                // space after the last column so the vertical scrollbar never covers its values
                '& .MuiTableCell-root:last-of-type': { paddingRight: `${SCROLLBAR_PADDING}px` },
                // space under the last row so the horizontal scrollbar never covers its values
                '& .MuiTableBody-root .MuiTableRow-root:last-of-type .MuiTableCell-root': {
                  paddingBottom: `${SCROLLBAR_PADDING}px`,
                },
              }}
            >
              <colgroup>
                {COLUMNS.map((col) => (
                  <col key={col.id} style={{ width: colWidths[col.id] }} />
                ))}
              </colgroup>
              <TableHead>
                <TableRow>
                  {COLUMNS.map((col) => (
                    <TableCell
                      key={col.id}
                      align={col.align}
                      sx={{
                        fontWeight: 700,
                        ...(col.id === 'select' && { py: 0, pl: 0.5 }),
                        overflow: 'hidden',
                        userSelect: 'none',
                      }}
                    >
                      {col.id === 'select' ? (
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Checkbox
                            size="small"
                            checked={allSelected}
                            indeterminate={!allSelected && someSelected}
                            onChange={toggleAll}
                          />
                          {col.label}
                        </Box>
                      ) : (
                        col.label
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
                            backgroundColor: 'rgba(0,0,0,0.2)',
                          },
                          '&:hover::after': { backgroundColor: 'primary.main' },
                        }}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      No assets with “For Disposal” status available.
                    </TableCell>
                  </TableRow>
                ) : pagedRows.map((r, i) => {
                  const added = isAlreadyAdded(r);
                  return (
                    <TableRow
                      key={rowKey(r)}
                      hover
                      selected={!!selected[rowKey(r)]}
                      onClick={() => { if (!added) toggleRow(r); }}
                      sx={added ? { opacity: 0.5 } : { cursor: 'pointer' }}
                    >
                      <TableCell>{page * rowsPerPage + i + 1}</TableCell>
                      <TableCell sx={{ py: 0, pl: 0.5 }}>
                        <Checkbox
                          size="small"
                          disabled={added}
                          checked={!!selected[rowKey(r)]}
                          onClick={(e) => e.stopPropagation()}
                          onChange={() => toggleRow(r)}
                        />
                      </TableCell>
                      <TableCell sx={wrapSx}>{r.JO_No}</TableCell>
                      <TableCell sx={wrapSx}>{fmtDate(r.JO_Date)}</TableCell>
                      <TableCell sx={wrapSx}>{r.Sector_name}</TableCell>
                      <TableCell sx={wrapSx}>{r.FAC_NO}{added ? ' (added)' : ''}</TableCell>
                      <TableCell sx={wrapSx}>{r.FAC_name}</TableCell>
                      <TableCell align="right" sx={wrapSx}>{r.qty}</TableCell>
                      <TableCell sx={wrapSx}>{r.UOM}</TableCell>
                      <TableCell sx={{ ...wrapSx, whiteSpace: 'pre-wrap' }}>{r.workDet}</TableCell>
                      <TableCell sx={wrapSx}>{r.Main_Status}</TableCell>
                      <TableCell sx={{ ...wrapSx, whiteSpace: 'pre-wrap' }}>{r.Main_Remarks ?? r.Main_Remakrs}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={rows.length}
            page={page}
            onPageChange={(e, p) => setPage(p)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
            rowsPerPageOptions={[5, 10, 25, 50]}
          />
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mr: 'auto' }}>
          {selectedCount} selected
        </Typography>
        <Button variant="outlined" color="inherit" onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleAdd} disabled={selectedCount === 0}>Add</Button>
      </DialogActions>
    </Dialog>
  );
}

MaintenanceDisposalDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  department: PropTypes.string,
  departmentCode: PropTypes.string,
  existingAssets: PropTypes.array,
  onAdd: PropTypes.func.isRequired,
};