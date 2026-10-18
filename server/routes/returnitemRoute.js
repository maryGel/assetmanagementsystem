import express from 'express';
import { db } from '../server.js';

const router = express.Router();

/*
  returnitem notes
  - One Return Slip = many rows sharing the same RSNo (new column, see README note below).
  - AAFNo on each row is the Asset Accountability document the asset was borrowed on.
  - xPosted: 0 = saved (draft), 3 = posted.
  - empname / dep are always read from assestacch (EmpName / dep), never trusted from the client.

  ALTER TABLE returnitem
    ADD COLUMN RSNo VARCHAR(30) NOT NULL DEFAULT '',
    ADD INDEX idx_returnitem_rsno (RSNo);
*/

const PENDING_STATUS = 'With Pending Return Slip';
const DRAFT = 0;
const POSTED = 3;

// ---------- promise helpers ----------
const poolQuery = (sql, params = []) => new Promise((resolve, reject) => {
  db.query(sql, params, (error, result) => (error ? reject(error) : resolve(result)));
});

const getConnection = () => new Promise((resolve, reject) => {
  db.getConnection((error, connection) => (error ? reject(error) : resolve(connection)));
});

const run = (connection, sql, params = []) => new Promise((resolve, reject) => {
  connection.query(sql, params, (error, result) => (error ? reject(error) : resolve(result)));
});

const begin = (c) => new Promise((resolve, reject) => c.beginTransaction((e) => (e ? reject(e) : resolve())));
const commit = (c) => new Promise((resolve, reject) => c.commit((e) => (e ? reject(e) : resolve())));
const rollback = (c) => new Promise((resolve) => c.rollback(() => resolve()));

// Runs fn(connection) inside a transaction; commits on success, rolls back on any error
const withTx = async (fn) => {
  const connection = await getConnection();
  try {
    await begin(connection);
    const out = await fn(connection);
    await commit(connection);
    return out;
  } catch (error) {
    await rollback(connection);
    throw error;
  } finally {
    connection.release();
  }
};

const httpError = (status, message) => Object.assign(new Error(message), { status });

const sendError = (res, error, fallback) => {
  if (error.status) return res.status(error.status).json({ error: error.message });
  console.error(fallback, error);
  return res.status(500).json({ error: fallback, details: error.sqlMessage || error.message, code: error.code });
};

