const connectDb = require('./database/db');

async function checkSP() {
    try {
        const pool = await connectDb.connectionToSqlDB('DigitalPanel');
        
        // Check if SP exists
        const spCheck = await pool.request()
            .query(`
                SELECT name 
                FROM sys.objects 
                WHERE type = 'P' AND name = 'UpdateEfficiencySettings'
            `);
        
        console.log('SP exists:', spCheck.recordset);
        
        if (spCheck.recordset.length === 0) {
            console.log('Creating SP...');
            await pool.request().query(`
                CREATE PROCEDURE UpdateEfficiencySettings
                    @efficiencyBase DECIMAL(10,2),
                    @efficiencyMultiplier DECIMAL(10,2),
                    @updatedBy VARCHAR(50)
                AS
                BEGIN
                    UPDATE TariffRates 
                    SET efficiencyBase = @efficiencyBase,
                        efficiencyMultiplier = @efficiencyMultiplier,
                        createdBy = @updatedBy,
                        timestamp = CURRENT_TIMESTAMP
                    WHERE isActive = 1;
                    
                    IF @@ROWCOUNT > 0
                        SELECT 1 AS success, 'Efficiency settings updated successfully' AS message;
                    ELSE
                        SELECT 0 AS success, 'No active tariffs found' AS message;
                END
            `);
            console.log('SP created successfully');
        }
        
    } catch (err) {
        console.error('Error:', err);
    }
}

checkSP();