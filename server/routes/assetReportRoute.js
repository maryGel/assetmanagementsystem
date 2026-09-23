import express from 'express';
import { db } from '../server.js';

// Mount with: app.use('/assetReport', assetReportRoute)
const router = express.Router();

const splitValues = (value) => String(value || '').split(',').map((item) => item.trim()).filter(Boolean);
const addInFilter = (filters, params, column, value) => {
  const values = splitValues(value);
  if (!values.length) return;
  filters.push(`${column} IN (${values.map(() => '?').join(', ')})`);
  params.push(...values);
};

router.get('/', (req, res) => {
  const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
  const pageSize = Math.min(Math.max(Number.parseInt(req.query.pageSize, 10) || 10, 1), 100);
  const filters = [];
  const params = [];

  // AssetGrpCode is stored on itemlist; the JOIN supplies its readable name.
  addInFilter(filters, params, 'i.AssetGrpCode', req.query.assetGroup);
  addInFilter(filters, params, 'i.CATEGORY', req.query.category);
  addInFilter(filters, params, 'i.ItemClass', req.query.itemClass);
  addInFilter(filters, params, 'i.xxStats', req.query.status);

  if (req.query.activeOnly === 'true') {
    filters.push("UPPER(COALESCE(i.xStatus, '')) = 'ACTIVE'");
  }
  if (req.query.writtenOff === 'true') filters.push('COALESCE(i.writeOff, 0) = 1');
  if (req.query.writtenOff === 'false') filters.push('COALESCE(i.writeOff, 0) = 0');
  if (req.query.acquiredFrom) {
    filters.push('DATE(i.Adate) >= ?');
    params.push(req.query.acquiredFrom);
  }
  if (req.query.acquiredTo) {
    filters.push('DATE(i.Adate) <= ?');
    params.push(req.query.acquiredTo);
  }
  if (req.query.amountFrom !== undefined && req.query.amountFrom !== '') {
    filters.push('COALESCE(i.AAmount, 0) >= ?');
    params.push(Number(req.query.amountFrom));
  }
  if (req.query.amountTo !== undefined && req.query.amountTo !== '') {
    filters.push('COALESCE(i.AAmount, 0) <= ?');
    params.push(Number(req.query.amountTo));
  }

  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const from = `FROM itemlist i LEFT JOIN refassetgroup ag ON ag.AssetGrpCode = i.AssetGrpCode ${where}`;
  const select = `
    SELECT i.FacNO, i.FacName, i.Description, i.AssetGrpCode,
      COALESCE(ag.AssetGroup, i.AssetGrpCode) AS AssetGroup,
      i.CATEGORY, i.ItemClass, i.Department, i.ItemLocation, i.balance_unit,
      i.Adate, i.AAmount, i.Percent, i.Depreciation, i.AccuDep, i.Abre,
      (COALESCE(i.AAmount, 0) - COALESCE(i.AccuDep, 0)) AS NetBookValue,
      i.xxStats, i.xStatus, i.Holder, i.Brand, i.serialNo, i.writeOff
    ${from}
    ORDER BY i.FacNO
    LIMIT ? OFFSET ?`;

  db.getConnection((connectionError, connection) => {
    if (connectionError) return res.status(500).json({ error: 'Database connection error' });
    connection.query(`SELECT COUNT(*) AS total ${from}`, params, (countError, countRows) => {
      if (countError) {
        connection.release();
        return res.status(500).json({ error: 'Could not count report rows' });
      }
      connection.query(select, [...params, pageSize, (page - 1) * pageSize], (queryError, rows) => {
        connection.release();
        if (queryError) return res.status(500).json({ error: 'Could not generate asset report' });
        res.json({ data: rows, total: countRows[0].total, page, pageSize });
      });
    });
  });
});

export default router;
