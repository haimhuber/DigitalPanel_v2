const connectDb = require('./database/db');

async function checkAllSP() {
  try {
    const pool = await connectDb.connectionToSqlDB('DigitalPanel');
    
    console.log('\n📋 All Stored Procedures in Database:\n');
    
    const result = await pool.request().query(`
      SELECT 
        ROUTINE_NAME,
        CREATED,
        LAST_ALTERED
      FROM INFORMATION_SCHEMA.ROUTINES
      WHERE ROUTINE_TYPE = 'PROCEDURE'
      ORDER BY ROUTINE_NAME
    `);
    
    console.log(`Found ${result.recordset.length} stored procedures:\n`);
    
    result.recordset.forEach((sp, index) => {
      console.log(`${index + 1}. ${sp.ROUTINE_NAME}`);
      console.log(`   Created: ${sp.CREATED}`);
      console.log(`   Last Modified: ${sp.LAST_ALTERED}\n`);
    });
    
    // List of SPs we created in storeProcedures.js
    const expectedSPs = [
      'addBreakerData',
      'getActiveEnergy',
      'getAllSwitchesData',
      'getLiveData',
      'GetDailySample',
      'GetDailySampleActiveEnergy',
      'GetLast2DaysActivePower',
      'AddUser',
      'CheckUserExists',
      'AlertsData',
      'UpdateAlertAck',
      'AddAckAlert',
      'AddProtectionAlert',
      'ReadAllAckData',
      'GetLatestSwitches',
      'AddUserAudit',
      'ReadAllAuditTrail',
      'GetAllDailySamples',
      'GetAllDailySamplesActiveEnergy',
      'GetDailyConsumption',
      'GetMonthlyConsumption',
      'GetConsumptionSummary',
      'GetConsumptionWithBilling',
      'CheckDataExists',
      'getAllSwitchesNames',
      'ReportPowerData',
      'UpdateLiveData',
      'GetLiveDataOnly',
      'GetHourlySamples',
      'GetDailySamples',
      'GetWeeklySamples',
      'DeleteUser',
      'UpdateUserPassword',
      'GetTariffRates'
    ];
    
    const actualSPs = result.recordset.map(sp => sp.ROUTINE_NAME);
    
    console.log('\n🔍 Comparison:\n');
    
    // Check for missing SPs
    const missingSPs = expectedSPs.filter(sp => !actualSPs.includes(sp));
    if (missingSPs.length > 0) {
      console.log('❌ Missing SPs (defined in code but not in DB):');
      missingSPs.forEach(sp => console.log(`   - ${sp}`));
    } else {
      console.log('✅ All expected SPs exist in database');
    }
    
    // Check for extra SPs
    const extraSPs = actualSPs.filter(sp => !expectedSPs.includes(sp));
    if (extraSPs.length > 0) {
      console.log('\n⚠️  Extra SPs (in DB but not in storeProcedures.js):');
      extraSPs.forEach(sp => console.log(`   - ${sp}`));
    } else {
      console.log('\n✅ No extra SPs in database');
    }
    
    console.log(`\n📊 Total: ${actualSPs.length} in DB, ${expectedSPs.length} in code\n`);
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkAllSP();
