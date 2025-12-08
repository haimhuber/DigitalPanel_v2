const sql = require('mssql');
require('dotenv').config();

const config = {
  user: process.env.USER,
  password: process.env.PASSWORD,
  server: process.env.SERVER,
  database: process.env.DATABASE,
  options: {
    encrypt: true,
    trustServerCertificate: true,
    enableArithAbort: true
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

async function clearAlerts() {
  let pool;
  try {
    console.log('🔗 Connecting to database...');
    pool = await sql.connect(config);
    console.log('✅ Connected successfully\n');

    // Count alerts before deletion
    const countBefore = await pool.request()
      .query('SELECT COUNT(*) AS total FROM Alerts');
    console.log(`📊 Current alerts in database: ${countBefore.recordset[0].total}\n`);

    if (countBefore.recordset[0].total === 0) {
      console.log('✅ No alerts to delete!\n');
      return;
    }

    // Delete all alerts
    console.log('🗑️  Deleting all alerts...');
    await pool.request().query('DELETE FROM Alerts');
    console.log('✅ All alerts deleted!\n');

    // Also clear AckAlert table
    const countAck = await pool.request()
      .query('SELECT COUNT(*) AS total FROM AckAlert');
    console.log(`📊 Current ack records in database: ${countAck.recordset[0].total}`);

    if (countAck.recordset[0].total > 0) {
      console.log('🗑️  Deleting all ack records...');
      await pool.request().query('DELETE FROM AckAlert');
      console.log('✅ All ack records deleted!\n');
    }

    // Verify deletion
    const countAfter = await pool.request()
      .query('SELECT COUNT(*) AS total FROM Alerts');
    console.log(`📊 Alerts remaining: ${countAfter.recordset[0].total}`);

    console.log('\n✅ Database cleaned successfully!\n');

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    if (pool) {
      await pool.close();
      console.log('🔌 Database connection closed');
    }
  }
}

clearAlerts();
