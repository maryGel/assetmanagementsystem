// routes/refCat.js
import express from 'express';
import { db } from '../server.js';

const router = express.Router();


// GET all categories
router.get('/', (req, res) => {
  
  db.getConnection((err, connection) => {
    if (err) {
      console.error('Database connection error:', err);
      return res.status(500).json({ error: 'Database connection failed' });
    }
    
    const sqlSelect = 'SELECT * FROM refcategory';
    
    connection.query(sqlSelect, (error, results) => {
      connection.release();
      
      if (error) {
        console.error('Database query error:', error);
        return res.status(500).json({ error: 'Database query failed', details: error.message });
      }
      
      res.json(results);
    });
  });
});

// GET single category by ID
router.get('/:id', (req, res) => {
  const { id } = req.params;
  
  db.getConnection((err, connection) => {
    if (err) {
      return res.status(500).json({ error: 'Database connection failed' });
    }

    const sql = 'SELECT * FROM refcategory WHERE id = ?';
    
    connection.query(sql, [id], (error, results) => {
      connection.release();
      
      if (error) {
        console.error('Database query error:', error);
        return res.status(500).json({ error: 'Database query failed' });
      }
      
      if (results.length === 0) {
        return res.status(404).json({ error: 'Category not found' });
      }
      
      res.json(results[0]);
    });
  });
});

// POST create new category
router.post('/', (req, res) => {
  const { xCode, category, AssetGrpCode = '' } = req.body;
  // console.log('POST /api/refCat - Creating category:', {xCode, category });
  
  if (!category) {
    return res.status(400).json({ error: 'Name is required' });
  }
  
  db.getConnection((err, connection) => {
    if (err) {
      return res.status(500).json({ error: 'Database connection failed' });
    }

    const sql = 'INSERT INTO refcategory (xCode, category, AssetGrpCode) VALUES (?, ?, ?)';
    const params = [xCode, category || '', AssetGrpCode || ''];
    
    connection.query(sql, params, (error, result) => {
      connection.release();
      
      if (error) {
        console.error('Database query error:', error);
        return res.status(500).json({ error: 'Database query failed', details: error.message, sql: sql });
      }
      
      res.json({ 
        message: 'Category created successfully', 
        id: result.insertId,
        category: category,
        xCode: xCode || '',
        AssetGrpCode: AssetGrpCode || ''
      });
    });
  });
});

// PUT update category
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { xCode, category, AssetGrpCode = '' } = req.body;
  // console.log(`PUT /api/refCat/${id} - Updating category to:`, {xCode, category});
  
  if (!category) {
    return res.status(400).json({ error: 'Name is required' });
  }

  db.getConnection((err, connection) => {
    if (err) {
      return res.status(500).json({ error: 'Database connection failed' });
    }

    const sql = 'UPDATE refcategory SET xCode = ?, category = ?, AssetGrpCode = ? WHERE id = ?';
    const params = [xCode, category || '', AssetGrpCode || '', id];    
    
    connection.query(sql, params, (error, result) => {
      connection.release();
      
      if (error) {
        return res.status(500).json({ error: 'Database query failed' });
      }
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Category not found' });
      }
      
      res.json({ message: 'Category updates has been successfully' });
    });
  });
});

// DELETE category
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  // console.log(`DELETE /api/refCat/${id} - Deleting category`);
  
  db.getConnection((err, connection) => {
    if (err) {
      return res.status(500).json({ error: 'Database connection failed' });
    }
    
    connection.query('DELETE FROM refcategory WHERE id = ?', [id], (error, result) => {
      connection.release();
      
      if (error) {
        return res.status(500).json({ error: 'Database query failed' });
      }
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Category not found' });
      }
      
      res.json({ message: 'Category deleted successfully' });
    });
  });
});

export default router;
