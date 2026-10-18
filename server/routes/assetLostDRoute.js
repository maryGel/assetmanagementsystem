import express from 'express';
  import {db} from '../server.js';

  const router = express.Router();

  // ---------- itemlist.xxStats sync for edited documents ----------
  const PENDING_STATUS = 'With Pending Lost Asset';

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
  // Lines that were already on the document are left untouched.
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

  // Get Asset lost Details
  router.get('/', (req, res) => {
    
    db.getConnection((err, connection) => {
        if (err) {
        return res.status(500).json({error: 'Database connection error'});
        }

        const sql = 'SELECT * FROM assetlostd';

        connection.query(sql, (err, results) => {
          connection.release();
            if(err){
                return res.status(500).json({err: 'Error fetching the data'})
            }
            res.json(results);
        });
    });
  });


  // Get single assetlostd details
  router.get('/:AAFNo', (req, res) => {
    const {AAFNo} = req.params;

    const decodedAAFNo = decodeURIComponent(AAFNo);
    const cleanAAFNo = decodedAAFNo
      .replace(/\u00A0/g, '') // Remove NBSP
      .replace(/\s/g, '') // Remove normal whitespace
      .toUpperCase();

    db.getConnection((err, connection) => {
      if(err){
        return res.status(500).json({err: 'Database connection failed assetlostd'})
      }

      const sql = 'SELECT * FROM assetlostd WHERE AAFNo = ?';

      connection.query(sql, [cleanAAFNo], (error, result)=>{
        connection.release();

        if(error){
          return res.status(500).json({error: 'Database query failed assetlostd'})
        }

        if(result.length === 0){
          return res.status(404).json({error: 'AAF details not found'})
        }

        res.json(result[0]);
      });
    });
  });


  // Create AL details (accepts array of items)
  router.post('/', (req, res) => {
    const items = req.body; // This should be an array of detail items
    
    // Validate that items is an array
    if (!Array.isArray(items)) {
      return res.status(400).json({error: 'Request body must be an array of detail items'});
    }
    
    if (items.length === 0) {
      return res.status(400).json({error: 'At least one detail item is required'});
    }
  
    db.getConnection((err, connection) => {
      if(err) {
        return res.status(500).json({error: 'Database connection failed assetlostd', details: err.message});
      }

    // Helper function to format date
    const formatDate = (dateStr) => {
      if (!dateStr) return null;
      // If already in YYYY-MM-DD format
      if (typeof dateStr === 'string' && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return dateStr;
      }
      // Convert from other formats
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return null;
      return date.toISOString().split('T')[0];
    };
      
      // Process each item
      const sql = `INSERT INTO assetlostd (
        AAFNo, ItemNo, ItemName, Qty, DteAqui,
        Units,  SERIAL,  Supplier, unitcost
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ? )`;
      
      const promises = items.map((item) => {
        const {
          AAFNo,
          ItemNo,
          ItemName,
          Qty,  
          DteAqui,
          Units,
          SERIAL,
          Supplier,          
          unitcost,
        } = item;
        
        const values = [
          AAFNo,
          ItemNo || '',
          ItemName || '',
          Qty !== undefined ? Number(Qty) : 1,
          formatDate(DteAqui),
          Units || '',
          SERIAL || '',
          Supplier || '',
          unitcost !== undefined ? Number(unitcost) : 0,
        ];
        
        return new Promise((resolve, reject) => {
          connection.query(sql, values, (error, result) => {
            if (error) reject(error);
            else resolve(result);
          });
        });
      });
      
      // Execute all inserts
      Promise.all(promises)
        .then(async (results) => {
          // Flag each asset on this AAF as having a pending lost-asset report (per FacNO = ItemNo).
          // Blank ItemNo and 'n' (no asset) are skipped.
          const facNos = [...new Set(
            items
              .map((i) => (i.ItemNo || '').trim())
              .filter((f) => f && f.toLowerCase() !== 'n')
          )];

          let assetsFlagged = 0;
          if (facNos.length > 0) {
            const upd = await new Promise((resolve, reject) => {
              connection.query(
                `UPDATE itemlist SET xxStats = 'With Pending Lost Asset' WHERE FacNO IN (?)`,
                [facNos],
                (error, result) => (error ? reject(error) : resolve(result))
              );
            });
            assetsFlagged = upd.affectedRows;
          }

          connection.release();
          res.status(201).json({
            message: 'AL details created successfully',
            count: results.length,
            ids: results.map(r => r.insertId),
            assetsFlagged
          });
        })
        .catch((error) => {
          connection.release();
          console.error('Detail insert error:', error);
          res.status(500).json({
            error: 'Database query failed assetlostd',
            details: error.sqlMessage,
            code: error.code
          });
        });
    });
  });
  
  // Update AL details (if needed)
  router.put('/:AAFNo', (req, res) => {
    const AAFNo = req.params.AAFNo;
    const details = req.body;
    
    if (!Array.isArray(details)) {
      return res.status(400).json({ error: 'Details must be an array' });
    }
    
    db.getConnection((err, connection) => {
      if (err) return res.status(500).json({ error: 'DB connection error' });
      
      // First, delete all existing details for this AL
      const deleteSql = 'DELETE FROM assetlostd WHERE AAFNo = ?';

      // Remember which assets were on this AAF before the lines are replaced
      // (queued on the same connection, so it runs before the DELETE)
      const oldFacNosPromise = runQuery(connection, 'SELECT ItemNo FROM assetlostd WHERE AAFNo = ?', [AAFNo])
        .then((rows) => rows.map((r) => r.ItemNo));
      oldFacNosPromise.catch(() => {}); // errors are handled where it is awaited
      
      connection.query(deleteSql, [AAFNo], async (err, deleteResult) => {
        // All lines removed: clear the pending status on the assets that were on this AAF
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
        
        // Insert new details
        const insertSql = 'INSERT INTO assetlostd (AAFNo, ItemNo, ItemName, Qty, DteAqui, Units, SERIAL,  Supplier, unitcost) VALUES ?';
        
        const values = details.map(detail => [
          AAFNo,
          detail.ItemNo || '',
          detail.ItemName || '',
          detail.Qty !== undefined ? Number(detail.Qty) : 1,
          detail.DteAqui || null,
          detail.Units || '',
          detail.SERIAL || '',
          detail.Supplier || '',
          detail.unitcost !== undefined ? Number(detail.unitcost) : 0,
        ]);
        
        connection.query(insertSql, [values], async (err, insertResult) => {
          // Added lines get the pending status; removed lines are cleared
          if (!err) {
            try {
              await syncPendingStatus(connection, await oldFacNosPromise, details.map((d) => d.ItemNo));
            } catch (statErr) {
              connection.release();
              console.error('Error updating itemlist xxStats:', statErr);
              return res.status(500).json({ error: 'Details saved but asset status update failed', details: statErr.message });
            }
          }

          connection.release();
          
          if (err) {
            console.error('Error inserting details:', err);
            return res.status(500).json({ error: 'Error inserting details', details: err.message });
          }
          
          res.json({ 
            success: true, 
            message: 'AL details updated successfully',
            deletedCount: deleteResult.affectedRows,
            insertedCount: insertResult.affectedRows
          });
        });
      });
    });
  });
  
  // Delete AL details (if needed)
  router.delete('/:id', (req, res) => {
    const { id } = req.params;
    
    db.getConnection((err, connection) => {
      if(err) return res.status(500).json({error: 'Database connection failed'});
      
      const sql = 'DELETE FROM assetlostd WHERE id = ?';
      connection.query(sql, [id], (error, result) => {
        connection.release();
        if(error) return res.status(500).json({error: 'Database query failed'});
        if(result.affectedRows === 0) return res.status(404).json({error: 'Detail not found'});
        res.json({message: 'Detail deleted successfully'});
      });
    });
  });

  export default router;

  //Update the Asset Lost Details