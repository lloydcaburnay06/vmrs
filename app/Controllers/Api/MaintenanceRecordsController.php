<?php

declare(strict_types=1);

namespace App\Controllers\Api;

use App\Core\Response;
use App\Repositories\MaintenanceRecordRepository;
use App\Services\AuditLogger;
use DateTimeImmutable;
use Exception;
use PDOException;

class MaintenanceRecordsController
{
    public function __construct(
        private readonly MaintenanceRecordRepository $repository,
        private readonly AuditLogger $auditLogger,
    )
    {
    }

    public function index(): void
    {
        Response::json(['data' => $this->repository->allForAdmin()]);
    }

    public function show(int $id): void
    {
        $record = $this->repository->findForAdmin($id);

        if (!$record) {
            Response::json(['error' => 'Maintenance record not found'], 404);
            return;
        }

        Response::json(['data' => $record]);
    }

    public function store(array $authUser): void
    {
        $input = $this->readJsonInput();
        $validationError = $this->validate($input);

        if ($validationError !== null) {
            Response::json(['error' => $validationError], 422);
            return;
        }

        $payload = $this->normalizePayload($input, (int) ($authUser['id'] ?? 0));

        try {
            $id = $this->repository->create($payload);
        } catch (PDOException $exception) {
            $dbError = $this->handleDbError($exception);
            if ($dbError !== null) {
                Response::json(['error' => $dbError], 409);
                return;
            }

            throw $exception;
        }

        $this->auditLogger->record($authUser, 'maintenance_record.created', 'maintenance_record', $id, [
            'vehicle_id' => $payload['vehicle_id'],
            'maintenance_type' => $payload['maintenance_type'],
            'status' => $payload['status'],
        ]);
        Response::json(['data' => $this->repository->findForAdmin($id)], 201);
    }

    public function update(int $id): void
    {
        $existing = $this->repository->findForAdmin($id);

        if (!$existing) {
            Response::json(['error' => 'Maintenance record not found'], 404);
            return;
        }

        $input = $this->readJsonInput();
        $validationError = $this->validate($input);

        if ($validationError !== null) {
            Response::json(['error' => $validationError], 422);
            return;
        }

        $payload = $this->normalizePayload($input, (int) ($existing['recorded_by'] ?? 0));

        try {
            $this->repository->updateById($id, $payload);
        } catch (PDOException $exception) {
            $dbError = $this->handleDbError($exception);
            if ($dbError !== null) {
                Response::json(['error' => $dbError], 409);
                return;
            }

            throw $exception;
        }

        $this->auditLogger->record($this->authUser(), 'maintenance_record.updated', 'maintenance_record', $id, [
            'vehicle_id' => $payload['vehicle_id'],
            'maintenance_type' => $payload['maintenance_type'],
            'status' => $payload['status'],
        ]);
        Response::json(['data' => $this->repository->findForAdmin($id)]);
    }

    public function destroy(int $id): void
    {
        $existing = $this->repository->findForAdmin($id);

        if (!$existing) {
            Response::json(['error' => 'Maintenance record not found'], 404);
            return;
        }

        $this->repository->deleteById($id);
        $this->auditLogger->record($this->authUser(), 'maintenance_record.deleted', 'maintenance_record', $id, [
            'vehicle_id' => (int) $existing['vehicle_id'],
            'maintenance_type' => (string) $existing['maintenance_type'],
        ]);
        Response::json(['message' => 'Maintenance record deleted']);
    }

    /**
     * @param array<string, mixed> $input
     */
    private function validate(array $input): ?string
    {
        $required = ['vehicle_id', 'maintenance_type', 'description', 'service_date', 'status'];
        foreach ($required as $field) {
            if (!isset($input[$field]) || trim((string) $input[$field]) === '') {
                return sprintf('%s is required', $field);
            }
        }

        if ((int) $input['vehicle_id'] <= 0) {
            return 'vehicle_id must be a valid ID';
        }

        if (!in_array((string) $input['maintenance_type'], ['preventive', 'corrective', 'inspection', 'emergency'], true)) {
            return 'maintenance_type is invalid';
        }

        if (!in_array((string) $input['status'], ['open', 'in_progress', 'completed', 'cancelled'], true)) {
            return 'status is invalid';
        }

        if (!$this->isDate((string) $input['service_date'])) {
            return 'service_date must be YYYY-MM-DD';
        }

        if (!$this->isNullableDate($input['next_service_date'] ?? null)) {
            return 'next_service_date must be YYYY-MM-DD';
        }

        if (isset($input['odometer_km']) && trim((string) $input['odometer_km']) !== '' && (!is_numeric((string) $input['odometer_km']) || (float) $input['odometer_km'] < 0)) {
            return 'odometer_km must be a non-negative number';
        }

        if (isset($input['cost']) && trim((string) $input['cost']) !== '' && (!is_numeric((string) $input['cost']) || (float) $input['cost'] < 0)) {
            return 'cost must be a non-negative number';
        }

        return null;
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    private function normalizePayload(array $input, int $recordedBy): array
    {
        return [
            'vehicle_id' => (int) $input['vehicle_id'],
            'recorded_by' => $recordedBy > 0 ? $recordedBy : null,
            'maintenance_type' => (string) $input['maintenance_type'],
            'description' => trim((string) $input['description']),
            'vendor' => $this->nullableString($input['vendor'] ?? null),
            'service_date' => (string) $input['service_date'],
            'odometer_km' => $this->nullableFloat($input['odometer_km'] ?? null),
            'cost' => $this->nullableFloat($input['cost'] ?? null),
            'next_service_date' => $this->nullableString($input['next_service_date'] ?? null),
            'status' => (string) $input['status'],
        ];
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

    private function nullableFloat(mixed $value): ?float
    {
        if ($value === null || trim((string) $value) === '') {
            return null;
        }

        return (float) $value;
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

    private function isNullableDate(mixed $value): bool
    {
        if ($value === null || trim((string) $value) === '') {
            return true;
        }

        return $this->isDate((string) $value);
    }

    private function handleDbError(PDOException $exception): ?string
    {
        $code = (int) ($exception->errorInfo[1] ?? 0);

        if ($code === 1452) {
            return 'Invalid vehicle_id or recorded_by reference';
        }

        return null;
    }

    /**
     * @return array<string, mixed>
     */
    private function authUser(): array
    {
        return is_array($_SESSION['auth_user'] ?? null) ? $_SESSION['auth_user'] : [];
    }
}
