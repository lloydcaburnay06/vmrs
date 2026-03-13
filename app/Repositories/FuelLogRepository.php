<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\FuelLog;
use PDO;
use Throwable;

class FuelLogRepository extends BaseRepository
{
    protected function table(): string
    {
        return 'fuel_logs';
    }

    /**
     * @return FuelLog[]
     */
    public function all(): array
    {
        return array_map(static fn(array $row): FuelLog => FuelLog::fromArray($row), $this->findAllRaw());
    }

    public function find(int $id): ?FuelLog
    {
        $row = $this->findByIdRaw($id);

        return $row ? FuelLog::fromArray($row) : null;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function allForAdmin(): array
    {
        $sql = 'SELECT fl.id, fl.vehicle_id, v.vehicle_code, CONCAT(v.make, " ", v.model) AS vehicle_name,
                       fl.recorded_by, CONCAT(u.first_name, " ", u.last_name) AS recorded_by_name,
                       fl.fueled_at, fl.odometer_km, fl.liters, fl.unit_price, fl.total_cost,
                       fl.fuel_station, fl.notes, fl.created_at
                FROM fuel_logs fl
                INNER JOIN vehicles v ON v.id = fl.vehicle_id
                LEFT JOIN users u ON u.id = fl.recorded_by
                ORDER BY fl.fueled_at DESC, fl.id DESC';

        return $this->db->query($sql)->fetchAll();
    }

    /**
     * @return array<string, mixed>|null
     */
    public function findForAdmin(int $id): ?array
    {
        $sql = 'SELECT fl.id, fl.vehicle_id, v.vehicle_code, CONCAT(v.make, " ", v.model) AS vehicle_name,
                       fl.recorded_by, CONCAT(u.first_name, " ", u.last_name) AS recorded_by_name,
                       fl.fueled_at, fl.odometer_km, fl.liters, fl.unit_price, fl.total_cost,
                       fl.fuel_station, fl.notes, fl.created_at
                FROM fuel_logs fl
                INNER JOIN vehicles v ON v.id = fl.vehicle_id
                LEFT JOIN users u ON u.id = fl.recorded_by
                WHERE fl.id = :id
                LIMIT 1';

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
        $this->db->beginTransaction();

        try {
            $statement = $this->db->prepare(
                'INSERT INTO fuel_logs (
                    vehicle_id, recorded_by, fueled_at, odometer_km, liters, unit_price, total_cost, fuel_station, notes
                 ) VALUES (
                    :vehicle_id, :recorded_by, :fueled_at, :odometer_km, :liters, :unit_price, :total_cost, :fuel_station, :notes
                 )'
            );
            $this->bindPayload($statement, $input);
            $statement->execute();

            $this->syncVehicleOdometer((int) $input['vehicle_id'], $input['odometer_km']);

            $this->db->commit();

            return (int) $this->db->lastInsertId();
        } catch (Throwable $throwable) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }

            throw $throwable;
        }
    }

    /**
     * @param array<string, mixed> $input
     */
    public function updateById(int $id, array $input): bool
    {
        $existing = $this->findForAdmin($id);
        if (!$existing) {
            return false;
        }

        $this->db->beginTransaction();

        try {
            $statement = $this->db->prepare(
                'UPDATE fuel_logs
                 SET vehicle_id = :vehicle_id,
                     fueled_at = :fueled_at,
                     odometer_km = :odometer_km,
                     liters = :liters,
                     unit_price = :unit_price,
                     total_cost = :total_cost,
                     fuel_station = :fuel_station,
                     notes = :notes
                 WHERE id = :id'
            );
            $this->bindPayload($statement, $input, false);
            $statement->bindValue(':id', $id, PDO::PARAM_INT);
            $statement->execute();

            $this->syncVehicleOdometer((int) $input['vehicle_id'], $input['odometer_km']);

            $this->db->commit();
            return true;
        } catch (Throwable $throwable) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }

            throw $throwable;
        }
    }

    public function deleteById(int $id): bool
    {
        $statement = $this->db->prepare('DELETE FROM fuel_logs WHERE id = :id');
        $statement->bindValue(':id', $id, PDO::PARAM_INT);

        return $statement->execute();
    }

    /**
     * @param array<string, mixed> $input
     */
    private function bindPayload(\PDOStatement $statement, array $input, bool $includeRecordedBy = true): void
    {
        $statement->bindValue(':vehicle_id', (int) $input['vehicle_id'], PDO::PARAM_INT);
        if ($includeRecordedBy) {
            $statement->bindValue(
                ':recorded_by',
                $input['recorded_by'],
                $input['recorded_by'] === null ? PDO::PARAM_NULL : PDO::PARAM_INT
            );
        }
        $statement->bindValue(':fueled_at', $input['fueled_at']);
        $statement->bindValue(':odometer_km', $input['odometer_km'], $input['odometer_km'] === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
        $statement->bindValue(':liters', $input['liters']);
        $statement->bindValue(':unit_price', $input['unit_price'], $input['unit_price'] === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
        $statement->bindValue(':total_cost', $input['total_cost'], $input['total_cost'] === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
        $statement->bindValue(':fuel_station', $input['fuel_station'], $input['fuel_station'] === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
        $statement->bindValue(':notes', $input['notes'], $input['notes'] === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
    }

    private function syncVehicleOdometer(int $vehicleId, ?float $odometerKm): void
    {
        if ($odometerKm === null) {
            return;
        }

        $statement = $this->db->prepare(
            'UPDATE vehicles
             SET odometer_km = CASE
                    WHEN :odometer_km > odometer_km THEN :odometer_km
                    ELSE odometer_km
                 END,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = :id'
        );
        $statement->bindValue(':id', $vehicleId, PDO::PARAM_INT);
        $statement->bindValue(':odometer_km', $odometerKm);
        $statement->execute();
    }
}
