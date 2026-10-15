import express from 'express';
import {db} from '../server.js';

const router = express.Router();

// ---------- itemlist.xxStats sync for edited documents ----------
const PENDING_STATUS = 'With Pending Job Order';

const runQuery = (connection, sql, params) => new Promise((resolve, reject) => {
  connection.query(sql, params, (error, result) => (error ? reject(error) : resolve(result)));
});

// Unique asset numbers; blank and 'n' (no asset) are skipped
const cleanFacNos = (list) => [...new Set(
  list.map((f) => (f || '').trim()).filter((f) => f && f.toLowerCase() !== 'n')
)];

// Compare the asset numbers before and after an edit:
//  - removed lines: clear xxStats (only if it still holds this document's pending status)
//  - added lines:   set xxStats to the pending status
// Lines that were already on the document are left untouched (so a status already
// advanced by evaluation/maintenance is not overwritten).
const syncPendingStatus = async (connection, oldList, newList) => {
  const oldSet = cleanFacNos(oldList);
  const newSet = cleanFacNos(newList);
  const removed = oldSet.filter((f) => !newSet.includes(f));
  const added = newSet.filter((f) => !oldSet.includes(f));
  if (removed.length > 0) {
    await runQuery(connection, `UPDATE itemlist SET xxStats = '' WHERE FacNO IN (?) AND xxStats = ?`, [removed, PENDING_STATUS]);
  }
  if (added.length > 0) {
    await runQuery(connection, `UPDATE itemlist SET xxStats = ? WHERE FacNO IN (?)`, [PENDING_STATUS, added]);
  }
};

// Get JO details
router.get('/', (req, res) => {
  db.getConnection((err, connection) => {
    if (err) {
      return res.status(500).json({error: 'Database connection error'});
    }

    const sql = 'SELECT * FROM jo_d';

    connection.query(sql, (err, results) => {
      connection.release();
      if(err){
        return res.status(500).json({error: 'Error fetching the data'})
      }
      res.json(results);
    });
  });
});

// Get single jo_d by JO_No
router.get('/:JO_No', (req, res) => {
  const {JO_No} = req.params;

  const decodedJONo = decodeURIComponent(JO_No);
  const cleanJONo = decodedJONo
    .replace(/\u00A0/g, '') // Remove NBSP
    .replace(/\s/g, '') // Remove normal whitespace
    .toUpperCase();

  db.getConnection((err, connection) => {
    if(err){
      return res.status(500).json({error: 'Database connection failed jo_d'})
    }

    const sql = 'SELECT * FROM jo_d WHERE JO_No = ?';

    connection.query(sql, [cleanJONo], (error, results) => {
      connection.release();

      if(error){
        return res.status(500).json({error: 'Database query failed jo_d'})
      }

      // Return array of details (not just first item)
      res.json(results);
    });
  });
});


