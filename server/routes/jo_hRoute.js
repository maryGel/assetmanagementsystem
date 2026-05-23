  import express from 'express';
  import {db} from '../server.js';

  const router = express.Router();

  // Get JO header
  router.get('/', (req, res) => {
    
    db.getConnection((err, connection) => {
        if (err) {
        return res.status(500).json({error: 'Database connection error'});
        }

        const sql = 'SELECT * FROM jo_h';
 
        connection.query(sql, (err, results) => {
          connection.release();
            if(err){
                return res.status(500).json({err: 'Error fetching the data'})
            }
            res.json(results);
        });
    });
  });


  // Get single jo_h header
  router.get('/:JO_No', (req, res) => {
    const {JO_No} = req.params;

    const decodedJONo = decodeURIComponent(JO_No);
    const cleanJONo = decodedJONo
      .replace(/\u00A0/g, '') // Remove NBSP
      .replace(/\s/g, '') // Remove normal whitespace
      .toUpperCase();

    db.getConnection((err, connection) => {
      if(err){
        return res.status(500).json({err: 'Database connection failed jo_h'})
      }

      const sql = 'SELECT * FROM jo_h WHERE JO_No = ?';

      connection.query(sql, [cleanJONo], (error, result)=>{
        connection.release();

        if(error) return res.status(500).json({error: 'Database query failed jo_h'})
        
        if(result.length === 0) return res.status(404).json({error: 'JO header not found'})        

        res.json(result[0]);
      });
    });
  });

  export default router;

  //Create the JO header xpost
  router.post('/', (req, res) => {
    const { 
      JO_No,
      Remarks,
      Sector_name,
      Sector_Code,
      xDate,
      xpost,
      Deparment_name,
      Department_Code,
      requested_by,
    } = req.body;

    // Format date properly
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

    db.getConnection((err, connection) => {
      if(err) return res.status(500).json({error: 'Database connection error'});
      
      const sql = `INSERT INTO jo_h (
        JO_No, Remarks, Sector_name, Sector_Code, 
        xDate, xpost, Deparment_name, Department_Code, requested_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
      
      const values = [
        JO_No,
        Remarks || '',
        Sector_name || '',
        Sector_Code || '',
        formatDate(xDate),  // Use formatted date
        xpost !== undefined ? xpost : 0,
        Deparment_name || '',
        Department_Code || '',
        requested_by || '',
      ];

      console.log('Inserting header:', { sql, values });

      connection.query(sql, values, (error, result) => {
        connection.release();
        if(error) {
          console.error('Header insert error:', error);
          return res.status(500).json({error: 'Database query failed', details: error.sqlMessage});
        }
        res.status(201).json({
          message: 'JO header created successfully',
          id: result.insertId,
          JO_No: JO_No
        });
      });
    });
  });

  // Update JO header

  router.put('/:joNo', (req, res) => {
    const joNo = req.params.joNo;
    const updateData = req.body;
    
    // Remove any fields that shouldn't be updated
    const { id, ...cleanData } = updateData;
    
    // Build dynamic UPDATE query
    const fields = Object.keys(cleanData).map(field => `${field} = ?`).join(', ');
    const values = [...Object.values(cleanData), joNo];
    
    const sql = `UPDATE jo_h SET ${fields} WHERE JO_No = ?`;
    
    db.getConnection((err, connection) => {
      if (err) return res.status(500).json({ error: 'DB connection error' });
      
      connection.query(sql, values, (err, result) => {
        connection.release();
        
        if (err) {
          console.error('Error updating JO header:', err);
          return res.status(500).json({ error: 'Error updating JO header', details: err.message });
        }
        
        if (result.affectedRows === 0) {
          return res.status(404).json({ error: 'JO not found' });
        }
        
        res.json({ 
          success: true, 
          message: 'JO header updated successfully',
          affectedRows: result.affectedRows
        });
      });
    });
  });