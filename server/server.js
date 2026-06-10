  /**************************************************
   * AMS PROJECT — Hybrid Server
   * - Vite React (same-origin)
   * - API-only (future use)
   * - LAN-friendly
   **************************************************/

  import express from 'express';
  import mysql from 'mysql2';
  import bodyParser from 'body-parser';
  import cors from 'cors';
  import dotenv from 'dotenv';
  import path from 'path';
  import { fileURLToPath } from 'url'

  // Load environment variables
  dotenv.config();

  // Route imports
  import useItemlist from './routes/asstMasterlist.js';
  import referentialsRoute from './routes/referentials.js';
  import refCategoryRoute from './routes/refCatRoute.js';
  import refBrandRoute from './routes/refBrandRoute.js';
  import refUnitRoute from './routes/refUnitRoute.js';
  import refItemClassRoute from './routes/refClassRoute.js';
  import refLocationRoute from './routes/refLocationRoute.js';
  import refDeptRoute from './routes/refDeptRoute.js';
  import refEmpRoute from './routes/refEmpRoute.js';
  import authRoute from './routes/authRoute.js';
  import usersRoute from './routes/usersRoute.js';
  import accessRoute from './routes/accessRoute.js';
  import colorsRoute from './routes/refColorRoute.js';
  import sectionsRoute from './routes/refSecRoute.js';
  import approvalRoute from './routes/refApprovalRoute.js';
  import jo_hRoute from './routes/jo_hRoute.js';
  import jo_dRoute from './routes/jo_dRoute.js';
  import jo_woeRoute from './routes/jo_woeRoute.js';
  import approvalLogsRoute from './routes/approvalLogsRoute.js';
  import ad_hRoute from './routes/ad_hRoute.js';
  import ad_dRoute from './routes/ad_dRoute.js';
  import tr_hRoute from './routes/tr_hRoute.js';
  import tr_dRoute from './routes/tr_dRoute.js';
  import assetacchRoute from './routes/assetacchRoute.js';
  import assetaccdRoute from './routes/assetaccdRoute.js';
  import assetLostHRoute from './routes/assetLostHRoute.js';
  import assetLostDRoute from './routes/assetLostDRoute.js';
  import jo_appRoute from './routes/jo_appRoute.js';
  import tr_appRoute from './routes/tr_appRoute.js';
  import ad_appRoute from './routes/ad_appRoute.js';
  import assetacc_appRoute from './routes/assetacc_appRoute.js';
  import assetLostAppRoute from './routes/assetLostAppRoute.js';
  import jo_evalRoute from './routes/jo_evalRoute.js';
  import user0002invRoute from './routes/user0002invRoute.js';




  // _DIRNAME FIX
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)

  // APP init
  const app = express();


  // --- CORS CONFIGURATION ---
  // Focused strictly on local development to avoid "split-brain" issues
  const allowedOrigins = [ 
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
  ];


  // Cors Hybrid safe
  const corsOptions = {
    origin: function (origin, callback) {
      // Allow Postman / curl / server-to-server
      if (!origin) return callback(null, true)

      // Allow localhost
      if (
        origin.startsWith('http://localhost:5173') ||
        origin.startsWith('http://localhost') ||
        origin.startsWith('http://127.0.0.1')
      ) {
        return callback(null, true)
      }

      // Allow LAN (192.168.x.x)
      if (origin.startsWith('http://192.168.')) {
        return callback(null, true)
      }

      // Allow future HTTPS domains
      if (origin.startsWith('https://')) {
        return callback(null, true)
      }

      console.log('❌ CORS blocked:', origin)
      callback(new Error('Not allowed by CORS'))
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  }

  app.use(cors(corsOptions))

  // --- MIDDLEWARE ---
  app.use(express.json());
  app.use(bodyParser.urlencoded({ extended: true }));

  // --- DATABASE CONFIGURATION ---
  // Hardcoded to ensure Node always talks to the same DB as SQLyog
  const dbConfig = {
    host: process.env.DB_HOST || '192.168.64.5',
    user: process.env.DB_USER || 'myuser101',
    password: process.env.DB_PASSWORD || 'MmFjbV69',
    database: process.env.DB_NAME || 'ams1',
    port: 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 30000,
    timezone: '+08:00', // or your local timezone (e.g., 'UTC', 'Asia/Manila')
    dateStrings: true,  // THIS IS KEY - returns dates as strings, not Date objects
  };

  export const db = mysql.createPool(dbConfig);

  // Test database connection on startup
  db.getConnection((err, connection) => {
    if (err) {
      console.error('❌ VM Database connection failed:', err.message);
      console.log('🔧 Attempting to connect to:', dbConfig.host);
    } else {
      console.log('✅ Successfully connected to VM Database at 192.168.64.5');
      console.log('📊 Database Name:', dbConfig.database);
      connection.release();
    }
  });



  // Attach database pool to every request
  app.use((req, res, next) => {
    req.db = db;
    next();
  });

  // --- ROUTES ---

  // Health check endpoint
  app.get('/health', (req, res) => {
    db.query("SELECT 1 as test", (err) => {
      if (err) return res.status(500).json({ status: 'error', error: err.message });
      res.json({ status: 'ok', database: 'Connected to VM' });
    });
  });

  // API Routes
  app.use('/login', authRoute);
  app.use('/users', usersRoute);
  app.use('/itemlist', useItemlist);
  app.use('/referentials', referentialsRoute);
  app.use('/api/refCat', refCategoryRoute);
  app.use('/refBrand', refBrandRoute);
  app.use('/api/refUnit', refUnitRoute);
  app.use('/refItemClass', refItemClassRoute);
  app.use('/refLocation', refLocationRoute);
  app.use('/refDepartment', refDeptRoute);
  app.use('/refEmployee', refEmpRoute);
  app.use('/accessRights', accessRoute);
  app.use('/colorsRoute', colorsRoute);
  app.use('/secRoutes', sectionsRoute);
  app.use('/approvalRoute', approvalRoute);
  app.use('/jo_hRoute', jo_hRoute);
  app.use('/jo_dRoute', jo_dRoute);
  app.use('/jo_woeRoute', jo_woeRoute);
  app.use('/appLogsRoute', approvalLogsRoute);
  app.use('/ad_hRoute', ad_hRoute);
  app.use('/ad_dRoute', ad_dRoute);
  app.use('/tr_hRoute', tr_hRoute);
  app.use('/tr_dRoute', tr_dRoute);
  app.use('/assetacchRoute', assetacchRoute);
  app.use('/assetaccdRoute', assetaccdRoute);
  app.use('/assetLostHRoute', assetLostHRoute);
  app.use('/assetLostDRoute', assetLostDRoute);
  app.use('/approval', jo_appRoute);
  app.use('/trApproval', tr_appRoute);
  app.use('/adApproval', ad_appRoute);
  app.use('/accApproval', assetacc_appRoute);
  app.use('/alostApproval', assetLostAppRoute);
  app.use('/jo_evalRoute', jo_evalRoute);
  app.use('/companyConfig', user0002invRoute);


  // React (Vite Dist)
  app.use(express.static(path.join(__dirname, '../client/dist')))

  // SPA fallback — MUST BE LAST
  app.get(/.*/, (req, res) => {
    res.sendFile(
      path.join(__dirname, '../client/dist/index.html')
    )
  })
  // 404 Handler
  app.use((req, res) => {
    res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
  });

  // --- SERVER START ---
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log('='.repeat(50));
    console.log(`🚀 Local Server running on http://localhost:${PORT}`);
    console.log(`📡 Target DB Host: 192.168.64.5`);
    console.log('='.repeat(50));
  });         