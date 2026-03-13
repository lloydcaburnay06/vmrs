SET NAMES utf8mb4;
SET time_zone = '+00:00';

START TRANSACTION;

INSERT INTO locations (name, address_line, city, state, postal_code, is_active)
VALUES
    ('Main Garage', '120 Fleet Ave', 'Quezon City', 'NCR', '1100', 1),
    ('North Depot', '88 Logistics Rd', 'Caloocan', 'NCR', '1400', 1),
    ('South Hub', '25 Transport St', 'Makati', 'NCR', '1200', 1)
ON DUPLICATE KEY UPDATE
    address_line = VALUES(address_line),
    city = VALUES(city),
    state = VALUES(state),
    postal_code = VALUES(postal_code),
    is_active = VALUES(is_active);

INSERT INTO users (role_id, employee_no, first_name, last_name, email, password_hash, phone, status)
SELECT r.id, 'EMP-0001', 'System', 'Admin', 'admin@vmrs.local', '$2y$10$P9kDSAsV6lS.DaeHSGnBAORTAkCnemvF2tuOR2EVi8hrkNsiM0kGO', '09170000001', 'active'
FROM roles r
WHERE r.name = 'admin'
ON DUPLICATE KEY UPDATE
    role_id = VALUES(role_id),
    first_name = VALUES(first_name),
    last_name = VALUES(last_name),
    password_hash = VALUES(password_hash),
    phone = VALUES(phone),
    status = VALUES(status);

INSERT INTO users (role_id, employee_no, first_name, last_name, email, password_hash, phone, status)
SELECT r.id, 'EMP-0002', 'Maya', 'Manager', 'manager@vmrs.local', '$2y$10$P9kDSAsV6lS.DaeHSGnBAORTAkCnemvF2tuOR2EVi8hrkNsiM0kGO', '09170000002', 'active'
FROM roles r
WHERE r.name = 'manager'
ON DUPLICATE KEY UPDATE
    role_id = VALUES(role_id),
    first_name = VALUES(first_name),
    last_name = VALUES(last_name),
    password_hash = VALUES(password_hash),
    phone = VALUES(phone),
    status = VALUES(status);

INSERT INTO users (role_id, employee_no, first_name, last_name, email, password_hash, phone, status)
SELECT r.id, 'EMP-0010', 'Celia', 'Officer', 'cao@vmrs.local', '$2y$10$P9kDSAsV6lS.DaeHSGnBAORTAkCnemvF2tuOR2EVi8hrkNsiM0kGO', '09170000010', 'active'
FROM roles r
WHERE r.name = 'cao'
ON DUPLICATE KEY UPDATE
    role_id = VALUES(role_id),
    first_name = VALUES(first_name),
    last_name = VALUES(last_name),
    password_hash = VALUES(password_hash),
    phone = VALUES(phone),
    status = VALUES(status);

INSERT INTO users (role_id, employee_no, first_name, last_name, email, password_hash, phone, status)
SELECT r.id, 'EMP-0003', 'Dan', 'Driver', 'driver1@vmrs.local', '$2y$10$P9kDSAsV6lS.DaeHSGnBAORTAkCnemvF2tuOR2EVi8hrkNsiM0kGO', '09170000003', 'active'
FROM roles r
WHERE r.name = 'driver'
ON DUPLICATE KEY UPDATE
    role_id = VALUES(role_id),
    first_name = VALUES(first_name),
    last_name = VALUES(last_name),
    password_hash = VALUES(password_hash),
    phone = VALUES(phone),
    status = VALUES(status);

INSERT INTO users (role_id, employee_no, first_name, last_name, email, password_hash, phone, status)
SELECT r.id, 'EMP-0004', 'Rae', 'Requester', 'requester1@vmrs.local', '$2y$10$P9kDSAsV6lS.DaeHSGnBAORTAkCnemvF2tuOR2EVi8hrkNsiM0kGO', '09170000004', 'active'
FROM roles r
WHERE r.name = 'requester'
ON DUPLICATE KEY UPDATE
    role_id = VALUES(role_id),
    first_name = VALUES(first_name),
    last_name = VALUES(last_name),
    password_hash = VALUES(password_hash),
    phone = VALUES(phone),
    status = VALUES(status);

