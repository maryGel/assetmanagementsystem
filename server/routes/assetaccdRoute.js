  import express from 'express';
  import {db} from '../server.js';

  const router = express.Router();

  // Get Asset Accountability details
  router.get('/', (req, res) => {
    
    db.getConnection((err, connection) => {
        if (err) {
        return res.status(500).json({error: 'Database connection error'});
        }

        const sql = 'SELECT * FROM assestaccd';

        connection.query(sql, (err, results) => {
          connection.release();
            if(err){
                return res.status(500).json({err: 'Error fetching the data'})
            }
            res.json(results);
        });
    });
  });


  // Get single assestaccd details
  router.get('/:AAFNo', (req, res) => {
    const {AAFNo} = req.params;

    const decodedAAFNo = decodeURIComponent(AAFNo);
    const cleanAAFNo = decodedAAFNo
      .replace(/\u00A0/g, '') // Remove NBSP
      .replace(/\s/g, '') // Remove normal whitespace
      .toUpperCase();

    db.getConnection((err, connection) => {
      if(err){
        return res.status(500).json({err: 'Database connection failed assestaccd'})
      }

      const sql = 'SELECT * FROM assestaccd WHERE AAFNo = ?';

      connection.query(sql, [cleanAAFNo], (error, result)=>{
        connection.release();

        if(error){
          return res.status(500).json({error: 'Database query failed assestaccd'})
        }

        if(result.length === 0){
          return res.status(404).json({error: 'AAF details not found'})
        }

        res.json(result[0]);
      });
    });
  });

  // Create AA details (accepts array of items)
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
        return res.status(500).json({error: 'Database connection failed assestaccd', details: err.message});
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
      const sql = `INSERT INTO assestaccd (
        AAFNo, ItemNo, ItemName, Qty, DteAqui,
        Units,  serial,  Supplier, unitcost
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ? )`;
      
      const promises = items.map((item) => {
        const {
          AAFNo,
          ItemNo,
          ItemName,
          Qty,  
          DteAqui,
          Units,
          serial,
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
          serial || '',
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
        .then((results) => {
          connection.release();
          res.status(201).json({
            message: 'AA details created successfully',
            count: results.length,
            ids: results.map(r => r.insertId)
          });
        })
        .catch((error) => {
          connection.release();
          console.error('Detail insert error:', error);
          res.status(500).json({
            error: 'Database query failed assestaccd',
            details: error.sqlMessage,
            code: error.code
          });
        });
    });
  });
  
  // Update AA details (if needed)
  router.put('/:AAFNo', (req, res) => {
    const AAFNo = req.params.AAFNo;
    const details = req.body;
    
    if (!Array.isArray(details)) {
      return res.status(400).json({ error: 'Details must be an array' });
    }
    
    db.getConnection((err, connection) => {
      if (err) return res.status(500).json({ error: 'DB connection error' });
      
      // First, delete all existing details for this AA
      const deleteSql = 'DELETE FROM assestaccd WHERE AAFNo = ?';
      
      connection.query(deleteSql, [AAFNo], (err, deleteResult) => {
        if (err) {
          connection.release();
          return res.status(500).json({ error: 'Error deleting old details', details: err.message });
        }
        
        if (details.length === 0) {
          connection.release();
          return res.json({ success: true, message: 'All details removed', deletedCount: deleteResult.affectedRows });
        }
        
        // Insert new details
        const insertSql = 'INSERT INTO assestaccd (AAFNo, ItemNo, ItemName, Qty, DteAqui, Units, serial,  Supplier, unitcost) VALUES ?';
        
        const values = details.map(detail => [
          AAFNo,
          detail.ItemNo || '',
          detail.ItemName || '',
          detail.Qty !== undefined ? Number(detail.Qty) : 1,
          detail.DteAqui || null,
          detail.Units || '',
          detail.serial || '',
          detail.Supplier || '',
          detail.unitcost !== undefined ? Number(detail.unitcost) : 0,
        ]);
        
        connection.query(insertSql, [values], (err, insertResult) => {
          connection.release();
          
          if (err) {
            console.error('Error inserting details:', err);
            return res.status(500).json({ error: 'Error inserting details', details: err.message });
          }
          
          res.json({ 
            success: true, 
            message: 'AA details updated successfully',
            deletedCount: deleteResult.affectedRows,
            insertedCount: insertResult.affectedRows
          });
        });
      });
    });
  });
  
  // Delete AA details (if needed)
  router.delete('/:id', (req, res) => {
    const { id } = req.params;
    
    db.getConnection((err, connection) => {
      if(err) return res.status(500).json({error: 'Database connection failed'});
      
      const sql = 'DELETE FROM assestaccd WHERE id = ?';
      connection.query(sql, [id], (error, result) => {
        connection.release();
        if(error) return res.status(500).json({error: 'Database query failed'});
        if(result.affectedRows === 0) return res.status(404).json({error: 'Detail not found'});
        res.json({message: 'Detail deleted successfully'});
      });
    });
  });

  export default router;

