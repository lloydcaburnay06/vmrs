CREATE TABLE IF NOT EXISTS driver_work_schedules (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    driver_id BIGINT UNSIGNED NOT NULL,
    work_date DATE NOT NULL,
    start_time TIME NULL,
    end_time TIME NULL,
    shift_code ENUM('S8_5','S6_2','S2_10','S10_6','OFF','H_OFF','CO','LEAVE','OB','OT') NOT NULL DEFAULT 'S8_5',
    shift_type ENUM('regular','overtime','off','leave') NOT NULL DEFAULT 'regular',
    status ENUM('scheduled','completed','cancelled') NOT NULL DEFAULT 'scheduled',
    notes VARCHAR(255) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_driver_work_schedule_driver FOREIGN KEY (driver_id) REFERENCES users(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    UNIQUE KEY uk_driver_work_schedule_driver_date (driver_id, work_date),
    KEY idx_driver_work_schedule_date (work_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
