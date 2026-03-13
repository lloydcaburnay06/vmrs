<?php

declare(strict_types=1);

namespace App\Repositories;

use PDO;

class DriverWorkScheduleRepository
{
    public function __construct(private readonly PDO $db)
    {
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function all(string $startDate, string $endDate): array
    {
        $sql = 'SELECT dws.id, dws.driver_id, CONCAT(u.first_name, " ", u.last_name) AS driver_name,
                       dws.work_date, dws.start_time, dws.end_time, dws.shift_code, dws.shift_type, dws.status, dws.notes,
                       dws.created_at, dws.updated_at
                FROM driver_work_schedules dws
                INNER JOIN users u ON u.id = dws.driver_id
                WHERE dws.work_date BETWEEN :start_date AND :end_date
                ORDER BY dws.work_date ASC, dws.start_time ASC';

        $statement = $this->db->prepare($sql);
        $statement->bindValue(':start_date', $startDate);
        $statement->bindValue(':end_date', $endDate);
        $statement->execute();

        return $statement->fetchAll();
    }

    /**
     * @return array<string, mixed>|null
     */
    public function find(int $id): ?array
    {
        $sql = 'SELECT dws.id, dws.driver_id, CONCAT(u.first_name, " ", u.last_name) AS driver_name,
                       dws.work_date, dws.start_time, dws.end_time, dws.shift_code, dws.shift_type, dws.status, dws.notes,
                       dws.created_at, dws.updated_at
                FROM driver_work_schedules dws
                INNER JOIN users u ON u.id = dws.driver_id
                WHERE dws.id = :id
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
        $sql = 'INSERT INTO driver_work_schedules (driver_id, work_date, start_time, end_time, shift_code, shift_type, status, notes)
                VALUES (:driver_id, :work_date, :start_time, :end_time, :shift_code, :shift_type, :status, :notes)';

        $statement = $this->db->prepare($sql);
        $statement->bindValue(':driver_id', (int) $input['driver_id'], PDO::PARAM_INT);
        $statement->bindValue(':work_date', $input['work_date']);
        $statement->bindValue(
            ':start_time',
            $input['start_time'],
            $input['start_time'] === null ? PDO::PARAM_NULL : PDO::PARAM_STR
        );
        $statement->bindValue(
            ':end_time',
            $input['end_time'],
            $input['end_time'] === null ? PDO::PARAM_NULL : PDO::PARAM_STR
        );
        $statement->bindValue(':shift_code', $input['shift_code']);
        $statement->bindValue(':shift_type', $input['shift_type']);
        $statement->bindValue(':status', $input['status']);
        $statement->bindValue(':notes', $input['notes']);
        $statement->execute();

        return (int) $this->db->lastInsertId();
    }

    /**
     * @param array<string, mixed> $input
     */
    public function update(int $id, array $input): bool
    {
        $sql = 'UPDATE driver_work_schedules
                SET driver_id = :driver_id,
                    work_date = :work_date,
                    start_time = :start_time,
                    end_time = :end_time,
                    shift_code = :shift_code,
                    shift_type = :shift_type,
                    status = :status,
                    notes = :notes,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = :id';

        $statement = $this->db->prepare($sql);
        $statement->bindValue(':id', $id, PDO::PARAM_INT);
        $statement->bindValue(':driver_id', (int) $input['driver_id'], PDO::PARAM_INT);
        $statement->bindValue(':work_date', $input['work_date']);
        $statement->bindValue(
            ':start_time',
            $input['start_time'],
            $input['start_time'] === null ? PDO::PARAM_NULL : PDO::PARAM_STR
        );
        $statement->bindValue(
            ':end_time',
            $input['end_time'],
            $input['end_time'] === null ? PDO::PARAM_NULL : PDO::PARAM_STR
        );
        $statement->bindValue(':shift_code', $input['shift_code']);
        $statement->bindValue(':shift_type', $input['shift_type']);
        $statement->bindValue(':status', $input['status']);
        $statement->bindValue(':notes', $input['notes']);
        $statement->execute();

        return $statement->rowCount() > 0;
    }

    public function delete(int $id): bool
    {
        $statement = $this->db->prepare('DELETE FROM driver_work_schedules WHERE id = :id');
        $statement->bindValue(':id', $id, PDO::PARAM_INT);
        $statement->execute();

        return $statement->rowCount() > 0;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function availableDriversForWindow(string $workDate, string $startTime, string $endTime): array
    {
        $sql = "SELECT DISTINCT dws.driver_id, CONCAT(u.first_name, ' ', u.last_name) AS driver_name
                FROM driver_work_schedules dws
                INNER JOIN users u ON u.id = dws.driver_id
                INNER JOIN roles r ON r.id = u.role_id AND r.name = 'driver'
                WHERE dws.work_date = :work_date
                  AND dws.status = 'scheduled'
                  AND dws.shift_type IN ('regular', 'overtime')
                  AND dws.start_time <= :start_time
                  AND dws.end_time >= :end_time
                  AND u.status = 'active'
                ORDER BY u.first_name ASC, u.last_name ASC";

        $statement = $this->db->prepare($sql);
        $statement->bindValue(':work_date', $workDate);
        $statement->bindValue(':start_time', $startTime);
        $statement->bindValue(':end_time', $endTime);
        $statement->execute();

        return $statement->fetchAll();
    }

    public function existsForDriverDate(int $driverId, string $workDate): bool
    {
        $statement = $this->db->prepare(
            'SELECT COUNT(*) FROM driver_work_schedules WHERE driver_id = :driver_id AND work_date = :work_date'
        );
        $statement->bindValue(':driver_id', $driverId, PDO::PARAM_INT);
        $statement->bindValue(':work_date', $workDate);
        $statement->execute();

        return (int) $statement->fetchColumn() > 0;
    }

    public function createDefaultShift(int $driverId, string $workDate, string $startTime, string $endTime): int
    {
        $statement = $this->db->prepare(
            "INSERT INTO driver_work_schedules
                (driver_id, work_date, start_time, end_time, shift_code, shift_type, status, notes)
             VALUES
                (:driver_id, :work_date, :start_time, :end_time, 'S8_5', 'regular', 'scheduled', 'Auto-generated shift')"
        );
        $statement->bindValue(':driver_id', $driverId, PDO::PARAM_INT);
        $statement->bindValue(':work_date', $workDate);
        $statement->bindValue(':start_time', $startTime);
        $statement->bindValue(':end_time', $endTime);
        $statement->execute();

        return (int) $this->db->lastInsertId();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function schedulesByDriversAndDateRange(array $driverIds, string $startDate, string $endDate): array
    {
        if ($driverIds === []) {
            return [];
        }

        $placeholders = [];
        $params = [
            ':start_date' => $startDate,
            ':end_date' => $endDate,
        ];

        foreach (array_values($driverIds) as $index => $driverId) {
            $key = ':driver_' . $index;
            $placeholders[] = $key;
            $params[$key] = (int) $driverId;
        }

        $sql = sprintf(
            'SELECT driver_id, work_date, shift_code, status
             FROM driver_work_schedules
             WHERE driver_id IN (%s)
               AND work_date BETWEEN :start_date AND :end_date',
            implode(', ', $placeholders)
        );

        $statement = $this->db->prepare($sql);

        foreach ($params as $key => $value) {
            if (str_starts_with($key, ':driver_')) {
                $statement->bindValue($key, $value, PDO::PARAM_INT);
                continue;
            }

            $statement->bindValue($key, $value);
        }

        $statement->execute();

        return $statement->fetchAll();
    }

    public function hasSchedulesInRange(string $startDate, string $endDate): bool
    {
        $statement = $this->db->prepare(
            'SELECT COUNT(*) FROM driver_work_schedules WHERE work_date BETWEEN :start_date AND :end_date'
        );
        $statement->bindValue(':start_date', $startDate);
        $statement->bindValue(':end_date', $endDate);
        $statement->execute();

        return (int) $statement->fetchColumn() > 0;
    }

    /**
     * @return array<string, mixed>|null
     */
    public function findByDriverDate(int $driverId, string $workDate): ?array
    {
        $statement = $this->db->prepare(
            'SELECT id, driver_id, work_date, start_time, end_time, shift_code, shift_type, status, notes
             FROM driver_work_schedules
             WHERE driver_id = :driver_id AND work_date = :work_date
             LIMIT 1'
        );
        $statement->bindValue(':driver_id', $driverId, PDO::PARAM_INT);
        $statement->bindValue(':work_date', $workDate);
        $statement->execute();
        $row = $statement->fetch();

        return is_array($row) ? $row : null;
    }

    public function deleteByDriverDate(int $driverId, string $workDate): bool
    {
        $statement = $this->db->prepare(
            'DELETE FROM driver_work_schedules WHERE driver_id = :driver_id AND work_date = :work_date'
        );
        $statement->bindValue(':driver_id', $driverId, PDO::PARAM_INT);
        $statement->bindValue(':work_date', $workDate);
        $statement->execute();

        return $statement->rowCount() > 0;
    }
}
