// routes/jo_appRoute.js
import express from 'express';
import { db } from '../server.js';
// helper config
import { getApprovalConfig, getCurrentApprovalStatus, getLatestApprovalLevel, calculateXpost, getApprovalStat} from './approvalConfigRoute.js';

const router = express.Router();

/**
 * Approve a Asset Accountability- Simplified for single-level approval
 */
router.put('/approve/:AAFNo', (req, res) => {
  const { AAFNo } = req.params;
  const { approver, remarks, userInfo, appLevel } = req.body;

  // console.log('Approval request:', { AAFNo, approver, remarks });

  const decodedJONo = decodeURIComponent(AAFNo);
  const cleanDocNo = decodedJONo
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
        // 1. Get approval configuration for Asset Accountabilitymodule
        const approvalConfig = await getApprovalConfig(connection, 'Asset Accountability');
        
        if (approvalConfig.length === 0) {
          throw new Error('No approval configuration found for this module');
        }

        const sql = `
          SELECT AAFNo, xPosted, appStat, approver, disapproved
          FROM assestacch
          WHERE AAFNo = ?
        `;

        // 2. Get current document status
        const currentDoc = await getCurrentApprovalStatus(connection, cleanDocNo, sql);
        
        // 3. Get the latest approved level from logs (only Approved or Confirmed)
        const currentApprovedLevel = await getLatestApprovalLevel(connection, cleanDocNo, 'Asset Accountability');
        
        // Determine the next level to approve
        const nextLevel = appLevel || (currentApprovedLevel + 1);
        console.log(`nextLevel: ${nextLevel}, currentApprovedLevel: ${currentApprovedLevel}`);
        
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
        
        // 5. Calculate new xPosted based on approved levels count
        const newXpost = calculateXpost(approvedLevelsCount, totalLevels);
        
        // 6. Determine the STAT value for the approval log
        const approvalStat = getApprovalStat(currentApprovedLevel, totalLevels, nextLevel);
        
        // 7. Update assestacch table with new values
        const updateHeaderSql = `
          UPDATE assestacch 
          SET xPosted = ?, 
              appStat = ?,
              approver = ?
          WHERE AAFNo = ?
        `;
        
        const updateResult = await new Promise((resolve, reject) => {
          connection.query(updateHeaderSql, [newXpost, newAppStat, approver || '', cleanDocNo], (error, result) => {
            if (error) reject(error);
            else resolve(result);
          });
        });
        
        if (updateResult.affectedRows === 0) {
          throw new Error('Asset Accountability header not found');
        }
        
        // 8. Check if this is the final approval level (xPosted becomes 1)
        const isFinalApproval = approvedLevelsCount === totalLevels;
        
        // // 9. Update assestaccd table only on final approval (when xPosted becomes 1)
        // let DetailsUpdateResult = null;
        // if (isFinalApproval) {
        //   const updateDetailsSql = `UPDATE assestaccd SET xPosted = 1 WHERE AAFNo = ?`;
        //   DetailsUpdateResult = await new Promise((resolve, reject) => {
        //     connection.query(updateDetailsSql, [cleanDocNo], (error, result) => {
        //       if (error) reject(error);
        //       else resolve(result);
        //     });
        //   });
        // }
        
        // 10. Create approval log with appropriate STAT value
        const insertLogSql = `
          INSERT INTO approval_logs 
          (TRNO, Module, X_USER, DT, APP_LEVEL, STAT, REMARKS) 
          VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?)
        `;
        
        const xUser = userInfo ? `${userInfo.user} - ${userInfo.lname}, ${userInfo.fname}` : String(approved);
        
        await new Promise((resolve, reject) => {
          connection.query(insertLogSql, [cleanDocNo, 'Asset Accountability', xUser, nextLevel, approvalStat, remarks || ''], (error) => {
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
            message = 'Asset Accountabilityfully approved successfully';
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
              // doc_d_updated: DetailsUpdateResult?.affectedRows || 0,
              status: approvalStat,
              currentLevel: nextLevel,
              approvedLevels: approvedLevelsCount,
              totalLevels: totalLevels,
              isFinalApproval: isFinalApproval,
              xPosted: newXpost,
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
 * Reject a Job Order
 */
router.put('/reject/:AAFNo', (req, res) => {
  const { AAFNo } = req.params;
  const { approver, remarks, userInfo, appLevel } = req.body;

  console.log('Rejection request:', { AAFNo, approver, remarks });

  const decodedJONo = decodeURIComponent(AAFNo);
  const cleanDocNo = decodedJONo
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
        // 1. Get approval configuration for Asset Accountabilitymodule
        const approvalConfig = await getApprovalConfig(connection, 'Asset Accountability');
        
        if (approvalConfig.length === 0) {
          throw new Error('No approval configuration found for this module');
        }

        const sql = `
          SELECT AAFNo, xPosted, appStat, approver, disapproved
          FROM assestacch
          WHERE AAFNo = ?
        `;

        // 2. Get current document status
        const currentDoc = await getCurrentApprovalStatus(connection, cleanDocNo, sql);
        
        // 3. Get the latest approved level from logs (only Approved or Confirmed)
        const currentApprovedLevel = await getLatestApprovalLevel(connection, cleanDocNo,  'Asset Accountability');
        
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
        
        // 5. Calculate new xPosted - RESET TO 3 for rejection (but follow same calculation pattern)
        const newXpost = 4; // Reset to 3 on rejection
        
        // 6. Determine the STAT value for the approval log - ALWAYS 'Disapproved' for rejection
        const approvalStat = 'Rejected';
        
        // 7. Update assestacch table - Set DISAPPROVED to 1, keep appStat same as approve flow
        const updateHeaderSql = `
          UPDATE assestacch 
          SET xPosted = ?, 
              appStat = ?,
              approver = ?
          WHERE AAFNo = ?
        `;
        
        const updateResult = await new Promise((resolve, reject) => {
          connection.query(updateHeaderSql, [newXpost, newAppStat, approver || '', cleanDocNo], (error, result) => {
            if (error) reject(error);
            else resolve(result);
          });
        });
        
        if (updateResult.affectedRows === 0) {
          throw new Error('Asset Accountability header not found');
        }
        
        // // 8. Reset assestaccd table xPosted to 3 on rejection
        // const updateDetailsSql = `UPDATE assestaccd SET xPosted = 3 WHERE AAFNo = ?`;
        // const DetailsUpdateResult = await new Promise((resolve, reject) => {
        //   connection.query(updateDetailsSql, [cleanDocNo], (error, result) => {
        //     if (error) reject(error);
        //     else resolve(result);
        //   });
        // });
        
        // 9. Create rejection log with STAT = 'Disapproved'
        const insertLogSql = `
          INSERT INTO approval_logs 
          (TRNO, Module, X_USER, DT, APP_LEVEL, STAT, REMARKS) 
          VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?)
        `;
        
        const xUser = userInfo ? `${userInfo.user} - ${userInfo.lname}, ${userInfo.fname}` : String(approved);
        
        await new Promise((resolve, reject) => {
          connection.query(insertLogSql, [cleanDocNo, 'Asset Accountability', xUser, nextLevel, approvalStat, remarks || ''], (error) => {
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
              // doc_d_updated: DetailsUpdateResult?.affectedRows || 0,
              status: approvalStat,
              currentLevel: nextLevel,
              processedLevels: processedLevelsCount,
              totalLevels: totalLevels,
              xPosted: newXpost,
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