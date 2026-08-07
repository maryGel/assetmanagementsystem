import express from 'express';
import { db } from '../server.js';

const router = express.Router();

// ============================================
// SESSION ENDPOINTS
// ============================================

/**
 * GET /physicalCount/sessions
 * Get all count sessions with statistics
 */
router.get('/sessions', (req, res) => {
  const sql = `
    SELECT 
      pcs.*,
      COUNT(psa.id) as asset_count,
      COUNT(DISTINCT CASE WHEN psa.status = 'counted' THEN psa.asset_no END) as counted_count,
      COUNT(DISTINCT CASE WHEN psa.status = 'verified' THEN psa.asset_no END) as verified_count,
      COUNT(DISTINCT CASE WHEN psa.status = 'discrepancy' THEN psa.asset_no END) as discrepancy_count
    FROM physical_count_sessions pcs
    LEFT JOIN physical_count_session_assets psa ON pcs.id = psa.session_id
    GROUP BY pcs.id
    ORDER BY pcs.created_at DESC
  `;
  
  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error fetching sessions:', err);
      return res.status(500).json({ error: 'Failed to fetch sessions' });
    }
    res.json(results);
  });
});

/**
 * GET /physicalCount/sessions/:id
 * Get a single session by ID
 */
router.get('/sessions/:id', (req, res) => {
  const { id } = req.params;
  
  const sql = `
    SELECT 
      pcs.*,
      COUNT(psa.id) as asset_count,
      COUNT(DISTINCT CASE WHEN psa.status = 'counted' THEN psa.asset_no END) as counted_count,
      COUNT(DISTINCT CASE WHEN psa.status = 'verified' THEN psa.asset_no END) as verified_count,
      COUNT(DISTINCT CASE WHEN psa.status = 'discrepancy' THEN psa.asset_no END) as discrepancy_count
    FROM physical_count_sessions pcs
    LEFT JOIN physical_count_session_assets psa ON pcs.id = psa.session_id
    WHERE pcs.id = ?
    GROUP BY pcs.id
  `;
  
  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error('Error fetching session:', err);
      return res.status(500).json({ error: 'Failed to fetch session' });
    }
    
    if (results.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    res.json(results[0]);
  });
});

/**
 * POST /physicalCount/sessions
 * Create a new count session
 */
router.post('/sessions', (req, res) => {
  const { 
    sessionName, 
    startDate, 
    endDate, 
    freezeAssets = false, 
    assets = [],
    counters = [],
    auditors = []
  } = req.body;
  
  // Validation
  if (!sessionName || !startDate || !endDate) {
    return res.status(400).json({ 
      error: 'Session name, start date, and end date are required' 
    });
  }
  
  if (assets.length === 0) {
    return res.status(400).json({ 
      error: 'At least one asset must be selected' 
    });
  }
  
  // Start transaction
  db.getConnection((err, connection) => {
    if (err) {
      console.error('Error getting connection:', err);
      return res.status(500).json({ error: 'Database connection error' });
    }
    
    connection.beginTransaction((txErr) => {
      if (txErr) {
        connection.release();
        return res.status(500).json({ error: txErr.message });
      }
      
      // Insert session
      const insertSessionSql = `
        INSERT INTO physical_count_sessions 
        (session_name, start_date, end_date, freeze_assets, asset_count, status, created_at)
        VALUES (?, ?, ?, ?, ?, 'draft', NOW())
      `;
      
      connection.query(
        insertSessionSql, 
        [sessionName, startDate, endDate, freezeAssets, assets.length], 
        (insertErr, result) => {
          if (insertErr) {
            connection.rollback(() => {
              connection.release();
              console.error('Error creating session:', insertErr);
              return res.status(500).json({ error: 'Failed to create session' });
            });
            return;
          }
          
          const sessionId = result.insertId;
          
          // Insert session assets
          if (assets.length > 0) {
            const assetValues = assets.map(assetNo => [sessionId, assetNo]);
            const assetSql = `INSERT INTO physical_count_session_assets (session_id, asset_no) VALUES ?`;
            
            connection.query(assetSql, [assetValues], (assetErr) => {
              if (assetErr) {
                connection.rollback(() => {
                  connection.release();
                  console.error('Error adding session assets:', assetErr);
                  return res.status(500).json({ error: 'Failed to add assets to session' });
                });
                return;
              }
              
              // Commit transaction
              connection.commit((commitErr) => {
                if (commitErr) {
                  connection.rollback(() => {
                    connection.release();
                    return res.status(500).json({ error: commitErr.message });
                  });
                  return;
                }
                connection.release();
                res.status(201).json({ 
                  id: sessionId, 
                  message: 'Session created successfully',
                  assetCount: assets.length
                });
              });
            });
          } else {
            // No assets to add, commit directly
            connection.commit((commitErr) => {
              if (commitErr) {
                connection.rollback(() => {
                  connection.release();
                  return res.status(500).json({ error: commitErr.message });
                });
                return;
              }
              connection.release();
              res.status(201).json({ 
                id: sessionId, 
                message: 'Session created successfully',
                assetCount: 0
              });
            });
          }
        }
      );
    });
  });
});

