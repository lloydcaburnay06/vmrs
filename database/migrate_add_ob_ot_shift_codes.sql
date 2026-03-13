ALTER TABLE driver_work_schedules
    MODIFY COLUMN shift_code ENUM('S8_5','S6_2','S2_10','S10_6','OFF','H_OFF','CO','LEAVE','OB','OT') NOT NULL DEFAULT 'S8_5';
