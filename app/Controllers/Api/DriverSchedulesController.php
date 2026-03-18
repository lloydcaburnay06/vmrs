<?php

declare(strict_types=1);

namespace App\Controllers\Api;

use App\Core\Response;
use App\Repositories\DriverRepository;
use App\Repositories\TravelRequestRepository;
use App\Services\AuditLogger;
use DateTimeImmutable;
use Exception;

class DriverSchedulesController
{
    public function __construct(
        private readonly TravelRequestRepository $travelRequestRepository,
        private readonly DriverRepository $driverRepository,
        private readonly AuditLogger $auditLogger,
    ) {
    }

    public function index(array $authUser): void
    {
        if (!$this->canAccessSchedules($authUser)) {
            Response::json(['error' => 'Only manager/admin/driver can access driver schedules'], 403);
            return;
        }

        $role = (string) ($authUser['role'] ?? '');
        $userId = (int) ($authUser['id'] ?? 0);
        $startDate = isset($_GET['start_date']) ? trim((string) $_GET['start_date']) : date('Y-m-01');
        $endDate = isset($_GET['end_date']) ? trim((string) $_GET['end_date']) : date('Y-m-t');

        if (!$this->isDate($startDate) || !$this->isDate($endDate)) {
            Response::json(['error' => 'start_date and end_date must be YYYY-MM-DD'], 422);
            return;
        }

        if (strtotime($endDate) < strtotime($startDate)) {
            Response::json(['error' => 'end_date must be on or after start_date'], 422);
            return;
        }

        $driverIdFilter = $role === 'driver' ? $userId : null;
        Response::json([
            'data' => $this->travelRequestRepository->driverSchedules($startDate, $endDate, $driverIdFilter),
            'range' => ['start_date' => $startDate, 'end_date' => $endDate],
        ]);
    }

    public function startTravel(int $id, array $authUser): void
    {
        if (!$this->canAccessSchedules($authUser)) {
            Response::json(['error' => 'Only manager/admin/driver can start travel'], 403);
            return;
        }

        $input = $this->readJsonInput();
        $checkOutAt = trim((string) ($input['check_out_at'] ?? ''));
        $startOdometerRaw = $input['start_odometer_km'] ?? null;
        $remarksRaw = $input['remarks'] ?? null;

        if (!$this->isDateTime($checkOutAt)) {
            Response::json(['error' => 'check_out_at must be YYYY-MM-DD HH:MM:SS'], 422);
            return;
        }

        if (!is_numeric($startOdometerRaw)) {
            Response::json(['error' => 'start_odometer_km must be numeric'], 422);
            return;
        }

        $startOdometerKm = (float) $startOdometerRaw;
        if ($startOdometerKm < 0) {
            Response::json(['error' => 'start_odometer_km must be non-negative'], 422);
            return;
        }

        $role = (string) ($authUser['role'] ?? '');
        $userId = (int) ($authUser['id'] ?? 0);
        $requiredAssignedDriverId = $role === 'driver' ? $userId : null;

        $request = $this->travelRequestRepository->findById($id);
        if (!$request) {
            Response::json(['error' => 'Travel request not found'], 404);
            return;
        }

        if ($role === 'driver' && (int) ($request['assigned_driver_id'] ?? 0) !== $userId) {
            Response::json(['error' => 'Drivers can only start their assigned requests'], 403);
            return;
        }

        $tripDriverId = isset($request['assigned_driver_id']) ? (int) $request['assigned_driver_id'] : null;
        if ($tripDriverId !== null && $tripDriverId <= 0) {
            $tripDriverId = null;
        }
        if ($tripDriverId === null && $role === 'driver') {
            $tripDriverId = $userId;
        }

        $updated = $this->travelRequestRepository->startTravel(
            $id,
            $requiredAssignedDriverId,
            $tripDriverId,
            $checkOutAt,
            $startOdometerKm,
            $this->nullableString($remarksRaw),
        );

        if (!$updated) {
            Response::json(['error' => 'Only approved requests can be started'], 409);
            return;
        }

        $this->auditLogger->record($authUser, 'driver_schedule.travel_started', 'travel_request', $id, [
            'check_out_at' => $checkOutAt,
            'start_odometer_km' => $startOdometerKm,
            'driver_id' => $tripDriverId,
        ]);
        Response::json(['data' => $this->travelRequestRepository->findById($id)]);
    }

    public function reassign(int $id, array $authUser): void
    {
        if (!$this->isManagerOrAdmin($authUser)) {
            Response::json(['error' => 'Only manager/admin can reassign drivers'], 403);
            return;
        }

        $request = $this->travelRequestRepository->findById($id);

        if (!$request) {
            Response::json(['error' => 'Travel request not found'], 404);
            return;
        }

        if ((string) ($request['status'] ?? '') !== 'approved') {
            Response::json(['error' => 'Only approved requests can be reassigned'], 409);
            return;
        }

        $input = $this->readJsonInput();
        $driverId = isset($input['driver_id']) ? (int) $input['driver_id'] : 0;

        if ($driverId <= 0) {
            Response::json(['error' => 'driver_id is required'], 422);
            return;
        }

        if (!$this->driverRepository->isDriver($driverId)) {
            Response::json(['error' => 'driver_id is not a valid driver account'], 422);
            return;
        }

        if ($this->travelRequestRepository->hasDriverConflictForApprovedActive($driverId, (string) $request['start_at'], (string) $request['end_at'], $id)) {
            Response::json(['error' => 'Driver schedule conflict with another approved/active request'], 409);
            return;
        }

        $updated = $this->travelRequestRepository->reassignApprovedDriver($id, $driverId);

        if (!$updated) {
            Response::json(['error' => 'Only approved requests can be reassigned'], 409);
            return;
        }

        $this->auditLogger->record($authUser, 'driver_schedule.reassigned', 'travel_request', $id, [
            'driver_id' => $driverId,
        ]);
        Response::json(['message' => 'Driver reassigned']);
    }

    public function unassign(int $id, array $authUser): void
    {
        if (!$this->isManagerOrAdmin($authUser)) {
            Response::json(['error' => 'Only manager/admin can unassign drivers'], 403);
            return;
        }

        $updated = $this->travelRequestRepository->unassignApprovedDriver($id);

        if (!$updated) {
            Response::json(['error' => 'Only approved requests can be unassigned'], 409);
            return;
        }

        $this->auditLogger->record($authUser, 'driver_schedule.unassigned', 'travel_request', $id, null);
        Response::json(['message' => 'Driver unassigned']);
    }

    private function isManagerOrAdmin(array $authUser): bool
    {
        $role = (string) ($authUser['role'] ?? '');

        return in_array($role, ['manager', 'admin'], true);
    }

    private function canAccessSchedules(array $authUser): bool
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
