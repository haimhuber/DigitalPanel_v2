const connectDb = require('./database/db');

async function checkTariffRates() {
  try {
    const pool = await connectDb.connectionToSqlDB('DigitalPanel');
    
    try {
      const result = await pool.request().query(`
        SELECT COLUMN_NAME, DATA_TYPE 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'TariffRates' 
        ORDER BY ORDINAL_POSITION
      `);
      
      console.log('TariffRates columns:');
      result.recordset.forEach(r => {
        console.log(`  ${r.COLUMN_NAME} (${r.DATA_TYPE})`);
      });
    } catch (e) {
      console.log('Table might not exist:', e.message);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkTariffRates();
