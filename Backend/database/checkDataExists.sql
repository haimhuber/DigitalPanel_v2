CREATE PROCEDURE CheckDataExists
    @switch_id INT,
    @start_date DATE,
    @end_date DATE
AS
BEGIN
    SELECT COUNT(*) as record_count,
           MIN(timestamp) as earliest_record,
           MAX(timestamp) as latest_record,
           CASE WHEN COUNT(*) > 0 THEN 1 ELSE 0 END as data_exists
    FROM Switches 
    WHERE switch_id = @switch_id 
      AND CAST(timestamp AS DATE) BETWEEN @start_date AND @end_date;
END