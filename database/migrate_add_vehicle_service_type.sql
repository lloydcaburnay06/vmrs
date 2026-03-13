ALTER TABLE vehicles
    ADD COLUMN IF NOT EXISTS service_type ENUM('ambulance','administrative') NOT NULL DEFAULT 'administrative' AFTER type_id;

UPDATE vehicles
SET service_type = 'ambulance'
WHERE (
    UPPER(vehicle_code) LIKE 'AMB%'
    OR UPPER(notes) LIKE '%AMBULANCE%'
)
AND service_type = 'administrative';
