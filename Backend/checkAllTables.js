const connectDb = require('./database/db');

async function checkAllTables() {
  try {
    const pool = await connectDb.connectionToSqlDB('DigitalPanel');
    
    const tables = await pool.request().query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE' 
      ORDER BY TABLE_NAME
    `);
    
    for (const table of tables.recordset) {
      console.log(`\n=== ${table.TABLE_NAME} ===`);
      
      const cols = await pool.request().query(`
        SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = '${table.TABLE_NAME}' 
        ORDER BY ORDINAL_POSITION
      `);
      
      cols.recordset.forEach(col => {
        const length = col.CHARACTER_MAXIMUM_LENGTH ? `(${col.CHARACTER_MAXIMUM_LENGTH})` : '';
        const nullable = col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL';
        console.log(`  ${col.COLUMN_NAME} ${col.DATA_TYPE}${length} ${nullable}`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkAllTables();
