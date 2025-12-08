const connectDb = require('./db');
const database = 'DigitalPanel';
const checkIfNeedsToDelete = require('./deleteTables');

async function createTables() {
  const checkState = await checkIfNeedsToDelete.deleteAllTables();

  if (!checkState) {
    console.log('⛔ Table creation skipped due to user cancellation or error.');
    return;
  }

  try {
    const pool = await connectDb.connectionToSqlDB(database);

    // 1️⃣ MainData table
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='MainData' AND xtype='U')
      CREATE TABLE MainData(
        id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        name VARCHAR(50) NOT NULL,
        type VARCHAR(50) NOT NULL,
        load VARCHAR(50) NOT NULL
      );
    `);
    console.log({ 'MainData table created (if not exists)': 200 });

    // 2️⃣ Switches
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Switches' AND xtype='U')
      CREATE TABLE Switches (
        id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        switch_id INT,
        V12 FLOAT NOT NULL,
        V23 FLOAT NOT NULL,
        V31 FLOAT NOT NULL,
        I1 FLOAT NOT NULL,
        I2 FLOAT NOT NULL,
        I3 FLOAT NOT NULL,
        Frequency FLOAT NOT NULL,
        PowerFactor FLOAT NOT NULL,
        ActivePower FLOAT NOT NULL,
        ReactivePower FLOAT NOT NULL,
        ApparentPower FLOAT NOT NULL,
        NominalCurrent FLOAT NOT NULL,
        ActiveEnergy FLOAT NOT NULL,
        CommStatus BIT NOT NULL,
        ProtectionTrip BIT NOT NULL,
        ProtectionInstTrip BIT NOT NULL,
        ProtectionI_Enabled BIT NOT NULL,
        ProtectionS_Enabled BIT NOT NULL,
        ProtectionL_Enabled BIT NOT NULL,
        ProtectionG_Trip BIT NOT NULL,
        ProtectionI_Trip BIT NOT NULL,
        ProtectionS_Trip BIT NOT NULL,
        ProtectionL_Trip BIT NOT NULL,
        TripDisconnected BIT NOT NULL,
        Tripped BIT NOT NULL,
        Undefined BIT NOT NULL,
        BreakerClose BIT NOT NULL,
        BreakerOpen BIT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (switch_id) REFERENCES MainData(id) ON DELETE CASCADE
      );
    `);
    console.log({ 'Switches table created (if not exists)': 200 });

    // 3️⃣ Alerts
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Alerts' AND xtype='U')
      CREATE TABLE Alerts (
        id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        alarmId INT NOT NULL,
        alert_type VARCHAR(50),
        alert_message VARCHAR(255),
        alertAck INT,
        ackBy VARCHAR(100),
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (alarmId) REFERENCES MainData(id) ON DELETE CASCADE
      );
    `);
    console.log({ 'Alerts table created (if not exists)': 200 });

    // 3️⃣.1 Alerts Ack
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='AckAlert' AND xtype='U')
      create table AckAlert(
        id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        ackId INT NOT NULL,
        ackBy VARCHAR(50),
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (ackId) REFERENCES Alerts(id) ON DELETE CASCADE
      );
      `);
    console.log({ 'Alerts Ack table created (if not exists)': 200 });

    // 4️⃣ Events
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Events' AND xtype='U')
      CREATE TABLE Events (
        id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        eventId INT NOT NULL,
        alert_message VARCHAR(255),
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (eventId) REFERENCES MainData(id) ON DELETE CASCADE
      );
    `);
    console.log({ 'Events table created (if not exists)': 200 });

    // 5️⃣ Users
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Users' AND xtype='U')
        CREATE TABLE Users (
        id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        userName VARCHAR(20) NOT NULL UNIQUE,
        userPassword VARCHAR(255),
        email VARCHAR(100),
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      );

    `);
    console.log({ 'Users table created (if not exists)': 200 });
    // 6️⃣ Users Audit Trail
    await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='UserAuditTrail' AND xtype='U')
         CREATE TABLE UserAuditTrail (
        id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        userName VARCHAR(20) NOT NULL,
        type VARCHAR(20),
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      );`);
    console.log({ 'UserAuditTrail table created (if not exists)': 200 });

    // 7️⃣ LiveData table for current data
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='LiveData' AND xtype='U')
      CREATE TABLE LiveData (
        switch_id INT PRIMARY KEY,
        V12 FLOAT NOT NULL,
        V23 FLOAT NOT NULL,
        V31 FLOAT NOT NULL,
        I1 FLOAT NOT NULL,
        I2 FLOAT NOT NULL,
        I3 FLOAT NOT NULL,
        Frequency FLOAT NOT NULL,
        PowerFactor FLOAT NOT NULL,
        ActivePower FLOAT NOT NULL,
        ReactivePower FLOAT NOT NULL,
        ApparentPower FLOAT NOT NULL,
        NominalCurrent FLOAT NOT NULL,
        ActiveEnergy FLOAT NOT NULL,
        CommStatus BIT NOT NULL,
        ProtectionTrip BIT NOT NULL,
        ProtectionInstTrip BIT NOT NULL,
        ProtectionI_Enabled BIT NOT NULL,
        ProtectionS_Enabled BIT NOT NULL,
        ProtectionL_Enabled BIT NOT NULL,
        ProtectionG_Trip BIT NOT NULL,
        ProtectionI_Trip BIT NOT NULL,
        ProtectionS_Trip BIT NOT NULL,
        ProtectionL_Trip BIT NOT NULL,
        TripDisconnected BIT NOT NULL,
        Tripped BIT NOT NULL,
        Undefined BIT NOT NULL,
        BreakerClose BIT NOT NULL,
        BreakerOpen BIT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (switch_id) REFERENCES MainData(id) ON DELETE CASCADE
      );
    `);
    console.log({ 'LiveData table created (if not exists)': 200 });

    // 8️⃣ TariffRates table
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='TariffRates' AND xtype='U')
      CREATE TABLE TariffRates (
        id INT IDENTITY(1,1) PRIMARY KEY,
        season VARCHAR(20) NOT NULL,
        peakRate DECIMAL(10,4) NOT NULL,
        offPeakRate DECIMAL(10,4) NOT NULL,
        peakHours VARCHAR(50) NOT NULL,
        weekdaysOnly BIT NOT NULL DEFAULT 1,
        isActive BIT NOT NULL DEFAULT 1,
        createdBy VARCHAR(50),
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log({ 'TariffRates table created (if not exists)': 200 });

    // Insert default tariff rates
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM TariffRates)
      BEGIN
        INSERT INTO TariffRates (season, peakRate, offPeakRate, peakHours, weekdaysOnly, createdBy)
        VALUES 
        ('Summer', 1.69, 0.53, '17:00-23:00', 1, 'System'),
        ('Winter', 1.21, 0.46, '17:00-22:00', 0, 'System'),
        ('Spring/Autumn', 0.50, 0.45, '17:00-22:00', 1, 'System');
      END
    `);
    console.log({ 'Default tariff rates inserted': 200 });

  } catch (err) {
    console.error('❌ Error creating tables:', err);
    return { message: err.message, status: 500 };
  }
}

module.exports = { createTables };
