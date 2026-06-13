// routes/jo_appRoute.js
import express from 'express';
import { db } from '../server.js';
// helper config
import { getApprovalConfig, getCurrentApprovalStatus, getLatestApprovalLevel, calculateXpost, getApprovalStat} from './approvalConfigRoute.js';

const router = express.Router();

/**
 * Approve a Transfer Request - Simplified for single-level approval
 */
router.put('/approve/:TR_No', (req, res) => {
  const { TR_No } = req.params;
  const { approved, remarks, userInfo, appLevel } = req.body;

  // console.log('Approval request:', { TR_No, approved, remarks });

  const decodedTRNo = decodeURIComponent(TR_No);
  const cleanDocNo = decodedTRNo
    .replace(/\u00A0/g, '')
    .replace(/\s/g, '')
    .toUpperCase();

  db.getConnection((err, connection) => {
    if (err) {
      console.error('Database connection error:', err);
      return res.status(500).json({
        success: false,
        error: 'Database connection error'
      });
    }

    // Begin transaction
    connection.beginTransaction(async (transactionErr) => {
      if (transactionErr) {
        connection.release();
        console.error('Transaction begin error:', transactionErr);
        return res.status(500).json({
          success: false,
          error: 'Failed to start transaction'
        });
      }

      try {
        // 1. Get approval configuration for Transfer (Internal) module
        const approvalConfig = await getApprovalConfig(connection, 'Transfer (Internal)');
        
        if (approvalConfig.length === 0) {
          throw new Error('No approval configuration found for this module');
        }

        const sql = `
          SELECT TR_No, xpost, appStat, approved, disapproved
          FROM tr_h
          WHERE TR_No = ?
          FOR UPDATE
        `;

        // 2. Get current document status
        const currentDoc = await getCurrentApprovalStatus(connection, cleanDocNo, sql);
        
        // 3. Get the latest approved level from logs (only Approved or Confirmed)
        const currentApprovedLevel = await getLatestApprovalLevel(connection, cleanDocNo, 'Transfer (Internal)');
        
        // Determine the next level to approve
        const nextLevel = appLevel || (currentApprovedLevel + 1);
        
        // Check if the next level exists in configuration
        const nextLevelConfig = approvalConfig.find(config => config.APP_LEVEL === nextLevel);
        
        if (!nextLevelConfig) {
          throw new Error(`Invalid approval level: ${nextLevel}`);
        }

        const totalLevels = approvalConfig.length;
        
        // 4. Calculate new appStat value (track which levels are approved)
        let newAppStat = currentDoc.appStat || '';
        const levelStr = nextLevel.toString();
        
        if (!newAppStat) {
          newAppStat = levelStr;
        } else {
          const existingLevels = newAppStat.split(',').filter(l => l.trim());
          if (!existingLevels.includes(levelStr)) {
            newAppStat = [...existingLevels, levelStr].sort((a,b) => a-b).join(',');
          }
        }
        
        // Calculate the new approved level count
        const approvedLevelsCount = newAppStat.split(',').filter(l => l.trim()).length;
        
        // 5. Calculate new xpost based on approved levels count
        const newXpost = calculateXpost(approvedLevelsCount, totalLevels);
        
        // 6. Determine the STAT value for the approval log
        const approvalStat = getApprovalStat(currentApprovedLevel, totalLevels, nextLevel);
        
        // 7. Update tr_h table with new values
        const updateHeaderSql = `
          UPDATE tr_h 
          SET xpost = ?, 
              appStat = ?,
              approved = ?
          WHERE TR_No = ?
        `;
        
        const updateResult = await new Promise((resolve, reject) => {
          connection.query(updateHeaderSql, [newXpost, newAppStat, approved || '', cleanDocNo], (error, result) => {
            if (error) reject(error);
            else resolve(result);
          });
        });
        
        if (updateResult.affectedRows === 0) {
          throw new Error('TR header not found');
        }
        
        // 8. Check if this is the final approval level (xpost becomes 1)
        const isFinalApproval = approvedLevelsCount === totalLevels;
        
        // 9. Update tr_d table only on final approval (when xpost becomes 1)
        let DetailsUpdateResult = null;
        if (isFinalApproval) {
          const updateDetailsSql = `UPDATE tr_d SET xpost = 1 WHERE TR_No = ?`;
          DetailsUpdateResult = await new Promise((resolve, reject) => {
            connection.query(updateDetailsSql, [cleanDocNo], (error, result) => {
              if (error) reject(error);
              else resolve(result);
            });
          });
        }
        
        // 10. Create approval log with appropriate STAT value
        const insertLogSql = `
          INSERT INTO approval_logs 
          (TRNO, Module, X_USER, DT, APP_LEVEL, STAT, REMARKS) 
          VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?)
        `;
        
        const xUser = userInfo ? `${userInfo.user} - ${userInfo.lname}, ${userInfo.fname}` : String(approved);
        
        await new Promise((resolve, reject) => {
          connection.query(insertLogSql, [cleanDocNo, 'Transfer (Internal)', xUser, nextLevel, approvalStat, remarks || ''], (error) => {
            if (error) reject(error);
            else resolve();
          });
        });
        
        // 11. Commit transaction
        connection.commit((commitErr) => {
          if (commitErr) {
            console.error('Commit error:', commitErr);
            return connection.rollback(() => {
              connection.release();
              return res.status(500).json({
                success: false,
                error: 'Failed to commit transaction'
              });
            });
          }
          
          connection.release();
          
          // Prepare response message based on approval status
          let message = '';
          if (isFinalApproval) {
            message = 'Transfer fully approved successfully';
          } else if (approvedLevelsCount === 1) {
            message = 'Level 1 approval confirmed';
          } else {
            message = `Level ${nextLevel} approval confirmed. ${totalLevels - approvedLevelsCount} more level(s) remaining.`;
          }
          
          res.json({
            success: true,
            message: message,
            data: {
              doc_h_updated: updateResult.affectedRows,
              doc_d_updated: DetailsUpdateResult?.affectedRows || 0,
              status: approvalStat,
              currentLevel: nextLevel,
              approvedLevels: approvedLevelsCount,
              totalLevels: totalLevels,
              isFinalApproval: isFinalApproval,
              xpost: newXpost,
              appStat: newAppStat
            }
          });
        });
        
      } catch (error) {
        console.error('Error in approval process:', error);
        connection.rollback(() => {
          connection.release();
          return res.status(500).json({
            success: false,
            error: error.message || 'Failed to process approval'
          });
        });
      }
    });
  });
});

