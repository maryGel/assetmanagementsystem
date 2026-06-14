  import express from 'express';
  import {db} from '../server.js';

  const router = express.Router();

  // Get Asset Accountability header
  router.get('/', (req, res) => {
    
    db.getConnection((err, connection) => {
        if (err) {
        return res.status(500).json({error: 'Database connection error'});
        }

        const sql = 'SELECT * FROM assestacch';

        connection.query(sql, (err, results) => {
          connection.release();
            if(err){
                return res.status(500).json({err: 'Error fetching the data'})
            }
            res.json(results);
        });
    });
  });


  // Get single assestacch header
  router.get('/:AAFNo', (req, res) => {
    const {AAFNo} = req.params;

    const decodedAAFNo = decodeURIComponent(AAFNo);
    const cleanAAFNo = decodedAAFNo
      .replace(/\u00A0/g, '') // Remove NBSP
      .replace(/\s/g, '') // Remove normal whitespace
      .toUpperCase();

    db.getConnection((err, connection) => {
      if(err){
        return res.status(500).json({err: 'Database connection failed assestacch'})
      }

      const sql = 'SELECT * FROM assestacch WHERE AAFNo = ?';

      connection.query(sql, [cleanAAFNo], (error, result)=>{
        connection.release();

        if(error){
          return res.status(500).json({error: 'Database query failed assestacch'})
        }

        if(result.length === 0){
          return res.status(404).json({error: 'JO header not found'})
        }

        res.json(result[0]);
      });
    });
  });

    //Create the AA header xPosted
    router.post('/', (req, res) => {
      const { 
        AAFNo,
        Custodian,
        xDate,
        xPosted,
        Dep,
        EmpID,   
        EmpName
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
        
        const sql = `INSERT INTO assestacch (
          AAFNo, Custodian, xDate, xPosted, Dep, EmpID, EmpName
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`;
        
        const values = [
          AAFNo,
          Custodian || '',
          formatDate(xDate),  // Use formatted date
          xPosted !== undefined ? xPosted : 0,
          Dep || '',
          EmpID || '',
          EmpName || '',
        ];
  
        console.log('Inserting header:', { sql, values });
  
        connection.query(sql, values, (error, result) => {
          connection.release();
          if(error) {
            console.error('Header insert error:', error);
            return res.status(500).json({error: 'Database query failed', details: error.sqlMessage});
          }
          res.status(201).json({
            message: 'AA header created successfully',
            id: result.insertId,
            AAFNo: AAFNo
          });
        });
      });
    });
  
    // Update AA header
    router.put('/:AAFNo', (req, res) => {
      const AAFNo = req.params.AAFNo;
      const updateData = req.body;
      
      // Remove any fields that shouldn't be updated
      const { id, ...cleanData } = updateData;
      
      // Build dynamic UPDATE query
      const fields = Object.keys(cleanData).map(field => `${field} = ?`).join(', ');
      const values = [...Object.values(cleanData), AAFNo];
      
      const sql = `UPDATE assestacch SET ${fields} WHERE AAFNo = ?`;
      
      db.getConnection((err, connection) => {
        if (err) return res.status(500).json({ error: 'DB connection error' });
        
        connection.query(sql, values, (err, result) => {
          connection.release();
          
          if (err) {
            console.error('Error updating AA header:', err);
            return res.status(500).json({ error: 'Error updating AA header', details: err.message });
          }
          
          if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'AA not found' });
          }
          
          res.json({ 
            success: true, 
            message: 'AA header updated successfully',
            affectedRows: result.affectedRows
          });
        });
      });
    });

  export default router;

  //Update the Asset Accountability header xPosted