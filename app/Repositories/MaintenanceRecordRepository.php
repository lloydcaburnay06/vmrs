<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\MaintenanceRecord;
use PDO;
use Throwable;

class MaintenanceRecordRepository extends BaseRepository
{
    protected function table(): string
    {
        return 'maintenance_records';
    }

    /**
     * @return MaintenanceRecord[]
     */
    public function all(): array
    {
        return array_map(static fn(array $row): MaintenanceRecord => MaintenanceRecord::fromArray($row), $this->findAllRaw());
    }

    public function find(int $id): ?MaintenanceRecord
    {
        $row = $this->findByIdRaw($id);

        return $row ? MaintenanceRecord::fromArray($row) : null;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function allForAdmin(): array
    {
        $sql = 'SELECT mr.id, mr.vehicle_id, v.vehicle_code, CONCAT(v.make, " ", v.model) AS vehicle_name,
                       mr.recorded_by, CONCAT(u.first_name, " ", u.last_name) AS recorded_by_name,
                       mr.maintenance_type, mr.description, mr.vendor, mr.service_date, mr.odometer_km, mr.cost,
                       mr.next_service_date, mr.status, mr.created_at, mr.updated_at
                FROM maintenance_records mr
                INNER JOIN vehicles v ON v.id = mr.vehicle_id
                LEFT JOIN users u ON u.id = mr.recorded_by
                ORDER BY CASE
                    WHEN mr.status = "open" THEN 0
                    WHEN mr.status = "in_progress" THEN 1
                    ELSE 2
                END ASC,
                mr.service_date DESC,
                mr.id DESC';

        return $this->db->query($sql)->fetchAll();
    }

    /**
     * @return array<string, mixed>|null
     */
    public function findForAdmin(int $id): ?array
    {
        $sql = 'SELECT mr.id, mr.vehicle_id, v.vehicle_code, CONCAT(v.make, " ", v.model) AS vehicle_name,
                       mr.recorded_by, CONCAT(u.first_name, " ", u.last_name) AS recorded_by_name,
                       mr.maintenance_type, mr.description, mr.vendor, mr.service_date, mr.odometer_km, mr.cost,
                       mr.next_service_date, mr.status, mr.created_at, mr.updated_at
                FROM maintenance_records mr
                INNER JOIN vehicles v ON v.id = mr.vehicle_id
                LEFT JOIN users u ON u.id = mr.recorded_by
                WHERE mr.id = :id
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
                'INSERT INTO maintenance_records (
                    vehicle_id, recorded_by, maintenance_type, description, vendor, service_date,
                    odometer_km, cost, next_service_date, status
                 ) VALUES (
                    :vehicle_id, :recorded_by, :maintenance_type, :description, :vendor, :service_date,
                    :odometer_km, :cost, :next_service_date, :status
                 )'
            );
            $this->bindPayload($statement, $input);
            $statement->execute();

            $vehicleId = (int) $input['vehicle_id'];
            $this->syncVehicleStatus($vehicleId);

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
                'UPDATE maintenance_records
                 SET vehicle_id = :vehicle_id,
                     maintenance_type = :maintenance_type,
                     description = :description,
                     vendor = :vendor,
                     service_date = :service_date,
                     odometer_km = :odometer_km,
                     cost = :cost,
                     next_service_date = :next_service_date,
                     status = :status,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = :id'
            );
            $this->bindPayload($statement, $input, false);
            $statement->bindValue(':id', $id, PDO::PARAM_INT);
            $statement->execute();

            $this->syncVehicleStatus((int) $existing['vehicle_id']);
            if ((int) $existing['vehicle_id'] !== (int) $input['vehicle_id']) {
                $this->syncVehicleStatus((int) $input['vehicle_id']);
            }

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
        $existing = $this->findForAdmin($id);
        if (!$existing) {
            return false;
        }

        $this->db->beginTransaction();

        try {
            $statement = $this->db->prepare('DELETE FROM maintenance_records WHERE id = :id');
            $statement->bindValue(':id', $id, PDO::PARAM_INT);
            $statement->execute();

            $this->syncVehicleStatus((int) $existing['vehicle_id']);

            $this->db->commit();
            return true;
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
        $statement->bindValue(':maintenance_type', $input['maintenance_type']);
        $statement->bindValue(':description', $input['description']);
        $statement->bindValue(':vendor', $input['vendor']);
        $statement->bindValue(':service_date', $input['service_date']);
        $statement->bindValue(':odometer_km', $input['odometer_km'], $input['odometer_km'] === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
        $statement->bindValue(':cost', $input['cost'], $input['cost'] === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
        $statement->bindValue(':next_service_date', $input['next_service_date'], $input['next_service_date'] === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
        $statement->bindValue(':status', $input['status']);
    }

    private function syncVehicleStatus(int $vehicleId): void
    {
        $activeStatement = $this->db->prepare(
            'SELECT COUNT(*)
             FROM maintenance_records
             WHERE vehicle_id = :vehicle_id
               AND status IN ("open", "in_progress")'
        );
        $activeStatement->bindValue(':vehicle_id', $vehicleId, PDO::PARAM_INT);
        $activeStatement->execute();
        $activeCount = (int) $activeStatement->fetchColumn();

        $statusStatement = $this->db->prepare('SELECT status FROM vehicles WHERE id = :id LIMIT 1');
        $statusStatement->bindValue(':id', $vehicleId, PDO::PARAM_INT);
        $statusStatement->execute();
        $currentStatus = (string) $statusStatement->fetchColumn();

        if ($activeCount > 0 && in_array($currentStatus, ['available', 'reserved'], true)) {
            $updateVehicle = $this->db->prepare(
                'UPDATE vehicles SET status = "maintenance", updated_at = CURRENT_TIMESTAMP WHERE id = :id'
            );
            $updateVehicle->bindValue(':id', $vehicleId, PDO::PARAM_INT);
            $updateVehicle->execute();
            return;
        }

        if ($activeCount === 0 && $currentStatus === 'maintenance') {
            $updateVehicle = $this->db->prepare(
                'UPDATE vehicles SET status = "available", updated_at = CURRENT_TIMESTAMP WHERE id = :id'
            );
            $updateVehicle->bindValue(':id', $vehicleId, PDO::PARAM_INT);
            $updateVehicle->execute();
        }
    }
}
