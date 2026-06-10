  import express from 'express';
  import {db} from '../server.js';

  const router = express.Router();

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
      
      // Helper function to format date
      // const formatDate = (dateStr) => {
      //   if (!dateStr) return null;
      //   // If already in YYYY-MM-DD format
      //   if (typeof dateStr === 'string' && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      //     return dateStr;
      //   }
      //   // Convert from other formats
      //   const date = new Date(dateStr);
      //   if (isNaN(date.getTime())) return null;
      //   return date.toISOString().split('T')[0];
      // };
      
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
          Amount_Aq,
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
          Amount_Aq !== undefined ? Number(Amount_Aq) : 0,
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
        .then((results) => {
          connection.release();
          res.status(201).json({
            message: 'TR details created successfully',
            count: results.length,
            ids: results.map(r => r.insertId)
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
      
      connection.query(deleteSql, [TR_No], (err, deleteResult) => {
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
          detail.Amount_Aq !== undefined ? Number(detail.Amount_Aq) : 0,
          detail.New_Department || '',
          detail.Holder || '',
          detail.location || '',
          detail.Orig_Department || '',
          detail.New_Holder || '',
          detail.New_Location || '',
        ]);
        
        connection.query(insertSql, [values], (err, insertResult) => {
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

