import express from 'express';
import { db } from '../server.js';

const router = express.Router();

// Get JO work order
router.get('/', (req, res) => {
  db.getConnection((err, connection) => {
    if (err) {
      return res.status(500).json({ error: 'Database connection error' });
    }

    const sql = 'SELECT * FROM jo_woe';

    connection.query(sql, (err, results) => {
      connection.release();
      if (err) {
        return res.status(500).json({ err: 'Error fetching the data' });
      }
      res.json(results);
    });
  });
});

// Get single jo_woe with expense
router.get('/:workNo', (req, res) => {
  const { workNo } = req.params;

  const decodedJONo = decodeURIComponent(workNo);
  const cleanJONo = decodedJONo
    .replace(/\u00A0/g, '') // Remove NBSP
    .replace(/\s/g, '') // Remove normal whitespace
    .toUpperCase();

  db.getConnection((err, connection) => {
    if (err) {
      return res.status(500).json({ err: 'Database connection failed jo_woe' });
    }

    // Get expenses for this workNo
    const expensesSql = 'SELECT * FROM jo_woe WHERE workNo = ? ORDER BY xDate DESC';
    
    connection.query(expensesSql, [cleanJONo], (expenseError, expenseResults) => {
      connection.release();

      if (expenseError) {
        console.error('Error fetching expenses:', expenseError);
        // Return empty expenses instead of error
        return res.json({
          workNo: cleanJONo,
          expenses: [],
          message: 'No expenses found'
        });
      }

      // Return the expenses (or empty array if none found)
      res.json({
        workNo: cleanJONo,
        expenses: expenseResults || [],
        count: expenseResults?.length || 0
      });
    });
  });
});

// POST - Create new work order entry
router.post('/', (req, res) => {
  const {
    ID,
    FAC_NO,
    FAC_name,
    xDate,
    Expense_Type,
    expense_amount,
    OR_No,
    workDet,
    workNo,
    jo_no
  } = req.body;

  // Validate required fields
  if (!ID || !FAC_NO || !workNo || !jo_no) {
    return res.status(400).json({ error: 'Missing required fields: ID, FAC_NO, workNo, jo_no' });
  }

  db.getConnection((err, connection) => {
    if (err) {
      return res.status(500).json({ error: 'Database connection error' });
    }

    const sql = `
      INSERT INTO jo_woe (
        ID, FAC_NO, FAC_name, xDate, Expense_Type, 
        expense_amount, OR_No, workDet, workNo, jo_no
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      ID,
      FAC_NO,
      FAC_name || null,
      xDate || new Date().toISOString().split('T')[0],
      Expense_Type || null,
      expense_amount || null,
      OR_No || null,
      workDet || null,
      workNo,
      jo_no
    ];

    connection.query(sql, values, (error, result) => {
      connection.release();

      if (error) {
        console.error('Error inserting work order expense:', error);
        return res.status(500).json({ error: 'Failed to create work order expense' });
      }

      res.status(201).json({
        message: 'Work order expense created successfully',
        data: {
          id: result.insertId,
          ...req.body
        }
      });
    });
  });
});

// PUT - Update existing work order entry
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const {
    FAC_NO,
    FAC_name,
    xDate,
    Expense_Type,
    expense_amount,
    OR_No,
    workDet,
    workNo,
    jo_no
  } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'ID is required' });
  }

  db.getConnection((err, connection) => {
    if (err) {
      return res.status(500).json({ error: 'Database connection error' });
    }

    // First check if record exists
    const checkSql = 'SELECT * FROM jo_woe WHERE ID = ?';
    connection.query(checkSql, [id], (checkErr, checkResult) => {
      if (checkErr) {
        connection.release();
        return res.status(500).json({ error: 'Database query failed' });
      }

      if (checkResult.length === 0) {
        connection.release();
        return res.status(404).json({ error: 'Work order expense not found' });
      }

      // Update the record
      const updateSql = `
        UPDATE jo_woe SET
          FAC_NO = ?,
          FAC_name = ?,
          xDate = ?,
          Expense_Type = ?,
          expense_amount = ?,
          OR_No = ?,
          workDet = ?,
          workNo = ?,
          jo_no = ?
        WHERE ID = ?
      `;

      const values = [
        FAC_NO || checkResult[0].FAC_NO,
        FAC_name || checkResult[0].FAC_name,
        xDate || checkResult[0].xDate,
        Expense_Type || checkResult[0].Expense_Type,
        expense_amount || checkResult[0].expense_amount,
        OR_No || checkResult[0].OR_No,
        workDet || checkResult[0].workDet,
        workNo || checkResult[0].workNo,
        jo_no || checkResult[0].jo_no,
        id
      ];

      connection.query(updateSql, values, (updateErr, updateResult) => {
        connection.release();

        if (updateErr) {
          console.error('Error updating work order expense:', updateErr);
          return res.status(500).json({ error: 'Failed to update work order expense' });
        }

        res.json({
          message: 'Work order expense updated successfully',
          data: {
            id: id,
            ...req.body
          }
        });
      });
    });
  });
});

// DELETE - Delete work order entry
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: 'ID is required' });
  }

  db.getConnection((err, connection) => {
    if (err) {
      return res.status(500).json({ error: 'Database connection error' });
    }

    // First check if record exists
    const checkSql = 'SELECT * FROM jo_woe WHERE ID = ?';
    connection.query(checkSql, [id], (checkErr, checkResult) => {
      if (checkErr) {
        connection.release();
        return res.status(500).json({ error: 'Database query failed' });
      }

      if (checkResult.length === 0) {
        connection.release();
        return res.status(404).json({ error: 'Work order expense not found' });
      }

      // Delete the record
      const deleteSql = 'DELETE FROM jo_woe WHERE ID = ?';
      connection.query(deleteSql, [id], (deleteErr, deleteResult) => {
        connection.release();

        if (deleteErr) {
          console.error('Error deleting work order expense:', deleteErr);
          return res.status(500).json({ error: 'Failed to delete work order expense' });
        }

        res.json({
          message: 'Work order expense deleted successfully',
          data: {
            id: id,
            deleted: true
          }
        });
      });
    });
  });
});

export default router;