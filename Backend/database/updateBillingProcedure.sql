DROP PROCEDURE IF EXISTS GetConsumptionWithBilling;

CREATE PROCEDURE GetConsumptionWithBilling
    @switch_id INT,
    @start_date DATE,
    @end_date DATE
AS
BEGIN
    SET NOCOUNT ON;
    
    WITH DailyData AS (
        SELECT 
            CAST(timestamp AS DATE) as consumption_date,
            MIN(ActiveEnergy) as start_energy,
            MAX(ActiveEnergy) as end_energy,
            MONTH(timestamp) as month_num
        FROM Switches
        WHERE switch_id = @switch_id
          AND CAST(timestamp AS DATE) BETWEEN @start_date AND @end_date
        GROUP BY CAST(timestamp AS DATE)
    ),
    SeasonalRates AS (
        SELECT *,
            CASE 
                WHEN (end_energy - start_energy) < 0 THEN 0
                ELSE (end_energy - start_energy)
            END as daily_consumption,
            CASE 
                WHEN month_num IN (12, 1, 2) THEN 'חורף'
                WHEN month_num IN (3, 4, 5) THEN 'אביב'
                WHEN month_num IN (6, 7, 8) THEN 'קיץ'
                ELSE 'סתיו'
            END as season
        FROM DailyData
    ),
    WithCosts AS (
        SELECT *,
            CASE 
                WHEN month_num IN (6, 7, 8) THEN -- קיץ
                    daily_consumption * 0.33 * 0.5712 + -- שיא 33%
                    daily_consumption * 0.25 * 0.4827 + -- גבע 25%
                    daily_consumption * 0.42 * 0.3956   -- שפל 42%
                WHEN month_num IN (12, 1, 2) THEN -- חורף
                    daily_consumption * 0.42 * 0.5712 + -- שיא 42%
                    daily_consumption * 0.25 * 0.4827 + -- גבע 25%
                    daily_consumption * 0.33 * 0.3956   -- שפל 33%
                ELSE -- אביב/סתיו
                    daily_consumption * 0.375 * 0.5712 + -- שיא 37.5%
                    daily_consumption * 0.25 * 0.4827 +  -- גבע 25%
                    daily_consumption * 0.375 * 0.3956   -- שפל 37.5%
            END as daily_cost
        FROM SeasonalRates
    )
    SELECT 
        @switch_id as switch_id,
        consumption_date,
        season,
        daily_consumption,
        daily_cost,
        SUM(daily_consumption) OVER (ORDER BY consumption_date) as cumulative_consumption,
        SUM(daily_cost) OVER (ORDER BY consumption_date) as cumulative_cost
    FROM WithCosts
    WHERE daily_consumption >= 0
    ORDER BY consumption_date;
END