INSERT INTO users (role_id, employee_no, first_name, last_name, email, password_hash, phone, status)
SELECT r.id, 'EMP-0005', 'Nico', 'Requester', 'requester2@vmrs.local', '$2y$10$P9kDSAsV6lS.DaeHSGnBAORTAkCnemvF2tuOR2EVi8hrkNsiM0kGO', '09170000005', 'active'
FROM roles r
WHERE r.name = 'requester'
ON DUPLICATE KEY UPDATE
    role_id = VALUES(role_id),
    first_name = VALUES(first_name),
    last_name = VALUES(last_name),
    password_hash = VALUES(password_hash),
    phone = VALUES(phone),
    status = VALUES(status);

INSERT INTO vehicles (
    vehicle_code, plate_no, vin, type_id, service_type, current_location_id, make, model, year, color,
    transmission, fuel_type, seats, payload_kg, odometer_km, status, registration_expiry, insurance_expiry, notes
)
SELECT
    'VH-0001', 'NAA-1001', '1HGBH41JXMN109186', vt.id, 'ambulance', l.id, 'Toyota', 'Innova', 2023, 'Silver',
    'automatic', 'diesel', 7, NULL, 32150.50, 'available', '2026-12-31', '2026-09-30', 'Primary transport unit'
FROM vehicle_types vt
CROSS JOIN locations l
WHERE vt.name = 'Van' AND l.name = 'Main Garage'
ON DUPLICATE KEY UPDATE
    type_id = VALUES(type_id),
    service_type = VALUES(service_type),
    current_location_id = VALUES(current_location_id),
    make = VALUES(make),
    model = VALUES(model),
    year = VALUES(year),
    color = VALUES(color),
    transmission = VALUES(transmission),
    fuel_type = VALUES(fuel_type),
    seats = VALUES(seats),
    odometer_km = VALUES(odometer_km),
    status = VALUES(status),
    registration_expiry = VALUES(registration_expiry),
    insurance_expiry = VALUES(insurance_expiry),
    notes = VALUES(notes);

INSERT INTO vehicles (
    vehicle_code, plate_no, vin, type_id, service_type, current_location_id, make, model, year, color,
    transmission, fuel_type, seats, payload_kg, odometer_km, status, registration_expiry, insurance_expiry, notes
)
SELECT
    'VH-0002', 'NBB-2002', '2FMDK3GC0ABB12933', vt.id, 'administrative', l.id, 'Mitsubishi', 'Montero', 2022, 'Black',
    'automatic', 'diesel', 7, NULL, 44780.00, 'available', '2026-11-30', '2026-10-15', 'Executive transport'
FROM vehicle_types vt
CROSS JOIN locations l
WHERE vt.name = 'SUV' AND l.name = 'North Depot'
ON DUPLICATE KEY UPDATE
    type_id = VALUES(type_id),
    service_type = VALUES(service_type),
    current_location_id = VALUES(current_location_id),
    make = VALUES(make),
    model = VALUES(model),
    year = VALUES(year),
    color = VALUES(color),
    transmission = VALUES(transmission),
    fuel_type = VALUES(fuel_type),
    seats = VALUES(seats),
    odometer_km = VALUES(odometer_km),
    status = VALUES(status),
    registration_expiry = VALUES(registration_expiry),
    insurance_expiry = VALUES(insurance_expiry),
    notes = VALUES(notes);

INSERT INTO vehicles (
    vehicle_code, plate_no, vin, type_id, service_type, current_location_id, make, model, year, color,
    transmission, fuel_type, seats, payload_kg, odometer_km, status, registration_expiry, insurance_expiry, notes
)
SELECT
    'VH-0003', 'NCC-3003', '3CZRE4H5XBG708352', vt.id, 'administrative', l.id, 'Isuzu', 'N-Series', 2021, 'White',
    'manual', 'diesel', 3, 1500.00, 58990.20, 'maintenance', '2026-08-30', '2026-08-15', 'Scheduled brake service'
