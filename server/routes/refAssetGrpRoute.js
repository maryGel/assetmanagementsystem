import express from 'express';
import { db } from '../server.js';

const router = express.Router();

// Get all asset groups (lookup table: AssetGrpCode -> AssetGroup name)
router.get('/', (req, res) => {
  const sql = 'SELECT AssetGrpCode, AssetGroup FROM refassetgroup ORDER BY AssetGroup';

  db.getConnection((err, connection) => {
    if (err) {
      console.error('Error getting connection from pool:', err.stack);
      return res.status(500).json({ error: 'Database connection error' });
    }

    connection.query(sql, (error, results) => {
      connection.release();

      if (error) {
        console.error('Error fetching asset groups:', error.stack);
        return res.status(500).json({ error: 'Error fetching asset groups' });
      }

      res.json(results);
    });
  });
});

// Get a single asset group by code
router.get('/:assetGrpCode', (req, res) => {
  const { assetGrpCode } = req.params;
  const sql = 'SELECT AssetGrpCode, AssetGroup FROM refassetgroup WHERE AssetGrpCode = ?';

  db.getConnection((err, connection) => {
    if (err) {
      console.error('Error getting connection from pool:', err.stack);
      return res.status(500).json({ error: 'Database connection error' });
    }

    connection.query(sql, [assetGrpCode], (error, results) => {
      connection.release();

      if (error) {
        console.error('Error fetching asset group:', error.stack);
        return res.status(500).json({ error: 'Error fetching asset group' });
      }

      res.json(results.length > 0 ? results[0] : null);
    });
  });
});

export default router;