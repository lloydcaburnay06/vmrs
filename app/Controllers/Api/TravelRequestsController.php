<?php

declare(strict_types=1);

namespace App\Controllers\Api;

use App\Core\Response;
use App\Repositories\DriverRepository;
use App\Repositories\TravelRequestRepository;
use App\Repositories\VehicleRepository;
use App\Services\AuditLogger;
use DateTimeImmutable;
use Exception;
use PDOException;

class TravelRequestsController
{
    public function __construct(
        private readonly TravelRequestRepository $travelRequestRepository,
        private readonly DriverRepository $driverRepository,
        private readonly VehicleRepository $vehicleRepository,
        private readonly AuditLogger $auditLogger,
    ) {
    }

    public function index(array $authUser): void
    {
        $role = (string) ($authUser['role'] ?? '');
        $userId = (int) ($authUser['id'] ?? 0);

        Response::json(['data' => $this->travelRequestRepository->allForRole($role, $userId)]);
    }

    public function show(int $id, array $authUser): void
    {
        $request = $this->travelRequestRepository->findById($id);

        if (!$request) {
            Response::json(['error' => 'Travel request not found'], 404);
            return;
        }

        if (!$this->canView($request, $authUser)) {
            Response::json(['error' => 'Forbidden'], 403);
            return;
        }

        Response::json(['data' => $request]);
    }

    public function create(array $authUser): void
    {
        if ((string) ($authUser['role'] ?? '') !== 'requester') {
            Response::json(['error' => 'Only requestors can create travel requests'], 403);
            return;
        }

        $input = $this->readJsonInput();
        $validation = $this->validateUpsert($input);

        if ($validation !== null) {
            Response::json(['error' => $validation], 422);
            return;
        }

        $payload = $this->normalizeUpsertPayload($input);
        $payload['requester_id'] = (int) $authUser['id'];
        $payload['reservation_no'] = $this->buildReservationNo();

        try {
            $id = $this->travelRequestRepository->create($payload);
        } catch (PDOException $exception) {
            if ((int) ($exception->errorInfo[1] ?? 0) === 1062) {
                Response::json(['error' => 'Duplicate reservation number, please retry'], 409);
                return;
            }
            throw $exception;
        }

        $this->auditLogger->record($authUser, 'travel_request.created', 'travel_request', $id, [
            'reservation_no' => $payload['reservation_no'],
            'vehicle_id' => $payload['vehicle_id'],
            'start_at' => $payload['start_at'],
            'end_at' => $payload['end_at'],
            'priority' => $payload['priority'],
        ]);
        Response::json(['data' => $this->travelRequestRepository->findById($id)], 201);
    }

    public function update(int $id, array $authUser): void
    {
        if ((string) ($authUser['role'] ?? '') !== 'requester') {
            Response::json(['error' => 'Only requestors can update travel requests'], 403);
            return;
        }

        $input = $this->readJsonInput();
        $validation = $this->validateUpsert($input);

        if ($validation !== null) {
            Response::json(['error' => $validation], 422);
            return;
        }

        $updated = $this->travelRequestRepository->updatePendingByRequester(
            $id,
            (int) $authUser['id'],
            $this->normalizeUpsertPayload($input)
        );

        if (!$updated) {
            Response::json(['error' => 'Request not found or not editable (must be pending and owned by requester)'], 409);
            return;
        }

        $this->auditLogger->record($authUser, 'travel_request.updated', 'travel_request', $id, [
            'vehicle_id' => (int) $input['vehicle_id'],
            'start_at' => (string) $input['start_at'],
            'end_at' => (string) $input['end_at'],
            'priority' => (string) $input['priority'],
        ]);
        Response::json(['data' => $this->travelRequestRepository->findById($id)]);
    }

    public function cancel(int $id, array $authUser): void
    {
        if ((string) ($authUser['role'] ?? '') !== 'requester') {
            Response::json(['error' => 'Only requestors can cancel travel requests'], 403);
            return;
        }

        $cancelled = $this->travelRequestRepository->requesterCancel($id, (int) $authUser['id']);

        if (!$cancelled) {
            Response::json(['error' => 'Request not found or not cancellable'], 409);
            return;
        }

        $this->auditLogger->record($authUser, 'travel_request.cancelled', 'travel_request', $id, null);
        Response::json(['message' => 'Travel request cancelled']);
    }

