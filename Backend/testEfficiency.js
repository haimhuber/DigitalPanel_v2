const connectDb = require('./database/db');

async function testEfficiency() {
    try {
        const pool = await connectDb.connectionToSqlDB('DigitalPanel');
        
        // Test current values
        const current = await pool.request()
            .query('SELECT * FROM TariffRates');
        
        console.log('Current TariffRates:', current.recordset);
        
        // Test update
        const result = await pool.request()
            .input('efficiencyBase', 60)
            .input('efficiencyMultiplier', 3)
            .input('updatedBy', 'Test')
            .execute('UpdateEfficiencySettings');
            
        console.log('Update result:', result.recordset);
        
        // Check after update
        const after = await pool.request()
            .query('SELECT * FROM TariffRates');
        
        console.log('After update:', after.recordset);
        
    } catch (err) {
        console.error('Error:', err);
    }
}

testEfficiency();