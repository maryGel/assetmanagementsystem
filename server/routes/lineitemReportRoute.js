import express from 'express';
import { db } from '../server.js';

// Mount with: app.use('/lineItemReport', lineItemReportRoute)
const router = express.Router();

const splitValues = (value) => String(value || '').split(',').map((item) => item.trim()).filter(Boolean);
const addInFilter = (filters, params, column, value) => {
  const values = splitValues(value);
  if (!values.length) return;
  filters.push(`${column} IN (${values.map(() => '?').join(', ')})`);
  params.push(...values);
};

// Each line-item table only tells us which document a FacNO/ItemNo appeared
// on (and under what document type). None of them carry the descriptive,
// quantity, value, or status columns the report needs — those all live on
// itemlist, matched via the FAC_NO/ItemNo link below. So this UNION just
// normalizes "doc no + doc type + asset link" across the five tables, and
// itemlist supplies everything else once, in a single JOIN.
const lineItemUnion = `(
  SELECT 'Job Order' AS DocType, jo.JO_No AS DocNo, jo.FAC_NO AS LinkFacNo FROM jo_d jo
  UNION ALL
  SELECT 'Transfer Order Form', tr.TR_No, tr.FAC_NO FROM tr_d tr
  UNION ALL
  SELECT 'Disposal Form', ad.AD_No, ad.FAC_NO FROM ad_d ad
  UNION ALL
  SELECT 'Asset Accountability Form', aa.AAFNo, aa.ItemNo FROM assestaccd aa
  UNION ALL
  SELECT 'Lost Asset Form', al.AAFNo, al.ItemNo FROM assetlostd al
) li`;

router.get('/', (req, res) => {
  const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
  const pageSize = Math.min(Math.max(Number.parseInt(req.query.pageSize, 10) || 10, 1), 100);
  const filters = [];
  const params = [];

  addInFilter(filters, params, 'li.DocNo', req.query.docNo);
  addInFilter(filters, params, 'li.DocType', req.query.docType);
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

  // jo_woe can have several entries per FAC_NO (one per work-order expense
  // logged over time). The report only wants one Work Order / Work Order
  // Date per asset, so this picks the most recent entry (by xDate) per
  // FAC_NO rather than joining directly, which would otherwise fan out into
  // duplicate report rows whenever an asset has more than one jo_woe entry.
  const latestWorkOrder = `(
    SELECT w.FAC_NO, w.workNo, w.xDate
    FROM jo_woe w
    INNER JOIN (
      SELECT FAC_NO, MAX(xDate) AS maxDate FROM jo_woe GROUP BY FAC_NO
    ) latest ON latest.FAC_NO = w.FAC_NO AND latest.maxDate = w.xDate
  ) wo`;

  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const from = `
    FROM ${lineItemUnion}
    JOIN itemlist i ON i.FacNO = li.LinkFacNo
    LEFT JOIN refassetgroup ag ON ag.AssetGrpCode = i.AssetGrpCode
    LEFT JOIN ${latestWorkOrder} ON wo.FAC_NO = i.FacNO
    ${where}`;
  const select = `
    SELECT li.DocNo, li.DocType,
      i.FacNO, i.FacName, i.Description, i.AssetGrpCode,
      COALESCE(ag.AssetGroup, i.AssetGrpCode) AS AssetGroup,
      i.CATEGORY, i.ItemClass, i.Department, i.ItemLocation, i.balance_unit,
      i.Adate, i.AAmount, i.xxStats, i.xStatus, i.Holder, i.Brand, i.serialNo, i.writeOff,
      wo.workNo AS WorkOrderNo, wo.xDate AS WorkOrderDate
    ${from}
    ORDER BY li.DocNo, i.FacNO
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
        if (queryError) return res.status(500).json({ error: 'Could not generate line item report' });
        res.json({ data: rows, total: countRows[0].total, page, pageSize });
      });
    });
  });
});

export default router;