// ---------- misc helpers ----------
const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const formatDate = (value) => {
  if (!value) return null;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const cleanRSNo = (value) => decodeURIComponent(value || '')
  .replace(/\u00A0/g, '')
  .replace(/\s/g, '')
  .toUpperCase();

// Unique asset numbers; blank and 'n' (no asset) are skipped
const cleanFacNos = (list) => [...new Set(
  list.map((f) => (f || '').trim()).filter((f) => f && f.toLowerCase() !== 'n')
)];

// Compare asset numbers before and after a change:
//  - removed: clear xxStats (only if it still holds the pending status)
//  - added:   set xxStats to the pending status
const syncPendingStatus = async (connection, oldList, newList) => {
  const oldSet = cleanFacNos(oldList);
  const newSet = cleanFacNos(newList);
  const removed = oldSet.filter((f) => !newSet.includes(f));
  const added = newSet.filter((f) => !oldSet.includes(f));
  if (removed.length > 0) {
    await run(connection, `UPDATE itemlist SET xxStats = '' WHERE FacNO IN (?) AND xxStats = ?`, [removed, PENDING_STATUS]);
  }
  if (added.length > 0) {
    await run(connection, `UPDATE itemlist SET xxStats = ? WHERE FacNO IN (?)`, [PENDING_STATUS, added]);
  }
};

// Validates the lines and turns them into insert rows.
// empname / dep come from assestacch (EmpName -> empname, dep -> dep).
const buildRows = async (connection, RSNo, lines, xPosted) => {
  if (!RSNo) throw httpError(400, 'RSNo is required');

  const aafNos = [...new Set(lines.map((l) => String(l.AAFNo || '').trim()).filter(Boolean))];
  if (aafNos.length === 0) throw httpError(400, 'Every line needs an AAFNo');

  const headers = await run(connection, 'SELECT AAFNo, EmpName, dep, xPosted FROM assestacch WHERE AAFNo IN (?)', [aafNos]);
  const headerMap = new Map(headers.map((h) => [h.AAFNo, h]));

  // Assets already on another saved/posted return slip cannot be returned twice
  const taken = await run(
    connection,
    'SELECT AAFNo, ItemNo FROM returnitem WHERE RSNo <> ? AND xPosted IN (?, ?) AND AAFNo IN (?)',
    [RSNo, DRAFT, POSTED, aafNos]
  );
  const takenKeys = new Set(taken.map((t) => `${t.AAFNo}|${t.ItemNo}`));

  const seen = new Set();
  return lines.map((line) => {
    const header = headerMap.get(line.AAFNo);
    if (!header) throw httpError(400, `Asset Accountability ${line.AAFNo} not found`);
    if (Number(header.xPosted) !== 1) throw httpError(400, `Asset Accountability ${line.AAFNo} is not approved`);

    const key = `${line.AAFNo}|${line.ItemNo}`;
    if (takenKeys.has(key)) throw httpError(409, `${line.ItemNo} on ${line.AAFNo} is already on another return slip`);
    if (seen.has(key)) throw httpError(400, `${line.ItemNo} on ${line.AAFNo} appears more than once`);
    seen.add(key);

    const qty = Number(line.Qty) || 0;
    const qtyToReturn = Number(line.qtyToReturn);
    if (!(qtyToReturn > 0) || qtyToReturn > qty) {
      throw httpError(400, `Qty to return for ${line.ItemNo} must be greater than 0 and not more than ${qty}`);
    }

    return [
      RSNo,
      line.AAFNo,
      line.ItemNo || '',
      line.ItemName || '',
      line.Units || '',
      qty,
      formatDate(line.returnDate) || localToday(),
      header.EmpName || '',
      header.dep || '',
      qtyToReturn,
      xPosted,
      line.serial || '',
      line.location || '',
    ];
  });
};

const INSERT_SQL = `INSERT INTO returnitem
  (RSNo, AAFNo, ItemNo, ItemName, Units, Qty, returnDate, empname, dep, qtyToReturn, xPosted, serial, location)
  VALUES ?`;

// Approved (assestacch.xPosted = 1) accountability lines that are not already on a saved/posted return slip
const BORROWED_FROM = `
  FROM assestaccd d
  JOIN assestacch h ON h.AAFNo = d.AAFNo
  WHERE h.xPosted = 1
    AND d.ItemNo <> '' AND LOWER(d.ItemNo) <> 'n'
    AND NOT EXISTS (
      SELECT 1 FROM returnitem r
      WHERE r.AAFNo = d.AAFNo AND r.ItemNo = d.ItemNo AND r.xPosted IN (0, 3)
    )`;

// ======================= ROUTES =======================
// NOTE: fixed paths (/lookups, /borrowed) must stay above '/:RSNo'

// Options for the two Autocomplete filters
router.get('/lookups', async (req, res) => {
  try {
    const [items, employees] = await Promise.all([
      poolQuery(`SELECT DISTINCT d.ItemNo, d.ItemName ${BORROWED_FROM} ORDER BY d.ItemNo`),
      poolQuery(`SELECT DISTINCT h.EmpName ${BORROWED_FROM} AND h.EmpName <> '' ORDER BY h.EmpName`),
    ]);
    res.json({ items, employees: employees.map((e) => e.EmpName) });
  } catch (error) {
    sendError(res, error, 'Error fetching return slip lookups');
  }
});

// Generate the list of borrowed assets for the selected employee and/or asset
router.get('/borrowed', async (req, res) => {
  const empname = (req.query.empname || '').trim();
  const itemNo = (req.query.itemNo || '').trim();

  if (!empname && !itemNo) {
    return res.status(400).json({ error: 'Select an employee or an asset' });
  }

  const where = [];
  const params = [];
  if (empname) { where.push('AND h.EmpName = ?'); params.push(empname); }
  if (itemNo) { where.push('AND d.ItemNo = ?'); params.push(itemNo); }

  try {
    const rows = await poolQuery(
      `SELECT d.AAFNo, d.ItemNo, d.ItemName, d.Qty, d.Units, d.serial, d.location,
              h.EmpName AS empname, h.dep AS dep
       ${BORROWED_FROM} ${where.join(' ')}
       ORDER BY d.AAFNo, d.ItemNo`,
      params
    );
    res.json(rows);
  } catch (error) {
    sendError(res, error, 'Error fetching borrowed assets');
  }
});

// Filter options for searching EXISTING return slips (from returnitem)
router.get('/slip-lookups', async (req, res) => {
  try {
    const [items, employees] = await Promise.all([
      poolQuery(`SELECT DISTINCT ItemNo, ItemName FROM returnitem
                 WHERE ItemNo <> '' AND LOWER(ItemNo) <> 'n' ORDER BY ItemNo`),
      poolQuery(`SELECT DISTINCT empname FROM returnitem WHERE empname <> '' ORDER BY empname`),
    ]);
    res.json({ items, employees: employees.map((e) => e.empname) });
  } catch (error) {
    sendError(res, error, 'Error fetching return slip filters');
  }
});

// Search existing return slips, one row per RSNo. Both filters are optional; a slip is listed when
// any of its lines matches, and its totals cover the whole slip. No filter lists the latest 1000 slips.
router.get('/slips', async (req, res) => {
  const empname = (req.query.empname || '').trim();
  const itemNo = (req.query.itemNo || '').trim();

  const where = [];
  const params = [];
  if (empname) { where.push('AND empname = ?'); params.push(empname); }
  if (itemNo) { where.push('AND ItemNo = ?'); params.push(itemNo); }

  try {
    const rows = await poolQuery(
      `SELECT r.RSNo,
              GROUP_CONCAT(DISTINCT r.empname ORDER BY r.empname SEPARATOR ', ') AS empname,
              GROUP_CONCAT(DISTINCT r.dep ORDER BY r.dep SEPARATOR ', ') AS dep,
              SUM(r.qtyToReturn) AS qtyToReturn,
              COUNT(*) AS lineCount,
              MIN(r.xPosted) AS xPosted
       FROM returnitem r
       WHERE r.RSNo <> ''
         AND r.RSNo IN (SELECT RSNo FROM returnitem WHERE 1 = 1 ${where.join(' ')})
       GROUP BY r.RSNo
       ORDER BY r.RSNo DESC
       LIMIT 1000`,
      params
    );
    res.json(rows);
  } catch (error) {
    sendError(res, error, 'Error searching return slips');
  }
});

// All return slip lines
router.get('/', async (req, res) => {
  try {
    res.json(await poolQuery('SELECT * FROM returnitem ORDER BY RSNo, id'));
  } catch (error) {
    sendError(res, error, 'Error fetching the data');
  }
});

// Lines of one return slip
router.get('/:RSNo', async (req, res) => {
  try {
    const rows = await poolQuery('SELECT * FROM returnitem WHERE RSNo = ? ORDER BY id', [cleanRSNo(req.params.RSNo)]);
    if (rows.length === 0) return res.status(404).json({ error: 'Return slip not found' });
    res.json(rows);
  } catch (error) {
    sendError(res, error, 'Database query failed returnitem');
  }
});

// Create a return slip (array of lines, all with the same RSNo). Saved as xPosted = 0.
router.post('/', async (req, res) => {
  const items = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Request body must be a non-empty array of lines' });
  }

  try {
    const result = await withTx(async (connection) => {
      // Auto-generate RSNo from user0002inv (CInitial + XRSNum). The row is locked
      // until commit so two users can never get the same number.
      const cfg = await run(connection, 'SELECT XRSNum FROM user0002inv LIMIT 1 FOR UPDATE');
      if (cfg.length === 0) throw httpError(400, 'Company configuration not found');
      const nextNum = Number(cfg[0].XRSNum || 0) + 1;
      const RSNo = `RS-${String(nextNum).padStart(5, '0')}`;

      const exists = await run(connection, 'SELECT 1 FROM returnitem WHERE RSNo = ? LIMIT 1', [RSNo]);
      if (exists.length > 0) throw httpError(409, `Return slip ${RSNo} already exists. Check XRSNum in company setup.`);

      const rows = await buildRows(connection, RSNo, items, DRAFT);
      const insert = await run(connection, INSERT_SQL, [rows]);

      // Counter moves forward in the same transaction as the insert
      await run(connection, 'UPDATE user0002inv SET XRSNum = ?', [nextNum]);

      // Flag each asset as having a pending return slip
      await syncPendingStatus(connection, [], items.map((i) => i.ItemNo));
      return { RSNo, count: insert.affectedRows };
    });

    res.status(201).json({ message: 'Return slip saved', ...result, xPosted: DRAFT });
  } catch (error) {
    sendError(res, error, 'Database query failed returnitem');
  }
});

