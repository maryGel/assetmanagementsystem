import express from 'express';
import { db } from '../server.js';

const router = express.Router();

// Full master catalog of permissions - this is what populates the
// "Available" side of the Assign Access dialog (not user-specific).
router.get('/', (req, res) => {

    const sql = 'SELECT * FROM user_permissions ORDER BY MAIN_CODE, sortno';

    db.getConnection((err, connection) => {
        if (err) {
            return res.status(500).json({ err: 'Database connection error: initiate all userPermissionsRoute' });
        }

        connection.query(sql, (err, result) => {
            connection.release();

            if (err) {
                return res.status(500).json({ err: 'error fetching user_permissions' });
            }

            res.json(result);
        });
    });
});

// Get a single master permission row
router.get('/:id', (req, res) => {

    const { id } = req.params;

    db.getConnection((err, connection) => {
        if (err) {
            return res.status(500).json({ err: 'Database connection error: initiate single userPermissionsRoute' });
        }

        const sql = 'SELECT * FROM user_permissions WHERE id = ?';

        connection.query(sql, [id], (err, result) => {
            connection.release();

            if (err) {
                return res.status(500).json({ err: 'error fetching user_permissions - get single id' });
            }

            if (result.length === 0) {
                return res.status(404).json({ err: 'permission not found' });
            }

            res.json(result[0]);
        });
    });
});

// Add a new entry to the master permission catalog
router.post('/', (req, res) => {
    const { U_PERM, U_MAIN = 0, U_CODE, MAIN_CODE, sortno = 0, superview = 0 } = req.body;

    if (!U_CODE) {
        return res.status(400).json({ err: 'U_CODE is required' });
    }

    db.getConnection((err, connection) => {
        if (err) {
            return res.status(500).json({ err: 'Database connection failed!' });
        }

        const sql = 'INSERT INTO user_permissions (U_PERM, U_MAIN, U_CODE, MAIN_CODE, sortno, superview) VALUES (?,?,?,?,?,?)';
        const params = [U_PERM, U_MAIN, U_CODE, MAIN_CODE, sortno, superview];

        connection.query(sql, params, (err, result) => {
            connection.release();

            if (err) {
                return res.status(500).json({ err: 'Error inserting permission' });
            }

            res.status(201).json({ message: 'Permission created', success: true, id: result.insertId });
        });
    });
});

// Edit an existing master permission catalog entry
router.put('/:id', (req, res) => {
    const { id } = req.params;
    const { U_PERM, U_MAIN, U_CODE, MAIN_CODE, sortno, superview } = req.body;

    db.getConnection((err, connection) => {
        if (err) {
            return res.status(500).json({ err: 'Database connection failed!' });
        }

        const sql = 'UPDATE user_permissions SET U_PERM = ?, U_MAIN = ?, U_CODE = ?, MAIN_CODE = ?, sortno = ?, superview = ? WHERE id = ?';
        const params = [U_PERM, U_MAIN, U_CODE, MAIN_CODE, sortno, superview, id];

        connection.query(sql, params, (err, result) => {
            connection.release();

            if (err) {
                return res.status(500).json({ err: 'Error updating permission' });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ err: 'permission not found' });
            }

            res.json({ message: 'Permission updated', success: true });
        });
    });
});

// Remove an entry from the master permission catalog
router.delete('/:id', (req, res) => {
    const { id } = req.params;

    db.getConnection((err, connection) => {
        if (err) {
            return res.status(500).json({ err: 'Database connection failed!' });
        }

        const sql = 'DELETE FROM user_permissions WHERE id = ?';

        connection.query(sql, [id], (err, result) => {
            connection.release();

            if (err) {
                return res.status(500).json({ err: 'Error deleting permission' });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ err: 'permission not found' });
            }

            res.json({ message: 'Permission deleted', success: true });
        });
    });
});

export default router;