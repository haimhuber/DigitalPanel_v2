const connectDb = require('./database/db');

async function testQuery() {
  try {
    const pool = await connectDb.connectionToSqlDB();
    
    // Check if table exists and has data
    const result = await pool.request().query(`
      SELECT TOP 5 switch_id, ActivePower, timestamp 
      FROM Switches 
      ORDER BY timestamp DESC
    `);
    
    console.log('Sample data from Switches table:');
    console.log(result.recordset);
    
    // Count total records
    const count = await pool.request().query('SELECT COUNT(*) as total FROM Switches');
    console.log('Total records:', count.recordset[0].total);
    
    // Test the stored procedure directly
    console.log('\nTesting getLiveData stored procedure...');
    const spResult = await pool.request()
      .input('liveData', 21)
      .execute('getLiveData');
    
    console.log('SP result:', spResult.recordset);
    
  } catch (err) {
    console.error('Error:', err);
  }
}

testQuery();