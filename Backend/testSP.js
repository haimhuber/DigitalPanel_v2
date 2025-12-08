const connectDb = require('./database/db');

async function testStoredProcedures() {
  try {
    const pool = await connectDb.connectionToSqlDB('DigitalPanel');
    
    console.log('\n📋 Testing Stored Procedures...\n');
    
    // Test 1: Check UpdateAlertAck
    console.log('1️⃣ Testing UpdateAlertAck SP...');
    try {
      const sp1 = await pool.request().query(`
        SELECT 
          ROUTINE_NAME,
          ROUTINE_DEFINITION
        FROM INFORMATION_SCHEMA.ROUTINES
        WHERE ROUTINE_NAME = 'UpdateAlertAck'
      `);
      if (sp1.recordset.length > 0) {
        console.log('   ✅ UpdateAlertAck exists');
        // Check if it references alert_type (should NOT)
        if (sp1.recordset[0].ROUTINE_DEFINITION.includes('alert_type')) {
          console.log('   ❌ Still references alert_type (SHOULD BE FIXED!)');
        } else {
          console.log('   ✅ Does not reference alert_type anymore');
        }
      }
    } catch (e) {
      console.log('   ❌ Error:', e.message);
    }
    
    // Test 2: Check AddAckAlert
    console.log('\n2️⃣ Testing AddAckAlert SP...');
    try {
      const sp2 = await pool.request().query(`
        SELECT 
          ROUTINE_NAME,
          ROUTINE_DEFINITION
        FROM INFORMATION_SCHEMA.ROUTINES
        WHERE ROUTINE_NAME = 'AddAckAlert'
      `);
      if (sp2.recordset.length > 0) {
        console.log('   ✅ AddAckAlert exists');
        // Check if it uses user_id (should)
        if (sp2.recordset[0].ROUTINE_DEFINITION.includes('user_id')) {
          console.log('   ✅ Uses user_id column correctly');
        } else {
          console.log('   ❌ Does not use user_id');
        }
      }
    } catch (e) {
      console.log('   ❌ Error:', e.message);
    }
    
    // Test 3: Check AddUser
    console.log('\n3️⃣ Testing AddUser SP...');
    try {
      const sp3 = await pool.request().query(`
        SELECT 
          ROUTINE_NAME,
          ROUTINE_DEFINITION
        FROM INFORMATION_SCHEMA.ROUTINES
        WHERE ROUTINE_NAME = 'AddUser'
      `);
      if (sp3.recordset.length > 0) {
        console.log('   ✅ AddUser exists');
        // Check if it uses lowercase username
        if (sp3.recordset[0].ROUTINE_DEFINITION.includes('username')) {
          console.log('   ✅ Uses lowercase "username" column correctly');
        } else {
          console.log('   ❌ Does not use lowercase "username"');
        }
      }
    } catch (e) {
      console.log('   ❌ Error:', e.message);
    }
    
    // Test 4: Check CheckUserExists
    console.log('\n4️⃣ Testing CheckUserExists SP...');
    try {
      const sp4 = await pool.request().query(`
        SELECT 
          ROUTINE_NAME,
          ROUTINE_DEFINITION
        FROM INFORMATION_SCHEMA.ROUTINES
        WHERE ROUTINE_NAME = 'CheckUserExists'
      `);
      if (sp4.recordset.length > 0) {
        console.log('   ✅ CheckUserExists exists');
        if (sp4.recordset[0].ROUTINE_DEFINITION.includes('username')) {
          console.log('   ✅ Uses lowercase "username" column correctly');
        } else {
          console.log('   ❌ Does not use lowercase "username"');
        }
      }
    } catch (e) {
      console.log('   ❌ Error:', e.message);
    }
    
    // Test 5: Check AddUserAudit
    console.log('\n5️⃣ Testing AddUserAudit SP...');
    try {
      const sp5 = await pool.request().query(`
        SELECT 
          ROUTINE_NAME,
          ROUTINE_DEFINITION
        FROM INFORMATION_SCHEMA.ROUTINES
        WHERE ROUTINE_NAME = 'AddUserAudit'
      `);
      if (sp5.recordset.length > 0) {
        console.log('   ✅ AddUserAudit exists');
        if (sp5.recordset[0].ROUTINE_DEFINITION.includes('user_id') && 
            sp5.recordset[0].ROUTINE_DEFINITION.includes('action')) {
          console.log('   ✅ Uses user_id and action columns correctly');
        } else {
          console.log('   ❌ Does not use correct columns');
        }
      }
    } catch (e) {
      console.log('   ❌ Error:', e.message);
    }
    
    console.log('\n✅ All tests completed!\n');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testStoredProcedures();