    public function approve(int $id, array $authUser): void
    {
        if (!$this->isCao($authUser)) {
            Response::json(['error' => 'Only the CAO can approve requests'], 403);
            return;
        }

        $request = $this->travelRequestRepository->findById($id);

        if (!$request) {
            Response::json(['error' => 'Travel request not found'], 404);
            return;
        }

        $vehicleId = (int) $request['vehicle_id'];

        if ($vehicleId <= 0 || !$this->vehicleRepository->exists($vehicleId)) {
            Response::json(['error' => 'Assigned vehicle was not found'], 422);
            return;
        }

        if ($this->travelRequestRepository->hasConflictForApprovedActive($vehicleId, (string) $request['start_at'], (string) $request['end_at'], $id)) {
            Response::json(['error' => 'Vehicle schedule conflict with another approved/active request'], 409);
            return;
        }

        $driverId = isset($request['assigned_driver_id']) ? (int) $request['assigned_driver_id'] : null;
        if ($driverId === null || $driverId <= 0) {
            Response::json(['error' => 'Admin must assign a driver before CAO approval'], 409);
            return;
        }

        if (!$this->driverRepository->isDriver($driverId)) {
            Response::json(['error' => 'Assigned driver was not found'], 422);
            return;
        }

        if ($this->travelRequestRepository->hasDriverConflictForApprovedActive($driverId, (string) $request['start_at'], (string) $request['end_at'], $id)) {
            Response::json(['error' => 'Driver schedule conflict with another approved/active request'], 409);
            return;
        }

        $approved = $this->travelRequestRepository->approve($id, (int) $authUser['id']);

        if (!$approved) {
            Response::json(['error' => 'Request is not in pending status'], 409);
            return;
        }

        $this->auditLogger->record($authUser, 'travel_request.approved', 'travel_request', $id, [
            'reservation_no' => (string) $request['reservation_no'],
            'vehicle_id' => $vehicleId,
            'driver_id' => $driverId,
        ]);
        Response::json(['data' => $this->travelRequestRepository->findById($id)]);
    }

    public function reject(int $id, array $authUser): void
    {
        if (!$this->isCao($authUser)) {
            Response::json(['error' => 'Only the CAO can reject requests'], 403);
            return;
        }

        $input = $this->readJsonInput();
        $reason = trim((string) ($input['reason'] ?? ''));

        if ($reason === '') {
            Response::json(['error' => 'reason is required'], 422);
            return;
        }

        $rejected = $this->travelRequestRepository->reject($id, (int) $authUser['id'], $reason);

        if (!$rejected) {
            Response::json(['error' => 'Request is not in pending status'], 409);
            return;
        }

        $this->auditLogger->record($authUser, 'travel_request.rejected', 'travel_request', $id, [
            'reason' => $reason,
        ]);
        Response::json(['data' => $this->travelRequestRepository->findById($id)]);
    }