FROM vehicle_types vt
CROSS JOIN locations l
WHERE vt.name = 'Truck' AND l.name = 'South Hub'
ON DUPLICATE KEY UPDATE
    type_id = VALUES(type_id),
    service_type = VALUES(service_type),
    current_location_id = VALUES(current_location_id),
    make = VALUES(make),
    model = VALUES(model),
    year = VALUES(year),
    color = VALUES(color),
    transmission = VALUES(transmission),
    fuel_type = VALUES(fuel_type),
    seats = VALUES(seats),
    payload_kg = VALUES(payload_kg),
    odometer_km = VALUES(odometer_km),
    status = VALUES(status),
    registration_expiry = VALUES(registration_expiry),
    insurance_expiry = VALUES(insurance_expiry),
    notes = VALUES(notes);

INSERT IGNORE INTO reservations (
    reservation_no, vehicle_id, requester_id, approver_id, pickup_location_id, dropoff_location_id,
    purpose, destination, start_at, end_at, actual_start_at, actual_end_at, passengers, priority, status, remarks
)
SELECT
    'RES-2026-0001', v.id, req.id, app.id, lp.id, ld.id,
    'Client site visit', 'Taguig City', '2026-02-24 08:00:00', '2026-02-24 12:00:00',
    '2026-02-24 08:05:00', '2026-02-24 12:15:00', 4, 'high', 'completed', 'Trip completed successfully'
FROM vehicles v
JOIN users req ON req.email = 'requester1@vmrs.local'
JOIN users app ON app.email = 'manager@vmrs.local'
JOIN locations lp ON lp.name = 'Main Garage'
JOIN locations ld ON ld.name = 'South Hub'
WHERE v.vehicle_code = 'VH-0001'
ON DUPLICATE KEY UPDATE
    vehicle_id = VALUES(vehicle_id),
    requester_id = VALUES(requester_id),
    approver_id = VALUES(approver_id),
    pickup_location_id = VALUES(pickup_location_id),
    dropoff_location_id = VALUES(dropoff_location_id),
    purpose = VALUES(purpose),
    destination = VALUES(destination),
    start_at = VALUES(start_at),
    end_at = VALUES(end_at),
    actual_start_at = VALUES(actual_start_at),
    actual_end_at = VALUES(actual_end_at),
    passengers = VALUES(passengers),
    priority = VALUES(priority),
    status = VALUES(status),
    remarks = VALUES(remarks);

INSERT INTO reservations (
    reservation_no, vehicle_id, requester_id, approver_id, pickup_location_id, dropoff_location_id,
    purpose, destination, start_at, end_at, passengers, priority, status, remarks
)
SELECT
    'RES-2026-0002', v.id, req.id, app.id, lp.id, ld.id,
    'Airport pickup', 'NAIA Terminal 3', '2026-02-26 09:00:00', '2026-02-26 14:00:00',
    3, 'normal', 'approved', 'Driver assigned'
FROM vehicles v
JOIN users req ON req.email = 'requester2@vmrs.local'
JOIN users app ON app.email = 'manager@vmrs.local'
JOIN locations lp ON lp.name = 'North Depot'
JOIN locations ld ON ld.name = 'Main Garage'
WHERE v.vehicle_code = 'VH-0002'
ON DUPLICATE KEY UPDATE
    vehicle_id = VALUES(vehicle_id),
    requester_id = VALUES(requester_id),
    approver_id = VALUES(approver_id),
    pickup_location_id = VALUES(pickup_location_id),
    dropoff_location_id = VALUES(dropoff_location_id),
    purpose = VALUES(purpose),
    destination = VALUES(destination),
    start_at = VALUES(start_at),
    end_at = VALUES(end_at),
    passengers = VALUES(passengers),
    priority = VALUES(priority),
    status = VALUES(status),
    remarks = VALUES(remarks);

INSERT INTO reservations (
    reservation_no, vehicle_id, requester_id, pickup_location_id, dropoff_location_id,
    purpose, destination, start_at, end_at, passengers, priority, status, remarks
)
SELECT
    'RES-2026-0003', v.id, req.id, lp.id, ld.id,
    'Branch stock transfer', 'Pasig Warehouse', '2026-02-27 07:00:00', '2026-02-27 11:00:00',
    2, 'urgent', 'pending', 'Awaiting CAO approval'
