import express from 'express';
import { db } from '../server.js';

const router = express.Router();


// Get all Colors
router.get('/', (req, res) => {

  db.getConnection((error, connection) => {
    if(error){
      return res.status(500).json({error: 'Database connection error'});
    }

    const sqlSelect = 'SELECT * FROM refcolor';

    connection.query(sqlSelect, (error, result) => {
      connection.release(); 

      if(error){
        return res.status(500).json({error: 'Error fetching the data'})
      }
      res.json(result);
    }) 
  })
})

// Get single color id 
router.get('/:id', (req, res) => {
  const { id } = req.params;

  db.getConnection((error, connection) => {
    if(error){
      return res.status(500).json({error: 'Database connection failed'});
    }

    connection.query('SELECT * FROM refcolor where id = ?', [id], (error, result) => {
      connection.release();

      if(error){
        return res.status(500).json({error: 'Database query failed'});
      }
      if(result.length === 0){
        return res.status(404).json({error: 'Brand not found'})
      }

      res.json(result[0]);
    });
  });
});

// Post create new Unit

router.post('/', (req, res) => {
  const {ColID, ColName} = req.body;

  if(!ColID){
    return res.status(400).json({error: 'Color Id is required'})
  }

  db.getConnection((error, connection) => {
    if(error) {
      return res.status(500).json({error: 'Database connection failed'});
    }

    const sql = 'INSERT INTO refcolor (ColID, ColName  ) VALUES (?,?)';
    const params = [ColID, ColName || '']

    connection.query(sql, params, (error, result) => {
      connection.release();

      if(error){
        return res.status(500).json({error: 'Database query failed', details: error.message, sql: sql});
      }

      res.json({
        message: 'New color has been created',
        id: result.insertId,
        ColID,
        ColName
      });
    });
  });
});


// PUT update color
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { ColID, ColName } = req.body;

  if(!ColID){
    return res.status(400).json({error: 'Color ID is required'})
  }

  db.getConnection((error, connection) => {

    if(error){
      return res.status(500).json({error: ' Database connection failed'});
    }

    const sql = 'UPDATE refcolor SET ColID = ?, ColName = ? where id = ?';
    const params = [ColID, ColName|| '', id];

    connection.query(sql, params, (error, result) => {
      connection.release();

      if(error) {
        return res.status(500).json({error: 'Database query failed'});
      }
  
      if(result.affectedRows === 0 ){
        return res.status(404).json({error: 'Unit not found'});
      }

      res.json({message : 'Color updates has been successfully'});
    });
  });
});



//Delete color

router.delete('/:id', (req,res) => {
  const { id } = req.params;

  db.getConnection((error, connection) => {
    if(error) {
      return res.status(500).json({error: 'Database connection failed'});
    }

    connection.query('Delete from refcolor where id = ?', [id], (error, result) => {
      connection.release();

      if(error){
        return res.status(500).json({error: 'Database query failed'});
      }

      if(result.affectedRows === 0){
        return res.status(404).json({ error: 'Unit not found'});
      }

      res.json({message: 'Color been deleted successfully'});
    });
  });
});

export default router;
