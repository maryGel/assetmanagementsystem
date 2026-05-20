  import express from 'express';
  import {db} from '../server.js';

  const router = express.Router();

  // Get JO header
  router.get('/', (req, res) => {
    
    db.getConnection((err, connection) => {
        if (err) {
        return res.status(500).json({error: 'Database connection error'});
        }

        const sql = 'SELECT * FROM jo_d';

        connection.query(sql, (err, results) => {
          connection.release();
            if(err){
                return res.status(500).json({err: 'Error fetching the data'})
            }
            res.json(results);
        });
    });
  });


  // Get single jo_d
  router.get('/:JO_No', (req, res) => {
    const {JO_No} = req.params;

    const decodedJONo = decodeURIComponent(JO_No);
    const cleanJONo = decodedJONo
      .replace(/\u00A0/g, '') // Remove NBSP
      .replace(/\s/g, '') // Remove normal whitespace
      .toUpperCase();

    db.getConnection((err, connection) => {
      if(err){
        return res.status(500).json({err: 'Database connection failed jo_d'})
      }

      const sql = 'SELECT * FROM jo_d WHERE JO_No = ?';

      connection.query(sql, [cleanJONo], (error, result)=>{
        connection.release();

        if(error){
          return res.status(500).json({error: 'Database query failed jo_h'})
        }

        if(result.length === 0){
          return res.status(404).json({error: 'JO header not found'})
        }

        res.json(result[0]);
      });
    });
  });
 
  
  export default router;

  //Create the JO details
  router.post('/:JO_No', (req, res) => {
    const [
      JO_No,
      FAC_NO,
      FAC_name,
      qty,
      xDate,
      xpost,
      UOM,
      brand,
      serialNo,
      workDet,
      TargetDate,
      Status,
      ItemLocation
     ] = req.body; 
    
      db.getConnection((err, connection) => {
        if(err) return res.status(500).json({error: 'Database connection failed jo_d'})
          
        const sql = 'INSERT INTO jo_d (JO_No, FAC_NO, FAC_name, qty, xDate, xpost, UOM, brand, serialNo, workDet, targetDate, Status, ItemLocation) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
        const values = [
          JO_No,
          FAC_NO || '',
          FAC_name || '',
          qty || 0,
          xDate || null,
          xpost || 0,
          UOM || '',
          brand || '',
          serialNo || '',
          workDet || '',
          TargetDate || null,
          Status || 'OPEN',
          ItemLocation || ''
        ];

        connection.query(sql, values, (error, results) => {
          connection.release();

          if(error) return res.status(500).json({error: 'Database query failed jo_d'})
          res.status(201).json({
            message: 'JO details created successfully',
            id: results.insertId,
          });
        });
      })
  });
