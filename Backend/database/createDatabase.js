const sqlConnection = require('./db');
const sql = require('mssql'); // Make sure you import this
const tableCreation = require('./tablesCreation');
const createSp = require('./storeProcedures');
async function createDatabase() {
  try {
    // 1️⃣ Connect to master database
    const masterPool = await sqlConnection.connectionToSqlDB('master');
    console.log('✅ Connected to SQL Server (master)');

    // 2️⃣ Create DigitalPanel if it doesn't exist
    const dbName = 'DigitalPanel';
    await masterPool.request().query(`
      IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = '${dbName}')
      BEGIN
        CREATE DATABASE [${dbName}];
      END
    `);
    console.log('🎉 Database "DigitalPanel" created (or already exists)');

    // 3️⃣ Close master connection
    await masterPool.close();

    // 4️⃣ Connect to the new database
    const pool = await sqlConnection.connectionToSqlDB();
    console.log('✅ Connected to DigitalPanel database');
    const createTables = await tableCreation.createTables();
    const createSp1 = await createSp.createSp();

  } catch (err) {
    console.error('❌ Error creating database or tables:', err);
  }
}

module.exports = { createDatabase };
