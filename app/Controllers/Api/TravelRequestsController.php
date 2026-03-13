<?php

declare(strict_types=1);

namespace App\Controllers\Api;

use App\Core\Response;
use App\Repositories\DriverRepository;
use App\Repositories\TravelRequestRepository;
use DateTimeImmutable;
use Exception;
use PDOException;

class TravelRequestsController
{
    public function __construct(
        private readonly TravelRequestRepository $travelRequestRepository,
        private readonly DriverRepository $driverRepository,
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

        Response::json(['message' => 'Travel request cancelled']);
    }

    public function approve(int $id, array $authUser): void
    {
        if (!$this->isManagerOrAdmin($authUser)) {
            Response::json(['error' => 'Only manager/admin can approve requests'], 403);
            return;
        }

        $request = $this->travelRequestRepository->findById($id);

        if (!$request) {
            Response::json(['error' => 'Travel request not found'], 404);
            return;
        }

        if ($this->travelRequestRepository->hasConflictForApprovedActive((int) $request['vehicle_id'], (string) $request['start_at'], (string) $request['end_at'], $id)) {
            Response::json(['error' => 'Vehicle schedule conflict with another approved/active request'], 409);
            return;
        }

        $approved = $this->travelRequestRepository->approve($id, (int) $authUser['id']);

        if (!$approved) {
            Response::json(['error' => 'Request is not in pending status'], 409);
            return;
        }

        Response::json(['data' => $this->travelRequestRepository->findById($id)]);
    }

    public function reject(int $id, array $authUser): void
    {
        if (!$this->isManagerOrAdmin($authUser)) {
            Response::json(['error' => 'Only manager/admin can reject requests'], 403);
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

        Response::json(['data' => $this->travelRequestRepository->findById($id)]);
    }

    public function assignDriver(int $id, array $authUser): void
    {
        if (!$this->isManagerOrAdmin($authUser)) {
            Response::json(['error' => 'Only manager/admin can assign drivers'], 403);
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

        $assigned = $this->travelRequestRepository->assignDriver($id, $driverId);

        if (!$assigned) {
            Response::json(['error' => 'Request must be approved before assigning driver'], 409);
            return;
        }

        Response::json(['data' => $this->travelRequestRepository->findById($id)]);
    }

    public function managerCancelApproved(int $id, array $authUser): void
    {
        if (!$this->isManagerOrAdmin($authUser)) {
            Response::json(['error' => 'Only manager/admin can cancel approved requests'], 403);
            return;
        }

        $input = $this->readJsonInput();
        $reason = trim((string) ($input['reason'] ?? 'Cancelled by manager/admin'));

        $cancelled = $this->travelRequestRepository->managerCancelApproved($id, (int) $authUser['id'], $reason);

        if (!$cancelled) {
            Response::json(['error' => 'Request must be in approved status to cancel'], 409);
            return;
        }

        Response::json(['data' => $this->travelRequestRepository->findById($id)]);
    }

    public function driverOptions(array $authUser): void
    {
        if (!$this->isManagerOrAdmin($authUser)) {
            Response::json(['error' => 'Only manager/admin can load driver options'], 403);
            return;
        }

        Response::json(['data' => $this->driverRepository->options()]);
    }

    public function calendar(array $authUser): void
    {
        $role = (string) ($authUser['role'] ?? '');
        $userId = (int) ($authUser['id'] ?? 0);

        Response::json(['data' => $this->travelRequestRepository->approvedForRole($role, $userId)]);
    }

    private function canView(array $request, array $authUser): bool
    {
        $role = (string) ($authUser['role'] ?? '');
        $userId = (int) ($authUser['id'] ?? 0);

        if (in_array($role, ['admin', 'manager'], true)) {
            return true;
        }

        if ($role === 'requester' && (int) $request['requester_id'] === $userId) {
            return true;
        }

        return $role === 'driver' && isset($request['assigned_driver_id']) && (int) $request['assigned_driver_id'] === $userId;
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
}