// Replace the lines of a saved (not yet posted) return slip
router.put('/:RSNo', async (req, res) => {
  const RSNo = cleanRSNo(req.params.RSNo);
  const details = req.body;
  if (!Array.isArray(details)) return res.status(400).json({ error: 'Details must be an array' });

  try {
    const result = await withTx(async (connection) => {
      const existing = await run(connection, 'SELECT ItemNo, xPosted FROM returnitem WHERE RSNo = ? FOR UPDATE', [RSNo]);
      if (existing.length === 0) throw httpError(404, 'Return slip not found');
      if (existing.some((r) => Number(r.xPosted) !== DRAFT)) {
        throw httpError(409, 'Only a saved (unposted) return slip can be edited');
      }

      const rows = details.length ? await buildRows(connection, RSNo, details, DRAFT) : [];

      const del = await run(connection, 'DELETE FROM returnitem WHERE RSNo = ?', [RSNo]);
      let insertedCount = 0;
      if (rows.length) {
        insertedCount = (await run(connection, INSERT_SQL, [rows])).affectedRows;
      }

      await syncPendingStatus(connection, existing.map((r) => r.ItemNo), details.map((d) => d.ItemNo));
      return { deletedCount: del.affectedRows, insertedCount };
    });

    res.json({ success: true, message: 'Return slip updated', ...result });
  } catch (error) {
    sendError(res, error, 'Error updating return slip');
  }
});

