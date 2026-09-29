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
    
    const sqlSelect = 'SELECT * FROM refemployee';
    
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

// GET single employee by ID
router.get('/:ID', (req, res) => {
  const { ID } = req.params;
  
  db.getConnection((err, connection) => {
    if (err) {
      return res.status(500).json({ error: 'Database connection failed' });
    }

    const sql = 'SELECT * FROM refemployee WHERE ID = ?';
    
    connection.query(sql, [ID], (error, results) => {
      connection.release();
      
      if (error) {
        console.error('Database query error:', error);
        return res.status(500).json({ error: 'Database query failed' });
      }
      
      if (results.length === 0) {
        return res.status(404).json({ error: 'employee not found' });
      }
      
      res.json(results[0]);
    });
  });
});

// POST create new employee
router.post('/', (req, res) => {
  const { Emp_No, Emp_FName, Emp_MName, Emp_LName  } = req.body;
  console.log('POST /api/refEmp - Creating employee:', {Emp_No, Emp_FName, Emp_MName, Emp_LName });
  
  if (!Emp_No) {
    return res.status(400).json({ error: 'Employee Number is required' });
  }
  
  db.getConnection((err, connection) => {
    if (err) {
      return res.status(500).json({ error: 'Database connection failed' });
    }

    const sql = 'INSERT INTO refemployee (Emp_No, Emp_FName, Emp_MName, Emp_LName ) VALUES (?, ?, ?, ?)';
    const params = [Emp_No, Emp_FName || '', Emp_MName || '', Emp_LName || ''];
    
    connection.query(sql, params, (error, result) => {
      connection.release();
      
      if (error) {
        console.error('Database query error:', error);
        return res.status(500).json({ error: 'Database query failed', details: error.message, sql: sql });
      }
      
      res.json({ 
        message: 'employee created successfully', 
        ID: result.insertID,
            Emp_No: Emp_No,
            Emp_FName: Emp_FName || '',
            Emp_MName: Emp_MName || '',
            Emp_LName: Emp_LName || ''
      });
    });
  });
});

// PUT update employee
router.put('/:ID', (req, res) => {
  const { ID } = req.params;
  const { Emp_No, Emp_FName, Emp_MName, Emp_LName  } = req.body;
  // console.log(`PUT /refEmployee/${ID} - Updating employee to:`, {Emp_No, Emp_FName, Emp_MName, Emp_LName});
  
  if (!Emp_No) {
    return res.status(400).json({ error: 'Employee Number is required' });
  }

  db.getConnection((err, connection) => {
    if (err) {
      return res.status(500).json({ error: 'Database connection failed' });
    }

    const sql = 'UPDATE refemployee SET Emp_No = ?, Emp_FName = ?, Emp_MName = ?, Emp_LName = ? WHERE ID = ?';
    const params = [Emp_No, Emp_FName, Emp_MName, Emp_LName || '', ID];

    connection.query(sql, params, (error, result) => {
      connection.release();
      
      if (error) {
        return res.status(500).json({ error: 'Database query failed' });
      }
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'employee not found' });
      }
      
      res.json({ message: 'employee updates has been successfully' });
    });
  });
});

// DELETE employee
router.delete('/:ID', (req, res) => {
  const { ID } = req.params;
  // console.log(`DELETE /api/refCat/${ID} - Deleting employee`);
  
  db.getConnection((err, connection) => {
    if (err) {
      return res.status(500).json({ error: 'Database connection failed' });
    }
    
    connection.query('DELETE FROM refemployee WHERE ID = ?', [ID], (error, result) => {
      connection.release();
      
      if (error) {
        return res.status(500).json({ error: 'Database query failed' });
      }
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'employee not found' });
      }
      
      res.json({ message: 'employee deleted successfully' });
    });
  });
});

export default router;