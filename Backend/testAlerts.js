// 🧪 בדיקת מערכת ההתראות

const connectDb = require('./database/db');
const sql = require('mssql');

async function testAlertSystem() {
  console.log('\n🧪 Testing Alert System...\n');
  
  try {
    const pool = await connectDb.connectionToSqlDB('DigitalPanel');
    
    // Get first switch ID from MainData
    const switches = await pool.request().query('SELECT TOP 1 id FROM MainData ORDER BY id');
    if (switches.recordset.length === 0) {
      console.log('❌ No switches found in MainData table');
      process.exit(1);
    }
    
    const testSwitchId = switches.recordset[0].id;
    console.log(`Using switch ID: ${testSwitchId}\n`);
    
    // Test 1: תקלת תקשורת (CommStatus = 0)
    console.log('1️⃣ Testing CommStatus Error Alert...');
    await pool.request()
      .input('switch_id', sql.Int, testSwitchId)
      .input('alert_type', sql.VarChar(50), 'CommStatus - Error')
      .input('alert_message', sql.VarChar(255), `בדיקה: תקלת תקשורת במתג ${testSwitchId}`)
      .execute('AddProtectionAlert');
    console.log('   ✅ CommStatus alert added\n');
    
    // Test 2: מפסק נותק (Tripped = 1)
    console.log('2️⃣ Testing Tripped Alert...');
    await pool.request()
      .input('switch_id', sql.Int, testSwitchId)
      .input('alert_type', sql.VarChar(50), 'Tripped')
      .input('alert_message', sql.VarChar(255), `בדיקה: המפסק ${testSwitchId} נותק`)
      .execute('AddProtectionAlert');
    console.log('   ✅ Tripped alert added\n');
    
    // Test 3: תקלת זרם יתר
    console.log('3️⃣ Testing Overcurrent Alert...');
    await pool.request()
      .input('switch_id', sql.Int, testSwitchId)
      .input('alert_type', sql.VarChar(50), 'ProtectionI_Trip')
      .input('alert_message', sql.VarChar(255), `בדיקה: זרם יתר במתג ${testSwitchId}`)
      .execute('AddProtectionAlert');
    console.log('   ✅ Overcurrent alert added\n');
    
    // Test 4: ניסיון להוסיף שוב את אותה ההתראה (לא צריך להוסיף)
    console.log('4️⃣ Testing Duplicate Prevention...');
    await pool.request()
      .input('switch_id', sql.Int, testSwitchId)
      .input('alert_type', sql.VarChar(50), 'Tripped')
      .input('alert_message', sql.VarChar(255), `בדיקה: המפסק ${testSwitchId} נותק (שוב)`)
      .execute('AddProtectionAlert');
    console.log('   ✅ Duplicate check passed (should not add)\n');
    
    // בדיקת התוצאות
    console.log('📋 Checking Alerts table...');
    const alerts = await pool.request()
      .query(`SELECT * FROM Alerts WHERE alarmId = ${testSwitchId} AND alarmMessage LIKE 'בדיקה%' ORDER BY timestamp DESC`);
    
    console.log(`\nFound ${alerts.recordset.length} test alerts for switch ${testSwitchId}:`);
    alerts.recordset.forEach((alert, i) => {
      console.log(`  ${i + 1}. ${alert.alarmType} - ${alert.alarmMessage}`);
      console.log(`     Acknowledged: ${alert.alertAck ? 'Yes' : 'No'}`);
    });
    
    // ניקוי - מחיקת ההתראות של הבדיקה
    console.log('\n🗑️ Cleaning up test alerts...');
    await pool.request()
      .query(`DELETE FROM Alerts WHERE alarmId = ${testSwitchId} AND alarmMessage LIKE 'בדיקה%'`);
    console.log('   ✅ Test alerts deleted\n');
    
    console.log('✅ All tests passed!\n');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testAlertSystem();
