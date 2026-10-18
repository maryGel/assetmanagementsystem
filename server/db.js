import mysql from 'mysql2';
import { config } from './config.js';

// Credentials come only from environment variables (see config.js)
export const db = mysql.createPool({
  ...config.db,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});