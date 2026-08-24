// Utils/printAssetLost.js
//
// Builds a professional, print-ready Asset Lost Form document and opens it
// in a new browser tab/window so the user can preview and print (or
// "Save as PDF") it via the native browser print dialog.
//
// Mirrors the layout/letterhead conventions of Utils/printJobOrder.js and
// Utils/printAssetAccountability.js so that all printed documents in the
// system share the same company letterhead, typography, and page styling.
//
// Usage (see assetLostPage.jsx):
//
//   import { openALPrintPreview } from '../../../Utils/printAssetLost';
//
//   <CustomBtn onClick={() => openALPrintPreview({
//     currentHeader,
//     currentALItems,
//     docStatus,
//     companyConfig,
//     userName,
//     totalLevels,
//     approvalLogs,      // optional - filtered approval log rows for this AL
//   })}>
//     Preview
//   </CustomBtn>

/* ------------------------------------------------------------------ */
/*  Small formatting helpers                                          */
/* ------------------------------------------------------------------ */

const escapeHtml = (val) => {
  if (val === null || val === undefined) return '';
  return String(val)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};

const formatDate = (value, { withTime = false } = {}) => {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  const datePart = d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
  if (!withTime) return datePart;
  const timePart = d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${datePart} ${timePart}`;
};

const formatMoney = (value) => {
  const num = Number(String(value ?? '').toString().replace(/,/g, ''));
  if (!value || isNaN(num)) return '—';
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Mirrors the docStatus() mapping used in assetLostPage.jsx, with a
// safe fallback in case a docStatus function isn't passed in.
const defaultDocStatus = (status) => {
  switch (status) {
    case 0: return 'Draft';
    case 1: return 'Fully Approved';
    case 2: return 'Partially Approved';
    case 3: return 'For Approval';
    case 4: return 'Rejected';
    default: return 'Draft';
  }
};

/* ------------------------------------------------------------------ */
/*  HTML builders                                                     */
/* ------------------------------------------------------------------ */

function buildItemsRows(items) {
  if (!items || items.length === 0) {
    return `
      <tr>
        <td colspan="9" class="empty-row">No line items on this Asset Lost report.</td>
      </tr>`;
  }

  return items
    .map((row, idx) => {
      return `
        <tr>
          <td class="num-cell">${idx + 1}</td>
          <td>${escapeHtml(row.ItemNo)}</td>
          <td>${escapeHtml(row.ItemName)}</td>
          <td class="center">${escapeHtml(row.Qty)}</td>
          <td class="center">${escapeHtml(row.Units)}</td>
          <td class="center">${formatDate(row.DteAqui)}</td>
          <td class="amount-cell">${formatMoney(row.unitcost)}</td>
          <td>${escapeHtml(row.Supplier)}</td>
          <td>${escapeHtml(row.SERIAL)}</td>
        </tr>`;
    })
    .join('');
}

function buildTotalRow(items) {
  const total = (items || []).reduce((sum, row) => {
    const val = Number(String(row.unitcost ?? '').toString().replace(/,/g, ''));
    return sum + (isNaN(val) ? 0 : val);
  }, 0);

  return `
    <tr class="total-row">
      <td colspan="6" class="total-label">Total Loss Value</td>
      <td class="amount-cell">${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      <td colspan="2"></td>
    </tr>`;
}

function buildApprovalSection(approvalLogs, totalLevels) {
  const hasLogs = Array.isArray(approvalLogs) && approvalLogs.length > 0;

  if (hasLogs) {
    const rows = approvalLogs
      .slice()
      .sort((a, b) => (a.APP_LEVEL || 0) - (b.APP_LEVEL || 0))
      .map((log) => {
        const approver = (log.X_USER || '').split('-')[1] || log.X_USER || '';
        return `
          <tr>
            <td class="center">${escapeHtml(log.APP_LEVEL)}</td>
            <td>${escapeHtml(approver)}</td>
            <td class="center">${formatDate(log.DT)}</td>
            <td class="center">${escapeHtml(log.STAT)}</td>
            <td>${escapeHtml(log.REMARKS)}</td>
          </tr>`;
      })
      .join('');

    return `
      <table class="approval-table">
        <thead>
          <tr>
            <th style="width:8%">Level</th>
            <th style="width:27%">Approver</th>
            <th style="width:20%">Date</th>
            <th style="width:15%">Action</th>
            <th style="width:30%">Remarks</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>`;
  }

  // No approval history yet — render blank signature lines for each level
  const levels = Math.max(1, Number(totalLevels) || 1);
  const blankRows = Array.from({ length: levels })
    .map((_, i) => `
      <tr>
        <td class="center">${i + 1}</td>
        <td>&nbsp;</td>
        <td>&nbsp;</td>
        <td>&nbsp;</td>
        <td>&nbsp;</td>
      </tr>`)
    .join('');

  return `
    <table class="approval-table">
      <thead>
        <tr>
          <th style="width:8%">Level</th>
          <th style="width:27%">Approver</th>
          <th style="width:20%">Date</th>
          <th style="width:15%">Action</th>
          <th style="width:30%">Remarks</th>
        </tr>
      </thead>
      <tbody>
        ${blankRows}
      </tbody>
    </table>`;
}

function buildStatusWatermark(statusCode) {
  // Only call out DRAFT and REJECTED — approved/pending documents print clean.
  if (statusCode === 0) return 'DRAFT';
  if (statusCode === 4) return 'REJECTED';
  return null;
}

/* ------------------------------------------------------------------ */
/*  Main export                                                       */
/* ------------------------------------------------------------------ */

export function generateALPrintHTML({
  currentHeader = {},
  currentALItems = [],
  docStatus = defaultDocStatus,
  companyConfig = {},
  userName = '',
  totalLevels = 3,
  approvalLogs = [],
  // Prefix to prepend to companyConfig.ReportHeader (the logo path returned by
  // the server) if it's a relative path, e.g. your API's origin/base URL.
  // Leave as '' if ReportHeader already stores a full/absolute usable URL.
  logoBaseUrl = '',
} = {}) {
  const cfg = Array.isArray(companyConfig) ? companyConfig[0] : (companyConfig || {});

  // Fields match the `user0002inv` config row returned by useCompanyConfig.js
  // (kept identical to printJobOrder.js / printAssetAccountability.js so
  // every printed document in the system shares one letterhead).
  const companyName = cfg?.Company || 'Company Name';
  const companyAddress = cfg?.address || '';
  const companyContact = cfg?.CompTel || '';
  const companyLogo = cfg?.ReportHeader
    ? `${logoBaseUrl}${cfg.ReportHeader}`
    : '';

  const alNo = currentHeader?.AAFNo || '';
  const statusCode = currentHeader?.xPosted;
  const statusLabel = docStatus(statusCode);
  const watermark = buildStatusWatermark(statusCode);

  const department = currentHeader?.Dep || '—';
  const custodian = currentHeader?.Custodian || userName || '—';
  const employeeRaw = currentHeader?.EmpID || '';
  const employeeName = currentHeader?.EmpName || (employeeRaw.split(' - ')[1]) || '—';
  const employeeNo = employeeRaw ? employeeRaw.split(' - ')[0] : '—';
  const remarks = currentHeader?.xREMARKS || '';

  const itemsRows = buildItemsRows(currentALItems);
  const totalRow = buildTotalRow(currentALItems);
  const approvalSection = buildApprovalSection(approvalLogs, totalLevels);

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Asset Lost ${escapeHtml(alNo)}</title>
<style>
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    font-family: 'Segoe UI', Arial, Helvetica, sans-serif;
    color: #1a1a1a;
    background: #e5e5e5;
  }

  .page {
    position: relative;
    width: 210mm;
    min-height: 297mm;
    margin: 12px auto;
    padding: 14mm 14mm 12mm 14mm;
    background: #ffffff;
    box-shadow: 0 0 8px rgba(0,0,0,0.25);
  }

  .watermark {
    position: absolute;
    top: 45%;
    left: 50%;
    transform: translate(-50%, -50%) rotate(-32deg);
    font-size: 96px;
    font-weight: 800;
    letter-spacing: 8px;
    color: rgba(200, 30, 30, 0.10);
    pointer-events: none;
    user-select: none;
    white-space: nowrap;
    z-index: 0;
  }

  .content { position: relative; z-index: 1; }

  /* ---------- Letterhead ---------- */
  .letterhead {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    border-bottom: 3px solid #01579b;
    padding-bottom: 10px;
    margin-bottom: 14px;
  }
  .letterhead .company-block {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .letterhead .company-logo {
    max-height: 56px;
    max-width: 160px;
    object-fit: contain;
  }
  .letterhead .company-name {
    font-size: 20px;
    font-weight: 700;
    color: #01579b;
    letter-spacing: 0.03em;
  }
  .letterhead .company-meta {
    font-size: 10.5px;
    color: #555;
    margin-top: 2px;
  }
  .letterhead .doc-title {
    text-align: right;
  }
  .letterhead .doc-title h1 {
    margin: 0;
    font-size: 22px;
    letter-spacing: 0.10em;
    color: #1a1a1a;
  }
  .letterhead .doc-title .al-no {
    font-size: 13px;
    font-weight: 600;
    color: #01579b;
    margin-top: 2px;
  }

  /* ---------- Info grid ---------- */
  .info-grid {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 14px;
    font-size: 11.5px;
  }
  .info-grid td {
    border: 1px solid #cfd8e3;
    padding: 6px 10px;
    vertical-align: top;
  }
  .info-grid .label {
    width: 18%;
    background: #f4f7fb;
    font-weight: 600;
    color: #444;
  }
  .info-grid .value {
    width: 32%;
    font-weight: 500;
  }
  .status-pill {
    display: inline-block;
    padding: 2px 10px;
    border-radius: 10px;
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: 0.04em;
  }
  .status-0 { background: #eeeeee; color: #555; }
  .status-1 { background: #e3f6e8; color: #1b7a3d; }
  .status-2 { background: #fff6e0; color: #9a6c00; }
  .status-3 { background: #e6f1fc; color: #01579b; }
  .status-4 { background: #fdeaea; color: #b3261e; }

  /* ---------- Section labels ---------- */
  .section-label {
    font-size: 11.5px;
    font-weight: 700;
    color: #01579b;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin: 16px 0 6px 0;
    border-bottom: 1px solid #cfd8e3;
    padding-bottom: 3px;
  }
  .remarks-box {
    min-height: 34px;
    border: 1px solid #cfd8e3;
    border-radius: 3px;
    padding: 8px 10px;
    font-size: 11.5px;
    white-space: pre-wrap;
    margin-bottom: 4px;
  }

  /* ---------- Items table ---------- */
  table.items-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 10.5px;
    margin-top: 6px;
  }
  table.items-table th {
    background: #01579b;
    color: #fff;
    padding: 6px 6px;
    text-align: left;
    font-weight: 600;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }
  table.items-table td {
    border: 1px solid #dbe2ea;
    padding: 5px 6px;
    vertical-align: top;
  }
  table.items-table tr:nth-child(even) td { background: #f8fafc; }
  .num-cell { text-align: center; width: 24px; color: #777; }
  .center { text-align: center; white-space: nowrap; }
  .amount-cell { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .empty-row { text-align: center; color: #888; padding: 16px; font-style: italic; }
  .total-row td {
    background: #f4f7fb !important;
    font-weight: 700;
    border-top: 2px solid #01579b;
  }
  .total-label { text-align: right; color: #01579b; }

  /* ---------- Approval table ---------- */
  table.approval-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 10.5px;
    margin-top: 6px;
  }
  table.approval-table th {
    background: #f4f7fb;
    border: 1px solid #cfd8e3;
    padding: 6px 6px;
    font-weight: 700;
    color: #444;
    text-transform: uppercase;
    font-size: 9.5px;
    letter-spacing: 0.03em;
  }
  table.approval-table td {
    border: 1px solid #dbe2ea;
    padding: 8px 6px;
    height: 20px;
  }

  /* ---------- Signatures ---------- */
  .signatures {
    display: flex;
    justify-content: space-between;
    margin-top: 34px;
    gap: 18px;
  }
  .sig-block {
    flex: 1;
    text-align: center;
    font-size: 10.5px;
  }
  .sig-line {
    border-top: 1px solid #333;
    margin-top: 40px;
    padding-top: 5px;
    font-weight: 600;
  }
  .sig-role {
    color: #666;
    font-size: 9.5px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin-top: 1px;
  }

  /* ---------- Footer ---------- */
  .print-footer {
    margin-top: 24px;
    padding-top: 8px;
    border-top: 1px solid #e0e0e0;
    display: flex;
    justify-content: space-between;
    font-size: 9px;
    color: #999;
  }

  /* ---------- Toolbar (screen only) ---------- */
  .toolbar {
    position: sticky;
    top: 0;
    z-index: 10;
    display: flex;
    justify-content: center;
    gap: 10px;
    padding: 10px;
    background: #333;
  }
  .toolbar button {
    font-family: inherit;
    font-size: 13px;
    font-weight: 600;
    padding: 8px 18px;
    border-radius: 4px;
    border: none;
    cursor: pointer;
  }
  .toolbar .btn-print { background: #01579b; color: #fff; }
  .toolbar .btn-close { background: #666; color: #fff; }

  @media print {
    body { background: #fff; }
    .toolbar { display: none; }
    .page { margin: 0; box-shadow: none; width: auto; min-height: auto; }
    @page { size: A4; margin: 12mm; }
  }
</style>
</head>
<body>

  <div class="toolbar">
    <button class="btn-print" onclick="window.print()">Print / Save as PDF</button>
    <button class="btn-close" onclick="window.close()">Close</button>
  </div>

  <div class="page">
    ${watermark ? `<div class="watermark">${watermark}</div>` : ''}
    <div class="content">

      <div class="letterhead">
        <div class="company-block">
          ${companyLogo ? `<img class="company-logo" src="${escapeHtml(companyLogo)}" alt="${escapeHtml(companyName)} logo" />` : ''}
          <div>
            <div class="company-name">${escapeHtml(companyName)}</div>
            ${companyAddress ? `<div class="company-meta">${escapeHtml(companyAddress)}</div>` : ''}
            ${companyContact ? `<div class="company-meta">${escapeHtml(companyContact)}</div>` : ''}
          </div>
        </div>
        <div class="doc-title">
          <h1>ASSET LOST FORM</h1>
          <div class="al-no">No. ${escapeHtml(alNo) || '—'}</div>
        </div>
      </div>

      <table class="info-grid">
        <tr>
          <td class="label">Date Created</td>
          <td class="value">${formatDate(currentHeader?.xDate)}</td>
          <td class="label">Status</td>
          <td class="value">
            <span class="status-pill status-${statusCode ?? 0}">${escapeHtml(statusLabel)}</span>
          </td>
        </tr>
        <tr>
          <td class="label">Department</td>
          <td class="value">${escapeHtml(department)}</td>
          <td class="label">Custodian</td>
          <td class="value">${escapeHtml(custodian)}</td>
        </tr>
        <tr>
          <td class="label">Employee No.</td>
          <td class="value">${escapeHtml(employeeNo)}</td>
          <td class="label">Employee Name</td>
          <td class="value">${escapeHtml(employeeName)}</td>
        </tr>
        <tr>
          <td class="label">Printed On</td>
          <td class="value" colspan="3">${formatDate(new Date(), { withTime: true })}</td>
        </tr>
      </table>

      <div class="section-label">Remarks / Circumstances of Loss</div>
      <div class="remarks-box">${remarks ? escapeHtml(remarks) : '&nbsp;'}</div>

      <div class="section-label">Lost Assets</div>
      <table class="items-table">
        <thead>
          <tr>
            <th style="width:3%">#</th>
            <th style="width:11%">Asset No.</th>
            <th style="width:19%">Asset Name</th>
            <th style="width:6%">Qty</th>
            <th style="width:7%">Units</th>
            <th style="width:11%">Date Acquired</th>
            <th style="width:12%">Unit Cost</th>
            <th style="width:16%">Supplier</th>
            <th style="width:15%">Serial No.</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
          ${currentALItems && currentALItems.length > 0 ? totalRow : ''}
        </tbody>
      </table>

      <div class="section-label">Approval History</div>
      ${approvalSection}

      <div class="signatures">
        <div class="sig-block">
          <div class="sig-line">${escapeHtml(custodian)}</div>
          <div class="sig-role">Reported By / Custodian</div>
        </div>
        <div class="sig-block">
          <div class="sig-line">${escapeHtml(employeeName)}</div>
          <div class="sig-role">Accountable Employee</div>
        </div>
        <div class="sig-block">
          <div class="sig-line">&nbsp;</div>
          <div class="sig-role">Verified By</div>
        </div>
        <div class="sig-block">
          <div class="sig-line">&nbsp;</div>
          <div class="sig-role">Approved By</div>
        </div>
      </div>

      <div class="print-footer">
        <span>Generated by the system on ${formatDate(new Date(), { withTime: true })}</span>
        <span>Asset Lost No. ${escapeHtml(alNo) || '—'}</span>
      </div>

    </div>
  </div>

</body>
</html>`;
}

/**
 * Opens a new tab containing the printable Asset Lost Form and, once the
 * content has finished loading, focuses it so the user's next action (or
 * the "Print / Save as PDF" button in the toolbar) triggers the print
 * dialog.
 *
 * We deliberately do NOT auto-trigger window.print() on load — some browsers
 * (and pop-up blockers) behave unpredictably when print() is invoked
 * immediately, and letting the user click the toolbar button is more
 * reliable and less surprising.
 */
export function openALPrintPreview(options = {}) {
  const html = generateALPrintHTML(options);

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    // Pop-up blocked
    // eslint-disable-next-line no-alert
    alert('Please allow pop-ups for this site to preview and print the Asset Lost Form.');
    return;
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
}

export default openALPrintPreview;