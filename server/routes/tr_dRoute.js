import express from 'express';
  import {db} from '../server.js';

  const router = express.Router();

  // ---------- itemlist.xxStats sync for edited documents ----------
  const PENDING_STATUS = 'With Pending Transfer';

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

  // Get all tr_d
  router.get('/', (req, res) => {
    
    db.getConnection((err, connection) => {
        if (err) {
        return res.status(500).json({error: 'Database connection error'});
        }

        const sql = 'SELECT * FROM tr_d';

        connection.query(sql, (err, results) => {
          connection.release();
            if(err){
                return res.status(500).json({err: 'Error fetching the data: tr_d'})
            }
            res.json(results);
        });
    });
  });


  // Get single tr_d
  router.get(':TR_No', (req, res) => {
    const {TR_No} = req.params;

    const decodedTR_No = decodeURIComponent(TR_No);
    const cleanTR_No = decodedJONo
      .replace(/\u00A0/g, '') // Remove NBSP
      .replace(/\s/g, '') // Remove normal whitespace
      .toUpperCase();

    db.getConnection((err, connection) => {
      if(err){
        return res.status(500).json({err: 'Database connection failed tr_d'})
      }

      const sql = 'SELECT * FORM tr_d WHERE TR_No = ?';

      connection.query(sql, [cleanJONo], (error, result)=>{
        connection.release();

        if(error){
          return res.status(500).json({error: 'Database query failed tr_d'})
        }

        if(result.length === 0){
          return res.status(404).json({error: 'TR header not found'})
        }

        res.json(result[0]);
      });
    });
  });

  // Create TR details (accepts array of items)
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
        return res.status(500).json({error: 'Database connection failed tr_d', details: err.message});
      }
      
      // Process each item
      const sql = `INSERT INTO tr_d (
        TR_No, FAC_NO, FAC_name, qty, xpost, 
        UOM, brand, serial_no, Date_Aq, Amount_aq, New_Department, Holder, location, Orig_Department, New_Holder, New_Location
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
      
      const promises = items.map((item) => {
        const {
          TR_No,
          FAC_NO,
          FAC_name,
          qty,
          xpost,
          UOM,
          brand,
          serial_no,
          Date_Aq,          
          Amount_aq,
          New_Department,
          Holder,
          location,
          Orig_Department,
          New_Holder,
          New_Location,
        } = item;
        
        const values = [
          TR_No,
          FAC_NO || '',
          FAC_name || '',
          qty !== undefined ? Number(qty) : 1,
          xpost !== undefined ? xpost : 0,
          UOM || '',
          brand || '',
          serial_no || '',
          Date_Aq || '',
          Amount_aq !== undefined ? Number(Amount_aq) : 0,
          New_Department || '',
          Holder || '',
          location || '',
          Orig_Department || '',
          New_Holder || '',
          New_Location || '',
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
          // Flag each asset on this TR as having a pending transfer (per FacNO).
          // Blank FAC_NO and 'n' (no asset) are skipped.
          const facNos = [...new Set(
            items
              .map((i) => (i.FAC_NO || '').trim())
              .filter((f) => f && f.toLowerCase() !== 'n')
          )];

          let assetsFlagged = 0;
          if (facNos.length > 0) {
            const upd = await new Promise((resolve, reject) => {
              connection.query(
                `UPDATE itemlist SET xxStats = 'With Pending Transfer' WHERE FacNO IN (?)`,
                [facNos],
                (error, result) => (error ? reject(error) : resolve(result))
              );
            });
            assetsFlagged = upd.affectedRows;
          }

          connection.release();
          res.status(201).json({
            message: 'TR details created successfully',
            count: results.length,
            ids: results.map(r => r.insertId),
            assetsFlagged
          });
        })
        .catch((error) => {
          connection.release();
          console.error('Detail insert error:', error);
          res.status(500).json({
            error: 'Database query failed tr_d',
            details: error.sqlMessage,
            code: error.code
          });
        });
    });
  });
  
  // Update TR details (if needed)
  router.put('/:TR_No', (req, res) => {
    const TR_No = req.params.TR_No;
    const details = req.body;
    
    if (!Array.isArray(details)) {
      return res.status(400).json({ error: 'Details must be an array' });
    }
    
    db.getConnection((err, connection) => {
      if (err) return res.status(500).json({ error: 'DB connection error' });
      
      // First, delete all existing details for this TR
      const deleteSql = 'DELETE FROM tr_d WHERE TR_No = ?';

      // Remember which assets were on this TR before the lines are replaced
      // (queued on the same connection, so it runs before the DELETE)
      const oldFacNosPromise = runQuery(connection, 'SELECT FAC_NO FROM tr_d WHERE TR_No = ?', [TR_No])
        .then((rows) => rows.map((r) => r.FAC_NO));
      oldFacNosPromise.catch(() => {}); // errors are handled where it is awaited
      
      connection.query(deleteSql, [TR_No], async (err, deleteResult) => {
        // All lines removed: clear the pending status on the assets that were on this TR
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
        const insertSql = 'INSERT INTO tr_d (TR_No, FAC_NO, FAC_name, qty, xpost, UOM, brand, serial_no, Date_Aq, Amount_aq, New_Department, Holder, location, Orig_Department, New_Holder, New_Location) VALUES ?';
        
        const values = details.map(detail => [
          TR_No,
          detail.FAC_NO || '',
          detail.FAC_name || '',
          detail.qty !== undefined ? Number(detail.qty) : 1,
          detail.xpost !== undefined ? detail.xpost : 0,
          detail.UOM || '',
          detail.brand || '',
          detail.serial_no || '',
          detail.Date_Aq || '',
          detail.Amount_aq !== undefined ? Number(detail.Amount_aq) : 0,
          detail.New_Department || '',
          detail.Holder || '',
          detail.location || '',
          detail.Orig_Department || '',
          detail.New_Holder || '',
          detail.New_Location || '',
        ]);
        
        connection.query(insertSql, [values], async (err, insertResult) => {
          // Added lines get the pending status; removed lines are cleared
          if (!err) {
            try {
              await syncPendingStatus(connection, await oldFacNosPromise, details.map((d) => d.FAC_NO));
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
            message: 'TR details updated successfully',
            deletedCount: deleteResult.affectedRows,
            insertedCount: insertResult.affectedRows
          });
        });
      });
    });
  });
  
  // Delete TR details (if needed)
  router.delete('/:id', (req, res) => {
    const { id } = req.params;
    
    db.getConnection((err, connection) => {
      if(err) return res.status(500).json({error: 'Database connection failed'});
      
      const sql = 'DELETE FROM tr_d WHERE id = ?';
      connection.query(sql, [id], (error, result) => {
        connection.release();
        if(error) return res.status(500).json({error: 'Database query failed'});
        if(result.affectedRows === 0) return res.status(404).json({error: 'Detail not found'});
        res.json({message: 'Detail deleted successfully'});
      });
    });
  });
 
  export default router;