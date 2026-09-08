import express from 'express';
import { db } from '../server.js';

const router = express.Router();


router.get('/', (req, res) => {

    const sql = 'SELECT * FROM user_permissions_granted';

    db.getConnection((err, connection) => {
        if (err) {
            return res.status(500).json({err: 'Database connection error: initiate all accessRoute'})
        }

        connection.query(sql, (err, result) => {
            connection.release();

            if (err){
                return res.status(500).json({err: 'error fetching user_permissions'})
            }

            res.json(result);
        });
    });
});


// Get every access right currently granted to a specific user (by G_CODE).
// This must be declared BEFORE the '/:id' route below, otherwise Express
// would match '/user' itself as an :id value.
router.get('/user/:gcode', (req, res) => {

    const { gcode } = req.params;

    db.getConnection((err, connection) => {
        if (err) {
            return res.status(500).json({ err: 'Database connection error: initiate user accessRoute' });
        }

        const sql = 'SELECT * FROM user_permissions_granted WHERE G_CODE = ?';

        connection.query(sql, [gcode], (err, result) => {
            connection.release();

            if (err) {
                return res.status(500).json({ err: 'error fetching user_permissions for user' });
            }

            res.json(result);
        });
    });
});


// Replace the full set of access rights granted to a user in one call:
// clears whatever G_CODE currently has, then re-inserts the given list.
// Wrapped in a transaction so a failed insert doesn't leave the user with
// no permissions at all.
// Body: { permissions: [{ U_PERM, U_MAIN, U_CODE, MAIN_CODE }, ...] }
router.put('/user/:gcode', (req, res) => {

    const { gcode } = req.params;
    const { permissions } = req.body;

    if (!gcode) {
        return res.status(400).json({ err: 'G_CODE is required' });
    }

    if (!Array.isArray(permissions)) {
        return res.status(400).json({ err: 'permissions must be an array' });
    }

    db.getConnection((err, connection) => {
        if (err) {
            return res.status(500).json({ err: 'Database connection error: initiate bulk save accessRoute' });
        }

        connection.beginTransaction((err) => {
            if (err) {
                connection.release();
                return res.status(500).json({ err: 'Failed to start transaction' });
            }

            const deleteSql = 'DELETE FROM user_permissions_granted WHERE G_CODE = ?';

            connection.query(deleteSql, [gcode], (err) => {
                if (err) {
                    return connection.rollback(() => {
                        connection.release();
                        res.status(500).json({ err: 'Error clearing existing access rights' });
                    });
                }

                // Nothing to insert (user was granted zero permissions) - done.
                if (permissions.length === 0) {
                    return connection.commit((commitErr) => {
                        connection.release();
                        if (commitErr) {
                            return res.status(500).json({ err: 'Error committing transaction' });
                        }
                        res.json({ message: 'Access rights cleared', success: true });
                    });
                }

                const insertSql = 'INSERT INTO user_permissions_granted (U_PERM, U_MAIN, U_CODE, MAIN_CODE, G_CODE) VALUES ?';
                const values = permissions.map((p) => [
                    p.U_PERM,
                    p.U_MAIN ?? 0,
                    p.U_CODE,
                    p.MAIN_CODE,
                    gcode,
                ]);

                connection.query(insertSql, [values], (err) => {
                    if (err) {
                        return connection.rollback(() => {
                            connection.release();
                            res.status(500).json({ err: 'Error saving access rights' });
                        });
                    }

                    connection.commit((commitErr) => {
                        connection.release();
                        if (commitErr) {
                            return res.status(500).json({ err: 'Error committing transaction' });
                        }
                        res.json({ message: 'Access rights successfully saved', success: true });
                    });
                });
            });
        });
    });
});


// Get single set of access assigned to a user (lookup by primary key id)
router.get('/:id', (req, res) => {

    const { id } = req.params;

    db.getConnection((err, connection) => {
        if (err) {
            return res.status(500).json({ err: 'Database connection error: initiate single accessRoute'})
        }

        const sql = 'SELECT * FROM user_permissions_granted where id = ?';

        connection.query(sql, [id], (err, result) => {
            connection.release();

            if (err) {
                return res.status(500).json({ err: 'error fetching user_permissions - get single id'})
            };

            if(result.length === 0){
                return res.status(404).json({err: 'user permission not found'})
            };

            res.json(result[0]);
        });
    });
});

// Create a single access right for a user (kept for backward compatibility -
// prefer PUT /user/:gcode for saving a full set from the Assign Access dialog)
router.post('/', (req, res) => {
    const { id, U_PERM,  U_MAIN = 0, U_CODE, MAIN_CODE, G_CODE } = req.body;

    if(!G_CODE){
        return res.status(400).json({err: 'G_CODE is required'});
    }

    db.getConnection((err, connection) => {
        if(err){
            return res.status(500).json({err: 'Database connection failed!'});
        }

        const sql = 'INSERT INTO user_permissions_granted(id, U_PERM,  U_MAIN, U_CODE, MAIN_CODE, G_CODE) VALUES (?,?,?,?,?,?)';
        const params = [id, U_PERM,  U_MAIN, U_CODE, MAIN_CODE, G_CODE ];

        connection.query(sql, params, (err, result) => {
            connection.release();

            if(err) {
                return res.status(500).json({ err: 'Error inserting access rights'})
            }

            res.status(201).json({
                message: 'Access rights successfully assigned',
                success: true
            })
        });
    });
});

// Remove all access rights for a user
router.delete('/user/:gcode', (req, res) => {
    const { gcode } = req.params;

    db.getConnection((err, connection) => {
        if (err) {
            return res.status(500).json({ err: 'Database connection failed!' });
        }

        const sql = 'DELETE FROM user_permissions_granted WHERE G_CODE = ?';

        connection.query(sql, [gcode], (err, result) => {
            connection.release();

            if (err) {
                return res.status(500).json({ err: 'Error deleting access rights' });
            }

            res.json({ message: 'Access rights deleted', success: true, affectedRows: result.affectedRows });
        });
    });
});

export default router;