FROM vehicles v
JOIN users req ON req.email = 'requester1@vmrs.local'
JOIN locations lp ON lp.name = 'South Hub'
JOIN locations ld ON ld.name = 'North Depot'
WHERE v.vehicle_code = 'VH-0003'
ON DUPLICATE KEY UPDATE
    vehicle_id = VALUES(vehicle_id),
    requester_id = VALUES(requester_id),
    pickup_location_id = VALUES(pickup_location_id),
    dropoff_location_id = VALUES(dropoff_location_id),
    purpose = VALUES(purpose),
    destination = VALUES(destination),
    start_at = VALUES(start_at),
    end_at = VALUES(end_at),
    passengers = VALUES(passengers),
    priority = VALUES(priority),
    status = VALUES(status),
    remarks = VALUES(remarks);

INSERT INTO reservation_passengers (reservation_id, full_name, contact_no, notes)
SELECT r.id, 'Jules Aquino', '09171112222', 'Senior staff'
FROM reservations r
WHERE r.reservation_no = 'RES-2026-0002'
AND NOT EXISTS (
    SELECT 1 FROM reservation_passengers rp
    WHERE rp.reservation_id = r.id AND rp.full_name = 'Jules Aquino'
);

INSERT INTO reservation_passengers (reservation_id, full_name, contact_no, notes)
SELECT r.id, 'Paolo Cruz', '09172223333', 'Project engineer'
FROM reservations r
WHERE r.reservation_no = 'RES-2026-0002'
AND NOT EXISTS (
    SELECT 1 FROM reservation_passengers rp
    WHERE rp.reservation_id = r.id AND rp.full_name = 'Paolo Cruz'
);

INSERT INTO trip_logs (
    reservation_id, driver_id, check_out_at, check_in_at,
    start_odometer_km, end_odometer_km, distance_km, fuel_used_liters, incident_report
)
SELECT
    r.id, d.id, '2026-02-24 08:00:00', '2026-02-24 12:20:00',
    32090.00, 32210.00, 120.00, 16.50, NULL
FROM reservations r
JOIN users d ON d.email = 'driver1@vmrs.local'
WHERE r.reservation_no = 'RES-2026-0001'
ON DUPLICATE KEY UPDATE
    driver_id = VALUES(driver_id),
    check_out_at = VALUES(check_out_at),
    check_in_at = VALUES(check_in_at),
    start_odometer_km = VALUES(start_odometer_km),
    end_odometer_km = VALUES(end_odometer_km),
    distance_km = VALUES(distance_km),
    fuel_used_liters = VALUES(fuel_used_liters),
    incident_report = VALUES(incident_report);

INSERT INTO maintenance_records (
    vehicle_id, recorded_by, maintenance_type, description, vendor, service_date,
    odometer_km, cost, next_service_date, status
)
SELECT
    v.id, u.id, 'preventive', 'Oil change and brake pad replacement', 'FleetCare Motors', '2026-02-18',
    58850.00, 7800.00, '2026-05-18', 'completed'
FROM vehicles v
JOIN users u ON u.email = 'manager@vmrs.local'
WHERE v.vehicle_code = 'VH-0003'
AND NOT EXISTS (
    SELECT 1
    FROM maintenance_records m
    WHERE m.vehicle_id = v.id
      AND m.service_date = '2026-02-18'
      AND m.maintenance_type = 'preventive'
);

INSERT INTO fuel_logs (
    vehicle_id, recorded_by, fueled_at, odometer_km, liters, unit_price, total_cost, fuel_station, notes
)
SELECT
    v.id, u.id, '2026-02-25 18:10:00', 44780.00, 48.00, 64.50, 3096.00, 'Shell C5', 'Refueled after airport run prep'
FROM vehicles v
JOIN users u ON u.email = 'driver1@vmrs.local'
WHERE v.vehicle_code = 'VH-0002'
AND NOT EXISTS (
    SELECT 1
    FROM fuel_logs f
    WHERE f.vehicle_id = v.id
      AND f.fueled_at = '2026-02-25 18:10:00'
);

INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address, user_agent, payload)
SELECT
    u.id,
    'seed.insert',
    'reservation',
    r.id,
    '127.0.0.1',
    'seed-script',
    JSON_OBJECT('reservation_no', r.reservation_no, 'status', r.status)
