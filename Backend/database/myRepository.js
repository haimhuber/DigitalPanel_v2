const connectDb = require('./db');
const sql = require('mssql');
const { notifyNewAlert, getActiveAlertsCount } = require('../websocketServer');
const path = require('path');
const fs = require('fs');
const { log } = require('console');
const configPath = path.join(__dirname, '../config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

async function writeBreakerData(data, tableIndex) {
  const bits = [];
  for (let i = 14; i >= 0; i--) { // Only 14 bits
    bits.push((data[12] >> i) & 1); // MSB bits[0] | LSB bits[14]
  }
  console.log(bits);

  try {
    const pool = await connectDb.connectionToSqlDB();
    
    // ✅ בדיקה והוספת Alerts לפני שמירת הנתונים
    await checkAndAddAlerts(pool, tableIndex, bits);
    
    const result = await pool.request()
      .input('switch_id', tableIndex)
      .input('V12', data[0] / 10.0)
      .input('V23', data[1] / 10.0)
      .input('V31', data[2] / 10.0)
      .input('I1', data[3] / 10.0)
      .input('I2', data[4] / 10.0)
      .input('I3', data[5] / 10.0)
      .input('Frequency', data[6] / 10.0)
      .input('PowerFactor', data[7] / 1000.0)
      .input('ActivePower', data[8] / 10.0)
      .input('ReactivePower', data[9] / 10.0)
      .input('ApparentPower', data[10] / 10.0)
      .input('NominalCurrent', data[11] / 10.0)
      .input('ActiveEnergy', ((data[13] * 65536) + data[14]) / 10.0)
      .input('CommStatus', bits[0])
      .input('ProtectionTrip', bits[1])
      .input('ProtectionInstTrip', bits[2])
      .input('ProtectionI_Enabled', bits[3])
      .input('ProtectionS_Enabled', bits[4])
      .input('ProtectionL_Enabled', bits[5])
      .input('ProtectionG_Trip', bits[6])
      .input('ProtectionI_Trip', bits[7])
      .input('ProtectionS_Trip', bits[8])
      .input('ProtectionL_Trip', bits[9])
      .input('TripDisconnected', bits[10])
      .input('Tripped', bits[11])
      .input('Undefined', bits[12])
      .input('BreakerClose', bits[13])
      .input('BreakerOpen', bits[14])
      .execute('addBreakerData');

    if (result.rowsAffected[0] === 0) {
      return { message: 'Values cannot be sent', status: 404 };
    }
    return { message: 'Values sent successfully', status: 200 };
  } catch (err) {
    console.error('DB insert error:', err); // log full error
    return { message: err.message || 'Unknown error', status: 500 };
  }
}

// --------------------------------------------------------------------------------------//
// 🔔 פונקציה לבדיקה והוספת Alerts על בסיס הביטים
async function checkAndAddAlerts(pool, switchId, bits) {
  try {
    let alertAdded = false;
    
    // bits[0] = CommStatus -> 0 = תקלת תקשורת
    if (bits[0] === 0) {
      // Get breaker name from MainData table
      const breakerResult = await pool.request()
        .input('id', sql.Int, switchId)
        .query('SELECT name FROM MainData WHERE id = @id');
      const breakerName = breakerResult.recordset[0]?.name || `Q${switchId}`;
      await pool.request()
        .input('switch_id', sql.Int, switchId)
        .input('alert_type', sql.VarChar(50), 'CommStatus - Error')
        .input('alert_message', sql.VarChar(255), `Communication error detected on breaker ${breakerName}`)
        .execute('AddProtectionAlert');
      console.log(`🚨 Alert added: CommStatus Error on breaker ${breakerName}`);
      alertAdded = true;
    }

    // bits[11] = Tripped -> 1 = המפסק נותק
    if (bits[11] === 1) {
      await pool.request()
        .input('switch_id', sql.Int, switchId)
        .input('alert_type', sql.VarChar(50), 'Tripped')
        .input('alert_message', sql.VarChar(255), `המפסק ${switchId} נותק בגלל תקלה`)
        .execute('AddProtectionAlert');
      console.log(`🚨 Alert added: Tripped on switch ${switchId}`);
      alertAdded = true;
    }

    // bits[1] = ProtectionTrip -> 1 = תקלת הגנה כללית
    if (bits[1] === 1) {
      await pool.request()
        .input('switch_id', sql.Int, switchId)
        .input('alert_type', sql.VarChar(50), 'ProtectionTrip')
        .input('alert_message', sql.VarChar(255), `תקלת הגנה במתג ${switchId}`)
        .execute('AddProtectionAlert');
      console.log(`🚨 Alert added: ProtectionTrip on switch ${switchId}`);
      alertAdded = true;
    }

    // bits[7] = ProtectionI_Trip -> 1 = תקלת זרם יתר
    if (bits[7] === 1) {
      await pool.request()
        .input('switch_id', sql.Int, switchId)
        .input('alert_type', sql.VarChar(50), 'ProtectionI_Trip')
        .input('alert_message', sql.VarChar(255), `תקלת זרם יתר במתג ${switchId}`)
        .execute('AddProtectionAlert');
      console.log(`🚨 Alert added: ProtectionI_Trip on switch ${switchId}`);
      alertAdded = true;
    }

    // bits[8] = ProtectionS_Trip -> 1 = תקלת קצר
    if (bits[8] === 1) {
      await pool.request()
        .input('switch_id', sql.Int, switchId)
        .input('alert_type', sql.VarChar(50), 'ProtectionS_Trip')
        .input('alert_message', sql.VarChar(255), `תקלת קצר במתג ${switchId}`)
        .execute('AddProtectionAlert');
      console.log(`🚨 Alert added: ProtectionS_Trip on switch ${switchId}`);
      alertAdded = true;
    }

    // bits[9] = ProtectionL_Trip -> 1 = תקלת עומס יתר
    if (bits[9] === 1) {
      await pool.request()
        .input('switch_id', sql.Int, switchId)
        .input('alert_type', sql.VarChar(50), 'ProtectionL_Trip')
        .input('alert_message', sql.VarChar(255), `תקלת עומס יתר במתג ${switchId}`)
        .execute('AddProtectionAlert');
      console.log(`🚨 Alert added: ProtectionL_Trip on switch ${switchId}`);
      alertAdded = true;
    }

    // bits[6] = ProtectionG_Trip -> 1 = תקלת הגנת קרקע
    if (bits[6] === 1) {
      await pool.request()
        .input('switch_id', sql.Int, switchId)
        .input('alert_type', sql.VarChar(50), 'ProtectionG_Trip')
        .input('alert_message', sql.VarChar(255), `תקלת הגנת קרקע במתג ${switchId}`)
        .execute('AddProtectionAlert');
      console.log(`🚨 Alert added: ProtectionG_Trip on switch ${switchId}`);
      alertAdded = true;
    }

    // If any alert was added, notify WebSocket clients
    if (alertAdded) {
      const alertsCount = await getActiveAlertsCount(pool);
      notifyNewAlert(alertsCount);
    }

  } catch (err) {
    console.error('Error adding alerts:', err.message);
  }
}

// --------------------------------------------------------------------------------------//
async function getActivePower(switch_id) {
  try {
    if (!switch_id) {
      throw new Error('Missing required parameters: switch_id');
    }

    const pool = await connectDb.connectionToSqlDB();
    const result = await pool.request()
      .input('switch_id', sql.Int, switch_id)
      .execute('GetLast2DaysActivePower');

    if (!result.recordset || result.recordset.length === 0) {
      console.log('No data found for switch_id:', switch_id);
      return { status: 200, data: [] };
    }

    console.log(`✅ Found ${result.recordset.length} records for switch_id ${switch_id}`);
    return { status: 200, data: result.recordset };

  } catch (err) {
    console.error('Error fetching active power:', err);
    return { status: 500, message: err.message };
  }
}
// --------------------------------------------------------------------------------------//
async function getActiveEnergy(switch_id) {
  try {
    if (!switch_id) {
      throw new Error('Missing required parameters: switch_id, startTime, endTime');
    }

    const pool = await connectDb.connectionToSqlDB();
    const result = await pool.request()
      .input('switch_id', sql.Int, switch_id)
      .execute('GetDailySampleActiveEnergy');           // call the SP that returns formatted time

    if (!result.recordset || result.recordset.length === 0) {
      console.log('No data found for the given parameters');
      return { status: 200, data: [] };
    }

    console.log({ status: 200, data: result.recordset });
    return { status: 200, data: result.recordset };

  } catch (err) {
    console.error('Error fetching active energy:', err);
    return { status: 500, message: err.message };
  }
}

// --------------------------------------------------------------------------------------//


async function getBreakersNames() {
  try {
    const pool = await connectDb.connectionToSqlDB();
    const result = await pool.request()
      .execute('getAllSwitchesNames');
    if (!result.recordset || result.recordset.length === 0) {
      console.log('No data found');
      return { status: 200, data: [] };
    }

    console.log({ status: 200, data: result.recordset });
    return { status: 200, data: result.recordset };

  } catch (err) {
    console.error('Error fetching Switches data:', err);
    return { status: 500, message: err.message };
  }
}


async function getBreakersMainData() {
  try {
    const pool = await connectDb.connectionToSqlDB();
    const result = await pool.request()
      .input('liveData', sql.Int, config.breakers.length)
      .execute('getLiveData');

    if (!result.recordset || result.recordset.length === 0) {
      console.log('No data found');
      return { status: 200, data: [] };
    }

    console.log({ status: 200, data: result.recordset });
    return { status: 200, data: result.recordset };

  } catch (err) {
    console.error('Error fetching Switches data:', err);
    return { status: 500, message: err.message };
  }
}

async function addUser(userData) {
  try {
    const pool = await connectDb.connectionToSqlDB();
    console.log({ userData: userData });

    const result = await pool.request()
      .input('userName', sql.VarChar, userData.username)
      .input('password', sql.VarChar, userData.password)
      .input('userEmail', sql.VarChar, userData.email)
      .execute('AddUser');
    if (!result.recordset || result.recordset.length === 0) {
      console.log('No data found');
      return { status: 200, data: [] };
    }
    console.log(result.recordset[0]);

    if (!result.recordset[0].success) return { status: 404, msg: "username already exist! User not created" };

    return { status: 200, msg: "User created!", data: true };

  } catch (err) {
    console.error('Error fetching Switches data:', err);
    return { status: 500, message: err.message };
  }
}

async function userExist(userName) {
  try {
    const pool = await connectDb.connectionToSqlDB();
    const result = await pool.request()
      .input('userName', sql.VarChar, userName)
      .execute('CheckUserExists');
    if (!result.recordset || result.recordset.length === 0) {
      console.log('User not found');
      return { status: 404, data: false, userData: null };
    }

    console.log({ status: 200, data: result.recordset[0] });
    return { status: 200, data: true, userData: result.recordset[0] };

  } catch (err) {
    console.error('Error fetching user data:', err);
    return { status: 500, message: err.message };
  }
}


async function getAlertData() {
  try {
    const pool = await connectDb.connectionToSqlDB();
    const result = await pool.request()
      .execute('AlertsData');
    if (!result.recordset || result.recordset.length === 0) {
      console.log('No data found');
      return { status: 400, data: false, userData: result.recordset[0] };
    }

    console.log({ status: 200, data: result.recordset });
    return { status: 200, data: result.recordset };

  } catch (err) {
    console.error('Error fetching Switches data:', err);
    return { status: 500, message: err.message };
  }
}


async function akcAlert(alertType, alertMsg, alertId, ackUpdate) {
  try {
    const pool = await connectDb.connectionToSqlDB();

    const result = await pool.request()
      .input('AckType', sql.VarChar, alertType)
      .input('AckMessage', sql.VarChar, alertMsg)
      .input('AlertId', sql.Int, alertId)
      .input('AckValue', sql.Int, ackUpdate)
      .execute('UpdateAlertAck');

    // Check if update happened
    if (result.rowsAffected[0] === 0) {
      console.log("❌ Alert not found");
      return { status: 404, data: false };
    }

    console.log("✅ Alert updated", result.rowsAffected);

    return {
      status: 200,
      data: true,
      rowsAffected: result.rowsAffected[0],
    };

  } catch (err) {
    console.error('Error Ack Alarm:', err);
    return { status: 500, message: err.message };
  }
}

async function akcAlertBy(ackId, ackBy) {
  try {
    const pool = await connectDb.connectionToSqlDB();

    const result = await pool.request()
      .input('ackId', sql.Int, ackId)
      .input('ackBy', sql.VarChar, ackBy)
      .execute('AddAckAlert');

    // Check if update happened
    if (result.rowsAffected[0] === 0) {
      console.log("❌ Alert not found");
      return { status: 404, data: false };
    }

    console.log("✅ Alert Ack updated", result.rowsAffected);

    return {
      status: 200,
      data: true,
      rowsAffected: result.rowsAffected[0],
    };

  } catch (err) {
    console.error('Error Ack Alarm:', err);
    return { status: 500, message: err.message };
  }
}

async function readAllAckData() {
  try {
    const pool = await connectDb.connectionToSqlDB();

    const result = await pool.request()
      .execute('ReadAllAckData');

    if (result.rowsAffected[0] === 0) {
      console.log("❌ Alert not found");
      return { status: 404, data: false };
    }
    return {
      status: 200,
      data: result.recordset,
    };

  } catch (err) {
    console.error('Error Featch Ack Data:', err);
    return { status: 500, message: err.message };
  }
}


async function reportPowerData(breakerName, startTime, endTime) {
  try {
    const pool = await connectDb.connectionToSqlDB();

    const result = await pool.request()
      .input('switch_id', sql.VarChar, breakerName)
      .input('startTime', sql.DateTime, startTime)
      .input('endTime', sql.DateTime, endTime)
      .execute('ReportPowerData');

    if (result.rowsAffected[0] === 0) {
      console.log("❌ Alert not found");
      return { status: 404, data: false };
    }
    return {
      status: 200,
      data: result.recordset,
    };

  } catch (err) {
    console.error('Error Featch Ack Data:', err);
    return { status: 500, message: err.message };
  }
}

async function breakerSwtichStatus() {
  try {
    const pool = await connectDb.connectionToSqlDB();

    const result = await pool.request()
      .execute('GetLatestSwitches');

    if (result.rowsAffected[0] === 0) {
      console.log("❌ Alert not found");
      return { status: 404, data: false };
    }
    return {
      status: 200,
      data: result.recordset,
    };

  } catch (err) {
    console.error('Error Featch Ack Data:', err);
    return { status: 500, message: err.message };
  }
}

async function AuditTrail(userName, type) {
  try {
    const pool = await connectDb.connectionToSqlDB();

    const result = await pool.request()
      .input('username', sql.VarChar, userName)
      .input('type', sql.VarChar, type)
      .query(`INSERT INTO UserAuditTrail (username, action) VALUES (@username, @type); SELECT 1 AS success;`);

    if (!result.recordset || result.recordset.length === 0) {
      return { status: 404, data: false };
    }
    return {
      status: 200,
      data: true,
    };

  } catch (err) {
    console.error('Error inserting Audit trail:', err);
    return { status: 500, message: err.message };
  }
}

async function auditTrailData() {
  try {
    const pool = await connectDb.connectionToSqlDB();

    const result = await pool.request()
      .execute('ReadAllAuditTrail');

    if (result.rowsAffected[0] === 0) {
      console.log("❌ Table not found");
      return { status: 404, data: false };
    }
    return {
      status: 200,
      data: result.recordset,
    };

  } catch (err) {
    console.error('Error Featch Ack Data:', err);
    return { status: 500, message: err.message };
  }
}


async function getBatchActivePower() {
  try {
    const pool = await connectDb.connectionToSqlDB();
    const result = await pool.request()
      .execute('GetAllDailySamples');

    if (!result.recordset || result.recordset.length === 0) {
      return { status: 200, data: {} };
    }

    // Group by switch_id
    const grouped = result.recordset.reduce((acc, row) => {
      if (!acc[row.switch_id]) acc[row.switch_id] = [];
      acc[row.switch_id].push(row);
      return acc;
    }, {});

    return { status: 200, data: grouped };
  } catch (err) {
    console.error('Error fetching batch active power:', err);
    return { status: 500, message: err.message };
  }
}

async function getBatchActiveEnergy() {
  try {
    const pool = await connectDb.connectionToSqlDB();
    const result = await pool.request()
      .execute('GetAllDailySamplesActiveEnergy');

    if (!result.recordset || result.recordset.length === 0) {
      return { status: 200, data: {} };
    }

    // Group by switch_id
    const grouped = result.recordset.reduce((acc, row) => {
      if (!acc[row.switch_id]) acc[row.switch_id] = [];
      acc[row.switch_id].push(row);
      return acc;
    }, {});

    return { status: 200, data: grouped };
  } catch (err) {
    console.error('Error fetching batch active energy:', err);
    return { status: 500, message: err.message };
  }
}

async function getConsumptionBilling(switch_id, start_date, end_date) {
  try {
    const pool = await connectDb.connectionToSqlDB();
    const result = await pool.request()
      .input('switch_id', sql.Int, switch_id)
      .input('start_date', sql.Date, start_date)
      .input('end_date', sql.Date, end_date)
      .execute('GetConsumptionWithBilling');

    if (!result.recordset || result.recordset.length === 0) {
      return { status: 200, data: [] };
    }

    return { status: 200, data: result.recordset };
  } catch (err) {
    console.error('Error fetching consumption billing:', err);
    return { status: 500, message: err.message };
  }
}

async function checkDataExists(switch_id, start_date, end_date) {
  try {
    const pool = await connectDb.connectionToSqlDB();
    const result = await pool.request()
      .input('switch_id', sql.Int, switch_id)
      .input('start_date', sql.Date, start_date)
      .input('end_date', sql.Date, end_date)
      .execute('CheckDataExists');

    return { status: 200, data: result.recordset[0] };
  } catch (err) {
    console.error('Error checking data exists:', err);
    return { status: 500, message: err.message };
  }
}

async function updateLiveData(data, tableIndex) {
  const bits = [];
  for (let i = 14; i >= 0; i--) {
    bits.push((data[12] >> i) & 1);
  }

  try {
    const pool = await connectDb.connectionToSqlDB();
    const result = await pool.request()
      .input('switch_id', tableIndex)
      .input('V12', data[0] / 10.0)
      .input('V23', data[1] / 10.0)
      .input('V31', data[2] / 10.0)
      .input('I1', data[3] / 10.0)
      .input('I2', data[4] / 10.0)
      .input('I3', data[5] / 10.0)
      .input('Frequency', data[6] / 10.0)
      .input('PowerFactor', data[7] / 1000.0)
      .input('ActivePower', data[8] / 10.0)
      .input('ReactivePower', data[9] / 10.0)
      .input('ApparentPower', data[10] / 10.0)
      .input('NominalCurrent', data[11] / 10.0)
      .input('ActiveEnergy', ((data[13] * 65536) + data[14]) / 10.0)
      .input('CommStatus', bits[0])
      .input('ProtectionTrip', bits[1])
      .input('ProtectionInstTrip', bits[2])
      .input('ProtectionI_Enabled', bits[3])
      .input('ProtectionS_Enabled', bits[4])
      .input('ProtectionL_Enabled', bits[5])
      .input('ProtectionG_Trip', bits[6])
      .input('ProtectionI_Trip', bits[7])
      .input('ProtectionS_Trip', bits[8])
      .input('ProtectionL_Trip', bits[9])
      .input('TripDisconnected', bits[10])
      .input('Tripped', bits[11])
      .input('Undefined', bits[12])
      .input('BreakerClose', bits[13])
      .input('BreakerOpen', bits[14])
      .execute('UpdateLiveData');

    return { message: 'LiveData updated successfully', status: 200 };
  } catch (err) {
    console.error('LiveData update error:', err);
    return { message: err.message || 'Unknown error', status: 500 };
  }
}

async function getLiveDataOnly() {
  try {
    const pool = await connectDb.connectionToSqlDB();
    const result = await pool.request()
      .execute('GetLiveDataOnly');

    return { status: 200, data: result.recordset };
  } catch (err) {
    console.error('Error fetching live data:', err);
    return { status: 500, message: err.message };
  }
}

async function clearLiveData() {
  try {
    const pool = await connectDb.connectionToSqlDB();

    // Clear the LiveData table and reset IDENTITY
    const result = await pool.request().query(`
      DELETE FROM LiveData;
      DBCC CHECKIDENT ('LiveData', RESEED, 0);
    `);

    console.log('✅ LiveData table cleared successfully');
    return { message: 'LiveData table cleared successfully', status: 200 };
  } catch (err) {
    console.error('Error clearing LiveData:', err);
    return { message: err.message || 'Unknown error', status: 500 };
  }
}

async function getHourlySamples(startDate, endDate, switchId) {
  try {
    const pool = await connectDb.connectionToSqlDB();
    const result = await pool.request()
      .input('StartDate', sql.DateTime, startDate)
      .input('EndDate', sql.DateTime, endDate)
      .input('SwitchId', sql.Int, switchId || null)
      .execute('GetHourlySamples');

    return { status: 200, data: result.recordset };
  } catch (err) {
    console.error('Error fetching hourly samples:', err);
    return { status: 500, message: err.message };
  }
}

async function getDailySamples(startDate, endDate, switchId) {
  try {
    const pool = await connectDb.connectionToSqlDB();
    const result = await pool.request()
      .input('StartDate', sql.DateTime, startDate)
      .input('EndDate', sql.DateTime, endDate)
      .input('SwitchId', sql.Int, switchId || null)
      .execute('GetDailySamples');

    return { status: 200, data: result.recordset };
  } catch (err) {
    console.error('Error fetching daily samples:', err);
    return { status: 500, message: err.message };
  }
}

async function getWeeklySamples(startDate, endDate, switchId) {
  try {
    const pool = await connectDb.connectionToSqlDB();
    const result = await pool.request()
      .input('StartDate', sql.DateTime, startDate)
      .input('EndDate', sql.DateTime, endDate)
      .input('SwitchId', sql.Int, switchId || null)
      .execute('GetWeeklySamples');

    return { status: 200, data: result.recordset };
  } catch (err) {
    console.error('Error fetching weekly samples:', err);
    return { status: 500, message: err.message };
  }
}

async function getUsers() {
  try {
    const pool = await connectDb.connectionToSqlDB();
    const result = await pool.request()
      .query('SELECT id, username AS userName, email, timestamp FROM Users ORDER BY timestamp DESC');

    return { status: 200, data: result.recordset };
  } catch (err) {
    console.error('Error fetching users:', err);
    return { status: 500, message: err.message };
  }
}

async function getUserById(userId) {
  try {
    const pool = await connectDb.connectionToSqlDB();
    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .query('SELECT id, username AS userName, email FROM Users WHERE id = @userId');

    return { status: 200, data: result.recordset[0] };
  } catch (err) {
    console.error('Error fetching user by id:', err);
    return { status: 500, message: err.message };
  }
}

async function getUserByEmail(email) {
  try {
    const pool = await connectDb.connectionToSqlDB();
    const result = await pool.request()
      .input('email', sql.VarChar, email)
      .query('SELECT id, username AS userName, email FROM Users WHERE email = @email');

    if (!result.recordset || result.recordset.length === 0) {
      return { status: 404, message: 'Email not found' };
    }

    return { status: 200, data: result.recordset[0] };
  } catch (err) {
    console.error('Error fetching user by email:', err);
    return { status: 500, message: err.message };
  }
}

async function updateUserPassword(email, hashedPassword) {
  try {
    const pool = await connectDb.connectionToSqlDB();
    const result = await pool.request()
      .input('email', sql.VarChar, email)
      .input('newPassword', sql.VarChar, hashedPassword)
      .execute('UpdateUserPassword');

    return { status: 200, data: result.recordset[0] };
  } catch (err) {
    console.error('Error updating password:', err);
    return { status: 500, message: err.message };
  }
}

async function deleteUser(userId) {
  try {
    const pool = await connectDb.connectionToSqlDB();
    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .execute('DeleteUser');

    return { status: 200, data: result.recordset[0] };
  } catch (err) {
    console.error('Error deleting user:', err);
    return { status: 500, message: err.message };
  }
}

async function getTariffRates() {
  try {
    const pool = await connectDb.connectionToSqlDB();
    const result = await pool.request()
      .execute('GetTariffRates');

    return { status: 200, data: result.recordset };
  } catch (err) {
    console.error('Error fetching tariff rates:', err);
    return { status: 500, message: err.message };
  }
}

async function updateTariffRate(season, peakRate, offPeakRate, peakHours, weekdaysOnly, efficiencyBase, efficiencyMultiplier, updatedBy) {
  try {
    const pool = await connectDb.connectionToSqlDB();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .input('season', sql.VarChar, season)
      .input('peakRate', sql.Decimal(10, 4), peakRate)
      .input('offPeakRate', sql.Decimal(10, 4), offPeakRate)
      .input('peakHours', sql.VarChar, peakHours)
      .input('weekdaysOnly', sql.Bit, weekdaysOnly)
      .input('isActive', sql.Bit, isActive)
      .input('createdBy', sql.VarChar, createdBy)
      .execute('UpdateTariffRate');

    return { status: 200, data: result.recordset[0] };
  } catch (err) {
    console.error('Error updating tariff rate:', err);
    return { status: 500, message: err.message };
  }
}

async function updateTariffRatesOnly(season, peakRate, offPeakRate, updatedBy) {
  try {
    const pool = await connectDb.connectionToSqlDB();
    const result = await pool.request()
      .input('season', sql.VarChar, season)
      .input('peakRate', sql.Decimal(10, 4), peakRate)
      .input('offPeakRate', sql.Decimal(10, 4), offPeakRate)
      .input('updatedBy', sql.VarChar, updatedBy)
      .execute('UpdateTariffRatesOnly');

    return { status: 200, data: result.recordset[0] };
  } catch (err) {
    console.error('Error updating tariff rates only:', err);
    return { status: 500, message: err.message };
  }
}

async function updateEfficiencySettings(efficiencyBase, efficiencyMultiplier, updatedBy) {
  try {
    const pool = await connectDb.connectionToSqlDB();
    const result = await pool.request()
      .input('efficiencyBase', sql.Decimal(10, 2), efficiencyBase)
      .input('efficiencyMultiplier', sql.Decimal(10, 2), efficiencyMultiplier)
      .input('updatedBy', sql.VarChar, updatedBy)
      .execute('UpdateEfficiencySettings');

    return { status: 200, data: result.recordset[0] };
  } catch (err) {
    console.error('Error updating efficiency settings:', err);
    return { status: 500, message: err.message };
  }
}

async function getBreakerInfo() {
  try {
    const pool = await connectDb.connectionToSqlDB();
    const result = await pool.request()
      .query('SELECT id, name, type, load FROM MainData ORDER BY id');

    return { status: 200, data: result.recordset };
  } catch (err) {
    console.error('Error fetching breaker info:', err);
    return { status: 500, message: err.message };
  }
}

async function updateBreakerInfo(id, name, type, load, updatedBy) {
  try {
    const pool = await connectDb.connectionToSqlDB();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .input('name', sql.VarChar, name)
      .input('type', sql.VarChar, type)
      .input('load', sql.VarChar, load)
      .query(`
        UPDATE MainData 
        SET name = @name, type = @type, load = @load 
        WHERE id = @id
      `);

    // Log to audit trail
    await auditTrailData(updatedBy, `Updated breaker ${id}: ${name}`);

    return { status: 200, data: { success: true, rowsAffected: result.rowsAffected[0] } };
  } catch (err) {
    console.error('Error updating breaker info:', err);
    return { status: 500, message: err.message };
  }
}

// Export pool getter
async function getPool() {
  return await connectDb.connectionToSqlDB();
}

module.exports = { getPool, auditTrailData, AuditTrail, breakerSwtichStatus, reportPowerData, readAllAckData, writeBreakerData, getActivePower, getBreakersMainData, getBreakersNames, getActiveEnergy, addUser, userExist, getAlertData, akcAlert, akcAlertBy, getBatchActivePower, getBatchActiveEnergy, getConsumptionBilling, checkDataExists, updateLiveData, clearLiveData, getLiveDataOnly, getHourlySamples, getDailySamples, getWeeklySamples, getUsers, getUserById, getUserByEmail, updateUserPassword, deleteUser, getTariffRates, updateTariffRate, updateTariffRatesOnly, updateEfficiencySettings, getBreakerInfo, updateBreakerInfo };