// Create JO details (accepts array of items)
router.post('/', (req, res) => {
  const items = req.body; // array of detail items

  if (!Array.isArray(items)) {
    return res.status(400).json({ error: 'Request body must be an array of detail items' });
  }

  if (items.length === 0) {
    return res.status(400).json({ error: 'At least one detail item is required' });
  }

  db.getConnection((err, connection) => {
    if (err) {
      return res.status(500).json({ error: 'Database connection failed jo_d', details: err.message });
    }

    const formatDate = (dateStr) => {
      if (!dateStr) return null;
      if (typeof dateStr === 'string' && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return dateStr;
      }
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return null;
      return date.toISOString().split('T')[0];
    };

    const run = (sql, params) => new Promise((resolve, reject) => {
      connection.query(sql, params, (error, result) => (error ? reject(error) : resolve(result)));
    });

    const sql = `INSERT INTO jo_d (
      JO_No, FAC_NO, FAC_name, qty, xDate, xpost,
      UOM, brand, serialno, workDet, targetDate, Status, ItemLocation,
      StartDate, EndDate
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    connection.beginTransaction(async (txErr) => {
      if (txErr) {
        connection.release();
        return res.status(500).json({ error: 'Failed to start transaction' });
      }

      try {
        const insertIds = [];

        for (const item of items) {
          const {
            JO_No, FAC_NO, FAC_name, qty, xDate, xpost, UOM, brand,
            serialno, workDet, TargetDate, Status, ItemLocation, StartDate, EndDate,
          } = item;

          const result = await run(sql, [
            JO_No,
            FAC_NO || '',
            FAC_name || '',
            qty !== undefined ? Number(qty) : 1,
            formatDate(xDate),
            xpost !== undefined ? xpost : 0,
            UOM || '',
            brand || '',
            serialno || '',
            workDet || '',
            formatDate(TargetDate),
            Status || 'OPEN',
            ItemLocation || '',
            formatDate(StartDate),
            formatDate(EndDate),
          ]);
          insertIds.push(result.insertId);
        }

        // Flag each asset on this JO as having a pending JO (per FacNO).
        // Blank FAC_NO and 'n' (no asset) are skipped, same as the maintenance update.
        const facNos = [...new Set(
          items
            .map((i) => (i.FAC_NO || '').trim())
            .filter((f) => f && f.toLowerCase() !== 'n')
        )];

        let assetsFlagged = 0;
        if (facNos.length > 0) {
          const upd = await run(
            `UPDATE itemlist SET xxStats = 'With Pending Job Order' WHERE FacNO IN (?)`,
            [facNos]
          );
          assetsFlagged = upd.affectedRows;
        }

        connection.commit((commitErr) => {
          if (commitErr) {
            return connection.rollback(() => {
              connection.release();
              res.status(500).json({ error: 'Failed to commit transaction' });
            });
          }
          connection.release();
          res.status(201).json({
            message: 'JO details created successfully',
            count: insertIds.length,
            ids: insertIds,
            assetsFlagged,
          });
        });
      } catch (error) {
        console.error('Detail insert error:', error);
        connection.rollback(() => {
          connection.release();
          res.status(500).json({
            error: 'Database query failed jo_d',
            details: error.sqlMessage || error.message,
            code: error.code,
          });
        });
      }
    });
  });
});

// YYYY-MM-DD passthrough; anything else (e.g. ISO timestamps from GET) -> local YYYY-MM-DD
const toSqlDate = (value) => {
  if (!value) return null;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/**
 * Maintenance update: changes ONLY the maintenance columns of existing jo_d rows.
 * Nothing is deleted or re-inserted, so every other column (known or not) is untouched.
 * Then mirrors "<eval_status> | <Main_Status>" onto itemlist.xxStats.
 */
router.put('/:joNo/maintenance', (req, res) => {
  const joNo = decodeURIComponent(req.params.joNo)
    .replace(/\u00A0/g, '')
    .replace(/\s/g, '')
    .toUpperCase();
  const items = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Body must be a non-empty array of items' });
  }

  db.getConnection((err, connection) => {
    if (err) return res.status(500).json({ error: 'DB connection error' });

    const run = (sql, params) => new Promise((resolve, reject) => {
      connection.query(sql, params, (error, result) => (error ? reject(error) : resolve(result)));
    });

    connection.beginTransaction(async (txErr) => {
      if (txErr) {
        connection.release();
        return res.status(500).json({ error: 'Failed to start transaction' });
      }

      try {
        let updated = 0;

        for (const item of items) {
          const setSql = `UPDATE jo_d
            SET Status = ?, Main_Status = ?, Main_Remarks = ?, disposal_reason = ?`;
          const setParams = [
            item.Status || 'OPEN',
            item.Main_Status || 'OPEN',
            item.Main_Remarks || '',
            item.disposal_reason || ''
          ];

          let result;
          if (item.id !== undefined && item.id !== null && item.id !== '') {
            result = await run(`${setSql} WHERE JO_No = ? AND id = ?`, [...setParams, joNo, item.id]);
          } else {
            result = await run(`${setSql} WHERE JO_No = ? AND FAC_NO = ?`, [...setParams, joNo, item.FAC_NO]);
          }
          updated += result.affectedRows;
        }

        // Asset status = "<eval_status> | <Main_Status>", using what is stored in jo_d
        const rows = await run(
          'SELECT FAC_NO, eval_status, Main_Status FROM jo_d WHERE JO_No = ?',
          [joNo]
        );
        for (const r of rows) {
          const facNo = (r.FAC_NO || '').trim();
          const evalStatus = (r.eval_status || '').trim();
          const mainStatus = (r.Main_Status || '').trim();
          if (!facNo || facNo.toLowerCase() === 'n') continue;
          if (!evalStatus || !mainStatus || mainStatus.toUpperCase() === 'OPEN') continue;
          await run('UPDATE itemlist SET xxStats = ? WHERE FacNO = ?', [`${evalStatus} | ${mainStatus}`, facNo]);
        }

        connection.commit((commitErr) => {
          if (commitErr) {
            return connection.rollback(() => {
              connection.release();
              res.status(500).json({ error: 'Failed to commit transaction' });
            });
          }
          connection.release();
          res.json({ success: true, updatedCount: updated });
        });
      } catch (error) {
        console.error('Maintenance update error:', error);
        connection.rollback(() => {
          connection.release();
          res.status(500).json({ error: 'Maintenance update failed', details: error.message });
        });
      }
    });
  });
});

// Update JO details 
router.put('/:joNo', (req, res) => {
  const joNo = req.params.joNo;
  const details = req.body;
  
  if (!Array.isArray(details)) {
    return res.status(400).json({ error: 'Details must be an array' });
  }
  
  db.getConnection((err, connection) => {
    if (err) return res.status(500).json({ error: 'DB connection error' });
    
    // First, delete all existing details for this JO
    const deleteSql = 'DELETE FROM jo_d WHERE JO_No = ?';

    // Remember which assets were on this JO before the lines are replaced
    // (queued on the same connection, so it runs before the DELETE)
    const oldFacNosPromise = runQuery(connection, 'SELECT FAC_NO FROM jo_d WHERE JO_No = ?', [joNo])
      .then((rows) => rows.map((r) => r.FAC_NO));
    oldFacNosPromise.catch(() => {}); // errors are handled where it is awaited
    
    connection.query(deleteSql, [joNo], async (err, deleteResult) => {
      // All lines removed: clear the pending status on the assets that were on this JO
      if (!err && details.length === 0) {
        try {
          await syncPendingStatus(connection, await oldFacNosPromise, []);
        } catch (statErr) {
          connection.release();
          console.error('Error updating itemlist xxStats:', statErr);
          return res.status(500).json({ error: 'Details removed but asset status update failed', details: statErr.message });
        }
      }

      if (err) {
        connection.release();
        return res.status(500).json({ error: 'Error deleting old details', details: err.message });
      }
      
      if (details.length === 0) {
        connection.release();
        return res.json({ success: true, message: 'All details removed', deletedCount: deleteResult.affectedRows });
      }
      
      // Insert new details - INCLUDE ALL FIELDS
      const insertSql = `INSERT INTO jo_d (
        JO_No, FAC_NO, FAC_name, qty, UOM, workDet, TargetDate, Status, 
        brand, serialno, ItemLocation, xDate, xpost, StartDate, EndDate,
        eval_status, eval_remarks, disposal_reason, Main_Status, Main_Remarks
      ) VALUES ?`;
      
      const values = details.map(detail => [
        joNo,
        detail.FAC_NO || '',
        detail.FAC_name || '',
        detail.qty || 1,
        detail.UOM || '',
        detail.workDet || '',
        toSqlDate(detail.TargetDate),
        detail.Status || 'OPEN',
        detail.brand || '',
        detail.serialno || '',
        detail.ItemLocation || '',
        toSqlDate(detail.xDate),
        detail.xpost || 0,
        toSqlDate(detail.StartDate),
        toSqlDate(detail.EndDate),
        detail.eval_status || '',          // Added - preserve eval_status
        detail.eval_remarks || '',         // Added - preserve eval_remarks
        detail.disposal_reason || '',      // Added - preserve disposal_reason
        detail.Main_Status || 'OPEN',      // Added - preserve Main_Status
        detail.Main_Remarks || ''
      ]);
      
      connection.query(insertSql, [values], async (err, insertResult) => {
        if (err) {
          connection.release();
          console.error('Error inserting details:', err);
          return res.status(500).json({ error: 'Error inserting details', details: err.message });
        }

        // Added lines get 'With Pending Job Order'; removed lines are cleared
        try {
          await syncPendingStatus(connection, await oldFacNosPromise, details.map((d) => d.FAC_NO));
        } catch (statErr) {
          connection.release();
          console.error('Error updating itemlist xxStats:', statErr);
          return res.status(500).json({ error: 'Details saved but asset status update failed', details: statErr.message });
        }

        // Maintenance update: asset status = "<eval_status> | <Main_Status>".
        // eval_status is the value set at evaluation. Rows still at the default
        // 'OPEN' (maintenance hasn't touched them) or without an evaluation are skipped.
        try {
          for (const detail of details) {
            const facNo = (detail.FAC_NO || '').trim();
            const evalStatus = (detail.eval_status || '').trim();
            const mainStatus = (detail.Main_Status || '').trim();

            if (!facNo || facNo.toLowerCase() === 'n') continue;
            if (!evalStatus || !mainStatus || mainStatus.toUpperCase() === 'OPEN') continue;

            await new Promise((resolve, reject) => {
              connection.query(
                'UPDATE itemlist SET xxStats = ? WHERE FacNO = ?',
                [`${evalStatus} | ${mainStatus}`, facNo],
                (error, result) => (error ? reject(error) : resolve(result))
              );
            });
          }
        } catch (statErr) {
          connection.release();
          console.error('Error updating itemlist xxStats:', statErr);
          return res.status(500).json({ error: 'Details saved but asset status update failed', details: statErr.message });
        }

        connection.release();
        res.json({ 
          success: true, 
          message: 'JO details updated successfully',
          deletedCount: deleteResult.affectedRows,
          insertedCount: insertResult.affectedRows
        });
      });
    });
  });
});

// Delete JO details (if needed)
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  
  db.getConnection((err, connection) => {
    if(err) return res.status(500).json({error: 'Database connection failed'});
    
    const sql = 'DELETE FROM jo_d WHERE id = ?';
    connection.query(sql, [id], (error, result) => {
      connection.release();
      if(error) return res.status(500).json({error: 'Database query failed'});
      if(result.affectedRows === 0) return res.status(404).json({error: 'Detail not found'});
      res.json({message: 'Detail deleted successfully'});
    });
  });
});

export default router;