-- Stored Procedure: GetPeakOffPeakConsumption
-- Returns daily peak/off-peak consumption for a switch, based on hourly ActiveEnergy readings

DROP PROCEDURE IF EXISTS GetPeakOffPeakConsumption;
GO

CREATE PROCEDURE GetPeakOffPeakConsumption
    @switch_id INT,
    @start_date DATE,
    @end_date DATE
AS
BEGIN
    SET NOCOUNT ON;

    -- Get hourly consumption per day
    WITH HourlyData AS (
        SELECT 
            CAST(timestamp AS DATE) AS consumption_date,
            DATEPART(HOUR, timestamp) AS hour,
            MIN(ActiveEnergy) AS start_energy,
            MAX(ActiveEnergy) AS end_energy
        FROM Switches
        WHERE switch_id = @switch_id
          AND CAST(timestamp AS DATE) BETWEEN @start_date AND @end_date
        GROUP BY CAST(timestamp AS DATE), DATEPART(HOUR, timestamp)
    ),
    HourlyConsumption AS (
        SELECT 
            consumption_date,
            hour,
            CASE WHEN (end_energy - start_energy) < 0 THEN 0 ELSE (end_energy - start_energy) END AS consumption
        FROM HourlyData
    ),
    PeakOffPeak AS (
        SELECT 
            consumption_date,
            SUM(CASE WHEN 
                -- Winter: Dec/Jan/Feb, all days, peak 17-22
                MONTH(consumption_date) IN (12,1,2) AND hour BETWEEN 17 AND 21 THEN consumption
                -- Summer: Jun-Sep, weekdays, peak 17-22
                WHEN MONTH(consumption_date) BETWEEN 6 AND 9 AND DATEPART(WEEKDAY, consumption_date) NOT IN (6,7) AND hour BETWEEN 17 AND 22 THEN consumption
                -- Spring/Autumn: Mar-May, Oct-Nov, weekdays, peak 17-21
                WHEN MONTH(consumption_date) IN (3,4,5,10,11) AND DATEPART(WEEKDAY, consumption_date) NOT IN (6,7) AND hour BETWEEN 17 AND 21 THEN consumption
                ELSE 0 END) AS peak_consumption,
            SUM(CASE WHEN 
                -- Winter: Dec/Jan/Feb, all days, off-peak all other hours
                MONTH(consumption_date) IN (12,1,2) AND NOT (hour BETWEEN 17 AND 21) THEN consumption
                -- Summer: Jun-Sep, weekdays, off-peak all other hours
                WHEN MONTH(consumption_date) BETWEEN 6 AND 9 AND DATEPART(WEEKDAY, consumption_date) NOT IN (6,7) AND NOT (hour BETWEEN 17 AND 22) THEN consumption
                -- Spring/Autumn: Mar-May, Oct-Nov, weekdays, off-peak all other hours
                WHEN MONTH(consumption_date) IN (3,4,5,10,11) AND DATEPART(WEEKDAY, consumption_date) NOT IN (6,7) AND NOT (hour BETWEEN 17 AND 21) THEN consumption
                -- All weekends (Fri/Sat): all hours off-peak
                WHEN DATEPART(WEEKDAY, consumption_date) IN (6,7) THEN consumption
                ELSE 0 END) AS offpeak_consumption
        FROM HourlyConsumption
        GROUP BY consumption_date
    )
    SELECT 
        @switch_id AS switch_id,
        consumption_date,
        peak_consumption,
        offpeak_consumption
    FROM PeakOffPeak
    ORDER BY consumption_date;
END
GO