// Post a return slip: xPosted 0 -> 3
router.post('/:RSNo/post', async (req, res) => {
  const RSNo = cleanRSNo(req.params.RSNo);
  try {
    const result = await withTx(async (connection) => {
      const upd = await run(connection, 'UPDATE returnitem SET xPosted = ? WHERE RSNo = ? AND xPosted = ?', [POSTED, RSNo, DRAFT]);
      if (upd.affectedRows === 0) throw httpError(409, 'Return slip not found or already posted');

      // Posted: the assets on this slip are back, so clear their status (itemlist.xxStats = '')
      const lines = await run(connection, 'SELECT ItemNo FROM returnitem WHERE RSNo = ?', [RSNo]);
      const facNos = cleanFacNos(lines.map((l) => l.ItemNo));
      let assetsCleared = 0;
      if (facNos.length > 0) {
        const clr = await run(connection, `UPDATE itemlist SET xxStats = '' WHERE FacNO IN (?)`, [facNos]);
        assetsCleared = clr.affectedRows;
      }
      return { count: upd.affectedRows, assetsCleared };
    });

    res.json({ success: true, message: `Return slip ${RSNo} posted`, xPosted: POSTED, ...result });
  } catch (error) {
    sendError(res, error, 'Error posting return slip');
  }
});

// Delete one line of a saved (unposted) return slip
router.delete('/:id', async (req, res) => {
  try {
    await withTx(async (connection) => {
      const rows = await run(connection, 'SELECT ItemNo, xPosted FROM returnitem WHERE id = ? FOR UPDATE', [req.params.id]);
      if (rows.length === 0) throw httpError(404, 'Detail not found');
      if (Number(rows[0].xPosted) !== DRAFT) throw httpError(409, 'Posted lines cannot be deleted');

      await run(connection, 'DELETE FROM returnitem WHERE id = ?', [req.params.id]);
      await syncPendingStatus(connection, [rows[0].ItemNo], []);
    });
    res.json({ message: 'Detail deleted successfully' });
  } catch (error) {
    sendError(res, error, 'Database query failed');
  }
});

export default router;