FROM users u
JOIN reservations r ON r.reservation_no = 'RES-2026-0003'
WHERE u.email = 'admin@vmrs.local'
AND NOT EXISTS (
    SELECT 1 FROM audit_logs a
    WHERE a.action = 'seed.insert'
      AND a.entity_type = 'reservation'
      AND a.entity_id = r.id
);

COMMIT;

INSERT INTO driver_profiles (user_id, dl_id_number, license_expiry, assignment_type)
SELECT u.id, 'DL-DRV-0001', '2027-12-31', 'administrative'
FROM users u
JOIN roles r ON r.id = u.role_id
WHERE u.email = 'driver1@vmrs.local' AND r.name = 'driver'
ON DUPLICATE KEY UPDATE
    dl_id_number = VALUES(dl_id_number),
    license_expiry = VALUES(license_expiry),
    assignment_type = VALUES(assignment_type);

UPDATE reservations r
JOIN users u ON u.email = 'driver1@vmrs.local'
SET r.assigned_driver_id = u.id,
    r.approved_at = '2026-02-25 09:00:00',
    r.assigned_at = '2026-02-25 09:15:00'
WHERE r.reservation_no = 'RES-2026-0002';

INSERT INTO driver_work_schedules (driver_id, work_date, start_time, end_time, shift_type, status, notes)
SELECT u.id, '2026-03-03', '08:00:00', '17:00:00', 'regular', 'scheduled', 'Day shift assignment'
FROM users u
JOIN roles r ON r.id = u.role_id
WHERE u.email = 'driver1@vmrs.local' AND r.name = 'driver'
AND NOT EXISTS (
    SELECT 1 FROM driver_work_schedules dws
    WHERE dws.driver_id = u.id
      AND dws.work_date = '2026-03-03'
      AND dws.start_time = '08:00:00'
      AND dws.end_time = '17:00:00'
);

-- Additional seed set: ensure at least 5 drivers and 5 vehicles, plus 100+ requests

INSERT INTO users (role_id, employee_no, first_name, last_name, email, password_hash, phone, status)
SELECT r.id, 'EMP-0006', 'Lia', 'Driver', 'driver2@vmrs.local', '$2y$10$P9kDSAsV6lS.DaeHSGnBAORTAkCnemvF2tuOR2EVi8hrkNsiM0kGO', '09170000006', 'active'
FROM roles r
WHERE r.name = 'driver'
ON DUPLICATE KEY UPDATE
    role_id = VALUES(role_id),
    first_name = VALUES(first_name),
    last_name = VALUES(last_name),
    password_hash = VALUES(password_hash),
    phone = VALUES(phone),
    status = VALUES(status);

INSERT INTO users (role_id, employee_no, first_name, last_name, email, password_hash, phone, status)
SELECT r.id, 'EMP-0007', 'Marco', 'Driver', 'driver3@vmrs.local', '$2y$10$P9kDSAsV6lS.DaeHSGnBAORTAkCnemvF2tuOR2EVi8hrkNsiM0kGO', '09170000007', 'active'
FROM roles r
WHERE r.name = 'driver'
ON DUPLICATE KEY UPDATE
    role_id = VALUES(role_id),
    first_name = VALUES(first_name),
    last_name = VALUES(last_name),
    password_hash = VALUES(password_hash),
    phone = VALUES(phone),
    status = VALUES(status);

INSERT INTO users (role_id, employee_no, first_name, last_name, email, password_hash, phone, status)
SELECT r.id, 'EMP-0008', 'Ivy', 'Driver', 'driver4@vmrs.local', '$2y$10$P9kDSAsV6lS.DaeHSGnBAORTAkCnemvF2tuOR2EVi8hrkNsiM0kGO', '09170000008', 'active'
FROM roles r
WHERE r.name = 'driver'
ON DUPLICATE KEY UPDATE
    role_id = VALUES(role_id),
    first_name = VALUES(first_name),
    last_name = VALUES(last_name),
    password_hash = VALUES(password_hash),
    phone = VALUES(phone),
    status = VALUES(status);