    public function assignDriver(int $id, array $authUser): void
    {
        if (!$this->isManagerOrAdmin($authUser)) {
            Response::json(['error' => 'Only manager/admin can assign drivers'], 403);
            return;
        }

        $request = $this->travelRequestRepository->findById($id);

        if (!$request) {
            Response::json(['error' => 'Travel request not found'], 404);
            return;
        }

        if ((string) ($request['status'] ?? '') !== 'approved') {
            Response::json(['error' => 'Request must be approved before assigning driver'], 409);
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

        $assigned = $this->travelRequestRepository->assignDriver($id, $driverId);

        if (!$assigned) {
            Response::json(['error' => 'Request must be approved before assigning driver'], 409);
            return;
        }

        $this->auditLogger->record($authUser, 'travel_request.driver_assigned', 'travel_request', $id, [
            'driver_id' => $driverId,
        ]);
        Response::json(['data' => $this->travelRequestRepository->findById($id)]);
    }

    public function updateApprovedAssignment(int $id, array $authUser): void
    {
        if (!$this->isAdmin($authUser)) {
            Response::json(['error' => 'Only admin can assign or reassign vehicles and drivers'], 403);
            return;
        }

        $request = $this->travelRequestRepository->findById($id);

        if (!$request) {
            Response::json(['error' => 'Travel request not found'], 404);
            return;
        }

        if (!in_array((string) ($request['status'] ?? ''), ['pending', 'approved'], true)) {
            Response::json(['error' => 'Only pending or approved requests can be assigned before travel'], 409);
            return;
        }

        $input = $this->readJsonInput();
        $vehicleId = array_key_exists('vehicle_id', $input) && trim((string) $input['vehicle_id']) !== ''
            ? (int) $input['vehicle_id']
            : (int) $request['vehicle_id'];
        $driverId = array_key_exists('driver_id', $input) && trim((string) $input['driver_id']) !== ''
            ? (int) $input['driver_id']
            : null;

        if ($vehicleId <= 0) {
            Response::json(['error' => 'vehicle_id must be valid'], 422);
            return;
        }

        if (!$this->vehicleRepository->exists($vehicleId)) {
            Response::json(['error' => 'Selected vehicle was not found'], 422);
            return;
        }

        if ($this->travelRequestRepository->hasConflictForApprovedActive($vehicleId, (string) $request['start_at'], (string) $request['end_at'], $id)) {
            Response::json(['error' => 'Vehicle schedule conflict with another approved/active request'], 409);
            return;
        }

        if ($driverId !== null && $driverId > 0 && !$this->driverRepository->isDriver($driverId)) {
            Response::json(['error' => 'Selected driver was not found'], 422);
            return;
        }

        if ($driverId !== null && $driverId > 0 && $this->travelRequestRepository->hasDriverConflictForApprovedActive($driverId, (string) $request['start_at'], (string) $request['end_at'], $id)) {
            Response::json(['error' => 'Driver schedule conflict with another approved/active request'], 409);
            return;
        }

        $updated = $this->travelRequestRepository->updateAssignmentBeforeTravel($id, $vehicleId, $driverId);

        if (!$updated) {
            Response::json(['error' => 'Assignment could not be updated'], 409);
            return;
        }

        $this->auditLogger->record($authUser, 'travel_request.assignment_updated', 'travel_request', $id, [
            'vehicle_id' => $vehicleId,
            'driver_id' => $driverId,
        ]);
        Response::json(['data' => $this->travelRequestRepository->findById($id)]);
    }

    public function managerCancelApproved(int $id, array $authUser): void
    {
        if (!$this->isAdmin($authUser)) {
            Response::json(['error' => 'Only admin can cancel approved requests'], 403);
            return;
        }

        $input = $this->readJsonInput();
        $reason = trim((string) ($input['reason'] ?? ''));

        if ($reason === '') {
            Response::json(['error' => 'Cancellation remark is required'], 422);
            return;
        }

        $cancelled = $this->travelRequestRepository->managerCancelApproved($id, (int) $authUser['id'], $reason);

        if (!$cancelled) {
            Response::json(['error' => 'Request must be in approved status to cancel'], 409);
            return;
        }

        $this->auditLogger->record($authUser, 'travel_request.cancelled_by_manager', 'travel_request', $id, [
            'reason' => $reason,
        ]);
        Response::json(['data' => $this->travelRequestRepository->findById($id)]);
    }

    public function driverOptions(array $authUser): void
    {
        if (!$this->isAdmin($authUser)) {
            Response::json(['error' => 'Only admin can load driver options'], 403);
            return;
        }

        Response::json(['data' => $this->driverRepository->options()]);
    }

    public function calendar(array $authUser): void
    {
        Response::json(['data' => $this->travelRequestRepository->approvedCalendarEntries()]);
    }

    public function availableVehicles(): void
    {
        $startAt = isset($_GET['start_at']) ? trim((string) $_GET['start_at']) : '';
        $endAt = isset($_GET['end_at']) ? trim((string) $_GET['end_at']) : '';
        $excludeReservationId = isset($_GET['exclude_request_id']) ? (int) $_GET['exclude_request_id'] : null;

        if ($startAt === '' || $endAt === '') {
            Response::json(['error' => 'start_at and end_at are required query params'], 422);
            return;
        }

        if (!$this->isDateTime($startAt) || !$this->isDateTime($endAt)) {
            Response::json(['error' => 'start_at and end_at must be valid DATETIME values (YYYY-MM-DD HH:MM:SS)'], 422);
            return;
        }

        if (strtotime($endAt) <= strtotime($startAt)) {
            Response::json(['error' => 'end_at must be later than start_at'], 422);
            return;
        }

        if ($excludeReservationId !== null && $excludeReservationId <= 0) {
            Response::json(['error' => 'exclude_request_id must be a positive integer'], 422);
            return;
        }

        Response::json([
            'data' => $this->vehicleRepository->availableForWindow($startAt, $endAt, $excludeReservationId),
        ]);
    }

    private function canView(array $request, array $authUser): bool
    {
        $role = (string) ($authUser['role'] ?? '');
        $userId = (int) ($authUser['id'] ?? 0);

        if (in_array($role, ['admin', 'manager', 'cao'], true)) {
            return true;
        }

        if ($role === 'requester' && (int) $request['requester_id'] === $userId) {
            return true;
        }

        return $role === 'driver' && isset($request['assigned_driver_id']) && (int) $request['assigned_driver_id'] === $userId;
    }

    private function isAdmin(array $authUser): bool
    {
        return (string) ($authUser['role'] ?? '') === 'admin';
    }

    private function isCao(array $authUser): bool
    {
        return (string) ($authUser['role'] ?? '') === 'cao';
    }

    private function isManagerOrAdmin(array $authUser): bool
    {
        $role = (string) ($authUser['role'] ?? '');

        return in_array($role, ['admin', 'manager'], true);
    }

    /**
     * @param array<string, mixed> $input
     */
    private function validateUpsert(array $input): ?string
    {
        $required = ['vehicle_id', 'purpose', 'start_at', 'end_at', 'priority'];

        foreach ($required as $field) {
            if (!isset($input[$field]) || trim((string) $input[$field]) === '') {
                return sprintf('%s is required', $field);
            }
        }

        if ((int) $input['vehicle_id'] <= 0) {
            return 'vehicle_id must be valid';
        }

        if (!$this->isDateTime((string) $input['start_at']) || !$this->isDateTime((string) $input['end_at'])) {
            return 'start_at and end_at must be YYYY-MM-DD HH:MM:SS';
        }

        if (strtotime((string) $input['end_at']) <= strtotime((string) $input['start_at'])) {
            return 'end_at must be later than start_at';
        }

        if (isset($input['passengers']) && trim((string) $input['passengers']) !== '' && (int) $input['passengers'] < 1) {
            return 'passengers must be a positive number';
        }

        $passengerCount = isset($input['passengers']) && trim((string) $input['passengers']) !== ''
            ? (int) $input['passengers']
            : 0;
        $passengerNames = isset($input['passenger_names']) && is_array($input['passenger_names'])
            ? $input['passenger_names']
            : [];

        if ($passengerCount > 0) {
            if (count($passengerNames) !== $passengerCount) {
                return 'passenger_names count must match passengers';
            }

            foreach ($passengerNames as $index => $name) {
                if (!is_string($name) || trim($name) === '') {
                    return sprintf('passenger_names[%d] is required', $index);
                }
            }
        }

        if (!in_array((string) $input['priority'], ['low', 'normal', 'high', 'urgent'], true)) {
            return 'priority is invalid';
        }

        return null;
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    private function normalizeUpsertPayload(array $input): array
    {
        return [
            'vehicle_id' => (int) $input['vehicle_id'],
            'pickup_location_id' => $this->nullableInt($input['pickup_location_id'] ?? null),
            'dropoff_location_id' => $this->nullableInt($input['dropoff_location_id'] ?? null),
            'purpose' => trim((string) $input['purpose']),
            'destination' => $this->nullableString($input['destination'] ?? null),
            'start_at' => (string) $input['start_at'],
            'end_at' => (string) $input['end_at'],
            'passengers' => $this->nullableInt($input['passengers'] ?? null),
            'passenger_names' => $this->normalizePassengerNames($input['passenger_names'] ?? null),
            'priority' => (string) $input['priority'],
            'remarks' => $this->nullableString($input['remarks'] ?? null),
        ];
    }

    private function buildReservationNo(): string
    {
        $year = date('Y');
        $suffix = strtoupper(bin2hex(random_bytes(3)));

        return sprintf('TR-%s-%s', $year, $suffix);
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

    private function nullableString(mixed $value): ?string
    {
        if (!is_string($value)) {
            return null;
        }

        $trimmed = trim($value);

        return $trimmed === '' ? null : $trimmed;
    }

    private function nullableInt(mixed $value): ?int
    {
        if ($value === null || trim((string) $value) === '') {
            return null;
        }

        return (int) $value;
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

    /**
     * @return array<int, string>
     */
    private function normalizePassengerNames(mixed $value): array
    {
        if (!is_array($value)) {
            return [];
        }

        $result = [];
        foreach ($value as $item) {
            if (!is_string($item)) {
                continue;
            }

            $result[] = trim($item);
        }

        return $result;
    }
}
