const sql = require('mssql');
require('dotenv').config();

async function checkUserAuditTrail() {
  const config = {
    server: process.env.SERVER,
    user: process.env.USER,
    password: process.env.PASSWORD,
    database: process.env.DATABASE,
    options: {
      encrypt: false,
      trustServerCertificate: true
    }
  };

  try {
    await sql.connect(config);
    console.log('Connected to database');
    
    const result = await sql.query`
      SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'UserAuditTrail' 
      ORDER BY ORDINAL_POSITION
    `;
    
    console.log('\n=== UserAuditTrail Table Schema ===');
    console.log(JSON.stringify(result.recordset, null, 2));
    
    await sql.close();
  } catch (err) {
    console.error('Error:', err);
    await sql.close();
  }
}

checkUserAuditTrail();
