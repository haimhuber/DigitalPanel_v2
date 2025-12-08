const createSp = require('./database/storeProcedures');

async function updateSP() {
    try {
        console.log('🔄 Updating stored procedures...');
        await createSp.createSp();
        console.log('✅ Stored procedures updated successfully!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error updating stored procedures:', err);
        process.exit(1);
    }
}

updateSP();
