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

async function testNewAlert() {
  let pool;
  try {
    console.log('🔗 Connecting to database...');
    pool = await sql.connect(config);
    console.log('✅ Connected successfully\n');

    const testSwitchId = 1; // Q8.15
    
    console.log('📝 Adding NEW test alert with GETUTCDATE()...');
    console.log(`   Switch ID: ${testSwitchId}`);
    console.log(`   Type: CommStatus - Error`);
    console.log(`   Using: GETUTCDATE() in stored procedure\n`);

    await pool.request()
      .input('switch_id', sql.Int, testSwitchId)
      .input('alert_type', sql.VarChar(50), 'CommStatus - Error')
      .input('alert_message', sql.VarChar(255), `בדיקה: תקלת תקשורת - זמן UTC חדש`)
      .execute('AddProtectionAlert');

    console.log('✅ Alert added successfully!\n');

    // Check what was saved
    console.log('🔍 Checking the saved alert...');
    const result = await pool.request()
      .query(`
        SELECT TOP 1 
          id,
          alarmId,
          alarmType,
          alarmMessage,
          timestamp,
          GETUTCDATE() AS CurrentUTC,
          DATEDIFF(SECOND, timestamp, GETUTCDATE()) AS SecondsAgo
        FROM Alerts 
        WHERE alarmId = ${testSwitchId}
        ORDER BY timestamp DESC
      `);

    if (result.recordset.length > 0) {
      const alert = result.recordset[0];
      console.log('📊 Saved Alert Details:');
      console.log(`   ID: ${alert.id}`);
      console.log(`   Alarm ID: ${alert.alarmId}`);
      console.log(`   Type: ${alert.alarmType}`);
      console.log(`   Message: ${alert.alarmMessage}`);
      console.log(`   Timestamp (DB): ${alert.timestamp}`);
      console.log(`   Current UTC: ${alert.CurrentUTC}`);
      console.log(`   Seconds ago: ${alert.SecondsAgo}`);
      console.log('\n✅ Alert was saved with UTC time!\n');
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    if (pool) {
      await pool.close();
      console.log('🔌 Database connection closed');
    }
  }
}

testNewAlert();
