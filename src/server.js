require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const { initDb, recordTimeOfDay, getRecentRecords, checkHealth } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Serve static frontend UI from /public
app.use(express.static(path.join(__dirname, '..', 'public')));

/**
 * GET /testme
 * Requirements:
 * 1. Returns "testing gcp"
 * 2. Stores the time of day in a PostgreSQL database
 */
app.get('/testme', async (req, res) => {
  try {
    const record = await recordTimeOfDay();
    console.log(`[GET /testme] Saved time of day: "${record.time_of_day}" (ID: ${record.id})`);

    // Attach metadata in headers for frontend inspection
    res.setHeader('X-Recorded-Id', String(record.id));
    res.setHeader('X-Recorded-Time', record.formatted_time);
    res.setHeader('X-Time-Of-Day', record.time_of_day);

    // Optional query parameter ?format=json for clients wanting structured metadata
    if (req.query.format === 'json') {
      return res.json({
        message: 'testing gcp',
        record: record,
      });
    }

    // Standard response: Returns "testing gcp"
    res.type('text/plain').send('testing gcp');
  } catch (err) {
    console.error('Error handling /testme:', err);
    res.status(500).send(`Internal Server Error: ${err.message}`);
  }
});

/**
 * GET /api/records
 * Returns recent records stored in the PostgreSQL database.
 */
app.get('/api/records', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 15;
    const records = await getRecentRecords(limit);
    res.json({ records });
  } catch (err) {
    console.error('Error fetching records:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/health
 * Health check endpoint for container environments (e.g., GCP Cloud Run).
 */
app.get('/api/health', async (req, res) => {
  try {
    const dbInfo = await checkHealth();
    res.json({
      status: 'ok',
      service: 'janky-express-gcp',
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        currentDatabase: dbInfo.database,
        dbTime: dbInfo.current_time,
      },
    });
  } catch (err) {
    res.status(503).json({
      status: 'degraded',
      error: err.message,
    });
  }
});

// Start server
async function startServer() {
  try {
    await initDb();
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
      console.log(`👉 Test endpoint: http://localhost:${PORT}/testme`);
      console.log(`👉 UI available at: http://localhost:${PORT}`);
    });
    return server;
  } catch (err) {
    console.error('Failed to start server due to database initialization error:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
