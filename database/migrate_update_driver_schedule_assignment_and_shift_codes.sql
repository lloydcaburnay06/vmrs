ALTER TABLE driver_profiles
    ADD COLUMN IF NOT EXISTS assignment_type ENUM('administrative','ambulance') NOT NULL DEFAULT 'ambulance' AFTER license_expiry;

ALTER TABLE driver_work_schedules
    MODIFY COLUMN start_time TIME NULL,
    MODIFY COLUMN end_time TIME NULL;

ALTER TABLE driver_work_schedules
    ADD COLUMN IF NOT EXISTS shift_code ENUM('S8_5','S6_2','S2_10','S10_6','OFF','H_OFF','CO','LEAVE') NOT NULL DEFAULT 'S8_5' AFTER end_time;

UPDATE driver_work_schedules
SET shift_code = CASE
    WHEN shift_type = 'leave' THEN 'LEAVE'
    WHEN shift_type = 'off' THEN 'OFF'
    WHEN start_time = '06:00:00' AND end_time = '14:00:00' THEN 'S6_2'
    WHEN start_time = '08:00:00' AND end_time = '17:00:00' THEN 'S8_5'
    WHEN start_time = '14:00:00' AND end_time = '22:00:00' THEN 'S2_10'
    WHEN start_time = '22:00:00' AND end_time = '06:00:00' THEN 'S10_6'
    ELSE 'S8_5'
END
WHERE shift_code IS NULL OR shift_code = 'S8_5';

DELETE d1
FROM driver_work_schedules d1
INNER JOIN driver_work_schedules d2
    ON d1.driver_id = d2.driver_id
   AND d1.work_date = d2.work_date
   AND d1.id < d2.id;

SET @has_uk_driver_date := (
    SELECT COUNT(*)
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'driver_work_schedules'
      AND index_name = 'uk_driver_work_schedule_driver_date'
);

SET @sql_add_uk_driver_date := IF(
    @has_uk_driver_date = 0,
    'ALTER TABLE driver_work_schedules ADD UNIQUE KEY uk_driver_work_schedule_driver_date (driver_id, work_date)',
    'SELECT 1'
);
PREPARE stmt FROM @sql_add_uk_driver_date;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
