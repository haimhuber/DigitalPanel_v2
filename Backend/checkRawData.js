const connectDb = require('./database/db');

async function checkRawData() {
    try {
        const pool = await connectDb.connectionToSqlDB('DigitalPanel');
        
        const result = await pool.request()
            .query(`
                SELECT 
                    CAST(timestamp AS DATE) as date,
                    MIN(ActiveEnergy) as min_energy,
                    MAX(ActiveEnergy) as max_energy,
                    MAX(ActiveEnergy) - MIN(ActiveEnergy) as consumption,
                    COUNT(*) as records
                FROM Switches 
                WHERE switch_id = 1 
                  AND CAST(timestamp AS DATE) >= '2025-11-06'
                GROUP BY CAST(timestamp AS DATE)
                ORDER BY date
            `);
        
        console.log('Raw data by date:');
        result.recordset.forEach(row => {
            console.log(`${row.date.toISOString().split('T')[0]}: ${row.min_energy} -> ${row.max_energy} = ${row.consumption} kWh (${row.records} records)`);
        });
        
    } catch (err) {
        console.error('Error:', err);
    }
}

checkRawData();