INSERT INTO users (role_id, employee_no, first_name, last_name, email, password_hash, phone, status)
SELECT r.id, 'EMP-0009', 'Noel', 'Driver', 'driver5@vmrs.local', '$2y$10$P9kDSAsV6lS.DaeHSGnBAORTAkCnemvF2tuOR2EVi8hrkNsiM0kGO', '09170000009', 'active'
FROM roles r
WHERE r.name = 'driver'
ON DUPLICATE KEY UPDATE
    role_id = VALUES(role_id),
    first_name = VALUES(first_name),
    last_name = VALUES(last_name),
    password_hash = VALUES(password_hash),
    phone = VALUES(phone),
    status = VALUES(status);

INSERT INTO driver_profiles (user_id, dl_id_number, license_expiry, assignment_type)
SELECT u.id, 'DL-DRV-0002', '2027-11-30', 'ambulance'
FROM users u
WHERE u.email = 'driver2@vmrs.local'
ON DUPLICATE KEY UPDATE dl_id_number = VALUES(dl_id_number), license_expiry = VALUES(license_expiry), assignment_type = VALUES(assignment_type);

INSERT INTO driver_profiles (user_id, dl_id_number, license_expiry, assignment_type)
SELECT u.id, 'DL-DRV-0003', '2027-10-31', 'ambulance'
FROM users u
WHERE u.email = 'driver3@vmrs.local'
ON DUPLICATE KEY UPDATE dl_id_number = VALUES(dl_id_number), license_expiry = VALUES(license_expiry), assignment_type = VALUES(assignment_type);

INSERT INTO driver_profiles (user_id, dl_id_number, license_expiry, assignment_type)
SELECT u.id, 'DL-DRV-0004', '2028-01-31', 'ambulance'
FROM users u
WHERE u.email = 'driver4@vmrs.local'
ON DUPLICATE KEY UPDATE dl_id_number = VALUES(dl_id_number), license_expiry = VALUES(license_expiry), assignment_type = VALUES(assignment_type);

INSERT INTO driver_profiles (user_id, dl_id_number, license_expiry, assignment_type)
SELECT u.id, 'DL-DRV-0005', '2027-09-30', 'ambulance'
FROM users u
WHERE u.email = 'driver5@vmrs.local'
ON DUPLICATE KEY UPDATE dl_id_number = VALUES(dl_id_number), license_expiry = VALUES(license_expiry), assignment_type = VALUES(assignment_type);

INSERT INTO vehicles (
    vehicle_code, plate_no, vin, type_id, service_type, current_location_id, make, model, year, color,
    transmission, fuel_type, seats, payload_kg, odometer_km, status, registration_expiry, insurance_expiry, notes
)
SELECT
    'VH-0004', 'NDD-4004', '5YJ3E1EA9JF123404', vt.id, 'administrative', l.id, 'Honda', 'City', 2024, 'Blue',
    'cvt', 'gasoline', 5, NULL, 11420.00, 'available', '2027-04-30', '2027-02-28', 'Pool sedan unit'
FROM vehicle_types vt
CROSS JOIN locations l
WHERE vt.name = 'Sedan' AND l.name = 'Main Garage'
ON DUPLICATE KEY UPDATE
    type_id = VALUES(type_id),
    service_type = VALUES(service_type),
    current_location_id = VALUES(current_location_id),
    make = VALUES(make),
    model = VALUES(model),
    year = VALUES(year),
    color = VALUES(color),
    transmission = VALUES(transmission),
    fuel_type = VALUES(fuel_type),
    seats = VALUES(seats),
    odometer_km = VALUES(odometer_km),
    status = VALUES(status),
    registration_expiry = VALUES(registration_expiry),
    insurance_expiry = VALUES(insurance_expiry),
    notes = VALUES(notes);

INSERT INTO vehicles (
    vehicle_code, plate_no, vin, type_id, service_type, current_location_id, make, model, year, color,
    transmission, fuel_type, seats, payload_kg, odometer_km, status, registration_expiry, insurance_expiry, notes
)
SELECT
    'VH-0005', 'NEE-5005', 'JH4TB2H26CC000505', vt.id, 'administrative', l.id, 'Yamaha', 'NMAX', 2024, 'Gray',
    'automatic', 'gasoline', 2, NULL, 6350.00, 'available', '2027-05-31', '2027-03-31', 'Courier support bike'
