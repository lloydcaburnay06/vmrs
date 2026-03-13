ALTER TABLE users
    MODIFY COLUMN status ENUM('pending','active','inactive','suspended') NOT NULL DEFAULT 'active';
