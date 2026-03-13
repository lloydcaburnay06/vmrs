SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE TABLE IF NOT EXISTS roles (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    role_id BIGINT UNSIGNED NOT NULL,
    employee_no VARCHAR(30) NULL UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(190) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(30) NULL,
    status ENUM('pending','active','inactive','suspended') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS locations (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    address_line VARCHAR(255) NULL,
    city VARCHAR(120) NULL,
    state VARCHAR(120) NULL,
    postal_code VARCHAR(20) NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_locations_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS vehicle_types (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(80) NOT NULL UNIQUE,
    description VARCHAR(255) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS vehicles (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    vehicle_code VARCHAR(30) NOT NULL UNIQUE,
    plate_no VARCHAR(30) NOT NULL UNIQUE,
    vin VARCHAR(50) NULL UNIQUE,
    type_id BIGINT UNSIGNED NOT NULL,
    service_type ENUM('ambulance','administrative') NOT NULL DEFAULT 'administrative',
    current_location_id BIGINT UNSIGNED NULL,
    make VARCHAR(80) NOT NULL,
    model VARCHAR(80) NOT NULL,
    year SMALLINT UNSIGNED NULL,
    color VARCHAR(40) NULL,
    transmission ENUM('manual','automatic','cvt','other') NULL,
    fuel_type ENUM('gasoline','diesel','electric','hybrid','lpg','other') NULL,
    seats TINYINT UNSIGNED NULL,
    payload_kg DECIMAL(10,2) NULL,
    odometer_km DECIMAL(12,2) NOT NULL DEFAULT 0,
    status ENUM('available','reserved','in_use','maintenance','inactive') NOT NULL DEFAULT 'available',
    registration_expiry DATE NULL,
    insurance_expiry DATE NULL,
    notes TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_vehicles_type FOREIGN KEY (type_id) REFERENCES vehicle_types(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_vehicles_location FOREIGN KEY (current_location_id) REFERENCES locations(id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    KEY idx_vehicles_status (status),
    KEY idx_vehicles_make_model (make, model)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reservations (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    reservation_no VARCHAR(40) NOT NULL UNIQUE,
    vehicle_id BIGINT UNSIGNED NOT NULL,
    requester_id BIGINT UNSIGNED NOT NULL,
    approver_id BIGINT UNSIGNED NULL,
    assigned_driver_id BIGINT UNSIGNED NULL,
    pickup_location_id BIGINT UNSIGNED NULL,
    dropoff_location_id BIGINT UNSIGNED NULL,
    purpose VARCHAR(255) NOT NULL,
    destination VARCHAR(255) NULL,
    start_at DATETIME NOT NULL,
    end_at DATETIME NOT NULL,
    actual_start_at DATETIME NULL,
    actual_end_at DATETIME NULL,
    approved_at DATETIME NULL,
    assigned_at DATETIME NULL,
    passengers TINYINT UNSIGNED NULL,
    priority ENUM('low','normal','high','urgent') NOT NULL DEFAULT 'normal',
    status ENUM('pending','approved','rejected','cancelled','active','completed','no_show') NOT NULL DEFAULT 'pending',
    rejection_reason VARCHAR(255) NULL,
    remarks TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    cancelled_at DATETIME NULL,
    CONSTRAINT chk_reservation_time CHECK (end_at > start_at),
    CONSTRAINT fk_reservations_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_reservations_requester FOREIGN KEY (requester_id) REFERENCES users(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_reservations_approver FOREIGN KEY (approver_id) REFERENCES users(id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_reservations_assigned_driver FOREIGN KEY (assigned_driver_id) REFERENCES users(id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_reservations_pickup_location FOREIGN KEY (pickup_location_id) REFERENCES locations(id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_reservations_dropoff_location FOREIGN KEY (dropoff_location_id) REFERENCES locations(id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    KEY idx_reservations_vehicle_time (vehicle_id, start_at, end_at),
    KEY idx_reservations_status (status),
    KEY idx_reservations_requester (requester_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reservation_passengers (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    reservation_id BIGINT UNSIGNED NOT NULL,
    full_name VARCHAR(180) NOT NULL,
    contact_no VARCHAR(30) NULL,
    notes VARCHAR(255) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_passengers_reservation FOREIGN KEY (reservation_id) REFERENCES reservations(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    KEY idx_passengers_reservation (reservation_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS trip_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    reservation_id BIGINT UNSIGNED NOT NULL,
    driver_id BIGINT UNSIGNED NULL,
    check_out_at DATETIME NULL,
    check_in_at DATETIME NULL,
    start_odometer_km DECIMAL(12,2) NULL,
    end_odometer_km DECIMAL(12,2) NULL,
    distance_km DECIMAL(12,2) NULL,
    fuel_used_liters DECIMAL(10,2) NULL,
    incident_report TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_trip_reservation FOREIGN KEY (reservation_id) REFERENCES reservations(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_trip_driver FOREIGN KEY (driver_id) REFERENCES users(id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    UNIQUE KEY uk_trip_reservation (reservation_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS maintenance_records (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    vehicle_id BIGINT UNSIGNED NOT NULL,
    recorded_by BIGINT UNSIGNED NULL,
    maintenance_type ENUM('preventive','corrective','inspection','emergency') NOT NULL,
    description TEXT NOT NULL,
    vendor VARCHAR(150) NULL,
    service_date DATE NOT NULL,
    odometer_km DECIMAL(12,2) NULL,
    cost DECIMAL(12,2) NULL,
    next_service_date DATE NULL,
    status ENUM('open','in_progress','completed','cancelled') NOT NULL DEFAULT 'open',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_maintenance_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_maintenance_user FOREIGN KEY (recorded_by) REFERENCES users(id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    KEY idx_maintenance_vehicle_date (vehicle_id, service_date),
    KEY idx_maintenance_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS fuel_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    vehicle_id BIGINT UNSIGNED NOT NULL,
    recorded_by BIGINT UNSIGNED NULL,
    fueled_at DATETIME NOT NULL,
    odometer_km DECIMAL(12,2) NULL,
    liters DECIMAL(10,2) NOT NULL,
    unit_price DECIMAL(10,2) NULL,
    total_cost DECIMAL(12,2) NULL,
    fuel_station VARCHAR(150) NULL,
    notes VARCHAR(255) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_fuel_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_fuel_user FOREIGN KEY (recorded_by) REFERENCES users(id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    KEY idx_fuel_vehicle_date (vehicle_id, fueled_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NULL,
    action VARCHAR(80) NOT NULL,
    entity_type VARCHAR(80) NOT NULL,
    entity_id BIGINT UNSIGNED NULL,
    ip_address VARCHAR(45) NULL,
    user_agent VARCHAR(255) NULL,
    payload JSON NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    KEY idx_audit_entity (entity_type, entity_id),
    KEY idx_audit_user_date (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO roles (name, description)
VALUES
    ('admin', 'Full system access'),
    ('manager', 'Coordinates fleet operations'),
    ('driver', 'Operates assigned vehicles'),
    ('requester', 'Creates reservation requests'),
    ('cao', 'Chief Administrative Officer approving travel requests')
ON DUPLICATE KEY UPDATE description = VALUES(description);

INSERT INTO vehicle_types (name, description)
VALUES
    ('Sedan', 'Standard sedan vehicle'),
    ('SUV', 'Sport utility vehicle'),
    ('Van', 'Passenger or cargo van'),
    ('Truck', 'Utility truck'),
    ('Motorcycle', 'Two-wheel vehicle')
ON DUPLICATE KEY UPDATE description = VALUES(description);

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
