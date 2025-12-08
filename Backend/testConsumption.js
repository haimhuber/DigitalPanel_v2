const connectDb = require('./database/db');

async function testConsumption() {
    try {
        const pool = await connectDb.connectionToSqlDB('DigitalPanel');
        
        // Test simple MAX-MIN calculation
        const result = await pool.request()
            .query(`
                SELECT 
                    CAST(timestamp AS DATE) as date,
                    MIN(ActiveEnergy) as min_energy,
                    MAX(ActiveEnergy) as max_energy,
                    MAX(ActiveEnergy) - MIN(ActiveEnergy) as consumption
                FROM Switches 
                WHERE switch_id = 1 
                  AND CAST(timestamp AS DATE) = '2025-11-06'
                GROUP BY CAST(timestamp AS DATE)
            `);
        
        console.log('Direct calculation:', result.recordset);
        
        // Test stored procedure
        const spResult = await pool.request()
            .input('switch_id', 1)
            .input('start_date', '2025-11-06')
            .input('end_date', '2025-11-06')
            .execute('GetConsumptionWithBilling');
            
        console.log('Stored procedure result:', spResult.recordset);
        
    } catch (err) {
        console.error('Error:', err);
    }
}

testConsumption();