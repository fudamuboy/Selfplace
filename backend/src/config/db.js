const { Pool } = require('pg');
require('dotenv').config();

console.log('--- DATABASE CONFIG AUDIT ---');
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('NODE_ENV:', process.env.NODE_ENV);

// In production or when using Supabase, we MUST use connectionString and SSL
const isProd = process.env.NODE_ENV === 'production' || process.env.DATABASE_URL?.includes('supabase.co');

let poolConfig;

if (process.env.DATABASE_URL) {
  try {
    const url = new URL(process.env.DATABASE_URL);
    console.log('[DB] Using connectionString from DATABASE_URL');
    console.log('[DB] Target Host:', url.hostname);
  } catch (e) {
    console.error('[DB-ERROR] Failed to parse DATABASE_URL. It might be malformed.');
  }
  
  poolConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: isProd ? { rejectUnauthorized: false } : false,
  };
} else {
  console.log('[DB] No DATABASE_URL found, falling back to local PG config');
  poolConfig = {
    user: process.env.DB_USER,
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
  };
}

console.log('------------------------------');

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('[DATABASE] Unexpected error on idle client:', err.message);
  if (err.message.includes('ECONNREFUSED')) {
    console.error('[DATABASE] CRITICAL: Connection refused. Check if you are trying to connect to localhost in production!');
  }
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
