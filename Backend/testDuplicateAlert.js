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

async function testDuplicateAlert() {
  let pool;
  try {
    console.log('🔗 Connecting to database...');
    pool = await sql.connect(config);
    console.log('✅ Connected successfully\n');

    const testSwitchId = 1; // Q8.15
    
    console.log('🧪 Test: Adding the SAME alert multiple times...\n');
    
    // Try to add the same alert 3 times
    for (let i = 1; i <= 3; i++) {
      console.log(`📝 Attempt ${i}: Adding CommStatus Error for switch ${testSwitchId}...`);
      
      await pool.request()
        .input('switch_id', sql.Int, testSwitchId)
        .input('alert_type', sql.VarChar(50), 'CommStatus - Error')
        .input('alert_message', sql.VarChar(255), `בדיקה כפולה - ניסיון ${i}`)
        .execute('AddProtectionAlert');
      
      // Check how many active alerts exist
      const result = await pool.request()
        .query(`
          SELECT COUNT(*) AS count
          FROM Alerts 
          WHERE alarmId = ${testSwitchId}
            AND alarmType = 'CommStatus - Error'
            AND alertAck = 0
        `);
      
      console.log(`   ✅ Active alerts in DB: ${result.recordset[0].count}`);
      console.log('');
    }

    console.log('\n📊 Final check - All active CommStatus errors:');
    const finalCheck = await pool.request()
      .query(`
        SELECT 
          id,
          alarmId,
          alarmType,
          alarmMessage,
          timestamp,
          alertAck
        FROM Alerts 
        WHERE alarmId = ${testSwitchId}
          AND alarmType = 'CommStatus - Error'
          AND alertAck = 0
        ORDER BY timestamp DESC
      `);

    console.log(`Total active alerts: ${finalCheck.recordset.length}`);
    finalCheck.recordset.forEach((alert, index) => {
      console.log(`\n   Alert ${index + 1}:`);
      console.log(`   ID: ${alert.id}`);
      console.log(`   Message: ${alert.alarmMessage}`);
      console.log(`   Timestamp: ${alert.timestamp}`);
    });

    if (finalCheck.recordset.length === 1) {
      console.log('\n✅ SUCCESS! Only ONE alert was added (duplicates prevented)');
    } else {
      console.log(`\n❌ PROBLEM! ${finalCheck.recordset.length} alerts found (should be 1)`);
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    if (pool) {
      await pool.close();
      console.log('\n🔌 Database connection closed');
    }
  }
}

testDuplicateAlert();
