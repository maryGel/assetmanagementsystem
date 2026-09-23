import { useMemo, useState } from 'react';
import {
  Box, FormControlLabel, Link, Paper, Switch, Table, TableBody, TableCell,
  TableContainer, TableHead, TablePagination, TableRow, TableSortLabel, Typography,
} from '@mui/material';

// Report Headers, in the order requested:
// Document No | Document Type | Asset ID | Asset Name | Description | Asset Group |
// Category | Asset Class | (Department) | (Location) | Quantity | Acquisition Date |
// Purchase Price ($) | Status
//
// NOTE on 'AssetGroup': the filter sends AssetGrpCode (itemlist), but this column
// expects the *name* already joined server-side from refassetgroup.AssetGroup.
// The API response row should look like: { ...row, AssetGroup: 'Office Equipment' }
// even though the filter itself is keyed by AssetGrpCode.
const baseColumns = [
  ['DocNo', 'Document No'], ['DocType', 'Document Type'],
  ['FacNO', 'Asset ID'], ['FacName', 'Asset Name'], ['Description', 'Description'],
  ['AssetGroup', 'Asset Group'], ['CATEGORY', 'Category'], ['ItemClass', 'Asset Class'],
  ['balance_unit', 'Quantity'],
  ['Adate', 'Acquisition Date'], ['AAmount', 'Purchase Price (PHP)'], ['xxStats', 'Status'],
];
// Each value is an array of [field, label] pairs so one "Includes" checkbox
// can add more than one column (e.g. Work Details Info adds both the work
// order number and its date). The API is expected to return WorkOrderNo /
// WorkOrderDate on each row, sourced from jo_woe.workNo / jo_woe.xDate,
// matched to the row's FacNO (latest jo_woe entry per asset).
const optionalColumns = {
  department: [['Department', 'Department']], location: [['ItemLocation', 'Location']],
  holder: [['Holder', 'Holder']], brand: [['Brand', 'Brand']], serialNumber: [['serialNo', 'Serial Number']],
  writtenOff: [['writeOff', 'Written Off']],
  workOrderInfo: [['WorkOrderNo', 'Work Order'], ['WorkOrderDate', 'Work Order Date']],
};

const money = new Intl.NumberFormat('en-US');
const moneyColumns = ['AAmount'];
const dateColumns = ['Adate', 'WorkOrderDate'];

// Column set for a given set of "includes" toggles. Shared by the table and by the CSV export.
export const buildColumns = (includes) => [
  ...baseColumns,
  ...Object.entries(includes)
    .filter(([key, enabled]) => enabled && optionalColumns[key])
    .flatMap(([key]) => optionalColumns[key]),
];

// Formatted value for on-screen display (commas, localized dates, Yes/No).
export const displayValue = (key, value) => {
  if (moneyColumns.includes(key)) return money.format(Number(value || 0));
  if (dateColumns.includes(key) && value) return new Date(value).toLocaleDateString();
  if (key === 'writeOff') return Number(value) ? 'Yes' : 'No';
  return value ?? '';
};

// Value for CSV export - keep numbers as real numbers instead of comma-formatted strings.
export const exportValue = (key, value) => {
  if (moneyColumns.includes(key)) return Number(value || 0);
  if (dateColumns.includes(key) && value) return new Date(value).toLocaleDateString();
  if (key === 'writeOff') return Number(value) ? 'Yes' : 'No';
  return value ?? '';
};

const openAssetDisplay = (facNo) => {
  const path = `/assetFolder/assetMasterDisplay?copyFrom=${facNo}`;
  window.open(path, '_blank');
};

// Rows aren't guaranteed a unique single-field key: the same asset (FacNO) can
// appear on more than one document (DocNo/DocType), so the row key combines all three.
const rowKey = (row) => `${row.DocNo ?? ''}-${row.DocType ?? ''}-${row.FacNO}`;


