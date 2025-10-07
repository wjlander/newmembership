const { drizzle } = require('drizzle-orm/node-postgres');
const { Pool } = require('pg');
const * as schema = require('../../src/lib/db/schema');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Initialize drizzle
const db = drizzle(pool, { schema });

// Test connection
pool.on('connect', () => {
  console.log('✅ Database connected');
});

pool.on('error', (err) => {
  console.error('❌ Database connection error:', err);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await pool.end();
  console.log('Database pool closed');
});

process.on('SIGINT', async () => {
  await pool.end();
  console.log('Database pool closed');
});

module.exports = { db, pool };