/**
 * PUT /physicalCount/sessions/:id
 * Update session status
 */
router.put('/sessions/:id', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }
  
  const validStatuses = ['draft', 'active', 'completed', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status value' });
  }
  
  const sql = `UPDATE physical_count_sessions SET status = ?, updated_at = NOW() WHERE id = ?`;
  
  db.query(sql, [status, id], (err, result) => {
    if (err) {
      console.error('Error updating session:', err);
      return res.status(500).json({ error: 'Failed to update session' });
    }
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    res.json({ 
      message: `Session ${status} successfully`,
      status: status
    });
  });
});

/**
 * DELETE /physicalCount/sessions/:id
 * Delete a session (only if draft or cancelled)
 */
router.delete('/sessions/:id', (req, res) => {
  const { id } = req.params;
  
  // Check if session can be deleted
  const checkSql = `SELECT status FROM physical_count_sessions WHERE id = ?`;
  
  db.query(checkSql, [id], (checkErr, checkResults) => {
    if (checkErr) {
      return res.status(500).json({ error: 'Failed to check session' });
    }
    
    if (checkResults.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    const status = checkResults[0].status;
    if (status === 'active' || status === 'completed') {
      return res.status(400).json({ 
        error: 'Cannot delete active or completed sessions' 
      });
    }
    
    const deleteSql = `DELETE FROM physical_count_sessions WHERE id = ?`;
    db.query(deleteSql, [id], (err) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to delete session' });
      }
      res.json({ message: 'Session deleted successfully' });
    });
  });
});

// ============================================
// ASSET ENDPOINTS
// ============================================

/**
 * GET /physicalCount/sessions/:id/assets
 * Get all assets in a session
 */
router.get('/sessions/:id/assets', (req, res) => {
  const { id } = req.params;
  
  const sql = `
    SELECT 
      psa.asset_no,
      psa.status,
      psa.counted_at,
      psa.counted_by,
      i.FacNO,
      i.Description,
      i.ItemLocation,
      i.Department,
      i.Holder,
      i.serialNo,
      i.CATEGORY
    FROM physical_count_session_assets psa
    INNER JOIN itemlist i ON psa.asset_no = i.FacNO
    WHERE psa.session_id = ?
    ORDER BY i.ItemLocation, i.FacNO
  `;
  
  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error('Error fetching session assets:', err);
      return res.status(500).json({ error: 'Failed to fetch assets' });
    }
    res.json(results || []);
  });
});

/**
 * DELETE /physicalCount/sessions/:id/assets/:assetNo
 * Remove an asset from a session
 */
