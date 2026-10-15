import express from 'express';
  import fs from 'fs';
  import path from 'path';
  import multer from 'multer';
  import {db} from '../server.js';

  const router = express.Router();

  // ---------- itemlist.xxStats sync for edited documents ----------
  const PENDING_STATUS = 'With Pending Disposal';

  const runQuery = (connection, sql, params) => new Promise((resolve, reject) => {
    connection.query(sql, params, (error, result) => (error ? reject(error) : resolve(result)));
  });

  // Unique asset numbers; blank and 'n' (no asset) are skipped
  const cleanFacNos = (list) => [...new Set(
    list.map((f) => (f || '').trim()).filter((f) => f && f.toLowerCase() !== 'n')
  )];

  // Compare the asset numbers before and after an edit:
  //  - removed lines: clear xxStats (only if it still holds this document's pending status)
  //  - added lines:   set xxStats to the pending status
  // Lines that were already on the document are left untouched.
  const syncPendingStatus = async (connection, oldList, newList) => {
    const oldSet = cleanFacNos(oldList);
    const newSet = cleanFacNos(newList);
    const removed = oldSet.filter((f) => !newSet.includes(f));
    const added = newSet.filter((f) => !oldSet.includes(f));
    if (removed.length > 0) {
      await runQuery(connection, `UPDATE itemlist SET xxStats = '' WHERE FacNO IN (?) AND xxStats = ?`, [removed, PENDING_STATUS]);
    }
    if (added.length > 0) {
      await runQuery(connection, `UPDATE itemlist SET xxStats = ? WHERE FacNO IN (?)`, [PENDING_STATUS, added]);
    }
  };

  // ---------- Image upload (server/uploads/disposal-images) ----------
  const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'disposal-images');
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });

  const MIME_BY_EXT = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
    '.gif': 'image/gif', '.webp': 'image/webp', '.bmp': 'image/bmp',
  };

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    fileFilter: (req, file, cb) => {
      if (!file.mimetype.startsWith('image/')) {
        return cb(new Error('Only image files are allowed'));
      }
      cb(null, true);
    },
  });

  // Safe file name: strip any path parts, keep the readable original name
  const safeFileName = (name) =>
    path.basename(String(name || 'image')).replace(/[\\/:*?"<>|]/g, '_');

  // Unique file name inside the upload folder (TV!.jpg -> TV!_1700000000000.jpg if taken)
  const uniqueFileName = (name) => {
    let finalName = safeFileName(name);
    if (fs.existsSync(path.join(UPLOAD_DIR, finalName))) {
      const ext = path.extname(finalName);
      finalName = `${path.basename(finalName, ext)}_${Date.now()}${ext}`;
    }
    return finalName;
  };

  // Buffer -> data URL so the browser can show it directly
  const toDataUrl = (buffer, fileName) => {
    if (!buffer) return null;
    const mime = MIME_BY_EXT[path.extname(fileName || '').toLowerCase()] || 'image/jpeg';
    return `data:${mime};base64,${Buffer.from(buffer).toString('base64')}`;
  };

  // Rows sent to the client: imgItem (BLOB) becomes a data URL
  const withImageData = (rows) =>
    rows.map((r) => ({ ...r, imgItem: toDataUrl(r.imgItem, r.imgTitle) }));

  // Decide what to store in imgItem for a line: the saved file first,
  // then the image already stored for the same asset, otherwise NULL.
  const resolveImgItem = (item, existingByFacNo = {}) => {
    if (!item.imgTitle) return null; // image removed / none chosen
    const filePath = path.join(UPLOAD_DIR, safeFileName(item.imgTitle));
    if (fs.existsSync(filePath)) return fs.readFileSync(filePath);
    return existingByFacNo[item.FAC_NO] || null;
  };

  // Upload one image. Saves the file to disk and returns its name + data URL.
  router.post('/upload-image', (req, res) => {
    upload.single('image')(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message });
      if (!req.file) return res.status(400).json({ error: 'No image uploaded' });

      const imgTitle = uniqueFileName(req.file.originalname);
      fs.writeFile(path.join(UPLOAD_DIR, imgTitle), req.file.buffer, (writeErr) => {
        if (writeErr) {
          console.error('Image save error:', writeErr);
          return res.status(500).json({ error: 'Failed to save image' });
        }
        res.status(201).json({
          imgTitle,
          imgItem: toDataUrl(req.file.buffer, imgTitle),
        });
      });
    });
  });

  // Get all ad_d
  router.get('/', (req, res) => {
    
    db.getConnection((err, connection) => {
        if (err) {
        return res.status(500).json({error: 'Database connection error'});
        }

        const sql = 'SELECT * FROM ad_d';

        connection.query(sql, (err, results) => {
          connection.release();
            if(err){
                return res.status(500).json({err: 'Error fetching the data: ad_d'})
            }
            res.json(withImageData(results));
        });
    });
  });


  // Get single ad_d
  router.get('/:AD_No', (req, res) => {
    const {ADNO} = req.params;

    const decodedAD_No = decodeURIComponent(ADNO);
    const cleanAD_No = decodedAD_No
      .replace(/\u00A0/g, '') // Remove NBSP
      .replace(/\s/g, '') // Remove normal whitespace
      .toUpperCase();

    db.getConnection((err, connection) => {
      if(err){
        return res.status(500).json({err: 'Database connection failed ad_d'})
      }

      const sql = 'SELECT * FROM ad_d WHERE AD_No = ?';

      connection.query(sql, [cleanJONo], (error, result)=>{
        connection.release();

        if(error){
          return res.status(500).json({error: 'Database query failed ad_d'})
        }

        if(result.length === 0){
          return res.status(404).json({error: 'ad_d not found'})
        }

        res.json(withImageData(result)[0]);
      });
    });
  });

  // Create AD details (accepts array of items)
  router.post('/', (req, res) => {
    const items = req.body; // This should be an array of detail items
    
    // Validate that items is an array
    if (!Array.isArray(items)) {
      return res.status(400).json({error: 'Request body must be an array of detail items'});
    }
    
    if (items.length === 0) {
      return res.status(400).json({error: 'At least one detail item is required'});
    }
  
    db.getConnection((err, connection) => {
      if(err) {
        return res.status(500).json({error: 'Database connection failed ad_d', details: err.message});
      }

    // Helper function to format date
    const formatDate = (dateStr) => {
      if (!dateStr) return null;
      // If already in YYYY-MM-DD format
      if (typeof dateStr === 'string' && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return dateStr;
      }
      // Convert from other formats
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return null;
      return date.toISOString().split('T')[0];
    };
      
      // Process each item
      const sql = `INSERT INTO ad_d (
        AD_No, FAC_NO, FAC_name, qty, xDate, xpost, 
        UOM, brand, serialno, workDet, Disposal_Type, salvage_amount,
        imgTitle, imgItem
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
      
      const promises = items.map((item) => {
        const {
          AD_No,
          FAC_NO,
          FAC_name,
          qty,  
          xDate,
          xpost,
          UOM,
          brand,
          serialno,
          workDet,
          Disposal_Type,          
          salvage_amount,
          imgTitle,
        } = item;
        
        const values = [
          AD_No,
          FAC_NO || '',
          FAC_name || '',
          qty !== undefined ? Number(qty) : 1,
          formatDate(xDate),
          xpost !== undefined ? xpost : 0,
          UOM || '',
          brand || '',
          serialno || '',
          workDet || '',
          Disposal_Type || '',
          salvage_amount !== undefined ? Number(salvage_amount) : 0,
          imgTitle || null,
          resolveImgItem(item),
        ];
        
        return new Promise((resolve, reject) => {
          connection.query(sql, values, (error, result) => {
            if (error) reject(error);
            else resolve(result);
          });
        });
      });
      
      // Execute all inserts
      Promise.all(promises)
        .then(async (results) => {
          // Flag each asset on this AD as having a pending disposal (per FacNO).
          // Blank FAC_NO and 'n' (no asset) are skipped.
          const facNos = [...new Set(
            items
              .map((i) => (i.FAC_NO || '').trim())
              .filter((f) => f && f.toLowerCase() !== 'n')
          )];

          let assetsFlagged = 0;
          if (facNos.length > 0) {
            const upd = await new Promise((resolve, reject) => {
              connection.query(
                `UPDATE itemlist SET xxStats = 'With Pending Disposal' WHERE FacNO IN (?)`,
                [facNos],
                (error, result) => (error ? reject(error) : resolve(result))
              );
            });
            assetsFlagged = upd.affectedRows;
          }

          connection.release();
          res.status(201).json({
            message: 'AD details created successfully',
            count: results.length,
            ids: results.map(r => r.insertId),
            assetsFlagged
          });
        })
        .catch((error) => {
          connection.release();
          console.error('Detail insert error:', error);
          res.status(500).json({
            error: 'Database query failed ad_d',
            details: error.sqlMessage,
            code: error.code
          });
        });
    });
  });
  
  // Update AD details (if needed)
  router.put('/:AD_No', (req, res) => {
    const AD_No = req.params.AD_No;
    const details = req.body;
    
    if (!Array.isArray(details)) {
      return res.status(400).json({ error: 'Details must be an array' });
    }
    
    db.getConnection((err, connection) => {
      if (err) return res.status(500).json({ error: 'DB connection error' });
      
      // Keep the images already stored for this AD, so unchanged lines
      // don't lose their imgItem when the details are replaced below
      connection.query('SELECT FAC_NO, imgItem FROM ad_d WHERE AD_No = ?', [AD_No], (selErr, existingRows) => {
      if (selErr) {
        connection.release();
        return res.status(500).json({ error: 'Error reading old details', details: selErr.message });
      }
      const existingByFacNo = {};
      existingRows.forEach(r => { if (r.imgItem) existingByFacNo[r.FAC_NO] = r.imgItem; });

      // First, delete all existing details for this AD
      const deleteSql = 'DELETE FROM ad_d WHERE AD_No = ?';
      
      connection.query(deleteSql, [AD_No], async (err, deleteResult) => {
        // All lines removed: clear the pending status on the assets that were on this AD
        if (!err && details.length === 0) {
          try {
            await syncPendingStatus(connection, existingRows.map((r) => r.FAC_NO), []);
          } catch (statErr) {
            connection.release();
            console.error('Error updating itemlist xxStats:', statErr);
            return res.status(500).json({ error: 'Details removed but asset status update failed', details: statErr.message });
          }
        }

        if (err) {
          connection.release();
          return res.status(500).json({ error: 'Error deleting old details', details: err.message });
        }
        
        if (details.length === 0) {
          connection.release();
          return res.json({ success: true, message: 'All details removed', deletedCount: deleteResult.affectedRows });
        }
        
        // Insert new details
        const insertSql = 'INSERT INTO ad_d (AD_No, FAC_NO, FAC_name, qty, xDate,  xpost, UOM, brand, serialno, workDet, Disposal_Type, salvage_amount, imgTitle, imgItem) VALUES ?';
        
        const values = details.map(detail => [
          AD_No,
          detail.FAC_NO || '',
          detail.FAC_name || '',
          detail.qty !== undefined ? Number(detail.qty) : 1,
          detail.xDate || null,
          detail.xpost !== undefined ? detail.xpost : 0,
          detail.UOM || '',
          detail.brand || '',
          detail.serialno || '',
          detail.workDet || '',
          detail.Disposal_Type || '',
          detail.salvage_amount !== undefined ? Number(detail.salvage_amount) : 0,
          detail.imgTitle || null,
          resolveImgItem(detail, existingByFacNo),
        ]);
        
        connection.query(insertSql, [values], async (err, insertResult) => {
          // Added lines get the pending status; removed lines are cleared
          if (!err) {
            try {
              await syncPendingStatus(connection, existingRows.map((r) => r.FAC_NO), details.map((d) => d.FAC_NO));
            } catch (statErr) {
              connection.release();
              console.error('Error updating itemlist xxStats:', statErr);
              return res.status(500).json({ error: 'Details saved but asset status update failed', details: statErr.message });
            }
          }

          connection.release();
          
          if (err) {
            console.error('Error inserting details:', err);
            return res.status(500).json({ error: 'Error inserting details', details: err.message });
          }
          
          res.json({ 
            success: true, 
            message: 'AD details updated successfully',
            deletedCount: deleteResult.affectedRows,
            insertedCount: insertResult.affectedRows
          });
        });
      });
      });
    });
  });
  
  // Delete AD details (if needed)
  router.delete('/:id', (req, res) => {
    const { id } = req.params;
    
    db.getConnection((err, connection) => {
      if(err) return res.status(500).json({error: 'Database connection failed'});
      
      const sql = 'DELETE FROM ad_d WHERE id = ?';
      connection.query(sql, [id], (error, result) => {
        connection.release();
        if(error) return res.status(500).json({error: 'Database query failed'});
        if(result.affectedRows === 0) return res.status(404).json({error: 'Detail not found'});
        res.json({message: 'Detail deleted successfully'});
      });
    });
  });

  export default router;