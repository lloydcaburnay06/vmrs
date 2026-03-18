<?php

declare(strict_types=1);

namespace App\Repositories;

use PDO;
use Throwable;

class TravelRequestRepository
{
    public function __construct(private readonly PDO $db)
    {
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function allForRole(string $role, int $userId): array
    {
        $sql = $this->baseQuery();

        if ($role === 'requester') {
            $sql .= ' WHERE r.requester_id = :user_id';
        } elseif ($role === 'driver') {
            $sql .= ' WHERE r.assigned_driver_id = :user_id';
        }

        $sql .= ' ORDER BY CASE WHEN r.status = "pending" THEN 0 ELSE 1 END ASC, r.start_at ASC, r.created_at ASC';

        $statement = $this->db->prepare($sql);

        if ($role === 'requester' || $role === 'driver') {
            $statement->bindValue(':user_id', $userId, PDO::PARAM_INT);
        }

        $statement->execute();

        return $this->attachPassengerNames($statement->fetchAll());
    }

    /**
     * @return array<string, mixed>|null
     */
    public function findById(int $id): ?array
    {
        $sql = $this->baseQuery() . ' WHERE r.id = :id LIMIT 1';
        $statement = $this->db->prepare($sql);
        $statement->bindValue(':id', $id, PDO::PARAM_INT);
        $statement->execute();
        $row = $statement->fetch();

        if (!is_array($row)) {
            return null;
        }

        $rows = $this->attachPassengerNames([$row]);
        return $rows[0] ?? null;
    }

    /**
     * @param array<string, mixed> $input
     */
    public function create(array $input): int
    {
        $this->db->beginTransaction();

        try {
            $sql = 'INSERT INTO reservations (
                        reservation_no, vehicle_id, requester_id, pickup_location_id, dropoff_location_id,
                        purpose, destination, start_at, end_at, passengers, priority, status, remarks
                    ) VALUES (
                        :reservation_no, :vehicle_id, :requester_id, :pickup_location_id, :dropoff_location_id,
                        :purpose, :destination, :start_at, :end_at, :passengers, :priority, "pending", :remarks
                    )';

            $statement = $this->db->prepare($sql);
            $statement->bindValue(':reservation_no', $input['reservation_no']);
            $statement->bindValue(':vehicle_id', (int) $input['vehicle_id'], PDO::PARAM_INT);
            $statement->bindValue(':requester_id', (int) $input['requester_id'], PDO::PARAM_INT);
            $statement->bindValue(':pickup_location_id', $input['pickup_location_id'], $input['pickup_location_id'] === null ? PDO::PARAM_NULL : PDO::PARAM_INT);
            $statement->bindValue(':dropoff_location_id', $input['dropoff_location_id'], $input['dropoff_location_id'] === null ? PDO::PARAM_NULL : PDO::PARAM_INT);
            $statement->bindValue(':purpose', $input['purpose']);
            $statement->bindValue(':destination', $input['destination']);
            $statement->bindValue(':start_at', $input['start_at']);
            $statement->bindValue(':end_at', $input['end_at']);
            $statement->bindValue(':passengers', $input['passengers'], $input['passengers'] === null ? PDO::PARAM_NULL : PDO::PARAM_INT);
            $statement->bindValue(':priority', $input['priority']);
            $statement->bindValue(':remarks', $input['remarks']);
            $statement->execute();

            $reservationId = (int) $this->db->lastInsertId();
            $this->replacePassengerNames($reservationId, $input['passenger_names'] ?? []);
            $this->db->commit();

            return $reservationId;
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
    public function updatePendingByRequester(int $id, int $requesterId, array $input): bool
    {
        $this->db->beginTransaction();

        try {
            $sql = 'UPDATE reservations
                    SET vehicle_id = :vehicle_id,
                        pickup_location_id = :pickup_location_id,
                        dropoff_location_id = :dropoff_location_id,
                        purpose = :purpose,
                        destination = :destination,
                        start_at = :start_at,
                        end_at = :end_at,
                        passengers = :passengers,
                        priority = :priority,
                        remarks = :remarks,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = :id
                      AND requester_id = :requester_id
                      AND status = "pending"';

            $statement = $this->db->prepare($sql);
            $statement->bindValue(':id', $id, PDO::PARAM_INT);
            $statement->bindValue(':requester_id', $requesterId, PDO::PARAM_INT);
            $statement->bindValue(':vehicle_id', (int) $input['vehicle_id'], PDO::PARAM_INT);
            $statement->bindValue(':pickup_location_id', $input['pickup_location_id'], $input['pickup_location_id'] === null ? PDO::PARAM_NULL : PDO::PARAM_INT);
            $statement->bindValue(':dropoff_location_id', $input['dropoff_location_id'], $input['dropoff_location_id'] === null ? PDO::PARAM_NULL : PDO::PARAM_INT);
            $statement->bindValue(':purpose', $input['purpose']);
            $statement->bindValue(':destination', $input['destination']);
            $statement->bindValue(':start_at', $input['start_at']);
            $statement->bindValue(':end_at', $input['end_at']);
            $statement->bindValue(':passengers', $input['passengers'], $input['passengers'] === null ? PDO::PARAM_NULL : PDO::PARAM_INT);
            $statement->bindValue(':priority', $input['priority']);
            $statement->bindValue(':remarks', $input['remarks']);
            $statement->execute();

            if ($statement->rowCount() <= 0) {
                $this->db->rollBack();
                return false;
            }

            $this->replacePassengerNames($id, $input['passenger_names'] ?? []);
            $this->db->commit();

            return true;
        } catch (Throwable $throwable) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }

            throw $throwable;
        }
    }