router.delete('/sessions/:id/assets/:assetNo', (req, res) => {
  const { id, assetNo } = req.params;
  
  const sql = `
    DELETE FROM physical_count_session_assets 
    WHERE session_id = ? AND asset_no = ?
  `;
  
  db.query(sql, [id, assetNo], (err, result) => {
    if (err) {
      console.error('Error removing asset:', err);
      return res.status(500).json({ error: 'Failed to remove asset' });
    }
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Asset not found in session' });
    }
    
    res.json({ 
      message: 'Asset removed successfully',
      assetNo: assetNo
    });
  });
});

// ============================================
// COUNT SHEET ENDPOINTS
// ============================================

/**
 * POST /physicalCount/sessions/:id/sheets
 * Generate count sheets for a session
 */
router.post('/sessions/:id/sheets', (req, res) => {
  const { id } = req.params;
  const { 
    hideDetails = false, 
    groupByLocation = false,
    includeCustodian = true,
    includeStatus = true
  } = req.body;
  
  // Get session assets with their details
  const sql = `
    SELECT 
      i.FacNO,
      i.Description,
      i.ItemLocation,
      i.Department,
      i.Holder,
      i.serialNo,
      i.CATEGORY,
      i.ItemClass,
      psa.status as count_status,
      psa.counted_at,
      psa.counted_by
    FROM itemlist i
    INNER JOIN physical_count_session_assets psa ON i.FacNO = psa.asset_no
    WHERE psa.session_id = ?
    ORDER BY i.ItemLocation, i.FacNO
  `;
  
  db.query(sql, [id], (err, assets) => {
    if (err) {
      console.error('Error fetching session assets:', err);
      return res.status(500).json({ error: 'Failed to fetch assets for sheets' });
    }
    
    if (!assets || assets.length === 0) {
      return res.status(404).json({ 
        error: 'No assets found in this session',
        sheets: []
      });
    }
    
    // Group by location if requested
    let sheets = [];
    if (groupByLocation) {
      const grouped = assets.reduce((acc, asset) => {
        const key = asset.ItemLocation || 'Unassigned';
        if (!acc[key]) acc[key] = [];
        acc[key].push(asset);
        return acc;
      }, {});
      
      sheets = Object.entries(grouped).map(([location, items]) => ({
        location,
        assets: items,
        count: items.length
      }));
    } else {
      sheets = [{
        location: 'All Locations',
        assets: assets,
        count: assets.length
      }];
    }
    
    // Apply blind count option (hide details)
    if (hideDetails) {
      sheets = sheets.map(sheet => ({
        ...sheet,
        assets: sheet.assets.map(asset => ({
          ...asset,
          Description: '***',
          serialNo: '***'
        }))
      }));
    }
    
    res.json({
      sessionId: parseInt(id),
      sheets: sheets,
      totalAssets: assets.length,
      generatedAt: new Date().toISOString()
    });
  });
});

// ============================================
// SCAN ENDPOINTS
// ============================================

/**
 * POST /physicalCount/sessions/:id/scan
 * Record a scanned asset
 */
