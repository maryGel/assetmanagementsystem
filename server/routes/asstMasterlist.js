import express from 'express';
import { db } from '../server.js';

const router = express.Router();

// Get all itemlist with pagination and filters
router.get('/', (req, res) => {
  // When fetchAll=true, ignore pagination entirely and return every
  // matching row. This avoids silently truncating results whenever a
  // caller's pageSize happens to be smaller than the table (e.g. a
  // hardcoded "fetch everything" pageSize of 10000 on a 15,320-row table).
  const fetchAll = req.query.fetchAll === 'true';
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 10;
  const offset = (page - 1) * pageSize;

  // Optional column projection so heavy callers (e.g. "fetch all assets
  // for a dropdown") don't have to pull large/irrelevant text columns
  // like Picpath, Description, Remarks, or suppName. Whitelisted against
  // the real itemlist schema to avoid building SQL from raw user input.
  const ALLOWED_COLUMNS = new Set([
    'id', 'FacNO', 'FacName', 'Description', 'ItemClass', 'CATEGORY', 'Unit',
    'serialNo', 'Department', 'Holder', 'Picpath', 'Adate', 'AAmount', 'Percent',
    'Abre', 'ItemLocation', 'balance_unit', 'suppName', 'Remarks', 'COA_D',
    'COA_C', 'xStatus', 'writeOff', 'xAvailable', 'Brand', 'Color', 'BarcodeNo',
    'xxStats', 'StartDate', 'EndDate', 'Dimention', 'rr_number', 'PC_BATCH',
    'stackabl', 'mms_item_no', 'ReferenceNo', 'AssetGrpCode'
  ]);
  const requestedColumns = req.query.columns
    ? req.query.columns.split(',').map(c => c.trim()).filter(c => ALLOWED_COLUMNS.has(c))
    : null;
  const selectClause = requestedColumns && requestedColumns.length
    ? requestedColumns.map(c => `\`${c}\``).join(', ')
    : '*';

  // Build WHERE clause from filters
  const filters = [];
  const params = [];
  
  // Text search
  if (req.query.search) {
    filters.push('(FacNO LIKE ? OR FacName LIKE ? OR Description LIKE ?)');
    params.push(`%${req.query.search}%`, `%${req.query.search}%`, `%${req.query.search}%`);
  }
  
  // Category filter (can be multiple)
  if (req.query.category) {
    const categories = req.query.category.split(',');
    const placeholders = categories.map(() => '?').join(',');
    filters.push(`CATEGORY IN (${placeholders})`);
    params.push(...categories);
  }
  
  // Item Class filter (can be multiple)
  if (req.query.itemClass) {
    const classes = req.query.itemClass.split(',');
    const placeholders = classes.map(() => '?').join(',');
    filters.push(`ItemClass IN (${placeholders})`);
    params.push(...classes);
  }
  
  // Location filter (can be multiple)
  if (req.query.location) {
    const locations = req.query.location.split(',');
    const placeholders = locations.map(() => '?').join(',');
    filters.push(`ItemLocation IN (${placeholders})`);
    params.push(...locations);
  }
  
  // Department filter (can be multiple)
  if (req.query.department) {
    const departments = req.query.department.split(',');
    const placeholders = departments.map(() => '?').join(',');
    filters.push(`Department IN (${placeholders})`);
    params.push(...departments);
  }

  // In the filters section, add:
  if (req.query.assetNos) {
    const assetNos = req.query.assetNos.split(',');
    const placeholders = assetNos.map(() => '?').join(',');
    filters.push(`FacNO IN (${placeholders})`);
    params.push(...assetNos);
  }

    // In your backend itemlist.js
  console.log('Received query params:', req.query);
  if (req.query.assetNos) {
    console.log('Asset Nos to filter:', req.query.assetNos);
  }
  
  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const countSql = `SELECT COUNT(*) as total FROM itemlist ${whereClause}`;
  const dataSql = fetchAll
    ? `SELECT ${selectClause} FROM itemlist ${whereClause}`
    : `SELECT ${selectClause} FROM itemlist ${whereClause} LIMIT ? OFFSET ?`;

  db.getConnection((err, connection) => {
    if (err) {
      console.error('Error getting connection from pool:', err.stack);
      return res.status(500).json({ error: 'Database connection error' });
    }

    // Get total count
    connection.query(countSql, params, (countErr, countResults) => {
      if (countErr) {
        connection.release();
        console.error('Error counting records:', countErr.stack);
        return res.status(500).json({ error: 'Error fetching data count' });
      }

      const total = countResults[0].total;
      
      // Get data - only add LIMIT/OFFSET params when actually paginating
      const dataParams = fetchAll ? params : [...params, pageSize, offset];
      
      connection.query(dataSql, dataParams, (dataErr, results) => {
        connection.release(); // Release only once here

        if (dataErr) {
          console.error('Error executing query:', dataErr.stack);
          return res.status(500).json({ error: 'Error fetching the data' });
        }

        res.json({
          data: results,
          total: total,
          page: page,
          pageSize: pageSize
        });
      });
    });
  });
});


// Get a single asset by facNo
router.get('/:facNo', (req, res) => {
  const { facNo } = req.params;
  // Decode URL parameter and clean it
  const decodedFacNo = decodeURIComponent(facNo);
  const cleanFacNo = decodedFacNo
    .replace(/\u00A0/g, '') // Remove NBSP
    .replace(/\s/g, '') // Remove normal whitespace
    .toUpperCase();
  
  
  const sqlSelect = 'SELECT * FROM itemlist WHERE REPLACE(REPLACE(UPPER(FacNO), CHAR(160), ""), " ", "") = ?';
  
  
  db.getConnection((err, connection) => {
    if (err) {
      console.error('Error getting connection from pool:' + err.stack);
      return res.status(500).json({error:'Database connection error'});
    }

    connection.query(sqlSelect, [cleanFacNo], (error, results) => {
      connection.release();
      
      if (error){
        console.error('Error executing query:' + error.stack);
        return res.status(500).json({error: 'Error fetching the data'});
      }

      res.json(results.length > 0 ? results[0] : null);
    });
  });
});

