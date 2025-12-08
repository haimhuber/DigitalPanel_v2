CREATE TABLE MainData(
id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
name VARCHAR(50) NOT NULL,
type VARCHAR(50) NOT NULL,
load VARCHAR(50) NOT NULL);


CREATE TABLE Switches (
    id INT IDENTITY(1,1) PRIMARY KEY,      -- Auto-incrementing primary key
    switch_id INT NOT NULL,
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
    FOREIGN KEY (switch_id) REFERENCES MainData(id) ON DELETE CASCADE);



CREATE TABLE Alerts (
id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
alarmId INT NOT NULL,
alert_type VARCHAR(50),
alert_message VARCHAR(255),
alertAck INT , 
timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
FOREIGN KEY (alarmId) REFERENCES MainData(id) ON DELETE CASCADE);

CREATE TABLE Events (
id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
eventId INT NOT NULL,
alert_message VARCHAR(255),
timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
FOREIGN KEY (eventId) REFERENCES Switches(id) ON DELETE CASCADE);

-- Procedure
CREATE 
 addBreakerData
    @switch_id INT,
    @V12 FLOAT,
    @V23 FLOAT,
    @V31 FLOAT,
    @I1 FLOAT,
    @I2 FLOAT,
    @I3 FLOAT,
    @Frequency FLOAT,
    @PowerFactor FLOAT,
    @ActivePower FLOAT,
    @ReactivePower FLOAT,
    @ApparentPower FLOAT,
    @NominalCurrent FLOAT,
    @ActiveEnergy FLOAT,
    @CommStatus BIT,
    @ProtectionTrip BIT,
    @ProtectionInstTrip BIT,
    @ProtectionI_Enabled BIT,
    @ProtectionS_Enabled BIT,
    @ProtectionL_Enabled BIT,
    @ProtectionG_Trip BIT,
    @ProtectionI_Trip BIT,
    @ProtectionS_Trip BIT,
    @ProtectionL_Trip BIT,
    @TripDisconnected BIT,
    @Tripped BIT,
    @Undefined BIT,
    @BreakerClose BIT,
    @BreakerOpen BIT
AS
BEGIN
    INSERT INTO Switches (
        switch_id, V12, V23, V31, I1, I2, I3, Frequency, PowerFactor, ActivePower, 
        ReactivePower, ApparentPower, NominalCurrent, ActiveEnergy, CommStatus, 
        ProtectionTrip, ProtectionInstTrip, ProtectionI_Enabled, ProtectionS_Enabled, ProtectionL_Enabled, 
        ProtectionG_Trip, ProtectionI_Trip, ProtectionS_Trip, ProtectionL_Trip, 
        TripDisconnected, Tripped, Undefined, BreakerClose, BreakerOpen
    )
    VALUES (
        @switch_id, @V12, @V23, @V31, @I1, @I2, @I3, @Frequency, @PowerFactor, @ActivePower, 
        @ReactivePower, @ApparentPower, @NominalCurrent, @ActiveEnergy, @CommStatus, 
        @ProtectionTrip, @ProtectionInstTrip, @ProtectionI_Enabled, @ProtectionS_Enabled, @ProtectionL_Enabled, 
        @ProtectionG_Trip, @ProtectionI_Trip, @ProtectionS_Trip, @ProtectionL_Trip, 
        @TripDisconnected, @Tripped, @Undefined, @BreakerClose, @BreakerOpen
    );
END;
GO

CREATE OR ALTER PROCEDURE getActiveEnergy
    @switch_id INT,
    @startTime DATETIME,
    @endTime DATETIME
AS
BEGIN
    SELECT 
        M.name,
        S.ActiveEnergy,
        FORMAT(S.timestamp, 'yyyy-MM-dd HH:mm') AS DateTimeHHMM
    FROM 
        MainData AS M
    INNER JOIN 
        Switches AS S ON M.id = S.switch_id
    WHERE
        S.switch_id = @switch_id
        AND S.timestamp BETWEEN @startTime AND @endTime
    ORDER BY 
        S.timestamp;
END;
GO
