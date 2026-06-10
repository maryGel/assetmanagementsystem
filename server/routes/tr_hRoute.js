  import express from 'express';
  import {db} from '../server.js';

  const router = express.Router();

  // Get all tr_d
  router.get('/', (req, res) => {
    
    db.getConnection((err, connection) => {
        if (err) {
        return res.status(500).json({error: 'Database connection error'});
        }

        const sql = 'SELECT * FROM tr_h';

        connection.query(sql, (err, results) => {
          connection.release();
            if(err){
                return res.status(500).json({err: 'Error fetching the data: tr_h'})
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
        return res.status(500).json({err: 'Database connection failed tr_h'})
      }

      const sql = 'SELECT * FORM tr_h WHERE TR_No = ?';

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

  //Create the TR header xpost
  router.post('/', (req, res) => {
    const { 
      TR_No,
      Custodian,
      xDate,
      xpost,
      Department,
      Remarks,
      Holder,
      Location,     
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
      
      const sql = `INSERT INTO tr_h (
        TR_No, Custodian, xDate, xpost, Department, Remarks, Holder, Location
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
      
      const values = [
        TR_No,
        Custodian || '',
        formatDate(xDate),  // Use formatted date
        xpost !== undefined ? xpost : 0,
        Department || '',
        Remarks || '',
        Holder || '',
        Location || '',
      ];

      console.log('Inserting header:', { sql, values });

      connection.query(sql, values, (error, result) => {
        connection.release();
        if(error) {
          console.error('Header insert error:', error);
          return res.status(500).json({error: 'Database query failed', details: error.sqlMessage});
        }
        res.status(201).json({
          message: 'TR header created successfully',
          id: result.insertId,
          TR_No: TR_No
        });
      });
    });
  });

  // Update TR header

  router.put('/:TR_No', (req, res) => {
    const TR_No = req.params.TR_No;
    const updateData = req.body;
    
    // Remove any fields that shouldn't be updated
    const { id, ...cleanData } = updateData;
    
    // Build dynamic UPDATE query
    const fields = Object.keys(cleanData).map(field => `${field} = ?`).join(', ');
    const values = [...Object.values(cleanData), TR_No];
    
    const sql = `UPDATE tr_h SET ${fields} WHERE TR_No = ?`;
    
    db.getConnection((err, connection) => {
      if (err) return res.status(500).json({ error: 'DB connection error' });
      
      connection.query(sql, values, (err, result) => {
        connection.release();
        
        if (err) {
          console.error('Error updating TR header:', err);
          return res.status(500).json({ error: 'Error updating TR header', details: err.message });
        }
        
        if (result.affectedRows === 0) {
          return res.status(404).json({ error: 'TR not found' });
        }
        
        res.json({ 
          success: true, 
          message: 'TR header updated successfully',
          affectedRows: result.affectedRows
        });
      });
    });
  });
 
  export default router;
