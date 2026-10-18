import { useMemo, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Paper,
  TextField,
  InputAdornment,
  IconButton,
  Typography,
  Button,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import AddIcon from '@mui/icons-material/Add';

/**
 * Reusable editable line-items grid for any document (Job Order, Transfer,
 * Disposal, Asset Accountability, Lost Asset ...).
 *
 * The page supplies the columns and how each cell renders; this component
 * handles search, sort, resize, frozen columns, optional column groups,
 * scrolling and the "Add Row" button.
 *
 *   <LineItemsTable
 *     rows={items}
 *     columns={[
 *       { id: 'FAC_NO', label: 'Asset No.', width: 220, render: (row) => <MyAssetPicker row={row} /> },
 *       { id: 'qty',    label: 'Qty',       width: 80,  type: 'number', render: (row) => ... },
 *       { id: 'eval_status', label: 'Eval Status', width: 160, group: 'evaluation', render: ... },
 *     ]}
 *     groups={[{ key: 'evaluation', label: 'Evaluation details' }]}
 *     frozenColumns={['no', 'action', 'FAC_name']}
 *     searchFields={['FAC_NO', 'FAC_name']}
 *     isReadOnly={isReadOnly}
 *     onAddRow={addDetailRow}
 *   />
 *
 * Column options: id, label, width (px), type ('string' | 'number' | 'date'),
 * sortable (default true), group (optional toggle group), render(row, { lineNo }),
 * sortValue(row) (optional custom sort value).
 * A column with id 'no' renders the line number automatically if it has no render().
 */

const MIN_COL_WIDTH = 50;

const defaultSortValue = (row, col) => {
  const raw = col.sortValue ? col.sortValue(row) : row[col.id];
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

export default function LineItemsTable({
  rows = [],
  columns = [],
  getRowKey = (row) => row.id,
  searchFields = [],
  searchPlaceholder = 'Search line items...',
  frozenColumns = [],
  groups = [],
  isReadOnly = false,
  onAddRow,
  addLabel = 'Add Row',
  toolbarExtra = null,
  maxVisibleRows = 10,
  rowHeight = 46,
  headerHeight = 40,
  headerBg = '#f5f5f5',
  emptyText = 'No items.',
  scrollbarGap = 16, // px of space under the last row so the sideways scrollbar never covers it
}) {
  const [searchText, setSearchText] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
  const [colWidths, setColWidths] = useState(() =>
    columns.reduce((acc, c) => ({ ...acc, [c.id]: c.width || 120 }), {})
  );
  const [visibleGroups, setVisibleGroups] = useState(() =>
    groups.reduce((acc, g) => ({ ...acc, [g.key]: !!g.defaultVisible }), {})
  );

  const visibleColumns = useMemo(
    () => columns.filter((c) => !c.group || visibleGroups[c.group]),
    [columns, visibleGroups]
  );

  const widthOf = (c) => colWidths[c.id] ?? c.width ?? 120;
  const totalWidth = visibleColumns.reduce((sum, c) => sum + widthOf(c), 0);

  // ---------- Sort: asc -> desc -> off ----------
  const handleSort = (colId) =>
    setSortConfig((prev) => {
      if (prev.key !== colId) return { key: colId, direction: 'asc' };
      if (prev.direction === 'asc') return { key: colId, direction: 'desc' };
      return { key: null, direction: null };
    });

  // ---------- Resize ----------
  const startResize = useCallback(
    (e, colId) => {
      e.preventDefault();
      e.stopPropagation();
      const startX = e.clientX;
      const startWidth = colWidths[colId];
      const onMove = (ev) => {
        const next = Math.max(MIN_COL_WIDTH, startWidth + (ev.clientX - startX));
        setColWidths((prev) => ({ ...prev, [colId]: next }));
      };
      const onUp = () => {
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp);
    },
    [colWidths]
  );

  // ---------- Frozen (sticky-left) columns ----------
  const getFrozenSx = (colId, isHead = false) => {
    if (!frozenColumns.includes(colId)) return {};
    const left = frozenColumns
      .slice(0, frozenColumns.indexOf(colId))
      .filter((id) => visibleColumns.some((c) => c.id === id))
      .reduce((sum, id) => sum + (colWidths[id] || 0), 0);
    const isLast = colId === frozenColumns[frozenColumns.length - 1];
    return {
      position: 'sticky',
      left,
      zIndex: isHead ? 5 : 2,
      backgroundColor: isHead ? headerBg : '#fff',
      ...(isLast && { boxShadow: '2px 0 4px -2px rgba(0,0,0,0.25)' }),
    };
  };

  // Line number = position in the full list (stable while searching/sorting)
  const lineNoOf = useMemo(() => {
    const map = new Map();
    (rows || []).forEach((r, i) => map.set(getRowKey(r), i + 1));
    return map;
  }, [rows, getRowKey]);

  // ---------- Search + sort ----------
  const displayed = useMemo(() => {
    let items = Array.isArray(rows) ? [...rows] : [];
    const q = searchText.trim().toLowerCase();
    if (q && searchFields.length) {
      items = items.filter((row) =>
        searchFields.some((f) => String(row[f] ?? '').toLowerCase().includes(q))
      );
    }
    if (sortConfig.key && sortConfig.direction) {
      const col = columns.find((c) => c.id === sortConfig.key);
      const dir = sortConfig.direction === 'asc' ? 1 : -1;
      items.sort((a, b) => {
        const va = defaultSortValue(a, col);
        const vb = defaultSortValue(b, col);
        if (va === null && vb === null) return 0;
        if (va === null) return 1; // empty values always last
        if (vb === null) return -1;
        if (typeof va === 'string') return va.localeCompare(vb, undefined, { numeric: true }) * dir;
        return (va - vb) * dir;
      });
    }
    return items;
  }, [rows, searchText, searchFields, sortConfig, columns]);

  return (
    <Box sx={{ width: '100%', p: { xs: 0.5, md: 1 } }}>
      {/* Toolbar: search + group toggles + page extras. Wraps on tablets. */}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          mb: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: '1 1 260px', minWidth: 0 }}>
          <TextField
            variant="outlined" // stay boxed even under a theme that defaults to underlined
            size="small"
            placeholder={searchPlaceholder}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            sx={{
              width: { xs: '100%', sm: 320, lg: 400 },
              maxWidth: '100%',
              '& .MuiInputBase-root': { borderRadius: '8px', backgroundColor: '#fff', pl: 1.25, pr: 0.5 },
              '& .MuiInputBase-input': { padding: '9px 6px !important', fontSize: '0.875rem' },
              '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(0,0,0,0.18)' },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: searchText ? (
                <InputAdornment position="end">
                  <IconButton size="small" aria-label="Clear search" onClick={() => setSearchText('')}>
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : null,
            }}
          />
          {searchText.trim() && (
            <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
              {displayed.length} of {rows?.length || 0}
            </Typography>
          )}
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.5 }}>
          {groups.map((g) => (
            <FormControlLabel
              key={g.key}
              sx={{ mr: 1, '& .MuiFormControlLabel-label': { fontSize: '0.85rem' } }}
              control={
                <Checkbox
                  size="small"
                  checked={!!visibleGroups[g.key]}
                  onChange={() => setVisibleGroups((p) => ({ ...p, [g.key]: !p[g.key] }))}
                />
              }
              label={g.label}
            />
          ))}
          {toolbarExtra}
        </Box>
      </Box>

      <TableContainer
        component={Paper}
        variant="outlined"
        sx={{
          width: '100%',
          maxHeight: headerHeight + rowHeight * maxVisibleRows + scrollbarGap,
          overflow: 'auto',
        }}
      >
        <Table
          stickyHeader
          size="small"
          sx={{
            tableLayout: 'fixed',
            width: totalWidth,
            minWidth: '100%',
            '& .MuiTableCell-root': { p: '3px 6px', fontSize: '0.8125rem' },
            '& .MuiTableCell-head': { height: headerHeight, fontWeight: 'bold', lineHeight: 1.2 },
            '& .MuiTableBody-root .MuiTableRow-root': { height: rowHeight },
            // breathing room under the last row, so the horizontal scrollbar sits below the data
            '& .MuiTableBody-root .MuiTableRow-root:last-of-type .MuiTableCell-root': {
              paddingBottom: `${scrollbarGap}px`,
            },
          }}
        >
          <TableHead>
            <TableRow>
              {visibleColumns.map((col) => {
                const active = sortConfig.key === col.id;
                return (
                  <TableCell
                    key={col.id}
                    sortDirection={active ? sortConfig.direction : false}
                    sx={{
                      width: widthOf(col),
                      top: 0,
                      zIndex: 3,
                      backgroundColor: headerBg,
                      overflow: 'hidden',
                      userSelect: 'none',
                      ...getFrozenSx(col.id, true),
                    }}
                  >
                    {col.sortable === false ? (
                      col.label
                    ) : (
                      <TableSortLabel
                        active={active}
                        direction={active ? sortConfig.direction : 'asc'}
                        onClick={() => handleSort(col.id)}
                      >
                        {col.label}
                      </TableSortLabel>
                    )}
                    <Box
                      role="separator"
                      aria-label={`Resize ${col.label} column`}
                      onPointerDown={(e) => startResize(e, col.id)}
                      onClick={(e) => e.stopPropagation()}
                      sx={{
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        bottom: 0,
                        width: 8,
                        cursor: 'col-resize',
                        touchAction: 'none',
                        zIndex: 1,
                        '&::after': {
                          content: '""',
                          position: 'absolute',
                          top: '22%',
                          bottom: '22%',
                          right: 3,
                          width: '2px',
                          backgroundColor: 'rgba(0,0,0,0.2)',
                        },
                        '&:hover::after': { backgroundColor: 'primary.main' },
                      }}
                    />
                  </TableCell>
                );
              })}
            </TableRow>
          </TableHead>

          <TableBody>
            {displayed.length === 0 && (
              <TableRow>
                <TableCell colSpan={visibleColumns.length} align="center" sx={{ py: 3 }}>
                  <Typography variant="body2" color="text.secondary">
                    {searchText.trim() ? 'No items match your search.' : emptyText}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {displayed.map((row) => {
              const key = getRowKey(row);
              const lineNo = lineNoOf.get(key);
              return (
                <TableRow key={key} hover>
                  {visibleColumns.map((col) => (
                    <TableCell key={col.id} sx={getFrozenSx(col.id)}>
                      {col.render
                        ? col.render(row, { lineNo })
                        : col.id === 'no'
                          ? lineNo
                          : row[col.id] ?? ''}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {onAddRow && (
        <Box sx={{ mt: 1 }}>
          <Button size="small" startIcon={<AddIcon />} onClick={onAddRow} disabled={isReadOnly}>
            {addLabel}
          </Button>
        </Box>
      )}
    </Box>
  );
}

LineItemsTable.propTypes = {
  rows: PropTypes.array,
  columns: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      width: PropTypes.number,
      type: PropTypes.oneOf(['string', 'number', 'date']),
      sortable: PropTypes.bool,
      group: PropTypes.string,
      render: PropTypes.func,
      sortValue: PropTypes.func,
    })
  ).isRequired,
  getRowKey: PropTypes.func,
  searchFields: PropTypes.arrayOf(PropTypes.string),
  searchPlaceholder: PropTypes.string,
  frozenColumns: PropTypes.arrayOf(PropTypes.string),
  groups: PropTypes.arrayOf(
    PropTypes.shape({ key: PropTypes.string.isRequired, label: PropTypes.string.isRequired, defaultVisible: PropTypes.bool })
  ),
  isReadOnly: PropTypes.bool,
  onAddRow: PropTypes.func,
  addLabel: PropTypes.string,
  toolbarExtra: PropTypes.node,
  maxVisibleRows: PropTypes.number,
  rowHeight: PropTypes.number,
  headerHeight: PropTypes.number,
  headerBg: PropTypes.string,
  emptyText: PropTypes.string,
  scrollbarGap: PropTypes.number,
};