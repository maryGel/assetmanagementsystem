import express from 'express';
import { db } from '../server.js';

const router = express.Router();

/*
  Maintenance Report
  - jo_d   : Main_Status, FAC_NO, FAC_name, Qty, UOM, workDet, eval_status, JO_No
  - jo_h   : JO_No, workNo, Sector_name (Maintenance), Department_Name
  - jo_woe : jo_no, workNo, FAC_NO, expense_amount

  Total Expense per row = sum of jo_woe.expense_amount for that row's
  job order (JO_No) + work order (workNo) + asset (FAC_NO).

  Mount in server.js:
    import maintenanceReportRoute from './routes/maintenanceReportRoute.js';
    app.use('/maintenanceReportRoute', maintenanceReportRoute);
*/

const poolQuery = (sql, params = []) => new Promise((resolve, reject) => {
  db.query(sql, params, (error, result) => (error ? reject(error) : resolve(result)));
});

const sendError = (res, error, fallback) => {
  console.error(fallback, error);
  res.status(500).json({ error: fallback, details: error.sqlMessage || error.message, code: error.code });
};

// Expense lookup key: job order + work order + asset (trimmed, case-insensitive)
const expenseKey = (joNo, workNo, facNo) => [joNo, workNo, facNo]
  .map((v) => String(v ?? '').trim().toLowerCase())
  .join('|');

// Multi-select filter values arrive as a JSON array string; a plain string counts as one value
const parseList = (value) => {
  if (!value) return [];
  let list = value;
  if (typeof value === 'string') {
    try { list = JSON.parse(value); } catch { list = [value]; }
  }
  return (Array.isArray(list) ? list : [list]).map((v) => String(v).trim()).filter(Boolean);
};

// Options for the Autocomplete filters
router.get('/lookups', async (req, res) => {
  try {
    const [statuses, items, workOrders, jobOrders, maintenances, departments] = await Promise.all([
      poolQuery(`SELECT DISTINCT Main_Status FROM jo_d WHERE Main_Status <> '' ORDER BY Main_Status`),
      poolQuery(`SELECT DISTINCT FAC_NO, FAC_name FROM jo_d WHERE FAC_NO <> '' ORDER BY FAC_NO`),
      // Work Order No and Job Order No options come from the job order header (jo_h)
      poolQuery(`SELECT DISTINCT workNo FROM jo_h WHERE workNo <> '' ORDER BY workNo`),
      poolQuery(`SELECT DISTINCT JO_No FROM jo_h WHERE JO_No <> '' ORDER BY JO_No`),
      // Maintenance (Sector_name) and Department (Department_Name) also come from jo_h
      poolQuery(`SELECT DISTINCT Sector_name FROM jo_h WHERE Sector_name <> '' ORDER BY Sector_name`),
      poolQuery(`SELECT DISTINCT Department_Name FROM jo_h WHERE Department_Name <> '' ORDER BY Department_Name`),
    ]);

    res.json({
      statuses: statuses.map((r) => r.Main_Status),
      items,
      workOrders: workOrders.map((r) => r.workNo),
      jobOrders: jobOrders.map((r) => r.JO_No),
      maintenances: maintenances.map((r) => r.Sector_name),
      departments: departments.map((r) => r.Department_Name),
    });
  } catch (error) {
    sendError(res, error, 'Error fetching maintenance report filters');
  }
});

// Report rows. All filters are optional; no filter returns everything (max 5000 rows).
router.get('/', async (req, res) => {
  const where = [];
  const params = [];
  // Each filter can hold several values: the line matches when it has ANY of the selected values
  const addIn = (column, rawValue) => {
    const list = parseList(rawValue);
    if (list.length > 0) { where.push(`AND ${column} IN (?)`); params.push(list); }
  };
  addIn('d.Main_Status', req.query.status);
  addIn('d.FAC_NO', req.query.facNo);
  addIn('h.workNo', req.query.workNo); // the work order number is on the job order header (jo_h)
  addIn('d.JO_No', req.query.joNo);
  addIn('h.Sector_name', req.query.maintenance);
  addIn('h.Department_Name', req.query.department);

  try {
    // 1) The report lines (jo_d + jo_h)
    const rows = await poolQuery(
      `SELECT d.Main_Status, d.FAC_NO, d.FAC_name, d.Qty AS Qty, d.UOM, d.workDet, d.eval_status,
              h.workNo AS workNo, d.JO_No, h.Sector_name, h.Department_Name,
              h.wo_date, h.main_stat
       FROM jo_d d
       LEFT JOIN jo_h h ON h.JO_No = d.JO_No
       WHERE 1 = 1 ${where.join(' ')}
       ORDER BY d.JO_No, d.FAC_NO
       LIMIT 5000`,
      params
    );

    // 2) Expenses per job order + work order + asset, matched to the lines in code
    //    (a separate query avoids join / collation problems between the tables)
    const expenseMap = new Map();
    const joNos = [...new Set(rows.map((r) => r.JO_No).filter(Boolean))];
    if (joNos.length > 0) {
      const expenses = await poolQuery(
        `SELECT jo_no AS joNo, workNo AS workNo, FAC_NO AS facNo, SUM(expense_amount) AS total_expense
         FROM jo_woe
         WHERE jo_no IN (?)
         GROUP BY jo_no, workNo, FAC_NO`,
        [joNos]
      );
      expenses.forEach((e) => {
        expenseMap.set(expenseKey(e.joNo, e.workNo, e.facNo), Number(e.total_expense) || 0);
      });
    }

    res.json(rows.map((r) => ({
      ...r,
      total_expense: expenseMap.get(expenseKey(r.JO_No, r.workNo, r.FAC_NO)) || 0,
    })));
  } catch (error) {
    sendError(res, error, 'Error generating maintenance report');
  }
});

export default router;