FROM vehicle_types vt
CROSS JOIN locations l
WHERE vt.name = 'Motorcycle' AND l.name = 'North Depot'
ON DUPLICATE KEY UPDATE
    type_id = VALUES(type_id),
    service_type = VALUES(service_type),
    current_location_id = VALUES(current_location_id),
    make = VALUES(make),
    model = VALUES(model),
    year = VALUES(year),
    color = VALUES(color),
    transmission = VALUES(transmission),
    fuel_type = VALUES(fuel_type),
    seats = VALUES(seats),
    odometer_km = VALUES(odometer_km),
    status = VALUES(status),
    registration_expiry = VALUES(registration_expiry),
    insurance_expiry = VALUES(insurance_expiry),
    notes = VALUES(notes);

INSERT INTO reservations (
    reservation_no, vehicle_id, requester_id, approver_id, assigned_driver_id,
    pickup_location_id, dropoff_location_id, purpose, destination,
    start_at, end_at, approved_at, assigned_at,
    passengers, priority, status, remarks
)
SELECT
    CONCAT('SEED-FULL-', DATE_FORMAT(fd.work_date, '%Y%m%d'), '-', v.vehicle_code) AS reservation_no,
    v.id AS vehicle_id,
    rq.id AS requester_id,
    m.id AS approver_id,
    d.id AS assigned_driver_id,
    lp.id AS pickup_location_id,
    ld.id AS dropoff_location_id,
    CONCAT('Full utilization trip for ', v.vehicle_code) AS purpose,
    'Metro Route' AS destination,
    DATE_ADD(TIMESTAMP(fd.work_date, '08:00:00'), INTERVAL ((map.rn - 1) * 80) MINUTE) AS start_at,
    DATE_ADD(TIMESTAMP(fd.work_date, '09:00:00'), INTERVAL ((map.rn - 1) * 80) MINUTE) AS end_at,
    DATE_SUB(TIMESTAMP(fd.work_date, '07:00:00'), INTERVAL 1 DAY) AS approved_at,
    DATE_SUB(TIMESTAMP(fd.work_date, '07:30:00'), INTERVAL 1 DAY) AS assigned_at,
    2 AS passengers,
    'high' AS priority,
    'approved' AS status,
    'Seeded fully-booked vehicle day' AS remarks
FROM (
    SELECT DATE('2026-03-10') AS work_date
    UNION ALL SELECT DATE('2026-03-11')
    UNION ALL SELECT DATE('2026-03-12')
    UNION ALL SELECT DATE('2026-03-13')
    UNION ALL SELECT DATE('2026-03-14')
) fd
INNER JOIN (
    SELECT 1 AS rn, 'VH-0001' AS vehicle_code, 'driver1@vmrs.local' AS driver_email, 'requester1@vmrs.local' AS requester_email
    UNION ALL SELECT 2, 'VH-0002', 'driver2@vmrs.local', 'requester2@vmrs.local'
    UNION ALL SELECT 3, 'VH-0003', 'driver3@vmrs.local', 'requester1@vmrs.local'
    UNION ALL SELECT 4, 'VH-0004', 'driver4@vmrs.local', 'requester2@vmrs.local'
    UNION ALL SELECT 5, 'VH-0005', 'driver5@vmrs.local', 'requester1@vmrs.local'
) map
INNER JOIN vehicles v ON v.vehicle_code = map.vehicle_code
INNER JOIN users d ON d.email = map.driver_email
INNER JOIN users rq ON rq.email = map.requester_email
INNER JOIN users m ON m.email = 'manager@vmrs.local'
INNER JOIN locations lp ON lp.name = 'Main Garage'
INNER JOIN locations ld ON ld.name = 'South Hub';

