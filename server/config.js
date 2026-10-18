/**************************************************
 * config.js — loads and checks environment variables
 *
 * Import this FIRST in server.js. ES module imports run before the
 * code in server.js, so calling dotenv.config() inside server.js was
 * too late for modules (like authRoute.js) that read process.env at
 * import time.
 *
 * Secrets live ONLY in server/.env (never committed).
 * See server/.env.example for the list of variables.
 **************************************************/
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// server/.env first, then server/.env.<NODE_ENV> for anything not already set
dotenv.config({ path: path.join(__dirname, '.env'), quiet: true });
if (process.env.NODE_ENV) {
  dotenv.config({ path: path.join(__dirname, `.env.${process.env.NODE_ENV}`), quiet: true });
}

// Accept the older name DB_PASSWORD too
const DB_PASS = process.env.DB_PASS ?? process.env.DB_PASSWORD;

const required = {
  DB_HOST: process.env.DB_HOST,
  DB_USER: process.env.DB_USER,
  DB_PASS,
  DB_NAME: process.env.DB_NAME,
  JWT_SECRET: process.env.JWT_SECRET,
};

const missing = Object.entries(required)
  .filter(([, v]) => v === undefined || v === '')
  .map(([k]) => k);

if (missing.length) {
  console.error(
    `❌ Missing environment variables: ${missing.join(', ')}\n` +
      '   Copy server/.env.example to server/.env and fill in the values.'
  );
  process.exit(1);
}

if (process.env.JWT_SECRET.length < 32) {
  console.error('❌ JWT_SECRET must be at least 32 characters. Generate one with:\n' +
    "   node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\"");
  process.exit(1);
}

export const config = {
  db: {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: DB_PASS,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT) || 3306,
  },
  jwtSecret: process.env.JWT_SECRET,
  port: Number(process.env.PORT) || 3000,
  isProduction: process.env.NODE_ENV === 'production',
  // Comma-separated list of extra allowed browser origins, e.g.
  // ALLOWED_ORIGINS=https://myapp.vercel.app,https://ams.mycompany.com
  allowedOrigins: (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean),
};

export const JWT_SECRET = config.jwtSecret;