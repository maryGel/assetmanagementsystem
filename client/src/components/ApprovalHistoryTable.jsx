import { useMemo } from 'react';
import PropTypes from 'prop-types';
import { useSearchParams } from 'react-router-dom';
import { TableContainer, Table, TableHead, TableBody, TableRow, TableCell, Paper } from '@mui/material';

import { useApprovalLogs } from '../hooks/useApprovalLogs';
import DateDisplay from '../Utils/formatDateForInput';
import { headerCellSx } from './tableHeaderStyle';

/**
 * Reusable approval history for any document.
 *
 *   <ApprovalHistoryTable docNo="DB-JO-0000090" modules={['Job Order']} />
 *
 * - docNo:   the document number (falls back to ?docId= in the URL).
 * - modules: approval_logs.Module values to include. Omit to match on docNo only.
 *
 * Logs are fetched when this mounts; give it a `key` that changes after an
 * approval (e.g. `${docNo}-${xpost}-${appStat}`) to refetch.
 */
export default function ApprovalHistoryTable({ docNo, modules, emptyMessage = 'No approval logs yet.' }) {
  const [searchParams] = useSearchParams();
  const trNo = docNo || searchParams.get('docId');

  const { approvalLogs, isLoading } = useApprovalLogs();

  const rows = useMemo(() => {
    if (!Array.isArray(approvalLogs) || !trNo) return [];
    return approvalLogs.filter(
      (log) => log.TRNO === trNo && (!modules?.length || modules.includes(log.Module))
    );
  }, [approvalLogs, trNo, modules]);

  return (
    <div className="w-full py-2">
      <TableContainer component={Paper} sx={{ width: '100%', overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 700, width: '100%' }} aria-label="approval history">
          <TableHead>
            <TableRow>
              {['Date', 'Level', 'Approver', 'Action', 'Remarks'].map((h) => (
                <TableCell key={h} sx={headerCellSx}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}>
                  {isLoading ? 'Loading approval logs…' : emptyMessage}
                </TableCell>
              </TableRow>
            )}
            {rows.map((row, index) => (
              <TableRow key={`${row.TRNO}-${row.APP_LEVEL}-${index}`} sx={{ '&:last-child td': { border: 0 } }}>
                <TableCell><DateDisplay value={row.DT} format="short" /></TableCell>
                <TableCell>{row.APP_LEVEL}</TableCell>
                <TableCell>{row.X_USER?.split('-')[1] ?? row.X_USER}</TableCell>
                <TableCell>{row.STAT}</TableCell>
                <TableCell>{row.REMARKS}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}

ApprovalHistoryTable.propTypes = {
  docNo: PropTypes.string,
  modules: PropTypes.arrayOf(PropTypes.string),
  emptyMessage: PropTypes.string,
};