INSERT IGNORE INTO reservations (
    reservation_no, vehicle_id, requester_id, approver_id, assigned_driver_id,
    pickup_location_id, dropoff_location_id, purpose, destination,
    start_at, end_at, approved_at, assigned_at,
    passengers, priority, status, rejection_reason, remarks, cancelled_at
)
SELECT
    CONCAT('SEED-REQ-', LPAD(s.n, 4, '0')) AS reservation_no,
    v.id AS vehicle_id,
    rq.id AS requester_id,
    CASE WHEN s.n % 5 IN (1,2) THEN m.id ELSE NULL END AS approver_id,
    CASE WHEN s.n % 5 IN (1,2) THEN d.id ELSE NULL END AS assigned_driver_id,
    lp.id AS pickup_location_id,
    ld.id AS dropoff_location_id,
    CONCAT('Seed request #', s.n) AS purpose,
    CONCAT('Destination #', ((s.n - 1) MOD 12) + 1) AS destination,
    DATE_ADD(TIMESTAMP(DATE_ADD('2026-03-01', INTERVAL FLOOR((s.n - 1) / 5) DAY), '08:00:00'), INTERVAL (((s.n - 1) MOD 5) * 90) MINUTE) AS start_at,
    DATE_ADD(TIMESTAMP(DATE_ADD('2026-03-01', INTERVAL FLOOR((s.n - 1) / 5) DAY), '09:00:00'), INTERVAL (((s.n - 1) MOD 5) * 90) MINUTE) AS end_at,
    CASE WHEN s.n % 5 IN (1,2) THEN DATE_SUB(TIMESTAMP(DATE_ADD('2026-03-01', INTERVAL FLOOR((s.n - 1) / 5) DAY), '07:00:00'), INTERVAL 1 DAY) ELSE NULL END AS approved_at,
    CASE WHEN s.n % 5 IN (1,2) THEN DATE_SUB(TIMESTAMP(DATE_ADD('2026-03-01', INTERVAL FLOOR((s.n - 1) / 5) DAY), '07:30:00'), INTERVAL 1 DAY) ELSE NULL END AS assigned_at,
    ((s.n - 1) MOD 6) + 1 AS passengers,
    ELT(((s.n - 1) MOD 4) + 1, 'low', 'normal', 'high', 'urgent') AS priority,
    CASE
        WHEN s.n % 5 = 0 THEN 'pending'
        WHEN s.n % 5 = 1 THEN 'approved'
        WHEN s.n % 5 = 2 THEN 'completed'
        WHEN s.n % 5 = 3 THEN 'rejected'
        ELSE 'cancelled'
    END AS status,
    CASE WHEN s.n % 5 = 3 THEN 'Insufficient details' ELSE NULL END AS rejection_reason,
    CONCAT('Bulk seeded request ', s.n) AS remarks,
    CASE WHEN s.n % 5 = 4 THEN TIMESTAMP(DATE_ADD('2026-03-01', INTERVAL FLOOR((s.n - 1) / 5) DAY), '06:30:00') ELSE NULL END AS cancelled_at
FROM (
    SELECT @seed_n := @seed_n + 1 AS n
    FROM (SELECT 1 FROM information_schema.columns LIMIT 20) a
    CROSS JOIN (SELECT 1 FROM information_schema.columns LIMIT 20) b
    CROSS JOIN (SELECT @seed_n := 0) seed_init
    LIMIT 100
) s
INNER JOIN (
    SELECT 1 AS rn, 'VH-0001' AS vehicle_code
    UNION ALL SELECT 2, 'VH-0002'
    UNION ALL SELECT 3, 'VH-0003'
    UNION ALL SELECT 4, 'VH-0004'
    UNION ALL SELECT 5, 'VH-0005'
) vm ON vm.rn = ((s.n - 1) MOD 5) + 1
INNER JOIN vehicles v ON v.vehicle_code = vm.vehicle_code
INNER JOIN (
    SELECT 1 AS rn, 'driver1@vmrs.local' AS driver_email
    UNION ALL SELECT 2, 'driver2@vmrs.local'
    UNION ALL SELECT 3, 'driver3@vmrs.local'
    UNION ALL SELECT 4, 'driver4@vmrs.local'
    UNION ALL SELECT 5, 'driver5@vmrs.local'
) dm ON dm.rn = ((s.n - 1) MOD 5) + 1
INNER JOIN users d ON d.email = dm.driver_email
INNER JOIN (
    SELECT 1 AS rn, 'requester1@vmrs.local' AS requester_email
    UNION ALL SELECT 2, 'requester2@vmrs.local'
) rm ON rm.rn = ((s.n - 1) MOD 2) + 1
INNER JOIN users rq ON rq.email = rm.requester_email
INNER JOIN users m ON m.email = 'manager@vmrs.local'
INNER JOIN locations lp ON lp.name = 'Main Garage'
INNER JOIN locations ld ON ld.name = 'North Depot';
