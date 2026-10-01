import express from 'express';
import {db} from '../server.js';

const router = express.Router();

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
      return res.status(500).json({error: 'Database connection failed jo_d', details: err.message});
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
    const sql = `INSERT INTO jo_d (
      JO_No, FAC_NO, FAC_name, qty, xDate, xpost, 
      UOM, brand, serialno, workDet, targetDate, Status, ItemLocation,
      StartDate, EndDate
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    const promises = items.map((item) => {
      const {
        JO_No,
        FAC_NO,
        FAC_name,
        qty,
        xDate,
        xpost,
        UOM,
        brand,
        serialno,
        workDet,
        TargetDate,
        Status,
        ItemLocation,
        StartDate,
        EndDate,
      } = item;
      
      const values = [
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
        formatDate(EndDate)
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
      .then((results) => {
        connection.release();
        res.status(201).json({
          message: 'JO details created successfully',
          count: results.length,
          ids: results.map(r => r.insertId)
        });
      })
      .catch((error) => {
        connection.release();
        console.error('Detail insert error:', error);
        res.status(500).json({
          error: 'Database query failed jo_d',
          details: error.sqlMessage,
          code: error.code
        });
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
    
    connection.query(deleteSql, [joNo], (err, deleteResult) => {
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
        detail.TargetDate || null,
        detail.Status || 'OPEN',
        detail.brand || '',
        detail.serialno || '',
        detail.ItemLocation || '',
        detail.xDate || null,
        detail.xpost || 0,
        detail.StartDate || null,
        detail.EndDate || null,
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