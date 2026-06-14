  import express from 'express';
  import {db} from '../server.js';

  const router = express.Router();

  // Get all ad_d
  router.get('/', (req, res) => {
    
    db.getConnection((err, connection) => {
        if (err) {
        return res.status(500).json({error: 'Database connection error'});
        }

        const sql = 'SELECT * FROM ad_h';

        connection.query(sql, (err, results) => {
          connection.release();
            if(err){
                return res.status(500).json({err: 'Error fetching the data: ad_h'})
            }
            res.json(results);
        });
    });
  });


  // Get single ad_d
  router.get('/:AD_No', (req, res) => {
    const {TRNO} = req.params;

    const decodedAD_No = decodeURIComponent(TRNO);
    const cleanAD_No = decodedAD_No
      .replace(/\u00A0/g, '') // Remove NBSP
      .replace(/\s/g, '') // Remove normal whitespace
      .toUpperCase();

    db.getConnection((err, connection) => {
      if(err){
        return res.status(500).json({err: 'Database connection failed ad_d'})
      }

      const sql = 'SELECT * FROM ad_h WHERE AD_No = ?';

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

  //Create the AD header xpost
  router.post('/', (req, res) => {
    const { 
      AD_No,
      Evaluated_By,
      xDate,
      xpost,
      Department_Code,
      Remarks,   
    } = req.body;

    // Format date properly
  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    // If already in YYYY-MM-DD format, return as is
    if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;  // NO transformation
    }
    // Convert from other formats
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    return date.toISOString().split('T')[0];
  };

    db.getConnection((err, connection) => {
      if(err) return res.status(500).json({error: 'Database connection error'});
      
      const sql = `INSERT INTO ad_h (
        AD_No, Evaluated_By, xDate, xpost, Department_Code, Remarks
      ) VALUES (?, ?, ?, ?, ?, ?)`;
      
      const values = [
        AD_No,
        Evaluated_By || '',
        formatDate(xDate),  // Use formatted date
        xpost !== undefined ? xpost : 0,
        Department_Code || '',
        Remarks || '',
      ];

      console.log('Inserting header:', { sql, values });

      connection.query(sql, values, (error, result) => {
        connection.release();
        if(error) {
          console.error('Header insert error:', error);
          return res.status(500).json({error: 'Database query failed', details: error.sqlMessage});
        }
        res.status(201).json({
          message: 'AD header created successfully',
          id: result.insertId,
          AD_No: AD_No
        });
      });
    });
  });

  // Update AD header
  router.put('/:AD_No', (req, res) => {
    const AD_No = req.params.AD_No;
    const updateData = req.body;
    
    // Remove any fields that shouldn't be updated
    const { id, ...cleanData } = updateData;
    
    // Build dynamic UPDATE query
    const fields = Object.keys(cleanData).map(field => `${field} = ?`).join(', ');
    const values = [...Object.values(cleanData), AD_No];
    
    const sql = `UPDATE ad_h SET ${fields} WHERE AD_No = ?`;
    
    db.getConnection((err, connection) => {
      if (err) return res.status(500).json({ error: 'DB connection error' });
      
      connection.query(sql, values, (err, result) => {
        connection.release();
        
        if (err) {
          console.error('Error updating AD header:', err);
          return res.status(500).json({ error: 'Error updating AD header', details: err.message });
        }
        
        if (result.affectedRows === 0) {
          return res.status(404).json({ error: 'AD not found' });
        }
        
        res.json({ 
          success: true, 
          message: 'AD header updated successfully',
          affectedRows: result.affectedRows
        });
      });
    });
  });

  export default router;

 