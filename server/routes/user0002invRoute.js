import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {fileURLToPath} from 'url';
import {db} from '../server.js';

const router = express.Router();

// ============================
// Logo upload storage config
// Files are written to /uploads/company-logo on disk; the relative path is
// what gets saved into user0002inv.ReportHeader.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logoUploadDir = path.join(__dirname, '..', 'uploads', 'company-logo');

if (!fs.existsSync(logoUploadDir)) {
    fs.mkdirSync(logoUploadDir, { recursive: true });
}

const logoStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, logoUploadDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `logo-${Date.now()}${ext}`);
    }
});

const logoUpload = multer({
    storage: logoStorage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
    fileFilter: (req, file, cb) => {
        const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
        if (allowed.includes(file.mimetype)) return cb(null, true);
        cb(new Error('Only PNG, JPG, WEBP, or SVG files are allowed for the company logo'));
    }
});

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
        // Company Setup - basic info
        Company,
        address,
        CompTel,
        ReportHeader,
        // Company Setup - advanced / auto-numbering
        Cinitial,
        XJONum,
        XTRNum,
        XADNum,
        XAANum,
        XALNum,
        AutoWO,
        // Pre-existing fields
        ItmPicpath,
        ApprovalApp,
        AccessBySection,
        Dep15Days,
        DepByDay,
        Signatories,
        DisposalFinanceDetailsPrintOut
    } = req.body;

    const checkSql = 'SELECT COUNT(*) as count FROM user0002inv';

    // Column/value pairs kept in one place so INSERT and UPDATE can never drift apart
    const fields = {
        Company: Company !== undefined ? Company : null,
        address: address !== undefined ? address : null,
        CompTel: CompTel !== undefined ? CompTel : null,
        ReportHeader: ReportHeader !== undefined ? ReportHeader : null,
        Cinitial: Cinitial !== undefined ? Cinitial : null,
        XJONum: XJONum !== undefined ? XJONum : 0,
        XTRNum: XTRNum !== undefined ? XTRNum : 0,
        XADNum: XADNum !== undefined ? XADNum : 0,
        XAANum: XAANum !== undefined ? XAANum : 0,
        XALNum: XALNum !== undefined ? XALNum : 0,
        AutoWO: AutoWO || null,
        ItmPicpath: ItmPicpath || null,
        ApprovalApp: ApprovalApp !== undefined ? ApprovalApp : null,
        AccessBySection: AccessBySection !== undefined ? AccessBySection : null,
        Dep15Days: Dep15Days !== undefined ? Dep15Days : null,
        DepByDay: DepByDay !== undefined ? DepByDay : null,
        Signatories: Signatories !== undefined ? Signatories : null,
        DisposalFinanceDetailsPrintOut: DisposalFinanceDetailsPrintOut !== undefined ? DisposalFinanceDetailsPrintOut : null
    };

    const columns = Object.keys(fields);
    const values = Object.values(fields);

    db.getConnection((err, connection) => {
        if (err) return res.status(500).json({ error: 'DB connection error' });

        connection.query(checkSql, (err, results) => {
            if (err) {
                connection.release();
                return res.status(500).json({ error: 'Error checking existing record' });
            }

            const exists = results[0].count > 0;
            let sql;
            let sqlValues;

            if (exists) {
                sql = `UPDATE user0002inv SET ${columns.map(c => `${c} = ?`).join(', ')}`;
                sqlValues = values;
            } else {
                sql = `INSERT INTO user0002inv (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`;
                sqlValues = values;
            }

            connection.query(sql, sqlValues, (err, result) => {
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
// Upload / replace the company logo (multipart/form-data, field name: "logo")
// Stores the file on disk and saves its relative path into ReportHeader.
router.post('/logo', logoUpload.single('logo'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No logo file was uploaded' });
    }

    const relativePath = `/uploads/company-logo/${req.file.filename}`;
    const checkSql = 'SELECT COUNT(*) as count FROM user0002inv';

    db.getConnection((err, connection) => {
        if (err) return res.status(500).json({ error: 'DB connection error' });

        connection.query(checkSql, (err, results) => {
            if (err) {
                connection.release();
                return res.status(500).json({ error: 'Error checking existing record' });
            }

            const exists = results[0].count > 0;
            const sql = exists
                ? 'UPDATE user0002inv SET ReportHeader = ?'
                : 'INSERT INTO user0002inv (ReportHeader) VALUES (?)';

            connection.query(sql, [relativePath], (err, result) => {
                connection.release();
                if (err) {
                    console.error('Error saving logo path:', err);
                    return res.status(500).json({ error: 'Error saving logo', details: err.message });
                }

                res.status(200).json({
                    success: true,
                    message: 'Logo uploaded successfully',
                    ReportHeader: relativePath,
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

// ============================
// UPDATE XTRNum ONLY (for incrementing after TR creation)
router.put('/xtr', (req, res) => {
    const { XTRNum } = req.body;

    console.log('=== XTR UPDATE REQUEST ===');
    console.log('Received XTRNum to update:', XTRNum);
    console.log('Type of XTRNum:', typeof XTRNum);
    console.log('Full request body:', req.body);

    if (XTRNum === undefined || XTRNum === null) {
        return res.status(400).json({ 
            error: 'XTRNum is required',
            message: 'Please provide XTRNum value to update'
        });
    }

    // First check current value before update
    const checkSql = 'SELECT XTRNum FROM user0002inv LIMIT 1';
    
    db.getConnection((err, connection) => {
        if (err) return res.status(500).json({ error: 'DB connection error' });

        connection.query(checkSql, (err, results) => {
            if (err) {
                console.error('Error checking current XTRNum:', err);
            } else {
                console.log('Current XTRNum in DB before update:', results[0]?.XTRNum);
            }
            
            // Now update XTRNum
            const sql = 'UPDATE user0002inv SET XTRNum = ?';
            const values = [XTRNum];
            
            console.log('Executing SQL:', sql);
            console.log('With values:', values);
            
            connection.query(sql, values, (err, result) => {
                if (err) {
                    connection.release();
                    console.error('Error updating XTRNum:', err);
                    return res.status(500).json({ 
                        error: 'Error updating XTRNum', 
                        details: err.message,
                        sqlMessage: err.sqlMessage
                    });
                }

                console.log('Update result:', result);
                console.log('Affected rows:', result.affectedRows);

                // Verify the update worked
                connection.query('SELECT XTRNum FROM user0002inv LIMIT 1', (err, verifyResults) => {
                    connection.release();
                    
                    if (!err) {
                        console.log('XTRNum in DB AFTER update:', verifyResults[0]?.XTRNum);
                    }
                    
                    if (result.affectedRows === 0) {
                        return res.status(404).json({ 
                            error: 'No record updated',
                            message: 'Configuration record not found.'
                        });
                    }

                    console.log('XTRNum updated successfully to:', XTRNum);
                    res.status(200).json({ 
                        success: true, 
                        message: 'XTRNum updated successfully',
                        oldValue: results[0]?.XTRNum,
                        newValue: XTRNum,
                        affectedRows: result.affectedRows
                    });
                });
            });
        });
    });
});

// UPDATE XADNum ONLY (for incrementing after AD creation)
router.put('/xad', (req, res) => {
    const { XADNum } = req.body;

    console.log('=== XTR UPDATE REQUEST ===');
    console.log('Received XTRNum to update:', XADNum);
    console.log('Type of XTRNum:', typeof XADNum);
    console.log('Full request body:', req.body);

    if (XADNum === undefined || XADNum === null) {
        return res.status(400).json({ 
            error: 'XADNum is required',
            message: 'Please provide XTRNum value to update'
        });
    }

    // First check current value before update
    const checkSql = 'SELECT XADNum FROM user0002inv LIMIT 1';
    
    db.getConnection((err, connection) => {
        if (err) return res.status(500).json({ error: 'DB connection error' });

        connection.query(checkSql, (err, results) => {
            if (err) {
                console.error('Error checking current XTRNum:', err);
            } else {
                console.log('Current XADNum in DB before update:', results[0]?.XADNum);
            }
            
            // Now update XTRNum
            const sql = 'UPDATE user0002inv SET XADNum = ?';
            const values = [XADNum];
            
            console.log('Executing SQL:', sql);
            console.log('With values:', values);
            
            connection.query(sql, values, (err, result) => {
                if (err) {
                    connection.release();
                    console.error('Error updating XADNum:', err);
                    return res.status(500).json({ 
                        error: 'Error updating XADNum', 
                        details: err.message,
                        sqlMessage: err.sqlMessage
                    });
                }

                console.log('Update result:', result);
                console.log('Affected rows:', result.affectedRows);

                // Verify the update worked
                connection.query('SELECT XADNum FROM user0002inv LIMIT 1', (err, verifyResults) => {
                    connection.release();
                    
                    if (!err) {
                        console.log('XADNum in DB AFTER update:', verifyResults[0]?.XADNum);
                    }
                    
                    if (result.affectedRows === 0) {
                        return res.status(404).json({ 
                            error: 'No record updated',
                            message: 'Configuration record not found.'
                        });
                    }

                    console.log('XADNum updated successfully to:', XADNum);
                    res.status(200).json({ 
                        success: true, 
                        message: 'XADNum updated successfully',
                        oldValue: results[0]?.XADNum,
                        newValue: XADNum,
                        affectedRows: result.affectedRows
                    });
                });
            });
        });
    });
});

// UPDATE XAANum ONLY (for incrementing after AD creation)
router.put('/xaa', (req, res) => {
    const { XAANum } = req.body;

    console.log('=== XTR UPDATE REQUEST ===');
    console.log('Received XTRNum to update:', XAANum);
    console.log('Type of XTRNum:', typeof XAANum);
    console.log('Full request body:', req.body);

    if (XAANum === undefined || XAANum === null) {
        return res.status(400).json({ 
            error: 'XAANum is required',
            message: 'Please provide XTRNum value to update'
        });
    }

    // First check current value before update
    const checkSql = 'SELECT XAANum FROM user0002inv LIMIT 1';
    
    db.getConnection((err, connection) => {
        if (err) return res.status(500).json({ error: 'DB connection error' });

        connection.query(checkSql, (err, results) => {
            if (err) {
                console.error('Error checking current XAANum:', err);
            } else {
                console.log('Current XAANum in DB before update:', results[0]?.XAANum);
            }
            
            // Now update XTRNum
            const sql = 'UPDATE user0002inv SET XAANum = ?';
            const values = [XAANum];
            
            console.log('Executing SQL:', sql);
            console.log('With values:', values);
            
            connection.query(sql, values, (err, result) => {
                if (err) {
                    connection.release();
                    console.error('Error updating XAANum:', err);
                    return res.status(500).json({ 
                        error: 'Error updating XAANum', 
                        details: err.message,
                        sqlMessage: err.sqlMessage
                    });
                }

                console.log('Update result:', result);
                console.log('Affected rows:', result.affectedRows);

                // Verify the update worked
                connection.query('SELECT XAANum FROM user0002inv LIMIT 1', (err, verifyResults) => {
                    connection.release();
                    
                    if (!err) {
                        console.log('XAANum in DB AFTER update:', verifyResults[0]?.XADNum);
                    }
                    
                    if (result.affectedRows === 0) {
                        return res.status(404).json({ 
                            error: 'No record updated',
                            message: 'Configuration record not found.'
                        });
                    }

                    console.log('XAANum updated successfully to:', XAANum);
                    res.status(200).json({ 
                        success: true, 
                        message: 'XAANum updated successfully',
                        oldValue: results[0]?.XAANum,
                        newValue: XAANum,
                        affectedRows: result.affectedRows
                    });
                });
            });
        });
    });
});

// UPDATE XALNum ONLY (for incrementing after AD creation)
router.put('/xal', (req, res) => {
    const { XALNum } = req.body;

    console.log('=== XTR UPDATE REQUEST ===');
    console.log('Received XALNum to update:', XALNum);
    console.log('Type of XALNum:', typeof XALNum);
    console.log('Full request body:', req.body);

    if (XALNum === undefined || XALNum === null) {
        return res.status(400).json({ 
            error: 'XALNum is required',
            message: 'Please provide XALNum value to update'
        });
    }

    // First check current value before update
    const checkSql = 'SELECT XALNum FROM user0002inv LIMIT 1';
    
    db.getConnection((err, connection) => {
        if (err) return res.status(500).json({ error: 'DB connection error' });

        connection.query(checkSql, (err, results) => {
            if (err) {
                console.error('Error checking current XAANum:', err);
            } else {
                console.log('Current XALNum in DB before update:', results[0]?.XAANum);
            }
            
            // Now update XTRNum
            const sql = 'UPDATE user0002inv SET XALNum = ?';
            const values = [XALNum];
            
            console.log('Executing SQL:', sql);
            console.log('With values:', values);
            
            connection.query(sql, values, (err, result) => {
                if (err) {
                    connection.release();
                    console.error('Error updating XALNum:', err);
                    return res.status(500).json({ 
                        error: 'Error updating XALNum', 
                        details: err.message,
                        sqlMessage: err.sqlMessage
                    });
                }

                console.log('Update result:', result);
                console.log('Affected rows:', result.affectedRows);

                // Verify the update worked
                connection.query('SELECT XALNum FROM user0002inv LIMIT 1', (err, verifyResults) => {
                    connection.release();
                    
                    if (!err) {
                        console.log('XALNum in DB AFTER update:', verifyResults[0]?.XALNum);
                    }
                    
                    if (result.affectedRows === 0) {
                        return res.status(404).json({ 
                            error: 'No record updated',
                            message: 'Configuration record not found.'
                        });
                    }

                    console.log('XAANum updated successfully to:', XALNum);
                    res.status(200).json({ 
                        success: true, 
                        message: 'XALNum updated successfully',
                        oldValue: results[0]?.XAANum,
                        newValue: XALNum,
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