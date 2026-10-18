import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

// MUI
import {
  Alert,
  Autocomplete,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  Link,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
} from '@mui/material';

import { CustomBtn } from '../../../Utils/groupbtns';
import { useMaintenanceReport } from '../../../hooks/useMaintenanceReport';
import { useJO_h } from '../../../hooks/useJO_h';
import WorkOrderDialog from '../../Movement/maintenance/workOrderDialog'; // adjust the path to where workOrderDialog.jsx lives

const headCell = 'font-semibold whitespace-nowrap bg-slate-100';

const fmtMoney = (n) => Number(n || 0).toLocaleString(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const fmtQty = (n) => Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 4 });

// Shows at most 2 lines of text; "See more" / "See less" only appears when the text is longer
function ClampedText({ text }) {
  const ref = useRef(null);
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (el && !expanded) setOverflowing(el.scrollHeight > el.clientHeight + 1);
  }, [text, expanded]);

  const clampStyle = expanded
    ? {}
    : { display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' };

  return (
    <div className="min-w-[220px] max-w-[320px]">
      <div ref={ref} style={clampStyle} className="break-words whitespace-pre-wrap">{text}</div>
      {(overflowing || expanded) && (
        <Link component="button" type="button" underline="hover" className="text-xs" onClick={() => setExpanded((v) => !v)}>
          {expanded ? 'See less' : 'See more'}
        </Link>
      )}
    </div>
  );
}

const openAsset = (facNo) => {
  const path = `/assetFolder/assetMasterDisplay?copyFrom=${encodeURIComponent(facNo)}`;
  window.open(path, '_blank');
};

const openJobOrder = (transNo) => {
  window.open(`/assetMovement/pages/JOFormPage?docId=${encodeURIComponent(transNo)}`, '_blank');
};

