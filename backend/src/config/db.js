const { Pool } = require('pg');
require('dotenv').config();

console.log('--- DATABASE CONFIG AUDIT ---');
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('NODE_ENV:', process.env.NODE_ENV);

if (!process.env.DATABASE_URL) {
  // Try to construct DATABASE_URL from individual variables if they exist
  if (process.env.DB_USER && process.env.DB_PASSWORD && process.env.DB_HOST && process.env.DB_NAME) {
    const port = process.env.DB_PORT || 5432;
    process.env.DATABASE_URL = `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${port}/${process.env.DB_NAME}`;
    console.log('[DB-INFO] Constructed DATABASE_URL from individual DB_ variables.');
  } else {
    console.error('[DB-ERROR] DATABASE_URL is missing in .env!');
    throw new Error("DATABASE_URL missing. Stabilization requires a valid database connection string.");
  }
}

try {
  const url = new URL(process.env.DATABASE_URL);
  console.log('[DB] Using connectionString from DATABASE_URL');
  console.log('[DB] Target Host:', url.hostname);
} catch (e) {
  console.error('[DB-ERROR] Failed to parse DATABASE_URL. It might be malformed.');
}

const isProd = process.env.NODE_ENV === 'production' || process.env.DATABASE_URL?.includes('supabase.co');

const poolConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: isProd ? { rejectUnauthorized: false } : false,
};

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
