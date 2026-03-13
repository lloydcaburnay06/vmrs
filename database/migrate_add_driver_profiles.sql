CREATE TABLE IF NOT EXISTS driver_profiles (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    dl_id_number VARCHAR(60) NOT NULL,
    license_expiry DATE NOT NULL,
    assignment_type ENUM('administrative','ambulance') NOT NULL DEFAULT 'ambulance',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_driver_profiles_user (user_id),
    UNIQUE KEY uk_driver_profiles_dl (dl_id_number),
    CONSTRAINT fk_driver_profiles_user FOREIGN KEY (user_id) REFERENCES users(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT chk_driver_profiles_license_expiry CHECK (license_expiry >= '2000-01-01')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