router.post('/', (req, res) => {

  const {
    FacNO,
    FacName,
    Description,
    ItemClass,
    CATEGORY,
    Unit,
    serialNo,
    Department,
    Adate,
    ItemLocation,
    balance_unit,
    suppName,

    // OPTIONAL
    Brand,
    Color,
    ReferenceNo,
    StartDate,
    EndDate,

    // splitAsset,

    AAmount,
    Percent,
    Abre,
    Remarks,
  } = req.body;

   // ADD THIS VALIDATION
  if (!FacNO || FacNO.trim() === '') {
    return res.status(400).json({
      error: 'FacNO is required and cannot be empty'
    });
  }

  // REQUIRED FIELD CHECK
  const requiredFields = {
    FacNO,
    FacName,
    Description,
    CATEGORY,
    ItemClass,
    Unit,
    Adate,
    AAmount,
    ItemLocation,
    Department,
    ReferenceNo
  };

  for (const [key, value] of Object.entries(requiredFields)) {
    if (value === undefined || value === null || value === '') {
      return res.status(400).json({
        error: `${key} is required`
      });
    }
  }

  const sqlInsert = `
    INSERT INTO itemlist (
      FacNO, FacName, Description, ItemClass, CATEGORY, Unit, serialNo,
      Department, Adate, AAmount, Percent, Abre, ItemLocation,
      balance_unit, suppName, Brand, Color, StartDate, EndDate,
      ReferenceNo, xStatus, Picpath, Remarks
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `;

  const values = [
    FacNO,
    FacName,
    Description,
    ItemClass || null,
    CATEGORY,
    Unit,
    serialNo,
    Department,
    Adate,
    AAmount,
    Percent,
    Abre || 0,
    ItemLocation,
    balance_unit,
    suppName,
    Brand || null,
    Color || null,
    StartDate || null,
    EndDate || null,
    ReferenceNo || null,
    'ACTIVE',
    null,
    // splitAsset ?? 0,
    Remarks || null,
  ];

  console.log('SQL Insert:', sqlInsert);
  console.log('Number of columns in SQL:', sqlInsert.match(/\(([^)]+)\)/)[1].split(',').length);
  console.log('Number of values:', values.length);
  console.log('Values:', values);

  db.getConnection((err, connection) => {
    if (err) {
      console.error('Error getting connection from pool:' + err.stack);
      return res.status(500).json({ error: 'Database connection error' });
    }

    connection.query(sqlInsert, values, (error, results) => {
      connection.release();

      if (error) {
        console.error('=== SQL ERROR DETAILS ===');
        console.error('Error message:', error.message);
        console.error('Error code:', error.code);
        console.error('SQL state:', error.sqlState);
        console.error('Full error:', error);
        console.error('Error executing query:' + error.stack);
        return res.status(500).json({ error: 'Error inserting asset' });
      }

      res.status(201).json({
        message: 'Asset created successfully',
        assetId: results.insertId
      });
      console.log(`DB result: ${results}`)
    });
  });
});


router.put('/:facNo', (req, res) => {

  const { facNo } = req.params;

  const {
    FacNO,
    FacName,
    Description,
    ItemClass,
    CATEGORY,
    Unit,
    serialNo,
    Department,
    Holder,
    Adate,
    AAmount,
    Percent,
    Abre,
    ItemLocation,
    balance_unit,
    suppName,
    Brand,
    Color,
    StartDate,
    EndDate,
    ReferenceNo,
    Remarks,
    // splitAsset
  } = req.body;

  if (!facNo) {
    return res.status(400).json({ error: 'FacNO is required' });
  }

  const sqlUpdate = `
    UPDATE itemlist SET
      FacNO = ?,
      FacName = ?,
      Description = ?,
      ItemClass = ?,
      CATEGORY = ?,
      Unit = ?,
      serialNo = ?,
      Department = ?,
      Holder = ?,
      Adate = ?,
      AAmount = ?,
      Percent = ?,
      Abre = ?,
      ItemLocation = ?,
      balance_unit = ?,
      suppName = ?,
      Brand = ?,
      Color = ?,
      StartDate = ?,
      EndDate = ?,
      ReferenceNo = ?,
      Remarks = ?

    WHERE FacNO = ?
  `;

  const values = [
    FacNO,
    FacName,
    Description,
    ItemClass || null,
    CATEGORY,
    Unit,
    serialNo,
    Department,
    Holder,
    Adate,
    AAmount,
    Percent,
    Abre || 0,
    ItemLocation,
    balance_unit,
    suppName,
    Brand || null,
    Color || null,
    StartDate || null,
    EndDate || null,
    ReferenceNo || null,
    Remarks || null,
    // splitAsset ?? 0,
    facNo
  ];


  // const m = sqlUpdate.match(/\(([^)]+)\)/);
  // console.log('Number of columns in SQL:', m );
  // console.log('PUT /updateAsset', facNo);



  db.getConnection((err, connection) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Database connection error' });
    }

    connection.query(sqlUpdate, values, (error, results) => {
      connection.release();

      if (error) {
        console.error(error);
        return res.status(500).json({ error: 'Error updating asset' });
      }

      if (results.affectedRows === 0) {
        return res.status(404).json({ error: 'Asset not found' });
      }

      res.json({ message: 'Asset updated successfully' });
    });
  });
});


export default router;
