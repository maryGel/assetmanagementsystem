import express from 'express';
import {db} from '../server.js';

const router = express.Router();

// ============================
// Get company configuration 
router.get('/', (req, res) => {
    const sql = 'SELECT * FROM user0002inv LIMIT 1';

    db.getConnection((err, connection) => {
        if (err) return res.status(500).json({ error: 'DB connection error' });

         connection.query(sql, (err, results) => {
            connection.release();
            if (err) return res.status(500).json({ error: 'Error fetching company config' });
                
            res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
            res.set('Pragma', 'no-cache');
            res.set('Expires', '0');

            res.json(results);
         })
    })
})

// ============================
// Post/Update company configuration
router.post('/', (req, res) => {
    const {
        ItmPicpath,
        ApprovalApp,
        AutoWO,
        AccessBySection,
        Dep15Days,
        DepByDay,
        Signatories,
        DisposalFinanceDetailsPrintOut,
        XJONum  // Add this
    } = req.body;

    const checkSql = 'SELECT COUNT(*) as count FROM user0002inv';
    
    db.getConnection((err, connection) => {
        if (err) return res.status(500).json({ error: 'DB connection error' });

        connection.query(checkSql, (err, results) => {
            if (err) {
                connection.release();
                return res.status(500).json({ error: 'Error checking existing record' });
            }

            const exists = results[0].count > 0;
            let sql;
            let values;

            if (exists) {
                sql = `UPDATE user0002inv SET 
                    ItmPicpath = ?,
                    ApprovalApp = ?,
                    AutoWO = ?,
                    AccessBySection = ?,
                    Dep15Days = ?,
                    DepByDay = ?,
                    Signatories = ?,
                    DisposalFinanceDetailsPrintOut = ?,
                    XJONum = ?
                `;
                values = [
                    ItmPicpath || null,
                    ApprovalApp !== undefined ? ApprovalApp : null,
                    AutoWO || null,
                    AccessBySection !== undefined ? AccessBySection : null,
                    Dep15Days !== undefined ? Dep15Days : null,
                    DepByDay !== undefined ? DepByDay : null,
                    Signatories !== undefined ? Signatories : null,
                    DisposalFinanceDetailsPrintOut !== undefined ? DisposalFinanceDetailsPrintOut : null,
                    XJONum !== undefined ? XJONum : 0
                ];
            } else {
                sql = `INSERT INTO user0002inv (
                    ItmPicpath, ApprovalApp, AutoWO, AccessBySection, 
                    Dep15Days, DepByDay, Signatories, DisposalFinanceDetailsPrintOut, XJONum
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
                values = [
                    ItmPicpath || null,
                    ApprovalApp !== undefined ? ApprovalApp : null,
                    AutoWO || null,
                    AccessBySection !== undefined ? AccessBySection : null,
                    Dep15Days !== undefined ? Dep15Days : null,
                    DepByDay !== undefined ? DepByDay : null,
                    Signatories !== undefined ? Signatories : null,
                    DisposalFinanceDetailsPrintOut !== undefined ? DisposalFinanceDetailsPrintOut : null,
                    XJONum !== undefined ? XJONum : 0
                ];
            }

            connection.query(sql, values, (err, result) => {
                connection.release();
                if (err) {
                    console.error('Error saving config:', err);
                    return res.status(500).json({ error: 'Error saving configuration', details: err.message });
                }

                res.status(200).json({ 
                    success: true, 
                    message: exists ? 'Configuration updated successfully' : 'Configuration created successfully',
                    affectedRows: result.affectedRows
                });
            });
        });
    });
});

// ============================
// UPDATE XJONum ONLY (for incrementing after JO creation)
router.put('/xjo', (req, res) => {
    const { XJONum } = req.body;

    console.log('=== XJO UPDATE REQUEST ===');
    console.log('Received XJONum to update:', XJONum);
    console.log('Type of XJONum:', typeof XJONum);
    console.log('Full request body:', req.body);

    if (XJONum === undefined || XJONum === null) {
        return res.status(400).json({ 
            error: 'XJONum is required',
            message: 'Please provide XJONum value to update'
        });
    }

    // First check current value before update
    const checkSql = 'SELECT XJONum FROM user0002inv LIMIT 1';
    
    db.getConnection((err, connection) => {
        if (err) return res.status(500).json({ error: 'DB connection error' });

        connection.query(checkSql, (err, results) => {
            if (err) {
                console.error('Error checking current XJONum:', err);
            } else {
                console.log('Current XJONum in DB before update:', results[0]?.XJONum);
            }
            
            // Now update XJONum
            const sql = 'UPDATE user0002inv SET XJONum = ?';
            const values = [XJONum];
            
            console.log('Executing SQL:', sql);
            console.log('With values:', values);
            
            connection.query(sql, values, (err, result) => {
                if (err) {
                    connection.release();
                    console.error('Error updating XJONum:', err);
                    return res.status(500).json({ 
                        error: 'Error updating XJONum', 
                        details: err.message,
                        sqlMessage: err.sqlMessage
                    });
                }

                console.log('Update result:', result);
                console.log('Affected rows:', result.affectedRows);

                // Verify the update worked
                connection.query('SELECT XJONum FROM user0002inv LIMIT 1', (err, verifyResults) => {
                    connection.release();
                    
                    if (!err) {
                        console.log('XJONum in DB AFTER update:', verifyResults[0]?.XJONum);
                    }
                    
                    if (result.affectedRows === 0) {
                        return res.status(404).json({ 
                            error: 'No record updated',
                            message: 'Configuration record not found.'
                        });
                    }

                    console.log('XJONum updated successfully to:', XJONum);
                    res.status(200).json({ 
                        success: true, 
                        message: 'XJONum updated successfully',
                        oldValue: results[0]?.XJONum,
                        newValue: XJONum,
                        affectedRows: result.affectedRows
                    });
                });
            });
        });
    });
});


// TEST endpoint - remove after testing
router.post('/test-update', (req, res) => {
    const sql = 'UPDATE user0002inv SET XJONum = XJONum + 1';
    
    db.getConnection((err, connection) => {
        if (err) return res.status(500).json({ error: 'DB connection error' });
        
        connection.query(sql, (err, result) => {
            connection.release();
            if (err) {
                console.error('Test update error:', err);
                return res.status(500).json({ error: err.message });
            }
            res.json({ 
                success: true, 
                affectedRows: result.affectedRows,
                message: 'XJONum incremented by 1'
            });
        });
    });
});

export default router;