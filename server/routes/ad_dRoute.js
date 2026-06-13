  import express from 'express';
  import {db} from '../server.js';

  const router = express.Router();

  // Get all ad_d
  router.get('/', (req, res) => {
    
    db.getConnection((err, connection) => {
        if (err) {
        return res.status(500).json({error: 'Database connection error'});
        }

        const sql = 'SELECT * FROM ad_d';

        connection.query(sql, (err, results) => {
          connection.release();
            if(err){
                return res.status(500).json({err: 'Error fetching the data: ad_d'})
            }
            res.json(results);
        });
    });
  });


  // Get single ad_d
  router.get('/:AD_No', (req, res) => {
    const {ADNO} = req.params;

    const decodedAD_No = decodeURIComponent(ADNO);
    const cleanAD_No = decodedAD_No
      .replace(/\u00A0/g, '') // Remove NBSP
      .replace(/\s/g, '') // Remove normal whitespace
      .toUpperCase();

    db.getConnection((err, connection) => {
      if(err){
        return res.status(500).json({err: 'Database connection failed ad_d'})
      }

      const sql = 'SELECT * FROM ad_d WHERE AD_No = ?';

      connection.query(sql, [cleanJONo], (error, result)=>{
        connection.release();

        if(error){
          return res.status(500).json({error: 'Database query failed ad_d'})
        }

        if(result.length === 0){
          return res.status(404).json({error: 'ad_d not found'})
        }

        res.json(result[0]);
      });
    });
  });

  // Create AD details (accepts array of items)
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
        return res.status(500).json({error: 'Database connection failed ad_d', details: err.message});
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
      const sql = `INSERT INTO ad_d (
        AD_No, FAC_NO, FAC_name, qty, xDate, xpost, 
        UOM, brand, serialno, workDet, Disposal_Type, salvage_amount
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? )`;
      
      const promises = items.map((item) => {
        const {
          AD_No,
          FAC_NO,
          FAC_name,
          qty,  
          xDate,
          xpost,
          UOM,
          brand,
          serialno,
          workDet,
          Disposal_Type,          
          salvage_amount,
        } = item;
        
        const values = [
          AD_No,
          FAC_NO || '',
          FAC_name || '',
          qty !== undefined ? Number(qty) : 1,
          formatDate(xDate),
          xpost !== undefined ? xpost : 0,
          UOM || '',
          brand || '',
          serialno || '',
          workDet || '',
          Disposal_Type || '',
          salvage_amount !== undefined ? Number(salvage_amount) : 0,
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
            message: 'AD details created successfully',
            count: results.length,
            ids: results.map(r => r.insertId)
          });
        })
        .catch((error) => {
          connection.release();
          console.error('Detail insert error:', error);
          res.status(500).json({
            error: 'Database query failed ad_d',
            details: error.sqlMessage,
            code: error.code
          });
        });
    });
  });
  
  // Update AD details (if needed)
  router.put('/:AD_No', (req, res) => {
    const AD_No = req.params.AD_No;
    const details = req.body;
    
    if (!Array.isArray(details)) {
      return res.status(400).json({ error: 'Details must be an array' });
    }
    
    db.getConnection((err, connection) => {
      if (err) return res.status(500).json({ error: 'DB connection error' });
      
      // First, delete all existing details for this AD
      const deleteSql = 'DELETE FROM ad_d WHERE AD_No = ?';
      
      connection.query(deleteSql, [AD_No], (err, deleteResult) => {
        if (err) {
          connection.release();
          return res.status(500).json({ error: 'Error deleting old details', details: err.message });
        }
        
        if (details.length === 0) {
          connection.release();
          return res.json({ success: true, message: 'All details removed', deletedCount: deleteResult.affectedRows });
        }
        
        // Insert new details
        const insertSql = 'INSERT INTO ad_d (AD_No, FAC_NO, FAC_name, qty, xDate,  xpost, UOM, brand, serialno, workDet, Disposal_Type, salvage_amount) VALUES ?';
        
        const values = details.map(detail => [
          AD_No,
          detail.FAC_NO || '',
          detail.FAC_name || '',
          detail.qty !== undefined ? Number(detail.qty) : 1,
          detail.xDate || null,
          detail.xpost !== undefined ? detail.xpost : 0,
          detail.UOM || '',
          detail.brand || '',
          detail.serialno || '',
          detail.workDet || '',
          detail.Disposal_Type || '',
          detail.salvage_amount !== undefined ? Number(detail.salvage_amount) : 0,
        ]);
        
        connection.query(insertSql, [values], (err, insertResult) => {
          connection.release();
          
          if (err) {
            console.error('Error inserting details:', err);
            return res.status(500).json({ error: 'Error inserting details', details: err.message });
          }
          
          res.json({ 
            success: true, 
            message: 'AD details updated successfully',
            deletedCount: deleteResult.affectedRows,
            insertedCount: insertResult.affectedRows
          });
        });
      });
    });
  });
  
  // Delete AD details (if needed)
  router.delete('/:id', (req, res) => {
    const { id } = req.params;
    
    db.getConnection((err, connection) => {
      if(err) return res.status(500).json({error: 'Database connection failed'});
      
      const sql = 'DELETE FROM ad_d WHERE id = ?';
      connection.query(sql, [id], (error, result) => {
        connection.release();
        if(error) return res.status(500).json({error: 'Database query failed'});
        if(result.affectedRows === 0) return res.status(404).json({error: 'Detail not found'});
        res.json({message: 'Detail deleted successfully'});
      });
    });
  });

  export default router;

 