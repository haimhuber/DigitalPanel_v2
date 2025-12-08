const connectDb = require('./database/db');

async function simpleTest() {
  try {
    const pool = await connectDb.connectionToSqlDB();
    
    // Very simple query
    const result = await pool.request().query('SELECT 1 as test');
    console.log('Simple query works:', result.recordset);
    
    // Check if table exists
    const tableCheck = await pool.request().query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'Switches'
    `);
    console.log('Switches table exists:', tableCheck.recordset.length > 0);
    
  } catch (err) {
    console.error('Error:', err.message);
  }
}

simpleTest();