router.post('/sessions/:id/scan', (req, res) => {
  const { id } = req.params;
  const { assetNo, scannedBy } = req.body;
  
  if (!assetNo) {
    return res.status(400).json({ error: 'Asset number is required' });
  }
  
  // Check if asset exists in session
  const checkSql = `
    SELECT id, status 
    FROM physical_count_session_assets 
    WHERE session_id = ? AND asset_no = ?
  `;
  
  db.query(checkSql, [id, assetNo], (checkErr, checkResults) => {
    if (checkErr) {
      return res.status(500).json({ error: 'Failed to check asset' });
    }
    
    if (checkResults.length === 0) {
      return res.status(404).json({ 
        error: 'Asset not found in this session' 
      });
    }
    
    // Update the asset status to 'counted'
    const updateSql = `
      UPDATE physical_count_session_assets 
      SET counted_at = NOW(), 
          counted_by = ?, 
          status = 'counted'
      WHERE session_id = ? AND asset_no = ?
    `;
    
    db.query(updateSql, [scannedBy || 'SYSTEM', id, assetNo], (updateErr) => {
      if (updateErr) {
        console.error('Error updating asset:', updateErr);
        return res.status(500).json({ error: 'Failed to update asset status' });
      }
      
      // Record scan in scans table
      const scanSql = `
        INSERT INTO physical_count_scans 
        (session_id, asset_no, scanned_by, scanned_at, status)
        VALUES (?, ?, ?, NOW(), 'counted')
      `;
      
      db.query(scanSql, [id, assetNo, scannedBy || 'SYSTEM'], (scanErr) => {
        if (scanErr) {
          console.error('Error recording scan:', scanErr);
          // Don't fail the whole operation if scan recording fails
        }
        
        res.json({ 
          message: 'Asset scanned successfully',
          assetNo: assetNo,
          status: 'counted'
        });
      });
    });
  });
});

/**
 * GET /physicalCount/sessions/:id/progress
 * Get scanning progress for a session
 */
router.get('/sessions/:id/progress', (req, res) => {
  const { id } = req.params;
  
  const sql = `
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'counted' THEN 1 ELSE 0 END) as counted,
      SUM(CASE WHEN status = 'verified' THEN 1 ELSE 0 END) as verified,
      SUM(CASE WHEN status = 'discrepancy' THEN 1 ELSE 0 END) as discrepancies,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
    FROM physical_count_session_assets
    WHERE session_id = ?
  `;
  
  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error('Error fetching progress:', err);
      return res.status(500).json({ error: 'Failed to fetch progress' });
    }
    
    const progress = results[0] || { total: 0, counted: 0, verified: 0, discrepancies: 0, pending: 0 };
    const percentage = progress.total > 0 
      ? Math.round(((progress.counted + progress.verified) / progress.total) * 100)
      : 0;
    
    res.json({
      ...progress,
      percentage: percentage,
      remaining: progress.total - (progress.counted + progress.verified)
    });
  });
});

// ============================================
// AVAILABLE ASSETS ENDPOINT
// ============================================

/**
 * GET /physicalCount/available-assets
 * Get assets available for counting (not in any active/draft session)
 */
router.get('/available-assets', (req, res) => {
  const { location, department, category, costCenter, custodian } = req.query;
  
  let sql = `
    SELECT i.* 
    FROM itemlist i
    WHERE i.FacNO NOT IN (
      SELECT DISTINCT psa.asset_no 
      FROM physical_count_session_assets psa
      INNER JOIN physical_count_sessions pcs ON psa.session_id = pcs.id
      WHERE pcs.status IN ('active', 'draft')
    )
  `;
  
  const params = [];
  
  if (location) {
    const locations = location.split(',');
    sql += ` AND i.ItemLocation IN (${locations.map(() => '?').join(',')})`;
    params.push(...locations);
  }
  
  if (department) {
    const departments = department.split(',');
    sql += ` AND i.Department IN (${departments.map(() => '?').join(',')})`;
    params.push(...departments);
  }
  
  if (category) {
    const categories = category.split(',');
    sql += ` AND i.CATEGORY IN (${categories.map(() => '?').join(',')})`;
    params.push(...categories);
  }
  
  if (custodian) {
    const custodians = custodian.split(',');
    sql += ` AND i.Holder IN (${custodians.map(() => '?').join(',')})`;
    params.push(...custodians);
  }
  
  sql += ` ORDER BY i.ItemLocation, i.FacNO`;
  
  db.query(sql, params, (err, results) => {
    if (err) {
      console.error('Error fetching available assets:', err);
      return res.status(500).json({ error: 'Failed to fetch available assets' });
    }
    res.json(results || []);
  });
});

export default router;