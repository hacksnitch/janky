const assert = require('assert');
const http = require('http');
const { app, startServer } = require('../src/server');
const { pool } = require('../src/db');

function fetchEndpoint(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
        });
      });
    }).on('error', reject);
  });
}

async function runTests() {
  console.log('🧪 Starting test suite...');
  const server = await startServer();
  const address = server.address();
  const baseUrl = `http://localhost:${address.port}`;

  try {
    // Test 1: Health check
    console.log('1️⃣ Testing GET /api/health...');
    const healthRes = await fetchEndpoint(`${baseUrl}/api/health`);
    assert.strictEqual(healthRes.statusCode, 200, 'Health check should return 200');
    const healthBody = JSON.parse(healthRes.body);
    assert.strictEqual(healthBody.status, 'ok');
    console.log('   ✅ Health check passed.');

    // Test 2: GET /testme
    console.log('2️⃣ Testing GET /testme returns "testing gcp"...');
    const testmeRes = await fetchEndpoint(`${baseUrl}/testme`);
    assert.strictEqual(testmeRes.statusCode, 200, 'Status code should be 200');
    assert.strictEqual(testmeRes.body, 'testing gcp', 'Body should be exactly "testing gcp"');
    assert(testmeRes.headers['x-recorded-id'], 'Header X-Recorded-Id must be present');
    assert(testmeRes.headers['x-time-of-day'], 'Header X-Time-Of-Day must be present');
    console.log(`   ✅ GET /testme returned "${testmeRes.body}" with recorded time ${testmeRes.headers['x-time-of-day']}`);

    // Test 3: Check PostgreSQL database directly
    console.log('3️⃣ Verifying PostgreSQL record was stored...');
    const recordedId = parseInt(testmeRes.headers['x-recorded-id'], 10);
    const dbRes = await pool.query('SELECT * FROM testme_records WHERE id = $1', [recordedId]);
    assert.strictEqual(dbRes.rows.length, 1, 'Record must exist in testme_records table');
    const row = dbRes.rows[0];
    assert(row.time_of_day, 'time_of_day column should not be empty');
    console.log(`   ✅ PostgreSQL row found: ID=${row.id}, time_of_day=${row.time_of_day}, formatted_time="${row.formatted_time}"`);

    // Test 4: GET /api/records
    console.log('4️⃣ Testing GET /api/records...');
    const recordsRes = await fetchEndpoint(`${baseUrl}/api/records?limit=5`);
    assert.strictEqual(recordsRes.statusCode, 200);
    const recordsJson = JSON.parse(recordsRes.body);
    assert(Array.isArray(recordsJson.records), 'Records should be an array');
    assert(recordsJson.records.some(r => r.id === recordedId), 'Newly inserted record should be in records list');
    console.log('   ✅ GET /api/records contains newly created record.');

    console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY!');
  } finally {
    server.close();
    await pool.end();
  }
}

runTests().catch((err) => {
  console.error('\n❌ Test failed with error:', err);
  process.exit(1);
});
