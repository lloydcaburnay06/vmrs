INSERT INTO roles (name, description)
VALUES
    ('cao', 'Chief Administrative Officer approving travel requests')
ON DUPLICATE KEY UPDATE
    description = VALUES(description);

UPDATE roles
SET description = 'Coordinates fleet operations'
WHERE name = 'manager';

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

UPDATE reservations
SET remarks = 'Awaiting CAO approval'
WHERE status = 'pending'
  AND remarks = 'Awaiting manager approval';
