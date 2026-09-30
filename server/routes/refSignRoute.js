import express from 'express';
import { db } from '../server.js';

const router = express.Router();


// GET all signatories
router.get('/', (req, res) => {
  
  db.getConnection((err, connection) => {
    if (err) {
      console.error('Database connection error:', err);
      return res.status(500).json({ error: 'Database connection failed' });
    }

    const sql = 'SELECT * FROM signatory';
    
    connection.query(sql, (error, results) => {
      connection.release();
      
      if (error) {
        return res.status(500).json({ error: 'Database query failed', details: error.message });
      }
      
      res.json(results);
    });
  });
});

// GET single signatory by ID
router.get('/:id', (req, res) => {
  const { id } = req.params;
  
  db.getConnection((err, connection) => {
    if (err) {
      return res.status(500).json({ error: 'Database connection failed' });
    }

    const sql = 'SELECT * FROM signatory WHERE id = ?';
    
    connection.query(sql, [id], (error, results) => {
      connection.release();
      
      if (error) {
        console.error('Database query error:', error);
        return res.status(500).json({ error: 'Database query failed' });
      }
      
      if (results.length === 0) {
        return res.status(404).json({ error: 'signatory not found' });
      }
      
      res.json(results[0]);
    });
  });
});

// POST create new signatory
router.post('/', (req, res) => {
  const { xModule, xLabel, xName, xPosition } = req.body;
  
  if (!xModule || !xLabel || !xName || !xPosition) {
    return res.status(400).json({ error: 'Module, Label, Name, and Position are required' });
  }
  
  db.getConnection((err, connection) => {
    if (err) {
      return res.status(500).json({ error: 'Database connection failed' });
    }

    const sql = 'INSERT INTO signatory( xModule, xLabel, xName, xPosition) VALUES (?, ?, ?, ?)';
    const params = [xModule, xLabel, xName, xPosition];
    
    connection.query(sql, params, (error, result) => {
      connection.release();
      
      if (error) {
        return res.status(500).json({ error: 'Database query failed', details: error.message, sql: sql });
      }
      
      res.json({ 
        message: 'signatory has been created successfully', 
        id: result.insertId,
        xModule: xModule || '',
        xLabel: xLabel || '',
        xName: xName || '',
        xPosition: xPosition || ''
      });
    });
  });
});


// PUT update signatory
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { xModule, xLabel, xName, xPosition } = req.body;
  
  if (!xModule || !xLabel || !xName || !xPosition) {
    return res.status(400).json({ error: 'Module, Label, Name, and Position are required' });
  }

  db.getConnection((err, connection) => {
    if (err) {
      return res.status(500).json({ error: 'Database connection failed' });
    }

    const sql = 'UPDATE signatory SET xModule = ?, xLabel = ?, xName = ?, xPosition = ? WHERE id = ?';
    const params = [xModule, xLabel, xName, xPosition, id];

    connection.query(sql, params, (error, result) => {
      connection.release();
      
      if (error) {
        return res.status(500).json({ error: 'Database query failed' });
      }
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'signatory not found' });
      }
      
      res.json({ message: 'signatory updates has been successfully' });
    });
  });
});

// DELETE signatory
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  
  db.getConnection((err, connection) => {
    if (err) {
      return res.status(500).json({ error: 'Database connection failed' });
    }

    const sql = 'DELETE FROM signatory WHERE id = ?';
    
    connection.query(sql, [id], (error, result) => {
      connection.release();
      
      if (error) {
        return res.status(500).json({ error: 'Database query failed' });
      }
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'signatory not found' });
      }
      
      res.json({ message: 'signatory deleted successfully' });
    });
  });
});

export default router;