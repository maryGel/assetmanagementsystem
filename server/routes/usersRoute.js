import express from 'express';
import { db } from '../server.js';
import bcrypt from 'bcrypt';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// ============================
// GET ALL USERS (with search & pagination)
// ============================
router.get('/', requireAuth, requireAdmin, (req, res) => {
  const q = (req.query.q || '').trim();
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.max(parseInt(req.query.limit, 10) || 20, 1);
  const offset = (page - 1) * limit;

  let params = [];
  let whereClause = 'WHERE user IS NOT NULL AND user != \'\'';
  let countWhereClause = whereClause;

  if (q) {
    const searchCondition = ' AND (user LIKE ? OR fname LIKE ? OR lname LIKE ? OR xDept LIKE ?)';
    whereClause += searchCondition;
    countWhereClause += searchCondition;
    params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
  }

  const sql = `
    SELECT SQL_NO_CACHE 
      user, fname, lname, xPosi, xDept, Admin, Log, xlevel, xSection, MULTI_DEPT, MULTI_APP       
    FROM user0000inv
    ${whereClause}
    ORDER BY user
    LIMIT ? OFFSET ?
  `;

  const countSql = `SELECT COUNT(*) as total FROM user0000inv ${countWhereClause}`;

  db.getConnection((err, connection) => {
    if (err) return res.status(500).json({ error: 'DB connection error' });

    const queryParams = [...params, limit, offset];
    const countParams = params;

    connection.query(countSql, countParams, (countErr, countRows) => {
      if (countErr) {
        connection.release();
        return res.status(500).json({ error: 'Error counting users' });
      }

      connection.query(sql, queryParams, (err, results) => {
        connection.release();
        if (err) return res.status(500).json({ error: 'Error fetching users' });

        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');

        res.json({ results, total: countRows[0].total });
      });
    });
  });
});

// ============================
// GET SINGLE USER BY USERNAME
// ============================
router.get('/:user', requireAuth, (req, res) => {

    // Optionally add authorization
  if (!req.user.Admin) return res.status(403).json({ error: 'You can only access your own data' });
    
  const sql = `
    SELECT 
      user, fname, mname, lname, xPosi, xDept, Admin, Log, xlevel, Approver, xSection, MULTI_DEPT, MULTI_APP          
    FROM user0000inv  
    WHERE user = ?  
  `;

  db.getConnection((err, connection) => {
    if (err) return res.status(500).json({ error: 'Database connection error' });

    connection.query(sql, [req.params.user], (err, results) => {
      connection.release();
      if (err) return res.status(500).json({ error: 'Error fetching user' });
      if (!results.length) return res.status(404).json({ error: 'User not found' });
      res.json(results[0]);
    });
  });
});

// ============================
// CREATE NEW USER
// ============================
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  console.log('Creating new user payload:', req.body);
  const {
    user, password, fname, mname, lname, xPosi, xDept,
    Admin = 0, Log = 0, xlevel = '', Approver = 0, xSection = '',
    MULTI_DEPT = '', MULTI_APP = ''
  } = req.body;

  if (!user || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  
  const checkSql = 'SELECT * FROM user0000inv where user = ?';

  try {
    const passwordHash = await bcrypt.hash(password, 10);

    const insertSql = `
      INSERT INTO user0000inv
        (user, password, fname, mname, lname, xPosi, xDept, Admin, Log, xlevel, Approver, xSection, MULTI_DEPT, MULTI_APP)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      user, passwordHash, fname, mname, lname, xPosi, xDept,
      Admin, Log, xlevel, Approver, xSection, MULTI_DEPT, MULTI_APP
    ];

    db.getConnection((err, connection) => {
      if (err) return res.status(500).json({ error: 'Database connection error' });

      connection.query(checkSql, [user], (checkErr, checkRows) => {
        if (checkErr) {
          connection.release();
          return res.status(500).json({ error: 'Error checking existing user' });
        }

        if (checkRows.length) {
          connection.release();
          return res.status(409).json({ error: 'Username already exists' });
        }

        connection.query(insertSql, params, (insertErr) => {
          connection.release();
          if (insertErr) return res.status(500).json({ error: 'Error creating user' });
          res.status(201).json({ message: 'User created successfully', success: true });
        });
      });
    });
  } catch (err) {
    console.error('POST /users error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================
// UPDATE USER
// ============================
router.put('/:user', requireAuth, requireAdmin, (req, res) => {
  const {
    password, fname, mname, lname, xPosi, xDept,
    Admin = 0, Log = 0, xlevel = '', Approver = 0, xSection = '', MULTI_DEPT = '', MULTI_APP = ''
  } = req.body;

  db.getConnection((err, connection) => {
    if (err) return res.status(500).json({ error: 'Connection Error' });

    connection.query('SET autocommit = 1', async (setErr) => {
      if (setErr) { connection.release(); return res.status(500).send(setErr); }

      try {
        const fields = [
          'fname = ?', 'mname = ?', 'lname = ?', 'xPosi = ?', 'xDept = ?',
          'Admin = ?', 'Log = ?', 'xlevel = ?', 'Approver = ?', 'xSection = ?', 'MULTI_DEPT = ?', 'MULTI_APP = ?'
        ];
        const params = [fname, mname, lname, xPosi, xDept, Admin, Log, xlevel, Approver, xSection, MULTI_DEPT, MULTI_APP];

        if (password && password.trim() !== '') {
          const bcrypt = await import('bcrypt');
          const passwordHash = await bcrypt.default.hash(password, 10);
          fields.push('password = ?');
          params.push(passwordHash);
        }

        const sql = `UPDATE user0000inv SET ${fields.join(', ')} WHERE user = ?`;
        params.push(req.params.user);

        // Execute Update
        connection.query(sql, params, (error, results) => {
          if (error) {
            connection.release();
            return res.status(500).json({ error: 'Update failed' });
          }

          // Execute Verification SELECT
          connection.query('SELECT user, fname, lname FROM user0000inv WHERE user = ?', [req.params.user], (selErr, rows) => {
            connection.release(); // Release back to pool
            
            console.log("--- DEBUG START ---");
            console.log("DB RAW RESULTS:", results);
            console.log("VERIFY DATA IN DB NOW:", rows[0]);
            console.log("--- DEBUG END ---");
            
            if (results.affectedRows === 0) {
              return res.status(404).json({ message: 'User not found' });
            }
            res.json({ message: 'User updated successfully', success: true });
          });
        });
      } catch (err) {
        connection.release();
        res.status(500).json({ error: 'Server error' });
      }
    });
  });
});

// ============================
// DELETE USER
// ============================
router.delete('/:user', requireAuth, requireAdmin, (req, res) => {
  const sql = 'DELETE FROM user0000inv WHERE user = ?';

  db.getConnection((err, connection) => {
    if (err) return res.status(500).json({ error: 'Database connection error' });

    connection.query(sql, [req.params.user], (error, result) => {
      connection.release();
      if (error) return res.status(500).json({ error: 'Error deleting user' });
      if (result.affectedRows === 0) return res.status(404).json({ error: 'User not found' });
      res.json({ success: true });
    });
  });
});

// ============================
// DEBUG: GET ALL USERS (simple list)
// ============================
router.get('/debug-all', requireAuth, (req, res) => {
  const sql = "SELECT user, fname, lname FROM user0000inv ORDER BY user";

  db.getConnection((err, connection) => {
    if (err) return res.status(500).json({ error: 'DB connection error' });

    connection.query(sql, (err, results) => {
      connection.release();
      if (err) return res.status(500).json({ error: 'Error fetching users' });
      res.json({ total: results.length, users: results });
    });
  });
});

export default router;