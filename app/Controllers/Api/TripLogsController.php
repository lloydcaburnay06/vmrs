<?php

declare(strict_types=1);

namespace App\Controllers\Api;

use App\Core\Response;
use App\Repositories\TripLogRepository;
use App\Services\AuditLogger;
use DateTimeImmutable;
use Exception;

class TripLogsController
{
    public function __construct(
        private readonly TripLogRepository $repository,
        private readonly AuditLogger $auditLogger,
    )
    {
    }

    public function index(array $authUser): void
    {
        if (!$this->canAccessTripLogs($authUser)) {
            Response::json(['error' => 'Only manager/admin/driver can access trip logs'], 403);
            return;
        }

        $role = (string) ($authUser['role'] ?? '');
        $userId = (int) ($authUser['id'] ?? 0);
        $startDate = isset($_GET['start_date']) ? trim((string) $_GET['start_date']) : date('Y-m-01');
        $endDate = isset($_GET['end_date']) ? trim((string) $_GET['end_date']) : date('Y-m-t');
        $status = isset($_GET['status']) ? trim((string) $_GET['status']) : null;

        if (!$this->isDate($startDate) || !$this->isDate($endDate)) {
            Response::json(['error' => 'start_date and end_date must be YYYY-MM-DD'], 422);
            return;
        }

        if (strtotime($endDate) < strtotime($startDate)) {
            Response::json(['error' => 'end_date must be on or after start_date'], 422);
            return;
        }

        if ($status !== null && $status !== '' && !in_array($status, ['active', 'completed'], true)) {
            Response::json(['error' => 'status must be active or completed'], 422);
            return;
        }

        Response::json([
            'data' => $this->repository->allForRole($role, $userId, $startDate, $endDate, $status),
            'range' => ['start_date' => $startDate, 'end_date' => $endDate],
        ]);
    }

    public function show(int $id, array $authUser): void
    {
        if (!$this->canAccessTripLogs($authUser)) {
            Response::json(['error' => 'Only manager/admin/driver can access trip logs'], 403);
            return;
        }

        $tripLog = $this->repository->findDetailedById($id);
        if (!$tripLog) {
            Response::json(['error' => 'Trip log not found'], 404);
            return;
        }

        if ((string) ($authUser['role'] ?? '') === 'driver' && (int) ($tripLog['driver_id'] ?? 0) !== (int) ($authUser['id'] ?? 0)) {
            Response::json(['error' => 'Drivers can only access their own trip logs'], 403);
            return;
        }

        Response::json(['data' => $tripLog]);
    }

    public function complete(int $id, array $authUser): void
    {
        if (!$this->canCompleteTripLogs($authUser)) {
            Response::json(['error' => 'Only manager/admin/driver can complete trips'], 403);
            return;
        }

        $input = $this->readJsonInput();
        $checkInAt = trim((string) ($input['check_in_at'] ?? ''));
        $endOdometerRaw = $input['end_odometer_km'] ?? null;
        $fuelUsedRaw = $input['fuel_used_liters'] ?? null;
        $incidentReport = $this->nullableString($input['incident_report'] ?? null);

        if (!$this->isDateTime($checkInAt)) {
            Response::json(['error' => 'check_in_at must be YYYY-MM-DD HH:MM:SS'], 422);
            return;
        }

        if (!is_numeric($endOdometerRaw)) {
            Response::json(['error' => 'end_odometer_km must be numeric'], 422);
            return;
        }

        $endOdometerKm = (float) $endOdometerRaw;
        if ($endOdometerKm < 0) {
            Response::json(['error' => 'end_odometer_km must be non-negative'], 422);
            return;
        }

        $fuelUsedLiters = null;
        if ($fuelUsedRaw !== null && $fuelUsedRaw !== '') {
            if (!is_numeric($fuelUsedRaw)) {
                Response::json(['error' => 'fuel_used_liters must be numeric'], 422);
                return;
            }

            $fuelUsedLiters = (float) $fuelUsedRaw;
            if ($fuelUsedLiters < 0) {
                Response::json(['error' => 'fuel_used_liters must be non-negative'], 422);
                return;
            }
        }

        $requiredDriverId = (string) ($authUser['role'] ?? '') === 'driver'
            ? (int) ($authUser['id'] ?? 0)
            : null;

        $result = $this->repository->completeTravel(
            $id,
            $requiredDriverId,
            $checkInAt,
            $endOdometerKm,
            $fuelUsedLiters,
            $incidentReport,
        );

        if (!(bool) ($result['ok'] ?? false)) {
            Response::json(['error' => (string) ($result['error'] ?? 'Failed to complete trip.')], 409);
            return;
        }

        $vehicleOdometerKm = (string) ($result['vehicle_odometer_km'] ?? '0.00');
        $vehicleOdometerUpdated = (bool) ($result['vehicle_odometer_updated'] ?? false);
        $message = $vehicleOdometerUpdated
            ? sprintf('Trip completed. Vehicle odometer updated to %s km.', $vehicleOdometerKm)
            : sprintf('Trip completed. Vehicle odometer remains at %s km.', $vehicleOdometerKm);

        $this->auditLogger->record($authUser, 'trip_log.completed', 'trip_log', $id, [
            'check_in_at' => $checkInAt,
            'end_odometer_km' => $endOdometerKm,
            'fuel_used_liters' => $fuelUsedLiters,
        ]);
        Response::json([
            'data' => $this->repository->findDetailedById($id),
            'message' => $message,
            'vehicle' => [
                'id' => (int) ($result['vehicle_id'] ?? 0),
                'odometer_km' => $vehicleOdometerKm,
                'status' => (string) ($result['vehicle_status'] ?? ''),
                'odometer_updated' => $vehicleOdometerUpdated,
            ],
        ]);
    }

    private function canAccessTripLogs(array $authUser): bool
    {
        $role = (string) ($authUser['role'] ?? '');
        return in_array($role, ['manager', 'admin', 'driver', 'cao'], true);
    }

    private function canCompleteTripLogs(array $authUser): bool
    {
        $role = (string) ($authUser['role'] ?? '');
        return in_array($role, ['manager', 'admin', 'driver'], true);
    }

    /**
     * @return array<string, mixed>
     */
    private function readJsonInput(): array
    {
        $raw = file_get_contents('php://input');

        if (!is_string($raw) || trim($raw) === '') {
            return [];
        }

        $decoded = json_decode($raw, true);

        return is_array($decoded) ? $decoded : [];
    }

    private function isDate(string $value): bool
    {
        try {
            $date = new DateTimeImmutable($value);
            return $date->format('Y-m-d') === $value;
        } catch (Exception) {
            return false;
        }
    }

    private function isDateTime(string $value): bool
    {
        try {
            $date = new DateTimeImmutable($value);
            return $date->format('Y-m-d H:i:s') === $value;
        } catch (Exception) {
            return false;
        }
    }

    private function nullableString(mixed $value): ?string
    {
        if (!is_string($value)) {
            return null;
        }

        $trimmed = trim($value);
        return $trimmed === '' ? null : $trimmed;
    }
}
