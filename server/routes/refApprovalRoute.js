import express from 'express';
import { db } from '../server.js';

const router = express.Router();


// GET all approvals
router.get('/', ( req, res ) => {

  db.getConnection((err, connection) => {
    if (err) {
      return res.status(500).json({error: 'Database connection error'});
    }
    
    const sqlSelect = 'SELECT * FROM ref_approval';
    
    connection.query(sqlSelect, (error, results) => {
      connection.release(); // release connection back to pool
      if(error) {
        return res.status(500).json({error: 'Error fetching the data'});
      }
      res.json(results);
    })
  })
})

// Get single approval
router.get('/:ID', (req, res) => {
  const { ID } = req.params;

  db.getConnection((err, connection) => {
    if(err) {
      return res.status(500).json({error: 'Database connection failed'});
    }

    const sql = 'SELECT * FROM ref_approval WHERE ID = ?';

    connection.query(sql, [id], (error, result) => {
      connection.release();
      if(error){
        return res.status(500).json({error: 'Database query failed'});
      }
      if(result.length === 0){
        return res.status(404).json({error: 'Approval Code not found'})
      }

      res.json(result[0]);
    });
  });
});


// Post create new approval
router.post('/',(req,res) => {
  const { APP_CODE, MODULE, APP_LEVEL, SIGNATORY } = req.body;

  if(!MODULE){
    return res.status(400).json({error: 'approval Code is required'})
  }

  db.getConnection((error, connection) => {
    if (error) {
      return res.status(500).json({error: 'Database connection failed'});
    }

    const sql = 'INSERT INTO ref_approval (APP_CODE, MODULE, APP_LEVEL, SIGNATORY) VALUES (?,?,?,?)';
    const params = [APP_CODE, MODULE, APP_LEVEL, SIGNATORY]

    connection.query(sql, params, (error, result) => {
      connection.release();

      if (error){
        return res.status(500).json({error: 'Database query failed', details: error.message, sql: sql});
      }

      res.json({
        message: 'New approval has been successfully created',
        id: result.insertId,
        APP_CODE,
        MODULE,
        APP_LEVEL,
        SIGNATORY
      });
    });
  });
});


// PUT update approval
router.put('/:ID', (req, res) => {
  const { ID } = req.params;
  const {  APP_CODE, MODULE,  APP_LEVEL, SIGNATORY } = req.body;

  if(!APP_CODE || !MODULE ||  !APP_LEVEL || !SIGNATORY){
    return res.status(400).json({error: 'All fields are required'})
  }

  db.getConnection((error, connection) => {

    if(error){
      return res.status(500).json({error: ' Database connection failed'});
    }

    const sql = 'UPDATE ref_approval SET APP_CODE = ?,  MODULE = ?,  APP_LEVEL = ?, SIGNATORY = ? where ID = ?';
    const params = [ APP_CODE, MODULE,  APP_LEVEL, SIGNATORY || '', ID];

    connection.query(sql, params, (error, result) => {
      connection.release();

      if(error) {
        return res.status(500).json({error: 'Database query failed'});
      }
  
      if(result.affectedRows === 0 ){
        return res.status(404).json({error: 'Approval Code not found'});
      }

      res.json({message : 'Approval updates has been successfully'});
    });
  });
});

//Delete approval

router.delete('/:ID', (req,res) => {
  const { ID } = req.params;

  db.getConnection((error, connection) => {
    if(error) {
      return res.status(500).json({error: 'Database connection failed'});
    }

    const sql = 'DELETE FROM ref_approval WHERE id = ?';

    connection.query(sql, [ID], (error, result) => {
      connection.release();

      if(error){
        return res.status(500).json({error: 'Database query failed'});
      }

      if(result.affectedRows === 0){
        return res.status(404).json({ error: 'approval not found'});
      }

      res.json({message: 'Approval has been deleted successfully'});
    });
  });
});

export default router;