<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\TripLog;
use PDO;
use Throwable;

class TripLogRepository extends BaseRepository
{
    protected function table(): string
    {
        return 'trip_logs';
    }

    /**
     * @return TripLog[]
     */
    public function all(): array
    {
        return array_map(static fn(array $row): TripLog => TripLog::fromArray($row), $this->findAllRaw());
    }

    public function find(int $id): ?TripLog
    {
        $row = $this->findByIdRaw($id);

        return $row ? TripLog::fromArray($row) : null;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function allForRole(string $role, int $userId, string $startDate, string $endDate, ?string $status = null): array
    {
        $sql = $this->baseQuery() . '
            WHERE DATE(COALESCE(tl.check_out_at, r.actual_start_at, r.start_at)) BETWEEN :start_date AND :end_date
              AND r.status IN ("active", "completed")';

        if ($role === 'driver') {
            $sql .= ' AND COALESCE(tl.driver_id, r.assigned_driver_id) = :user_id';
        }

        if ($status !== null && in_array($status, ['active', 'completed'], true)) {
            $sql .= ' AND r.status = :status';
        }

        $sql .= '
            ORDER BY CASE WHEN r.status = "active" THEN 0 ELSE 1 END ASC,
                     COALESCE(tl.check_out_at, r.actual_start_at, r.start_at) DESC,
                     tl.id DESC';

        $statement = $this->db->prepare($sql);
        $statement->bindValue(':start_date', $startDate);
        $statement->bindValue(':end_date', $endDate);

        if ($role === 'driver') {
            $statement->bindValue(':user_id', $userId, PDO::PARAM_INT);
        }

        if ($status !== null && in_array($status, ['active', 'completed'], true)) {
            $statement->bindValue(':status', $status);
        }

        $statement->execute();

        return $statement->fetchAll();
    }

    /**
     * @return array<string, mixed>|null
     */
    public function findDetailedById(int $id): ?array
    {
        $statement = $this->db->prepare($this->baseQuery() . ' WHERE tl.id = :id LIMIT 1');
        $statement->bindValue(':id', $id, PDO::PARAM_INT);
        $statement->execute();
        $row = $statement->fetch();

        return is_array($row) ? $row : null;
    }

    public function completeTravel(
        int $tripLogId,
        ?int $requiredDriverId,
        string $checkInAt,
        float $endOdometerKm,
        ?float $fuelUsedLiters,
        ?string $incidentReport
    ): array {
        $this->db->beginTransaction();

        try {
            $statement = $this->db->prepare(
                'SELECT tl.id,
                        tl.reservation_id,
                        tl.driver_id,
                        tl.check_out_at,
                        tl.start_odometer_km,
                        r.vehicle_id,
                        r.status,
                        r.assigned_driver_id
                 FROM trip_logs tl
                 INNER JOIN reservations r ON r.id = tl.reservation_id
                 WHERE tl.id = :id
                 LIMIT 1
                 FOR UPDATE'
            );
            $statement->bindValue(':id', $tripLogId, PDO::PARAM_INT);
            $statement->execute();
            $row = $statement->fetch();

            if (!is_array($row)) {
                $this->db->rollBack();
                return ['ok' => false, 'error' => 'Trip log not found.'];
            }

            if ((string) ($row['status'] ?? '') !== 'active') {
                $this->db->rollBack();
                return ['ok' => false, 'error' => 'Only active trips can be completed.'];
            }

            $tripDriverId = isset($row['driver_id']) ? (int) $row['driver_id'] : null;
            $assignedDriverId = isset($row['assigned_driver_id']) ? (int) $row['assigned_driver_id'] : null;
            $effectiveDriverId = $tripDriverId ?: $assignedDriverId;

            if ($requiredDriverId !== null && $effectiveDriverId !== $requiredDriverId) {
                $this->db->rollBack();
                return ['ok' => false, 'error' => 'Drivers can only complete their own assigned trips.'];
            }

            $checkOutAt = (string) ($row['check_out_at'] ?? '');
            if ($checkOutAt !== '' && strtotime($checkInAt) < strtotime($checkOutAt)) {
                $this->db->rollBack();
                return ['ok' => false, 'error' => 'Return date/time cannot be earlier than departure date/time.'];
            }

            $startOdometerKm = isset($row['start_odometer_km']) ? (float) $row['start_odometer_km'] : null;
            if ($startOdometerKm !== null && $endOdometerKm < $startOdometerKm) {
                $this->db->rollBack();
                return ['ok' => false, 'error' => 'Return odometer cannot be lower than departure odometer.'];
            }

            $distanceKm = $startOdometerKm !== null ? $endOdometerKm - $startOdometerKm : null;
            $distanceKmValue = $distanceKm !== null ? number_format($distanceKm, 2, '.', '') : null;
            $endOdometerValue = number_format($endOdometerKm, 2, '.', '');
            $fuelUsedValue = $fuelUsedLiters !== null ? number_format($fuelUsedLiters, 2, '.', '') : null;
            $incidentReportValue = $incidentReport !== null ? trim($incidentReport) : null;

            $updateTrip = $this->db->prepare(
                'UPDATE trip_logs
                 SET check_in_at = :check_in_at,
                     end_odometer_km = :end_odometer_km,
                     distance_km = :distance_km,
                     fuel_used_liters = :fuel_used_liters,
                     incident_report = :incident_report,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = :id'
            );
            $updateTrip->execute([
                ':id' => $tripLogId,
                ':check_in_at' => $checkInAt,
                ':end_odometer_km' => $endOdometerValue,
                ':distance_km' => $distanceKmValue,
                ':fuel_used_liters' => $fuelUsedValue,
                ':incident_report' => $incidentReportValue,
            ]);

            $reservationId = (int) $row['reservation_id'];
            $completeReservation = $this->db->prepare(
                'UPDATE reservations
                 SET status = "completed",
                     actual_end_at = :actual_end_at,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = :id
                   AND status = "active"'
            );
            $completeReservation->bindValue(':id', $reservationId, PDO::PARAM_INT);
            $completeReservation->bindValue(':actual_end_at', $checkInAt);
            $completeReservation->execute();

            if ($completeReservation->rowCount() <= 0) {
                $this->db->rollBack();
                return ['ok' => false, 'error' => 'Trip could not be marked completed because the reservation is no longer active.'];
            }

            $vehicleId = (int) $row['vehicle_id'];
            $updateVehicle = $this->db->prepare(
                'UPDATE vehicles
                 SET odometer_km = CASE
                        WHEN :end_odometer_compare > odometer_km THEN :end_odometer_value
                        ELSE odometer_km
                     END,
                     status = CASE
                        WHEN status = "in_use" THEN "available"
                        ELSE status
                     END,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = :id'
            );
            $updateVehicle->bindValue(':id', $vehicleId, PDO::PARAM_INT);
            $updateVehicle->bindValue(':end_odometer_compare', $endOdometerKm);
            $updateVehicle->bindValue(':end_odometer_value', $endOdometerKm);
            $updateVehicle->execute();

            $this->db->commit();
            return ['ok' => true, 'error' => null];
        } catch (Throwable $throwable) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }

            throw $throwable;
        }
    }

    private function baseQuery(): string
    {
        return 'SELECT tl.id,
                       tl.reservation_id,
                       r.reservation_no,
                       r.status,
                       r.vehicle_id,
                       v.vehicle_code,
                       CONCAT(v.make, " ", v.model) AS vehicle_name,
                       r.requester_id,
                       CONCAT(req.first_name, " ", req.last_name) AS requester_name,
                       COALESCE(tl.driver_id, r.assigned_driver_id) AS driver_id,
                       CONCAT(dr.first_name, " ", dr.last_name) AS driver_name,
                       r.purpose,
                       r.destination,
                       r.pickup_location_id,
                       pl.name AS pickup_location_name,
                       r.passengers,
                       r.remarks,
                       r.start_at AS scheduled_start_at,
                       r.end_at AS scheduled_end_at,
                       r.actual_start_at,
                       r.actual_end_at,
                       tl.check_out_at,
                       tl.check_in_at,
                       tl.start_odometer_km,
                       tl.end_odometer_km,
                       tl.distance_km,
                       tl.fuel_used_liters,
                       tl.incident_report,
                       tl.created_at,
                       tl.updated_at
                FROM trip_logs tl
                INNER JOIN reservations r ON r.id = tl.reservation_id
                INNER JOIN vehicles v ON v.id = r.vehicle_id
                INNER JOIN users req ON req.id = r.requester_id
                LEFT JOIN users dr ON dr.id = COALESCE(tl.driver_id, r.assigned_driver_id)
                LEFT JOIN locations pl ON pl.id = r.pickup_location_id';
    }
}
