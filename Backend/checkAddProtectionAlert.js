const connectDb = require('./database/db');

async function checkAddProtectionAlert() {
  try {
    const pool = await connectDb.connectionToSqlDB('DigitalPanel');
    
    const result = await pool.request().query(`
      SELECT ROUTINE_DEFINITION
      FROM INFORMATION_SCHEMA.ROUTINES
      WHERE ROUTINE_NAME = 'AddProtectionAlert'
    `);
    
    if (result.recordset.length > 0) {
      console.log('\n📋 AddProtectionAlert SP Definition:\n');
      console.log(result.recordset[0].ROUTINE_DEFINITION);
    } else {
      console.log('SP not found');
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkAddProtectionAlert();