const handleSelectItem = (row) => {
  const transNo = encodeURIComponent(row.DocNo);

  switch (row.DocType) {
    case 'Job Order':
      return window.open(`/assetMovement/pages/JOFormPage?docId=${transNo}`, '_blank');
    case 'Transfer Order Form':
      return window.open(`/assetMovement/pages/TRFormPage?docId=${transNo}`, '_blank');
    case 'Disposal Form':
      return window.open(`/assetMovement/pages/ADFormPage?docId=${transNo}`, '_blank');
    case 'Asset Accountability Form':
      return window.open(`/assetMovement/pages/AAFormPage?docId=${transNo}`, '_blank');
    case 'Lost Asset Form':
      return window.open(`/assetMovement/pages/ALFormPage?docId=${transNo}`, '_blank');
    default:
      return;
  }
};

export default function LineItemReportTable({
  rows = [],
  total = 0,
  page,
  pageSize,
  loading,
  includes,
  onPageChange,
  onPageSizeChange,
  onWorkOrderClick,
}) {
  const [dense, setDense] = useState(false);
  const [order, setOrder] = useState('asc');
  const [orderBy, setOrderBy] = useState('DocNo');

  const columns = useMemo(() => buildColumns(includes), [includes]);

  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => {
      const left = a[orderBy] ?? '';
      const right = b[orderBy] ?? '';
      const comparison = typeof left === 'number'
        ? left - right
        : String(left).localeCompare(String(right), undefined, { numeric: true });

      return order === 'asc' ? comparison : -comparison;
    }),
    [rows, order, orderBy],
  );

  const requestSort = (key) => {
    setOrder(orderBy === key && order === 'asc' ? 'desc' : 'asc');
    setOrderBy(key);
  };

  return (
    <Box sx={{ px: 2, pb: 2 }}>
      <Paper elevation={2}>
        <Box sx={{ p: 2 }}>
          <Typography variant="h6">Line Item Report</Typography>
        </Box>

        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader size={dense ? 'small' : 'medium'} sx={{ minWidth: 1600 }}>
            <TableHead>
              <TableRow>
                {columns.map(([key, label]) => (
                  <TableCell key={key} sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                    <TableSortLabel
                      active={orderBy === key}
                      direction={orderBy === key ? order : 'asc'}
                      onClick={() => requestSort(key)}
                    >
                      {label}
                    </TableSortLabel>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={columns.length} align="center">
                    Generating report…
                  </TableCell>
                </TableRow>
              ) : sortedRows.length ? (
                sortedRows.map((row) => (
                  <TableRow hover key={rowKey(row)}>
                    {columns.map(([key]) => (
                      <TableCell key={key} sx={{ whiteSpace: 'nowrap' }}>
                       {key === 'DocNo' ? (
                          <Link
                            component="button"
                            variant="body2"
                            underline="hover"
                            onClick={() => handleSelectItem(row)}
                          >
                            {displayValue(key, row[key])}
                          </Link>
                        ) : key === 'FacNO' ? (
                          <Link
                            component="button"
                            variant="body2"
                            underline="hover"
                            onClick={() => openAssetDisplay(row.FacNO)}
                          >
                            {displayValue(key, row[key])}
                          </Link>
                        ) : key === 'WorkOrderNo' && row.WorkOrderNo ? (
                          <Link
                            component="button"
                            variant="body2"
                            underline="hover"
                            onClick={() => onWorkOrderClick?.({
                              JO_No: row.DocNo,
                              workNo: row.WorkOrderNo,
                              wo_date: row.WorkOrderDate,
                            })}
                          >
                            {row.WorkOrderNo}
                          </Link>
                        ) : (
                          displayValue(key, row[key])
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} align="center">
                    Choose filters and select Go to generate a report.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(_, nextPage) => onPageChange(nextPage)}
          rowsPerPage={pageSize}
          onRowsPerPageChange={(event) => onPageSizeChange(Number(event.target.value))}
          rowsPerPageOptions={[10, 25, 50]}
        />
      </Paper>

      <FormControlLabel
        control={
          <Switch
            checked={dense}
            onChange={(event) => setDense(event.target.checked)}
          />
        }
        label="Dense padding"
        sx={{ mt: 1 }}
      />
    </Box>
  );
}