/**
 * Reject a Transfer (Internal)
 */

router.put('/reject/:TR_No', (req, res) => {
  const { TR_No } = req.params;
  const { approved, remarks, userInfo, appLevel } = req.body;

  console.log('Rejection request:', { TR_No, approved, remarks });

  const decodedTRNo = decodeURIComponent(TR_No);
  const cleanDocNo = decodedTRNo
    .replace(/\u00A0/g, '')
    .replace(/\s/g, '')
    .toUpperCase();

  db.getConnection((err, connection) => {
    if (err) {
      console.error('Database connection error:', err);
      return res.status(500).json({
        success: false,
        error: 'Database connection error'
      });
    }

    connection.beginTransaction(async (transactionErr) => {
      if (transactionErr) {
        connection.release();
        console.error('Transaction begin error:', transactionErr);
        return res.status(500).json({
          success: false,
          error: 'Failed to start transaction'
        });
      }

      try {
        // 1. Get approval configuration for Transfer (Internal) module
        const approvalConfig = await getApprovalConfig(connection, 'Transfer (Internal)');
        
        if (approvalConfig.length === 0) {
          throw new Error('No approval configuration found for this module');
        }

        const sql = `
          SELECT TR_No, xpost, appStat, approved, disapproved
          FROM tr_h
          WHERE TR_No = ?
        `;

        // 2. Get current document status
        const currentDoc = await getCurrentApprovalStatus(connection, cleanDocNo, sql);
        
        // 3. Get the latest approved level from logs (only Approved or Confirmed)
        const currentApprovedLevel = await getLatestApprovalLevel(connection, cleanDocNo, 'Transfer (Internal)');
        
        // Determine the level being rejected
        const nextLevel = appLevel || (currentApprovedLevel + 1);
        
        // Check if the next level exists in configuration
        const nextLevelConfig = approvalConfig.find(config => config.APP_LEVEL === nextLevel);
        
        if (!nextLevelConfig) {
          throw new Error(`Invalid approval level: ${nextLevel}`);
        }

        const totalLevels = approvalConfig.length;
        
        // 4. Calculate new appStat value (track which levels are processed - same as approve)
        let newAppStat = currentDoc.appStat || '';
        const levelStr = nextLevel.toString();
        
        if (!newAppStat) {
          newAppStat = levelStr;
        } else {
          const existingLevels = newAppStat.split(',').filter(l => l.trim());
          if (!existingLevels.includes(levelStr)) {
            newAppStat = [...existingLevels, levelStr].sort((a,b) => a-b).join(',');
          }
        }
        
        // Calculate the processed level count (same as approve)
        const processedLevelsCount = newAppStat.split(',').filter(l => l.trim()).length;
        
        // 5. Calculate new xpost - RESET TO 4 for rejection (but follow same calculation pattern)
        const newXpost = 4; // Reset to 4 on rejection
        
        // 6. Determine the STAT value for the approval log - ALWAYS 'Disapproved' for rejection
        const approvalStat = 'Rejected';
        
        // 7. Update tr_h table - Set DISAPPROVED to 1, keep appStat same as approve flow
        const updateHeaderSql = `
          UPDATE tr_h 
          SET xpost = ?, 
              appStat = ?,
              approved = ?
          WHERE TR_No = ?
        `;
        
        const updateResult = await new Promise((resolve, reject) => {
          connection.query(updateHeaderSql, [newXpost, newAppStat, approved || '', cleanDocNo], (error, result) => {
            if (error) reject(error);
            else resolve(result);
          });
        });
        
        if (updateResult.affectedRows === 0) {
          throw new Error('TR header not found');
        }
        
        // 8. Reset tr_d table xpost to 3 on rejection
        const updateDetailsSql = `UPDATE tr_d SET xpost = 4 WHERE TR_No = ?`;
        const DetailsUpdateResult = await new Promise((resolve, reject) => {
          connection.query(updateDetailsSql, [cleanDocNo], (error, result) => {
            if (error) reject(error);
            else resolve(result);
          });
        });
        
        // 9. Create rejection log with STAT = 'Disapproved'
        const insertLogSql = `
          INSERT INTO approval_logs 
          (TRNO, Module, X_USER, DT, APP_LEVEL, STAT, REMARKS) 
          VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?)
        `;
        
        const xUser = userInfo ? `${userInfo.user} - ${userInfo.lname}, ${userInfo.fname}` : String(approved);
        
        await new Promise((resolve, reject) => {
          connection.query(insertLogSql, [cleanDocNo, 'Transfer (Internal)', xUser, nextLevel, approvalStat, remarks || ''], (error) => {
            if (error) reject(error);
            else resolve();
          });
        });
        
        // 10. Commit transaction
        connection.commit((commitErr) => {
          if (commitErr) {
            console.error('Commit error:', commitErr);
            return connection.rollback(() => {
              connection.release();
              return res.status(500).json({
                success: false,
                error: 'Failed to commit transaction'
              });
            });
          }
          
          connection.release();
          
          res.json({
            success: true,
            message: 'Transfer rejected successfully',
            data: {
              doc_h_updated: updateResult.affectedRows,
              doc_d_updated: DetailsUpdateResult?.affectedRows || 0,
              status: approvalStat,
              currentLevel: nextLevel,
              processedLevels: processedLevelsCount,
              totalLevels: totalLevels,
              xpost: newXpost,
              appStat: newAppStat,
              disapproved: 1
            }
          });
        });
        
      } catch (error) {
        console.error('Error in rejection process:', error);
        connection.rollback(() => {
          connection.release();
          return res.status(500).json({
            success: false,
            error: error.message || 'Failed to process rejection'
          });
        });
      }
    });
  });
});