    public function approve(int $id, int $approverId): bool
    {
        $sql = 'UPDATE reservations
                SET status = "approved",
                    approver_id = :approver_id,
                    approved_at = NOW(),
                    rejection_reason = NULL,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = :id
                  AND status = "pending"';

        $statement = $this->db->prepare($sql);
        $statement->bindValue(':id', $id, PDO::PARAM_INT);
        $statement->bindValue(':approver_id', $approverId, PDO::PARAM_INT);
        $statement->execute();

        return $statement->rowCount() > 0;
    }

    public function reject(int $id, int $approverId, string $reason): bool
    {
        $statement = $this->db->prepare(
            'UPDATE reservations
             SET status = "rejected",
                 approver_id = :approver_id,
                 rejection_reason = :reason,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = :id
               AND status = "pending"'
        );
        $statement->bindValue(':id', $id, PDO::PARAM_INT);
        $statement->bindValue(':approver_id', $approverId, PDO::PARAM_INT);
        $statement->bindValue(':reason', $reason);
        $statement->execute();

        return $statement->rowCount() > 0;
    }

    public function assignDriver(int $id, int $driverId): bool
    {
        $statement = $this->db->prepare(
            'UPDATE reservations
             SET assigned_driver_id = :driver_id,
                 assigned_at = NOW(),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = :id
               AND status = "approved"'
        );
        $statement->bindValue(':id', $id, PDO::PARAM_INT);
        $statement->bindValue(':driver_id', $driverId, PDO::PARAM_INT);
        $statement->execute();

        return $statement->rowCount() > 0;
    }

    public function requesterCancel(int $id, int $requesterId): bool
    {
        $statement = $this->db->prepare(
            'UPDATE reservations
             SET status = "cancelled",
                 cancelled_at = NOW(),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = :id
               AND requester_id = :requester_id
               AND status = "pending"'
        );
        $statement->bindValue(':id', $id, PDO::PARAM_INT);
        $statement->bindValue(':requester_id', $requesterId, PDO::PARAM_INT);
        $statement->execute();

        return $statement->rowCount() > 0;
    }

