import express from 'express';
import { db } from '../server.js';

const router = express.Router();


// GET all Sections
router.get('/', ( req, res ) => {

  db.getConnection((err, connection) => {
    if (err) {
      return res.status(500).json({error: 'Database connection error'});
    }
    
    const sqlSelect = 'SELECT * FROM refsupplier';
    
    connection.query(sqlSelect, (error, results) => {
      connection.release(); // release connection back to pool
      if(error) {
        return res.status(500).json({error: 'Error fetching the data'});
      }
      res.json(results);
    })
  })
})

// Get single section
router.get('/:id', (req, res) => {
  const { id } = req.params;

  db.getConnection((err, connection) => {
    if(err) {
      return res.status(500).json({error: 'Database connection failed'});
    }

    const sql = 'SELECT * FROM refsupplier WHERE id = ?';

    connection.query(sql, [id], (error, result) => {
      connection.release();
      if(error){
        return res.status(500).json({error: 'Database query failed'});
      }
      if(result.length === 0){
        return res.status(404).json({error: 'Section not found'})
      }

      res.json(result[0]);
    });
  });
});


// Post create new Section
router.post('/',(req,res) => {
  const { suppID, suppName } = req.body;

  if(!suppName){
    return res.status(400).json({error: 'Section Code is required'})
  }

  db.getConnection((error, connection) => {
    if (error) {
      return res.status(500).json({error: 'Database connection failed'});
    }

    const sql = 'INSERT INTO refsupplier(suppID, suppName) VALUES (?,?)';
    const params = [suppID, suppName || '']

    connection.query(sql, params, (error, result) => {
      connection.release();

      if (error){
        return res.status(500).json({error: 'Database query failed', details: error.message, sql: sql});
      }

      res.json({
        message: 'New Supplier has been successfully created',
        id: result.insertId,
        suppID,
        suppName
      });
    });
  });
});


// PUT update Section
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { suppID, suppName } = req.body;

  if(!suppName){
    return res.status(400).json({error: 'Supplier name is required'})
  }

  db.getConnection((error, connection) => {

    if(error){
      return res.status(500).json({error: ' Database connection failed'});
    }

    const sql = 'UPDATE refsupplier SET suppID = ?, suppName = ? where id = ?';
    const params = [suppID, suppName || '', id];

    connection.query(sql, params, (error, result) => {
      connection.release();

      if(error) {
        return res.status(500).json({error: 'Database query failed'});
      }
  
      if(result.affectedRows === 0 ){
        return res.status(404).json({error: 'Supplier not found'});
      }

      res.json({message : 'Supplier updates has been successfully'});
    });
  });
});

//Delete brand

router.delete('/:id', (req,res) => {
  const { id } = req.params;

  db.getConnection((error, connection) => {
    if(error) {
      return res.status(500).json({error: 'Database connection failed'});
    }

    connection.query('Delete from refsupplier where id = ?', [id], (error, result) => {
      connection.release();

      if(error){
        return res.status(500).json({error: 'Database query failed'});
      }

      if(result.affectedRows === 0){
        return res.status(404).json({ error: 'Supplier not found'});
      }

      res.json({message: 'Supplier has been deleted successfully'});
    });
  });
});

export default router;