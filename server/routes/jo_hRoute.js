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
      Deaprtment_Code,
      requested_by,
    } = req.body;

    db.getConnection((err, connection) => {
      if(err) return res.status(500).json({error: 'Database connection error'});
      
      const sql = 'INSERT INTO jo_h (JO_No, Remarks, Sector_name, Sector_Code, xDate, xpost, Deparment_name, Deaprtment_Code, requested_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
      const values = [
        JO_No,
        Remarks || '',
        Sector_name || '',
        Sector_Code || '',
        xDate ? new Date(xDate) : null,
        xpost || 0,
        Deparment_name || '',
        Deaprtment_Code || '',
        requested_by || '',
      ]

      connection.query(sql, values, (error, result) => {
        connection.release();
        if(error) return res.status(500).json({error: 'Database query failed'});
        res.status(201).json({
          message: 'JO header created successfully',
          id: result.insertId,});
      });
    });
  });

  // Update JO header
  router.put('/:JO_No', (req, res) => {
    const { JO_No } = req.params;
    const {
      Remarks,
      Sector_name,
      Sector_Code,
      xDate,
      xpost,
      Deparment_name,
      Deaprtment_Code,
      requested_by,
    } = req.body;

    db.getConnection((err, connection) => {
      if(err) return res.status(500).json({error: 'Database connection error'});

      const sql = 'UPDATE jo_h SET Remarks = ?, Sector_name = ?, Sector_Code = ?, xDate = ?, xpost = ?, Deparment_name = ?, Deaprtment_Code = ?, requested_by = ? WHERE JO_No = ?';
      const values = [
        Remarks,
        Sector_name || '',
        Sector_Code || '',
        xDate ? new Date(xDate) : null,
        xpost || 0,
        Deparment_name || '',
        Deaprtment_Code || '',
        requested_by || '',
        JO_No,
      ];

      connection.query(sql, values, (error, result) => {
        connection.release();
        if(error) return res.status(500).json({error: 'Database query failed'});
        if(result.affectedRows === 0) return res.status(404).json({error: 'JO header not found'});
        res.json({message: 'JO header updated successfully'});
      });
    });
  });