/**
 * Get total approval levels for a module
 */

router.get('/total-levels', (req, res) => {
  const { module } = req.query;
  
  console.log('=== TOTAL LEVELS API CALLED ===');
  console.log('Module requested:', module);
  
  // Simple query without connection pooling issues
  const query = `
    SELECT MAX(APP_LEVEL) as total_levels
    FROM ref_approval 
    WHERE MODULE = ?
  `;
  
  db.query(query, [module], (error, results) => {
    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
    
    console.log('Query results:', results);
    
    const totalLevels = results[0]?.total_levels || 3;
    
    res.json({
      success: true,
      totalLevels: totalLevels,
      module: module
    });
  });
});


/**
 * Post a Transfer Form for approval - updates xpost to 3 only
 * This is just to mark the TR as ready for approval, no approval action yet
 */

router.put('/post/:TR_No', (req, res) => {
  const { TR_No } = req.params;

  console.log('Post Transfer Form request:', { TR_No });

  const decodedTRNo = decodeURIComponent(TR_No)
    .replace(/\u00A0/g, '')
    .replace(/\s/g, '')
    .toUpperCase();

  db.getConnection((err, connection) => {
    if (err) {
      console.error('Database connection error:', err);
      return res.status(500).json({
        success: false,
        error: 'Database connection error'
      });
    }

    // Begin transaction
    connection.beginTransaction(async (transactionErr) => {
      if (transactionErr) {
        connection.release();
        console.error('Transaction begin error:', transactionErr);
        return res.status(500).json({
          success: false,
          error: 'Failed to start transaction'
        });
      }

      try {
        // 1. Check current status of the TR
        const checkSql = `
          SELECT TR_No, xpost, disapproved 
          FROM tr_h 
          WHERE TR_No = ?
        `;
        
        const currentDoc = await new Promise((resolve, reject) => {
          connection.query(checkSql, [decodedTRNo], (error, results) => {
            if (error) reject(error);
            else resolve(results[0]);
          });
        });

        if (!currentDoc) {
          throw new Error(`Transfer Form ${decodedTRNo} not found`);
        }

        // 2. Validate if it can be posted
        if (currentDoc.xpost === 3) {
          throw new Error('Transfer Form is already posted for approval');
        }
        
        if (currentDoc.xpost === 1) {
          throw new Error('Transfer Form is already fully approved');
        }
        
        if (currentDoc.disapproved === 1) {
          throw new Error('Cannot post a disapproved Transfer Form');
        }

        // 3. Update tr_h table - set xpost = 3
        const updateHeaderSql = `
          UPDATE tr_h 
          SET xpost = 3
          WHERE TR_No = ?
        `;
        
        const updateResult = await new Promise((resolve, reject) => {
          connection.query(updateHeaderSql, [decodedTRNo], (error, result) => {
            if (error) reject(error);
            else resolve(result);
          });
        });
        
        if (updateResult.affectedRows === 0) {
          throw new Error('Failed to update Transfer Form');
        }

        // 4. Update tr_d table - set xpost = 3 for all detail items
        const updateDetailsSql = `UPDATE tr_d SET xpost = 3 WHERE TR_No = ?`;
        const detailsResult = await new Promise((resolve, reject) => {
          connection.query(updateDetailsSql, [decodedTRNo], (error, result) => {
            if (error) reject(error);
            else resolve(result);
          });
        });

        // 5. Commit transaction
        connection.commit((commitErr) => {
          if (commitErr) {
            console.error('Commit error:', commitErr);
            return connection.rollback(() => {
              connection.release();
              return res.status(500).json({
                success: false,
                error: 'Failed to commit transaction'
              });
            });
          }
          
          connection.release();
          
          res.json({
            success: true,
            message: `Transfer Form ${TR_No} has been posted for approval`,
            data: {
              TR_No: decodedTRNo,
              old_xpost: currentDoc.xpost,
              new_xpost: 3,
              details_updated: detailsResult.affectedRows,
              status: 'Pending Approval'
            }
          });
        });
        
      } catch (error) {
        console.error('Error in post Transfer Form process:', error);
        connection.rollback(() => {
          connection.release();
          return res.status(500).json({
            success: false,
            error: error.message || 'Failed to post Transfer Form for approval'
          });
        });
      }
    });
  });
});

/**
 * Test endpoint
 */
router.get('/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Approval route is working!',
    timestamp: new Date().toISOString()
  });
});


export default router;