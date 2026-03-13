ALTER TABLE reservations
    ADD COLUMN assigned_driver_id BIGINT UNSIGNED NULL AFTER approver_id,
    ADD COLUMN approved_at DATETIME NULL AFTER actual_end_at,
    ADD COLUMN assigned_at DATETIME NULL AFTER approved_at,
    ADD CONSTRAINT fk_reservations_assigned_driver FOREIGN KEY (assigned_driver_id) REFERENCES users(id)
        ON UPDATE CASCADE ON DELETE SET NULL;
