const { Pool } = require('pg');

// Setup connection pool using DATABASE_URL or individual PG environment variables
const poolConfig = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : {
      host: process.env.PGHOST || 'localhost',
      port: parseInt(process.env.PGPORT || '5432', 10),
      database: process.env.PGDATABASE || 'janky_db',
      user: process.env.PGUSER || process.env.USER || 'postgres',
      password: process.env.PGPASSWORD || undefined,
    };

// If SSL is required (e.g. for some managed GCP Cloud SQL or cloud instances)
if (process.env.PGSSL === 'true') {
  poolConfig.ssl = { rejectUnauthorized: false };
}

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('[PostgreSQL Pool Error]:', err.message);
});

/**
 * Initializes required tables in the PostgreSQL database.
 */
async function initDb() {
  const query = `
    CREATE TABLE IF NOT EXISTS testme_records (
      id SERIAL PRIMARY KEY,
      time_of_day TIME NOT NULL DEFAULT CURRENT_TIME,
      formatted_time VARCHAR(100) NOT NULL,
      recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
  try {
    const client = await pool.connect();
    try {
      await client.query(query);
      console.log('✅ PostgreSQL: "testme_records" table verified/created.');
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('❌ Failed to initialize database schema:', err.message);
    throw err;
  }
}

/**
 * Stores the current time of day in the PostgreSQL database.
 * Returns the inserted record.
 */
async function recordTimeOfDay() {
  const now = new Date();
  
  // Format the time of day string (e.g. "12:52:11 AM EDT")
  const formattedTime = now.toLocaleTimeString('en-US', {
    hour12: true,
    timeZoneName: 'short'
  });

  // Extract HH:MM:SS format for PostgreSQL TIME column
  const pad = (n) => String(n).padStart(2, '0');
  const timeOfDay = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  const query = `
    INSERT INTO testme_records (time_of_day, formatted_time, recorded_at)
    VALUES ($1::time, $2, NOW())
    RETURNING id, time_of_day, formatted_time, recorded_at;
  `;

  const result = await pool.query(query, [timeOfDay, formattedTime]);
  return result.rows[0];
}

/**
 * Fetches recent records ordered by most recent first.
 */
async function getRecentRecords(limit = 10) {
  const query = `
    SELECT id, time_of_day, formatted_time, recorded_at
    FROM testme_records
    ORDER BY id DESC
    LIMIT $1;
  `;
  const result = await pool.query(query, [limit]);
  return result.rows;
}

/**
 * Checks connection health.
 */
async function checkHealth() {
  const result = await pool.query('SELECT NOW() as current_time, current_database() as database;');
  return result.rows[0];
}

module.exports = {
  pool,
  initDb,
  recordTimeOfDay,
  getRecentRecords,
  checkHealth,
};
