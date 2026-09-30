import * as React from 'react';
import PropTypes from 'prop-types';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Link from '@mui/material/Link';

// Joins the 5 detail tables (which carry FAC_NO) back to their headers,
// client-side, filtered to this one asset. See useCombinedDocPerFacNo.js
// for the field-name assumptions this currently relies on.
import { useCombinedDocPerFacNo } from '../../../hooks/combinedDocPerFacNo';
// Same date formatting SearchTransactionTable (searchTransTable.jsx) uses.
import DateDisplay from '../../../Utils/formatDateForInput';

// Mirrors the status code -> label mapping in searchTransTable.jsx's
// handleDocStatus, so this tab reads the same as the main search page.
const STATUS_LABELS = {
  0: 'Draft',
  3: 'For Approval',
  2: 'Partially Approved',
  1: 'Fully Approved',
  4: 'Rejected',
};

function getDocStatusLabel(status) {
  return STATUS_LABELS[status] ?? '';
}

// Same routing searchTransTable.jsx uses for its DocNo column, adapted to
// this component's field names (row.id is the doc number, row.docType is
// the type label) instead of DocNo/DocType.
function openDocumentPage(row) {
  const transNo = row.id;
  switch (row.docType) {
    case 'Job Order':
      return window.open(`/assetMovement/pages/JOFormPage?docId=${transNo}`, '_blank');
    case 'Transfer':
      return window.open(`/assetMovement/pages/TRFormPage?docId=${transNo}`, '_blank');
    case 'Disposal':
      return window.open(`/assetMovement/pages/ADFormPage?docId=${transNo}`, '_blank');
    case 'Asset Accountability':
      return window.open(`/assetMovement/pages/AAFormPage?docId=${transNo}`, '_blank');
    case 'Lost Asset':
      return window.open(`/assetMovement/pages/ALFormPage?docId=${transNo}`, '_blank');
    default:
      return;
  }
}

// NOTE ON FILTERING: useCombinedDocPerFacNo pulls all 5 detail tables and
// all 5 header tables into the browser and joins/filters them client-side,
// same cost tradeoff SearchTransactions has today. Worth revisiting as a
// server-side endpoint (see chat) once the field-name assumptions in that
// hook are confirmed and this is proven out end-to-end.
export default function AssetDisplayTrans({ facNo }) {
  const { transactions, isLoading, error } = useCombinedDocPerFacNo(facNo);

  const rows = React.useMemo(() => {
    if (!Array.isArray(transactions)) return [];
    return transactions.map((doc, index) => ({
      id: doc.transNo || index,
      docDate: doc.date,
      docType: doc.type,
      status: doc.status,
      remarks: doc.Remarks,
    }));
  }, [transactions]);

  return (
    <div className='w-full min-w-0 px-10'>
      <div className='pt-5 pb-5 text-[clamp(0.72rem,0.55rem+0.6vw,1rem)] shadow-sm shadow-slate-200 min-w-0'>
        {/*
          Fill available width with a minWidth floor instead of a fixed
          rem width, matching the other display tables. minWidth: 0 on the
          TableContainer lets it actually shrink and trigger its own
          horizontal scroll instead of pushing an ancestor wider.
        */}
        <TableContainer component={Paper} sx={{ width: '100%', minWidth: 0 }}>
          <Table
            sx={{
              minWidth: 500,
              width: '100%',
              '& .MuiTableCell-root': {
                fontSize: 'clamp(0.72rem, 0.6rem + 0.45vw, 0.875rem)',
              },
            }}
            aria-label="asset transaction history table"
          >
            <TableHead>
              <TableRow sx={{ color: 'text.primary' }}>
                <TableCell>Document No.</TableCell>
                <TableCell>Document Date</TableCell>
                <TableCell>Document Type</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Remarks</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1 }}>
                      <CircularProgress size={20} />
                      <Typography variant="body2">Loading transactions...</Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="error">
                      Failed to load transaction history.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      No transactions found for this asset.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow
                    key={row.id}
                    sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                  >
                    <TableCell
                      sx={{
                        fontWeight: 'bold',
                        color: 'primary.main',
                        textDecoration: 'underline',
                        '&:hover': { fontSize: '.9rem', color: '#43a047' },
                      }}
                    >
                      <Link
                        component="button"
                        variant="body2"
                        underline="hover"
                        onClick={() => openDocumentPage(row)}
                      >
                        {row.id}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <DateDisplay value={row.docDate} format="short" />
                    </TableCell>
                    <TableCell>{row.docType}</TableCell>
                    <TableCell>{getDocStatusLabel(row.status)}</TableCell>
                    <TableCell>{row.remarks}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </div>
    </div>
  );
}

AssetDisplayTrans.propTypes = {
  facNo: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};