    public function managerCancelApproved(int $id, int $managerId, string $reason): bool
    {
        $statement = $this->db->prepare(
            'UPDATE reservations
             SET status = "cancelled",
                 approver_id = :manager_id,
                 rejection_reason = :reason,
                 cancelled_at = NOW(),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = :id
               AND status = "approved"'
        );
        $statement->bindValue(':id', $id, PDO::PARAM_INT);
        $statement->bindValue(':manager_id', $managerId, PDO::PARAM_INT);
        $statement->bindValue(':reason', $reason);
        $statement->execute();

        return $statement->rowCount() > 0;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function driverSchedules(string $startDate, string $endDate, ?int $driverId = null): array
    {
        $sql = 'SELECT r.id, r.reservation_no, r.status, r.start_at, r.end_at, r.purpose, r.destination,
                       r.passengers, r.remarks,
                       r.assigned_driver_id,
                       CONCAT(d.first_name, " ", d.last_name) AS driver_name,
                       r.pickup_location_id, pl.name AS pickup_location_name,
                       r.vehicle_id, v.vehicle_code, CONCAT(v.make, " ", v.model) AS vehicle_name,
                       CONCAT(req.first_name, " ", req.last_name) AS requester_name
                FROM reservations r
                INNER JOIN vehicles v ON v.id = r.vehicle_id
                INNER JOIN users req ON req.id = r.requester_id
                LEFT JOIN users d ON d.id = r.assigned_driver_id
                LEFT JOIN locations pl ON pl.id = r.pickup_location_id
                WHERE r.status = "approved"
                  AND DATE(r.start_at) <= :end_date
                  AND DATE(r.end_at) >= :start_date';

        if ($driverId !== null) {
            $sql .= ' AND r.assigned_driver_id = :driver_id';
        }

        $sql .= '
                ORDER BY r.start_at ASC';

        $statement = $this->db->prepare($sql);
        $statement->bindValue(':start_date', $startDate);
        $statement->bindValue(':end_date', $endDate);
        if ($driverId !== null) {
            $statement->bindValue(':driver_id', $driverId, PDO::PARAM_INT);
        }
        $statement->execute();

        return $statement->fetchAll();
    }

    public function startTravel(
        int $reservationId,
        ?int $requiredAssignedDriverId,
        ?int $tripDriverId,
        string $checkOutAt,
        float $startOdometerKm,
        ?string $tripRemarks
    ): bool {
        $this->db->beginTransaction();

        try {
            $updateSql = 'UPDATE reservations
                          SET status = "active",
                              actual_start_at = :actual_start_at,
                              updated_at = CURRENT_TIMESTAMP
                          WHERE id = :id
                            AND status = "approved"';

            if ($requiredAssignedDriverId !== null) {
                $updateSql .= ' AND assigned_driver_id = :required_driver_id';
            }

            $updateStatement = $this->db->prepare($updateSql);
            $updateStatement->bindValue(':id', $reservationId, PDO::PARAM_INT);
            $updateStatement->bindValue(':actual_start_at', $checkOutAt);
            if ($requiredAssignedDriverId !== null) {
                $updateStatement->bindValue(':required_driver_id', $requiredAssignedDriverId, PDO::PARAM_INT);
            }
            $updateStatement->execute();

            if ($updateStatement->rowCount() <= 0) {
                $this->db->rollBack();
                return false;
            }

            $tripSql = 'INSERT INTO trip_logs (
                            reservation_id, driver_id, check_out_at, start_odometer_km, incident_report
                        ) VALUES (
                            :reservation_id, :driver_id, :check_out_at, :start_odometer_km, :incident_report
                        )
                        ON DUPLICATE KEY UPDATE
                            driver_id = VALUES(driver_id),
                            check_out_at = VALUES(check_out_at),
                            start_odometer_km = VALUES(start_odometer_km),
                            incident_report = VALUES(incident_report),
                            updated_at = CURRENT_TIMESTAMP';

            $tripStatement = $this->db->prepare($tripSql);
            $tripStatement->bindValue(':reservation_id', $reservationId, PDO::PARAM_INT);
            $tripStatement->bindValue(':driver_id', $tripDriverId, $tripDriverId === null ? PDO::PARAM_NULL : PDO::PARAM_INT);
            $tripStatement->bindValue(':check_out_at', $checkOutAt);
            $tripStatement->bindValue(':start_odometer_km', $startOdometerKm);
            $tripStatement->bindValue(':incident_report', $tripRemarks);
            $tripStatement->execute();

            $vehicleStatement = $this->db->prepare(
                'UPDATE vehicles
                 SET status = CASE
                        WHEN status IN ("available", "reserved") THEN "in_use"
                        ELSE status
                     END,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = (
                    SELECT vehicle_id
                    FROM reservations
                    WHERE id = :reservation_id
                    LIMIT 1
                 )'
            );
            $vehicleStatement->bindValue(':reservation_id', $reservationId, PDO::PARAM_INT);
            $vehicleStatement->execute();

            $this->db->commit();
            return true;
        } catch (Throwable $throwable) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }

