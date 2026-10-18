import { useEffect, useMemo, useState } from 'react';

// MUI
import {
  Alert,
  Autocomplete,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Link,
  Paper,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
} from '@mui/material';

import { CustomBtn } from '../../../Utils/groupbtns'; 
import { useReturnSlip, isQtyValid, RS_STATUS } from '../../../hooks/useReturnItem_reducer';
import { useCompanyConfig } from '../../../hooks/useCompanyConfig';
import { api } from '../../../api/axios';

const headCell = 'font-semibold whitespace-nowrap bg-slate-100';

const statusChip = (xPosted) => (
  Number(xPosted) === RS_STATUS.POSTED
    ? <Chip label="Posted" color="success" size="small" />
    : <Chip label="Saved" color="warning" size="small" />
);

// Read-only list of return slip lines (search results and the opened slip).
// RSNo column replaces the checkbox column; it is a link when onOpen is given.
function SlipTable({ lines, onOpen, showStatus = false }) {
  return (
    <TableContainer component={Paper} className="max-h-[65vh]">
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell className={headCell}>#</TableCell>
            <TableCell className={headCell}>Slip No.</TableCell>
            <TableCell className={headCell}>Doc No.</TableCell>
            <TableCell className={headCell}>Asset No.</TableCell>
            <TableCell className={headCell}>Asset Name</TableCell>
            <TableCell className={headCell} align="right">Qty</TableCell>
            <TableCell className={headCell}>UOM</TableCell>
            <TableCell className={headCell}>Return Date</TableCell>
            <TableCell className={headCell}>Employee</TableCell>
            <TableCell className={headCell}>Department</TableCell>
            <TableCell className={headCell} align="right">Qty Return</TableCell>
            <TableCell className={headCell}>Serial No.</TableCell>
            <TableCell className={headCell}>Location</TableCell>
            {showStatus && <TableCell className={headCell}>Status</TableCell>}
          </TableRow>
        </TableHead>
        <TableBody>
          {lines.map((l, i) => (
            <TableRow key={l.id ?? `${l.RSNo}_${l.AAFNo}_${l.ItemNo}_${i}`} hover>
              <TableCell>{i + 1}</TableCell>
              <TableCell className="whitespace-nowrap">
                {onOpen ? (
                  <Link component="button" type="button" underline="hover" onClick={() => onOpen(l.RSNo)}>
                    {l.RSNo}
                  </Link>
                ) : l.RSNo}
              </TableCell>
              <TableCell>{l.AAFNo}</TableCell>
              <TableCell>{l.ItemNo}</TableCell>
              <TableCell>{l.ItemName}</TableCell>
              <TableCell align="right">{l.Qty}</TableCell>
              <TableCell>{l.Units}</TableCell>
              <TableCell>{l.returnDate}</TableCell>
              <TableCell>{l.empname}</TableCell>
              <TableCell>{l.dep}</TableCell>
              <TableCell align="right">{l.qtyToReturn}</TableCell>
              <TableCell>{l.serial}</TableCell>
              <TableCell>{l.location}</TableCell>
              {showStatus && <TableCell>{statusChip(l.xPosted)}</TableCell>}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

const escapeHtml = (v) => String(v ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

// Prints the return slip through a hidden iframe (no popup window, so no popup blocker)
const printReturnSlip = ({ rsNo, lines, receivedBy, returnedBy, company, logoUrl }) => {
  const rowsHtml = lines.map((l, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${escapeHtml(l.AAFNo)}</td>
      <td>${escapeHtml(l.ItemNo)}</td>
      <td>${escapeHtml(l.ItemName)}</td>
      <td class="r">${escapeHtml(l.Qty)}</td>
      <td>${escapeHtml(l.Units)}</td>
      <td>${escapeHtml(l.returnDate)}</td>
      <td>${escapeHtml(l.dep)}</td>
      <td class="r">${escapeHtml(l.qtyToReturn)}</td>
      <td>${escapeHtml(l.serial)}</td>
      <td>${escapeHtml(l.location)}</td>
    </tr>`).join('');

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(rsNo)}</title>
  <style>
    @page { size: A4 portrait; margin: 10mm; }
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 9px; color: #000; margin: 0; }
    .head { display: flex; align-items: center; gap: 12px; margin-bottom: 100px; }
    .head img { max-height: 60px; max-width: 160px; }
    .co { font-size: 11px; line-height: 1.4; }
    .co b { font-size: 14px; }
    h1 { text-align: center; font-size: 18px; letter-spacing: 2px; margin: 8px 0; }
    .meta { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; table-layout: auto; }
    th, td { border: 1px solid #444; padding: 3px 4px; text-align: left; vertical-align: top; word-break: break-word; }
    th { background: #eee; }
    .r { text-align: right; }
    .sign { display: flex; justify-content: space-between; gap: 40px; margin-top: 100px; }
    .sign div { flex: 1; text-align: center; }
    .line { border-bottom: 1px solid #000; min-height: 20px; padding-bottom: 2px; font-weight: bold; }
    .cap { font-size: 10px; margin-top: 3px; }
  </style>
</head>
<body>
  <div class="head">
    ${logoUrl ? `<img src="${escapeHtml(logoUrl)}" onerror="this.style.display='none'" />` : ''}
    <div class="co">
      <b>${escapeHtml(company?.Company)}</b><br />
      ${escapeHtml(company?.address)}<br />
      ${company?.CompTel ? `Tel: ${escapeHtml(company.CompTel)}` : ''}
    </div>
  </div>
  <h1>RETURN SLIP</h1>
  <div class="meta">
    <div><b>Slip No.:</b> ${escapeHtml(rsNo)}</div>
    <div><b>Date Printed:</b> ${escapeHtml(new Date().toLocaleDateString())}</div>
  </div>
  <table>
    <thead>
      <tr>
        <th>#</th><th>Doc No.</th><th>Asset No.</th><th>Asset Name</th>
        <th class="r">Qty</th><th>UOM</th><th>Return Date</th><th>Department</th>
        <th class="r">Qty Return</th><th>Serial No.</th><th>Location</th>
      </tr>
    </thead>
    <tbody>${rowsHtml}</tbody>
  </table>
  <div class="sign">
    <div>
      <div class="line">${escapeHtml(returnedBy)}</div>
      <div class="cap">Returned by</div>
    </div>
    <div>
      <div class="line">${escapeHtml(receivedBy)}</div>
      <div class="cap">Received by (Signatory)</div>
    </div>
  </div>
</body>
</html>`;

  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(html);
  doc.close();

  // Wait for the logo (if any) before opening the print dialog
  const pending = Array.from(doc.images)
    .filter((img) => !img.complete)
    .map((img) => new Promise((resolve) => { img.onload = resolve; img.onerror = resolve; }));

  Promise.all(pending).then(() => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    setTimeout(() => document.body.removeChild(iframe), 1000);
  });
};

// Search results: one row per return slip. Click the Slip No. to open it.
function SlipListTable({ slips, onOpen }) {
  return (
    <TableContainer component={Paper} className="max-h-[65vh]">
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell className={headCell}>#</TableCell>
            <TableCell className={headCell}>Slip No.</TableCell>
            <TableCell className={headCell}>Employee</TableCell>
            <TableCell className={headCell}>Department</TableCell>
            <TableCell className={headCell} align="right">Qty Returned</TableCell>
            <TableCell className={headCell}>Status</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {slips.map((s, i) => (
            <TableRow key={s.RSNo} hover>
              <TableCell>{i + 1}</TableCell>
              <TableCell className="whitespace-nowrap">
                <Link component="button" type="button" underline="hover" onClick={() => onOpen(s.RSNo)}>
                  {s.RSNo}
                </Link>
              </TableCell>
              <TableCell>{s.empname}</TableCell>
              <TableCell>{s.dep}</TableCell>
              <TableCell align="right">{Number(s.qtyToReturn)}</TableCell>
              <TableCell>{statusChip(s.xPosted)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function ReturnSlipPage({ setHeaderTitle, onDirtyChange }) {
  const { companyConfig } = useCompanyConfig();
  const [printOpen, setPrintOpen] = useState(false);
  const [receivedBy, setReceivedBy] = useState('');

  const {
    state,
    loadSearchLookups,
    setFilter,
    clearFilters,
    goSearch,
    openSlip,
    closeSlip,
    startCreate,
    cancelCreate,
    generate,
    toggleRow,
    toggleAll,
    updateRow,
    hideSnackbar,
    openSaveDialog,
    closeSaveDialog,
    openPostDialog,
    closePostDialog,
    confirmSave,
    confirmPost,
  } = useReturnSlip();

  const {
    mode, items, employees, lookupsLoading, filters,
    searchRows, searched, rows, generated, generating,
    rsNo, slipLines, saving, posting, saveDialogOpen, postDialogOpen, snackbar,
  } = state;

  // Default view is the search of existing return slips
  useEffect(() => {
    if (setHeaderTitle) setHeaderTitle('Return Slip');
    loadSearchLookups();
  }, [setHeaderTitle, loadSearchLookups]);

  const selectedRows = useMemo(() => rows.filter((r) => r.selected), [rows]);
  const allSelected = rows.length > 0 && selectedRows.length === rows.length;
  const someSelected = selectedRows.length > 0 && !allSelected;
  const canSave = selectedRows.length > 0 && selectedRows.every(isQtyValid) && !saving;
  const isPosted = slipLines.length > 0 && slipLines.every((l) => Number(l.xPosted) === RS_STATUS.POSTED);

  // "Returned by" comes from the slip's empname (assestacch EmpName)
  const returnedBy = [...new Set(slipLines.map((l) => (l.empname || '').trim()).filter(Boolean))].join(', ');

  // "Received by" defaults to the logged-in user but can be changed in the dialog
  const openPrintDialog = () => {
    setReceivedBy(localStorage.getItem('username') || '');
    setPrintOpen(true);
  };

  const handlePrint = () => {
    setPrintOpen(false);
    let logoUrl = '';
    try {
      if (companyConfig?.ReportHeader) {
        logoUrl = `${new URL(api.defaults.baseURL || '/', window.location.origin).origin}${companyConfig.ReportHeader}`;
      }
    } catch {
      logoUrl = '';
    }
    printReturnSlip({
      rsNo,
      lines: slipLines,
      receivedBy: receivedBy.trim(),
      returnedBy,
      company: companyConfig,
      logoUrl,
    });
  };

  // Tell the form-type wrapper when there is unsaved work (generated rows not yet saved)
  useEffect(() => {
    if (onDirtyChange) onDirtyChange(mode === 'create' && rows.length > 0);
  }, [onDirtyChange, mode, rows.length]);

  const filterFields = (
    <>
      <Autocomplete
        className="w-full md:w-1/3"
        size="small"
        options={items}
        loading={lookupsLoading}
        value={filters.item}
        onChange={(_, value) => setFilter('item', value)}
        getOptionLabel={(o) => `${o.ItemNo} - ${o.ItemName}`}
        isOptionEqualToValue={(o, v) => o.ItemNo === v.ItemNo}
        renderInput={(params) => <TextField {...params} label="Asset No - Asset Name" />}
      />
      <Autocomplete
        className="w-full md:w-1/3"
        size="small"
        options={employees}
        loading={lookupsLoading}
        value={filters.employee}
        onChange={(_, value) => setFilter('employee', value)}
        renderInput={(params) => <TextField {...params} label="Employee Name" />}
      />
    </>
  );

  const snackbarEl = (
    <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={hideSnackbar}>
      <Alert severity={snackbar.severity} onClose={hideSnackbar} variant="filled">{snackbar.message}</Alert>
    </Snackbar>
  );

  // ---------------- VIEW: one saved / posted slip ----------------
  if (mode === 'view') {
    return (
      <div className="flex flex-col w-full gap-4 p-10 mt-10">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-semibold">Return Slip: {rsNo}</h2>
          {statusChip(isPosted ? RS_STATUS.POSTED : RS_STATUS.DRAFT)}
          <CustomBtn variant="printBtn" iconType="print" onClick={openPrintDialog}>Print</CustomBtn>
          <div className="flex gap-2 ml-auto">
            {!isPosted && (
              <CustomBtn variant="postBtn" iconType="post" onClick={openPostDialog} disabled={posting}>
                {posting ? 'Posting…' : 'Post'}
              </CustomBtn>
            )}
            <CustomBtn variant="cancelBtn" iconType="cancel" onClick={closeSlip}>Close</CustomBtn>
          </div>
        </div>

        <SlipTable lines={slipLines} />

        <Dialog open={postDialogOpen} onClose={closePostDialog}>
          <DialogTitle>Post Return Slip?</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Return Slip {rsNo} will be posted and can no longer be edited.
            </DialogContentText>
          </DialogContent>
          <DialogActions className="gap-2 p-4">
            <CustomBtn variant="cancelBtn" iconType="cancel" onClick={closePostDialog}>Cancel</CustomBtn>
            <CustomBtn variant="postBtn" iconType="post" onClick={confirmPost}>Post</CustomBtn>
          </DialogActions>
        </Dialog>

        <Dialog open={printOpen} onClose={() => setPrintOpen(false)} fullWidth maxWidth="sm">
          <DialogTitle>Review Signatories</DialogTitle>
          <DialogContent className="flex flex-col gap-4" sx={{ paddingTop: '16px !important' }}>
            <TextField
              size="small"
              label="Returned by"
              value={returnedBy}
              InputProps={{ readOnly: true }}
              fullWidth
            />
            <TextField
              size="small"
              label="Received by (Signatory)"
              value={receivedBy}
              onChange={(e) => setReceivedBy(e.target.value)}
              autoFocus
              fullWidth
            />
          </DialogContent>
          <DialogActions className="gap-2 p-4">
            <CustomBtn variant="cancelBtn" iconType="cancel" onClick={() => setPrintOpen(false)}>Cancel</CustomBtn>
            <CustomBtn variant="printBtn" iconType="print" onClick={handlePrint} disabled={!receivedBy.trim()}>Print</CustomBtn>
          </DialogActions>
        </Dialog>

        {snackbarEl}
      </div>
    );
  }

  // ---------------- CREATE: generate borrowed assets, check, save ----------------
  if (mode === 'create') {
    return (
      <div className="flex flex-col w-full gap-4 p-10 mt-10">
        {saving && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" role="status">
            <CircularProgress sx={{ color: 'white' }} />
          </div>
        )}

        <h1 className="font-semibold">New Return Slip</h1>

        <Paper className="flex flex-col gap-3 p-4 md:flex-row md:items-center">
          {filterFields}
          <CustomBtn
            variant="goBtn"
            iconType="go"
            onClick={generate}
            disabled={generating || (!filters.item && !filters.employee)}
          >
            {generating ? 'Generating…' : 'Generate'}
          </CustomBtn>
          <CustomBtn variant="cancelBtn" iconType="cancel" onClick={cancelCreate}>Cancel</CustomBtn>
        </Paper>

        {generated && rows.length === 0 && (
          <Alert severity="info">No borrowed assets found for the selected filter.</Alert>
        )}

        {rows.length > 0 && (
          <>
            <TableContainer component={Paper} className="max-h-[60vh]">
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell className={headCell}>#</TableCell>
                    <TableCell className={headCell} padding="checkbox">
                      <Checkbox
                        checked={allSelected}
                        indeterminate={someSelected}
                        onChange={toggleAll}
                        inputProps={{ 'aria-label': 'Select all' }}
                      />
                    </TableCell>
                    <TableCell className={headCell}>Doc No.</TableCell>
                    <TableCell className={headCell}>Asset No.</TableCell>
                    <TableCell className={headCell}>Asset Name</TableCell>
                    <TableCell className={headCell} align="right">Qty</TableCell>
                    <TableCell className={headCell}>UOM</TableCell>
                    <TableCell className={headCell}>Return Date</TableCell>
                    <TableCell className={headCell}>Employee</TableCell>
                    <TableCell className={headCell}>Department</TableCell>
                    <TableCell className={headCell} align="right">Qty Return</TableCell>
                    <TableCell className={headCell}>Serial No.</TableCell>
                    <TableCell className={headCell}>Location</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((r, i) => {
                    const qtyBad = r.selected && !isQtyValid(r);
                    return (
                      <TableRow key={r.id} hover selected={r.selected}>
                        <TableCell>{i + 1}</TableCell>
                        <TableCell padding="checkbox">
                          <Checkbox checked={r.selected} onChange={() => toggleRow(r.id)} />
                        </TableCell>
                        <TableCell>{r.AAFNo}</TableCell>
                        <TableCell>{r.ItemNo}</TableCell>
                        <TableCell>{r.ItemName}</TableCell>
                        <TableCell align="right">{r.Qty}</TableCell>
                        <TableCell>{r.Units}</TableCell>
                        <TableCell>
                          <TextField
                            type="date"
                            size="small"
                            value={r.returnDate}
                            onChange={(e) => updateRow(r.id, 'returnDate', e.target.value)}
                            disabled={!r.selected}
                          />
                        </TableCell>
                        <TableCell>{r.empname}</TableCell>
                        <TableCell>{r.dep}</TableCell>
                        <TableCell align="right">
                          <TextField
                            size="small"
                            value={r.qtyToReturn}
                            onChange={(e) => updateRow(r.id, 'qtyToReturn', e.target.value)}
                            disabled={!r.selected}
                            error={qtyBad}
                            helperText={qtyBad ? `1 to ${r.Qty}` : ''}
                            inputProps={{ inputMode: 'decimal', style: { textAlign: 'right', width: 70 } }}
                          />
                        </TableCell>
                        <TableCell>{r.serial}</TableCell>
                        <TableCell>{r.location}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">
                {selectedRows.length} of {rows.length} selected
              </span>
              <div className="ml-auto">
                <CustomBtn variant="saveBtn" iconType="save" onClick={openSaveDialog} disabled={!canSave}>
                  Save
                </CustomBtn>
              </div>
            </div>
          </>
        )}

        <Dialog open={saveDialogOpen} onClose={closeSaveDialog}>
          <DialogTitle>Save Return Slip?</DialogTitle>
          <DialogContent>
            <DialogContentText>
              {selectedRows.length} asset(s) will be saved on a new return slip. You can post it after saving.
            </DialogContentText>
          </DialogContent>
          <DialogActions className="gap-2 p-4">
            <CustomBtn variant="cancelBtn" iconType="cancel" onClick={closeSaveDialog}>Cancel</CustomBtn>
            <CustomBtn variant="saveBtn" iconType="save" onClick={confirmSave}>Save</CustomBtn>
          </DialogActions>
        </Dialog>

        {snackbarEl}
      </div>
    );
  }

  // ---------------- SEARCH (default): existing return slips ----------------
  return (
    <div className="flex flex-col w-full gap-4 p-10 mt-10">
      <h1 className="font-semibold">Search Return Slips</h1>

      <Paper className="flex flex-col gap-3 p-4 md:flex-row md:items-center">
        {filterFields}
        <CustomBtn variant="goBtn" iconType="go" onClick={goSearch} disabled={generating}>
          {generating ? 'Searching…' : 'GO'}
        </CustomBtn>
        <CustomBtn variant="clearBtn" iconType="clear" onClick={clearFilters}>Clear</CustomBtn>
        <div className="md:ml-auto">
          <CustomBtn variant="createBtn" iconType="add" onClick={startCreate}>Create</CustomBtn>
        </div>
      </Paper>

      {searched && searchRows.length === 0 && (
        <Alert severity="info">No return slips found for the selected filter.</Alert>
      )}

      {searchRows.length > 0 && <SlipListTable slips={searchRows} onOpen={openSlip} />}

      {snackbarEl}
    </div>
  );
}

export default ReturnSlipPage;