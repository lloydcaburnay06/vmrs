<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\Vehicle;
use PDO;

class VehicleRepository extends BaseRepository
{
    protected function table(): string
    {
        return 'vehicles';
    }

    /**
     * @return Vehicle[]
     */
    public function all(): array
    {
        return array_map(static fn(array $row): Vehicle => Vehicle::fromArray($row), $this->findAllRaw());
    }

    public function find(int $id): ?Vehicle
    {
        $row = $this->findByIdRaw($id);

        return $row ? Vehicle::fromArray($row) : null;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function allForAdmin(): array
    {
        $sql = "SELECT v.id, v.vehicle_code, v.plate_no, v.vin, v.type_id, vt.name AS type_name,
                       v.service_type, v.current_location_id, l.name AS location_name, v.make, v.model, v.year, v.color,
                       v.transmission, v.fuel_type, v.seats, v.payload_kg, v.odometer_km, v.status,
                       v.registration_expiry, v.insurance_expiry, v.notes, v.created_at, v.updated_at
                FROM vehicles v
                INNER JOIN vehicle_types vt ON vt.id = v.type_id
                LEFT JOIN locations l ON l.id = v.current_location_id
                ORDER BY v.id DESC";

        return $this->db->query($sql)->fetchAll();
    }

    /**
     * @return array<string, mixed>|null
     */
    public function findForAdmin(int $id): ?array
    {
        $sql = "SELECT v.id, v.vehicle_code, v.plate_no, v.vin, v.type_id, vt.name AS type_name,
                       v.service_type, v.current_location_id, l.name AS location_name, v.make, v.model, v.year, v.color,
                       v.transmission, v.fuel_type, v.seats, v.payload_kg, v.odometer_km, v.status,
                       v.registration_expiry, v.insurance_expiry, v.notes, v.created_at, v.updated_at
                FROM vehicles v
                INNER JOIN vehicle_types vt ON vt.id = v.type_id
                LEFT JOIN locations l ON l.id = v.current_location_id
                WHERE v.id = :id
                LIMIT 1";

        $statement = $this->db->prepare($sql);
        $statement->bindValue(':id', $id, PDO::PARAM_INT);
        $statement->execute();
        $row = $statement->fetch();

        return is_array($row) ? $row : null;
    }

    /**
     * @param array<string, mixed> $input
     */
    public function create(array $input): int
    {
        $sql = "INSERT INTO vehicles (
                    vehicle_code, plate_no, vin, type_id, service_type, current_location_id, make, model, year, color,
                    transmission, fuel_type, seats, payload_kg, odometer_km, status, registration_expiry,
                    insurance_expiry, notes
                ) VALUES (
                    :vehicle_code, :plate_no, :vin, :type_id, :service_type, :current_location_id, :make, :model, :year, :color,
                    :transmission, :fuel_type, :seats, :payload_kg, :odometer_km, :status, :registration_expiry,
                    :insurance_expiry, :notes
                )";

        $statement = $this->db->prepare($sql);
        $this->bindVehiclePayload($statement, $input);
        $statement->execute();

        return (int) $this->db->lastInsertId();
    }

    /**
     * @param array<string, mixed> $input
     */
    public function updateById(int $id, array $input): bool
    {
        $sql = "UPDATE vehicles
                SET vehicle_code = :vehicle_code,
                    plate_no = :plate_no,
                    vin = :vin,
                    type_id = :type_id,
                    service_type = :service_type,
                    current_location_id = :current_location_id,
                    make = :make,
                    model = :model,
                    year = :year,
                    color = :color,
                    transmission = :transmission,
                    fuel_type = :fuel_type,
                    seats = :seats,
                    payload_kg = :payload_kg,
                    odometer_km = :odometer_km,
                    status = :status,
                    registration_expiry = :registration_expiry,
                    insurance_expiry = :insurance_expiry,
                    notes = :notes
                WHERE id = :id";

        $statement = $this->db->prepare($sql);
        $this->bindVehiclePayload($statement, $input);
        $statement->bindValue(':id', $id, PDO::PARAM_INT);

        return $statement->execute();
    }

    public function deleteById(int $id): bool
    {
        $statement = $this->db->prepare('DELETE FROM vehicles WHERE id = :id');
        $statement->bindValue(':id', $id, PDO::PARAM_INT);

        return $statement->execute();
    }

    /**
     * @param array<string, mixed> $input
     */
    private function bindVehiclePayload(\PDOStatement $statement, array $input): void
    {
        $statement->bindValue(':vehicle_code', $input['vehicle_code']);
        $statement->bindValue(':plate_no', $input['plate_no']);
        $statement->bindValue(':vin', $input['vin']);
        $statement->bindValue(':type_id', (int) $input['type_id'], PDO::PARAM_INT);
        $statement->bindValue(':service_type', $input['service_type']);
        $statement->bindValue(':current_location_id', $input['current_location_id'], $input['current_location_id'] === null ? PDO::PARAM_NULL : PDO::PARAM_INT);
        $statement->bindValue(':make', $input['make']);
        $statement->bindValue(':model', $input['model']);
        $statement->bindValue(':year', $input['year'], $input['year'] === null ? PDO::PARAM_NULL : PDO::PARAM_INT);
        $statement->bindValue(':color', $input['color']);
        $statement->bindValue(':transmission', $input['transmission']);
        $statement->bindValue(':fuel_type', $input['fuel_type']);
        $statement->bindValue(':seats', $input['seats'], $input['seats'] === null ? PDO::PARAM_NULL : PDO::PARAM_INT);
        $statement->bindValue(':payload_kg', $input['payload_kg']);
        $statement->bindValue(':odometer_km', $input['odometer_km']);
        $statement->bindValue(':status', $input['status']);
        $statement->bindValue(':registration_expiry', $input['registration_expiry']);
        $statement->bindValue(':insurance_expiry', $input['insurance_expiry']);
        $statement->bindValue(':notes', $input['notes']);
    }
}