            throw $throwable;
        }
    }

    public function reassignApprovedDriver(int $id, int $driverId): bool
    {
        $statement = $this->db->prepare(
            'UPDATE reservations
             SET assigned_driver_id = :driver_id,
                 assigned_at = NOW(),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = :id
               AND status = "approved"'
        );
        $statement->bindValue(':id', $id, PDO::PARAM_INT);
        $statement->bindValue(':driver_id', $driverId, PDO::PARAM_INT);
        $statement->execute();

        return $statement->rowCount() > 0;
    }

    public function unassignApprovedDriver(int $id): bool
    {
        $statement = $this->db->prepare(
            'UPDATE reservations
             SET assigned_driver_id = NULL,
                 assigned_at = NULL,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = :id
               AND status = "approved"'
        );
        $statement->bindValue(':id', $id, PDO::PARAM_INT);
        $statement->execute();

        return $statement->rowCount() > 0;
    }

    public function updateAssignmentBeforeTravel(int $id, int $vehicleId, ?int $driverId): bool
    {
        $assignDriverSql = $driverId === null
            ? 'assigned_driver_id = NULL, assigned_at = NULL,'
            : 'assigned_driver_id = :driver_id,
               assigned_at = CASE
                    WHEN assigned_driver_id <=> :driver_compare_id THEN assigned_at
                    ELSE NOW()
               END,';

        $sql = 'UPDATE reservations
                SET vehicle_id = :vehicle_id,
                    ' . $assignDriverSql . '
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = :id
                  AND status IN ("pending", "approved")';

        $statement = $this->db->prepare($sql);
        $statement->bindValue(':id', $id, PDO::PARAM_INT);
        $statement->bindValue(':vehicle_id', $vehicleId, PDO::PARAM_INT);

        if ($driverId !== null) {
            $statement->bindValue(':driver_id', $driverId, PDO::PARAM_INT);
            $statement->bindValue(':driver_compare_id', $driverId, PDO::PARAM_INT);
        }

        $statement->execute();

        return $statement->rowCount() > 0;
    }

    public function hasConflictForApprovedActive(int $vehicleId, string $startAt, string $endAt, ?int $excludeId = null): bool
    {
        $sql = 'SELECT COUNT(*)
                FROM reservations
                WHERE vehicle_id = :vehicle_id
                  AND status IN ("approved", "active")
                  AND :start_at < end_at
                  AND :end_at > start_at';

        if ($excludeId !== null) {
            $sql .= ' AND id <> :exclude_id';
        }

        $statement = $this->db->prepare($sql);
        $statement->bindValue(':vehicle_id', $vehicleId, PDO::PARAM_INT);
        $statement->bindValue(':start_at', $startAt);
        $statement->bindValue(':end_at', $endAt);

        if ($excludeId !== null) {
            $statement->bindValue(':exclude_id', $excludeId, PDO::PARAM_INT);
        }

        $statement->execute();

        return (int) $statement->fetchColumn() > 0;
    }

    public function hasDriverConflictForApprovedActive(int $driverId, string $startAt, string $endAt, ?int $excludeId = null): bool
    {
        $sql = 'SELECT COUNT(*)
                FROM reservations
                WHERE assigned_driver_id = :driver_id
                  AND status IN ("approved", "active")
                  AND :start_at < end_at
                  AND :end_at > start_at';

        if ($excludeId !== null) {
            $sql .= ' AND id <> :exclude_id';
        }

        $statement = $this->db->prepare($sql);
        $statement->bindValue(':driver_id', $driverId, PDO::PARAM_INT);
        $statement->bindValue(':start_at', $startAt);
        $statement->bindValue(':end_at', $endAt);

        if ($excludeId !== null) {
            $statement->bindValue(':exclude_id', $excludeId, PDO::PARAM_INT);
        }

        $statement->execute();

        return (int) $statement->fetchColumn() > 0;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function approvedCalendarEntries(): array
    {
        $sql = 'SELECT r.id, r.reservation_no, r.start_at, r.end_at, r.purpose, r.destination,
                       v.vehicle_code, CONCAT(v.make, " ", v.model) AS vehicle_name,
                       CONCAT(req.first_name, " ", req.last_name) AS requester_name,
                       CONCAT(dr.first_name, " ", dr.last_name) AS driver_name,
                       pl.name AS pickup_location_name, dl.name AS dropoff_location_name
                FROM reservations r
                INNER JOIN vehicles v ON v.id = r.vehicle_id
                INNER JOIN users req ON req.id = r.requester_id
                LEFT JOIN users dr ON dr.id = r.assigned_driver_id
                LEFT JOIN locations pl ON pl.id = r.pickup_location_id
                LEFT JOIN locations dl ON dl.id = r.dropoff_location_id
                WHERE r.status = "approved"
                ORDER BY r.start_at ASC';

        $statement = $this->db->prepare($sql);
        $statement->execute();

        return $statement->fetchAll();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function approvedUnassignedBetweenDates(string $startDate, string $endDate): array
    {
        $sql = 'SELECT r.id, r.reservation_no, r.vehicle_id, r.start_at, r.end_at, r.priority, r.purpose
                FROM reservations r
                WHERE r.status = "approved"
                  AND r.assigned_driver_id IS NULL
                  AND DATE(r.start_at) BETWEEN :start_date AND :end_date
                ORDER BY FIELD(r.priority, "urgent", "high", "normal", "low"), r.start_at ASC';

        $statement = $this->db->prepare($sql);
        $statement->bindValue(':start_date', $startDate);
        $statement->bindValue(':end_date', $endDate);
        $statement->execute();

        return $statement->fetchAll();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function driverAssignmentsForDate(int $driverId, string $date): array
    {
        $sql = 'SELECT id, reservation_no, start_at, end_at, status
                FROM reservations
                WHERE assigned_driver_id = :driver_id
                  AND status IN ("approved", "active", "completed")
                  AND DATE(start_at) = :work_date
                ORDER BY start_at ASC';

        $statement = $this->db->prepare($sql);
        $statement->bindValue(':driver_id', $driverId, PDO::PARAM_INT);
        $statement->bindValue(':work_date', $date);
        $statement->execute();

        return $statement->fetchAll();
    }

    public function assignDriverIfUnassigned(int $requestId, int $driverId): bool
    {
        $statement = $this->db->prepare(
            'UPDATE reservations
             SET assigned_driver_id = :driver_id,
                 assigned_at = NOW(),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = :id
               AND status = "approved"
               AND assigned_driver_id IS NULL'
        );
        $statement->bindValue(':id', $requestId, PDO::PARAM_INT);
        $statement->bindValue(':driver_id', $driverId, PDO::PARAM_INT);
        $statement->execute();

        return $statement->rowCount() > 0;
    }

    private function baseQuery(): string
    {
        return 'SELECT r.id, r.reservation_no, r.vehicle_id, v.vehicle_code, v.plate_no,
                       CONCAT(v.make, " ", v.model) AS vehicle_name,
                       r.requester_id, CONCAT(req.first_name, " ", req.last_name) AS requester_name,
                       req.phone AS requester_phone,
                       r.approver_id, CONCAT(app.first_name, " ", app.last_name) AS approver_name,
                       r.assigned_driver_id, CONCAT(dr.first_name, " ", dr.last_name) AS driver_name,
                       dr.phone AS driver_phone,
                       r.pickup_location_id, pl.name AS pickup_location_name,
                       r.dropoff_location_id, dl.name AS dropoff_location_name,
                       r.purpose, r.destination, r.start_at, r.end_at,
                       r.passengers, r.priority, r.status, r.rejection_reason,
                       r.remarks, r.approved_at, r.assigned_at,
                       r.created_at, r.updated_at
                FROM reservations r
                INNER JOIN vehicles v ON v.id = r.vehicle_id
                INNER JOIN users req ON req.id = r.requester_id
                LEFT JOIN users app ON app.id = r.approver_id
                LEFT JOIN users dr ON dr.id = r.assigned_driver_id
                LEFT JOIN locations pl ON pl.id = r.pickup_location_id
                LEFT JOIN locations dl ON dl.id = r.dropoff_location_id';
    }

    /**
     * @param array<int, array<string, mixed>> $rows
     * @return array<int, array<string, mixed>>
     */
    private function attachPassengerNames(array $rows): array
    {
        if ($rows === []) {
            return $rows;
        }

        $reservationIds = array_map(
            static fn(array $row): int => (int) $row['id'],
            $rows
        );
        $nameMap = $this->passengerNamesByReservationIds($reservationIds);

        foreach ($rows as &$row) {
            $reservationId = (int) $row['id'];
            $row['passenger_names'] = $nameMap[$reservationId] ?? [];
        }
        unset($row);

        return $rows;
    }

    /**
     * @param array<int, int> $reservationIds
     * @return array<int, array<int, string>>
     */
    private function passengerNamesByReservationIds(array $reservationIds): array
    {
        if ($reservationIds === []) {
            return [];
        }

        $placeholders = implode(',', array_fill(0, count($reservationIds), '?'));
        $sql = sprintf(
            'SELECT reservation_id, full_name
             FROM reservation_passengers
             WHERE reservation_id IN (%s)
             ORDER BY reservation_id ASC, id ASC',
            $placeholders
        );

        $statement = $this->db->prepare($sql);
        foreach ($reservationIds as $index => $reservationId) {
            $statement->bindValue($index + 1, $reservationId, PDO::PARAM_INT);
        }
        $statement->execute();

        $result = [];
        foreach ($statement->fetchAll() as $row) {
            $reservationId = (int) $row['reservation_id'];
            if (!isset($result[$reservationId])) {
                $result[$reservationId] = [];
            }

            $result[$reservationId][] = (string) $row['full_name'];
        }

        return $result;
    }

    /**
     * @param array<int, string> $passengerNames
     */
    private function replacePassengerNames(int $reservationId, array $passengerNames): void
    {
        $deleteStatement = $this->db->prepare('DELETE FROM reservation_passengers WHERE reservation_id = :reservation_id');
        $deleteStatement->bindValue(':reservation_id', $reservationId, PDO::PARAM_INT);
        $deleteStatement->execute();

        if ($passengerNames === []) {
            return;
        }

        $insertStatement = $this->db->prepare(
            'INSERT INTO reservation_passengers (reservation_id, full_name, contact_no, notes)
             VALUES (:reservation_id, :full_name, NULL, NULL)'
        );

        foreach ($passengerNames as $name) {
            $trimmed = trim($name);
            if ($trimmed === '') {
                continue;
            }

            $insertStatement->bindValue(':reservation_id', $reservationId, PDO::PARAM_INT);
            $insertStatement->bindValue(':full_name', $trimmed);
            $insertStatement->execute();
        }
    }
}
