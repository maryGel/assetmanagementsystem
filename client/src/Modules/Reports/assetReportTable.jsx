import { useMemo, useState } from 'react';
import {
  Box, FormControlLabel, Link, Paper, Switch, Table, TableBody, TableCell,
  TableContainer, TableHead, TablePagination, TableRow, TableSortLabel, Typography,
} from '@mui/material';


const baseColumns = [
  ['FacNO', 'Asset ID'], ['FacName', 'Asset Name'], ['Description', 'Description'],
  ['AssetGroup', 'Asset Group'], ['CATEGORY', 'Category'], ['ItemClass', 'Asset Class'],
  ['balance_unit', 'Quantity'],
  ['Adate', 'Acquisition Date'], ['AAmount', 'Purchase Price (PHP)'], ['Percent', 'Useful Life (Years)'],
  ['Depreciation', 'Depreciated Amount'], ['AccuDep', 'Accumulated Depreciation (PHP)'],
  ['Abre', 'Residual Value'], ['NetBookValue', 'Net Book Value (PHP)'], ['xxStats', 'Status'],
];
const optionalColumns = {
  department: ['Department', 'Department'], location: ['ItemLocation', 'Location'],
  holder: ['Holder', 'Holder'], brand: ['Brand', 'Brand'], serialNumber: ['serialNo', 'Serial Number'],
  writtenOff: ['writeOff', 'Written Off'],
};

const money = new Intl.NumberFormat('en-US');
const moneyColumns = ['AAmount', 'AccuDep', 'Abre', 'NetBookValue', 'Depreciation'];

// Column set for a given set of "includes" toggles. Shared by the table and by the Excel export.
export const buildColumns = (includes) => [
  ...baseColumns,
  ...Object.entries(includes)
    .filter(([key, enabled]) => enabled && optionalColumns[key])
    .map(([key]) => optionalColumns[key]),
];

// Formatted value for on-screen display (commas, localized dates, Yes/No).
export const displayValue = (key, value) => {
  if (moneyColumns.includes(key)) return money.format(Number(value || 0));
  if (key === 'Adate' && value) return new Date(value).toLocaleDateString();
  if (key === 'writeOff') return Number(value) ? 'Yes' : 'No';
  return value ?? '';
};

// Value for Excel export - keep numbers as real numbers instead of comma-formatted strings.
export const exportValue = (key, value) => {
  if (moneyColumns.includes(key)) return Number(value || 0);
  if (key === 'Adate' && value) return new Date(value).toLocaleDateString();
  if (key === 'writeOff') return Number(value) ? 'Yes' : 'No';
  return value ?? '';
};

const openAssetDisplay = (facNo) => {
  const path = `/assetFolder/assetMasterDisplay?copyFrom=${facNo}`;
  window.open(path, '_blank');
};

export default function AssetReportTable({ rows = [], total = 0, page, pageSize, loading, includes, onPageChange, onPageSizeChange }) {
  const [dense, setDense] = useState(false);
  const [order, setOrder] = useState('asc');
  const [orderBy, setOrderBy] = useState('FacNO');
  const columns = useMemo(() => buildColumns(includes), [includes]);
  const sortedRows = useMemo(() => [...rows].sort((a, b) => {
    const left = a[orderBy] ?? ''; const right = b[orderBy] ?? '';
    const comparison = typeof left === 'number' ? left - right : String(left).localeCompare(String(right), undefined, { numeric: true });
    return order === 'asc' ? comparison : -comparison;
  }), [rows, order, orderBy]);
  const requestSort = (key) => { setOrder(orderBy === key && order === 'asc' ? 'desc' : 'asc'); setOrderBy(key); };

  return (
    <Box sx={{ px: 2, pb: 2 }}>
      <Paper elevation={2}>
        <Box sx={{ p: 2 }}><Typography variant="h6">Asset Report</Typography></Box>
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader size={dense ? 'small' : 'medium'} sx={{ minWidth: 1800 }}>
            <TableHead>
              <TableRow>{columns.map(([key, label]) => <TableCell key={key} sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
              <TableSortLabel active={orderBy === key} direction={orderBy === key ? order : 'asc'} onClick={() => requestSort(key)}>{label}</TableSortLabel>
              </TableCell>)}
              </TableRow>
            </TableHead>
            <TableBody>{loading ? <TableRow><TableCell colSpan={columns.length} align="center">Generating report…</TableCell></TableRow>
              : sortedRows.length ? sortedRows.map((row) => <TableRow hover key={row.FacNO}>{columns.map(([key]) => <TableCell key={key} sx={{ whiteSpace: 'nowrap' }}>
                {key === 'FacNO'
                  ? <Link component="button" variant="body2" underline="hover" onClick={() => openAssetDisplay(row.FacNO)}>{displayValue(key, row[key])}</Link>
                  : displayValue(key, row[key])}
              </TableCell>)}</TableRow>)
              : <TableRow><TableCell colSpan={columns.length} align="center">Choose filters and select Go to generate a report.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination component="div" count={total} page={page} onPageChange={(_, nextPage) => onPageChange(nextPage)} rowsPerPage={pageSize}
          onRowsPerPageChange={(event) => onPageSizeChange(Number(event.target.value))} rowsPerPageOptions={[10, 25, 50]} />
      </Paper>
      <FormControlLabel control={<Switch checked={dense} onChange={(event) => setDense(event.target.checked)} />} label="Dense padding" sx={{ mt: 1 }} />
    </Box>
  );
}