function MaintenanceReportPage({ setHeaderTitle }) {
  const {
    lookups, lookupsLoading, filters, rows, generated, isLoading, error,
    setFilter, go, clear, refresh,
  } = useMaintenanceReport();

  // "Includes": optional columns
  const [include, setInclude] = useState({
    maintenance: true,
    department: true,
    workOrder: true,
    jobOrder: true,
  });
  const toggleInclude = (key) => setInclude((prev) => ({ ...prev, [key]: !prev[key] }));

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [workOrderJo, setWorkOrderJo] = useState(null); // job order (header row) whose work order is open in the dialog
  const { updateJOHeader } = useJO_h(); // the work order dialog needs this to save the header

  useEffect(() => {
    if (setHeaderTitle) setHeaderTitle('Maintenance Report');
  }, [setHeaderTitle]);

  // Keep the current page when the report is refreshed, but never stay past the last page
  useEffect(() => {
    setPage((p) => Math.min(p, Math.max(0, Math.ceil(rows.length / rowsPerPage) - 1)));
  }, [rows, rowsPerPage]);

  // Go / Clear start again from the first page
  const handleGo = () => { setPage(0); go(); };
  const handleClear = () => { setPage(0); clear(); };

  // Totals cover ALL generated rows, not just the current page.
  // Expense is counted once per job order + work order + asset, so duplicate lines are not doubled.
  const { totalQty, totalExpense } = useMemo(() => {
    let qty = 0;
    let expense = 0;
    const seenWorkOrders = new Set();
    rows.forEach((r) => {
      qty += Number(r.Qty) || 0;
      if (r.workNo) {
        const woKey = `${r.JO_No}|${r.workNo}|${r.FAC_NO}`;
        if (!seenWorkOrders.has(woKey)) {
          seenWorkOrders.add(woKey);
          expense += Number(r.total_expense) || 0;
        }
      } else {
        expense += Number(r.total_expense) || 0;
      }
    });
    return { totalQty: qty, totalExpense: expense };
  }, [rows]);

  const pageRows = rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <div className="flex flex-col w-full gap-4 p-10 mt-10">
      {isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" role="status">
          <CircularProgress sx={{ color: 'white' }} />
        </div>
      )}

      <h1 className="font-semibold">Maintenance Report</h1>

      {/* Filters */}
      <Paper className="flex flex-col gap-4 p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          <Autocomplete
            size="small"
            options={lookups.statuses}
            loading={lookupsLoading}
            multiple
            disableCloseOnSelect
            limitTags={1}
            value={filters.statuses}
            onChange={(_, value) => setFilter('statuses', value)}
            renderInput={(params) => <TextField {...params} label="Item Status" />}
          />
          <Autocomplete
            size="small"
            options={lookups.items}
            loading={lookupsLoading}
            multiple
            disableCloseOnSelect
            limitTags={1}
            value={filters.items}
            onChange={(_, value) => setFilter('items', value)}
            getOptionLabel={(o) => `${o.FAC_NO} - ${o.FAC_name}`}
            isOptionEqualToValue={(o, v) => o.FAC_NO === v.FAC_NO}
            renderInput={(params) => <TextField {...params} label="Asset No - Asset Name" />}
          />
          <Autocomplete
            size="small"
            options={lookups.workOrders}
            loading={lookupsLoading}
            multiple
            disableCloseOnSelect
            limitTags={1}
            value={filters.workOrders}
            onChange={(_, value) => setFilter('workOrders', value)}
            renderInput={(params) => <TextField {...params} label="Work Order No." />}
          />
          <Autocomplete
            size="small"
            options={lookups.jobOrders}
            loading={lookupsLoading}
            multiple
            disableCloseOnSelect
            limitTags={1}
            value={filters.jobOrders}
            onChange={(_, value) => setFilter('jobOrders', value)}
            renderInput={(params) => <TextField {...params} label="Job Order No." />}
          />
          <Autocomplete
            size="small"
            options={lookups.maintenances}
            loading={lookupsLoading}
            multiple
            disableCloseOnSelect
            limitTags={1}
            value={filters.maintenances}
            onChange={(_, value) => setFilter('maintenances', value)}
            renderInput={(params) => <TextField {...params} label="Maintenance" />}
          />
          <Autocomplete
            size="small"
            options={lookups.departments}
            loading={lookupsLoading}
            multiple
            disableCloseOnSelect
            limitTags={1}
            value={filters.departments}
            onChange={(_, value) => setFilter('departments', value)}
            renderInput={(params) => <TextField {...params} label="Department" />}
          />
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="text-sm font-medium">Includes:</span>
          <FormControlLabel
            control={<Checkbox size="small" checked={include.maintenance} onChange={() => toggleInclude('maintenance')} />}
            label="Maintenance"
          />
          <FormControlLabel
            control={<Checkbox size="small" checked={include.department} onChange={() => toggleInclude('department')} />}
            label="Department"
          />
          <FormControlLabel
            control={<Checkbox size="small" checked={include.workOrder} onChange={() => toggleInclude('workOrder')} />}
            label="Work Order No"
          />
          <FormControlLabel
            control={<Checkbox size="small" checked={include.jobOrder} onChange={() => toggleInclude('jobOrder')} />}
            label="Job Order No"
          />

          <div className="flex gap-2 md:ml-auto">
            <CustomBtn variant="goBtn" iconType="go" onClick={handleGo} disabled={isLoading}>Go</CustomBtn>
            <CustomBtn variant="clearBtn" iconType="clear" onClick={handleClear}>Clear</CustomBtn>
            <CustomBtn variant="refreshBtn" iconType="refresh" onClick={refresh} disabled={isLoading}>Refresh</CustomBtn>
          </div>
        </div>
      </Paper>

      {error && <Alert severity="error">{error}</Alert>}

      {generated && rows.length === 0 && (
        <Alert severity="info">No records found for the selected filters.</Alert>
      )}

      {rows.length > 0 && (
        <Paper>
          <TableContainer className="max-h-[65vh]">
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell className={headCell}>Item Status</TableCell>
                  <TableCell className={headCell}>Asset No</TableCell>
                  <TableCell className={headCell}>Asset Name</TableCell>
                  <TableCell className={headCell} align="right">Qty</TableCell>
                  <TableCell className={headCell}>UOM</TableCell>
                  <TableCell className={headCell}>Details of Work</TableCell>
                  <TableCell className={headCell}>Evaluation</TableCell>
                  <TableCell className={headCell} align="right">Total Expense</TableCell>
                  {include.workOrder && <TableCell className={headCell}>Work Order</TableCell>}
                  {include.jobOrder && <TableCell className={headCell}>Job Order</TableCell>}
                  {include.maintenance && <TableCell className={headCell}>Maintenance</TableCell>}
                  {include.department && <TableCell className={headCell}>Department</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {pageRows.map((r, i) => (
                  <TableRow key={`${r.JO_No}|${r.FAC_NO}|${page * rowsPerPage + i}`} hover>
                    <TableCell>{r.Main_Status}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {r.FAC_NO ? (
                        <Link component="button" type="button" underline="hover" onClick={() => openAsset(r.FAC_NO)}>
                          {r.FAC_NO}
                        </Link>
                      ) : null}
                    </TableCell>
                    <TableCell>{r.FAC_name}</TableCell>
                    <TableCell align="right">{fmtQty(r.Qty)}</TableCell>
                    <TableCell>{r.UOM}</TableCell>
                    <TableCell><ClampedText text={r.workDet || ''} /></TableCell>
                    <TableCell>{r.eval_status}</TableCell>
                    <TableCell align="right">{fmtMoney(r.total_expense)}</TableCell>
                    {include.workOrder && (
                      <TableCell className="whitespace-nowrap">
                        {r.workNo ? (
                          <Link component="button" type="button" underline="hover" onClick={() => setWorkOrderJo({
                              JO_No: r.JO_No,
                              workNo: r.workNo,
                              wo_date: r.wo_date,
                              main_stat: r.main_stat,
                              Department_Code: r.Department_Name,
                              Sector_name: r.Sector_name,
                            })}>
                            {r.workNo}
                          </Link>
                        ) : null}
                      </TableCell>
                    )}
                    {include.jobOrder && (
                      <TableCell className="whitespace-nowrap">
                        {r.JO_No ? (
                          <Link component="button" type="button" underline="hover" onClick={() => openJobOrder(r.JO_No)}>
                            {r.JO_No}
                          </Link>
                        ) : null}
                      </TableCell>
                    )}
                    {include.maintenance && <TableCell>{r.Sector_name}</TableCell>}
                    {include.department && <TableCell>{r.Department_Name}</TableCell>}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Totals for the whole generated report */}
          <div className="flex flex-wrap items-center px-4 py-3 text-sm border-t gap-x-8 gap-y-1 bg-slate-50">
            <span>Total Quantity: <b>{fmtQty(totalQty)}</b></span>
            <span>Total Expense: <b>{fmtMoney(totalExpense)}</b></span>
          </div>

          <TablePagination
            component="div"
            count={rows.length}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
            rowsPerPageOptions={[10, 25, 50, 100]}
          />
        </Paper>
      )}

      {/* Work order dialog */}
      {workOrderJo && (
        <WorkOrderDialog
          open
          mode="edit"
          jo={workOrderJo}
          updateJOHeader={updateJOHeader}
          // Expenses can change inside the dialog, so refresh the report when it closes
          onClose={() => { setWorkOrderJo(null); if (generated) go(); }}
        />
      )}
    </div>
  );
}

export default MaintenanceReportPage;