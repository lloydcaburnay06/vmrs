<?php

declare(strict_types=1);

namespace App\Controllers\Api;

use App\Core\Response;
use App\Repositories\FuelLogRepository;
use App\Services\AuditLogger;
use DateTimeImmutable;
use Exception;
use PDOException;

class FuelLogsController
{
    public function __construct(
        private readonly FuelLogRepository $repository,
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
            Response::json(['error' => 'Fuel log not found'], 404);
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

        $this->auditLogger->record($authUser, 'fuel_log.created', 'fuel_log', $id, [
            'vehicle_id' => $payload['vehicle_id'],
            'fueled_at' => $payload['fueled_at'],
            'liters' => $payload['liters'],
            'total_cost' => $payload['total_cost'],
        ]);
        Response::json(['data' => $this->repository->findForAdmin($id)], 201);
    }

    public function update(int $id): void
    {
        $existing = $this->repository->findForAdmin($id);

        if (!$existing) {
            Response::json(['error' => 'Fuel log not found'], 404);
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

        $this->auditLogger->record($this->authUser(), 'fuel_log.updated', 'fuel_log', $id, [
            'vehicle_id' => $payload['vehicle_id'],
            'fueled_at' => $payload['fueled_at'],
            'liters' => $payload['liters'],
            'total_cost' => $payload['total_cost'],
        ]);
        Response::json(['data' => $this->repository->findForAdmin($id)]);
    }

    public function destroy(int $id): void
    {
        $existing = $this->repository->findForAdmin($id);

        if (!$existing) {
            Response::json(['error' => 'Fuel log not found'], 404);
            return;
        }

        $this->repository->deleteById($id);
        $this->auditLogger->record($this->authUser(), 'fuel_log.deleted', 'fuel_log', $id, [
            'vehicle_id' => (int) $existing['vehicle_id'],
            'fueled_at' => (string) $existing['fueled_at'],
        ]);
        Response::json(['message' => 'Fuel log deleted']);
    }

    /**
     * @param array<string, mixed> $input
     */
    private function validate(array $input): ?string
    {
        $required = ['vehicle_id', 'fueled_at', 'liters'];
        foreach ($required as $field) {
            if (!isset($input[$field]) || trim((string) $input[$field]) === '') {
                return sprintf('%s is required', $field);
            }
        }

        if ((int) $input['vehicle_id'] <= 0) {
            return 'vehicle_id must be a valid ID';
        }

        if (!$this->isDateTime((string) $input['fueled_at'])) {
            return 'fueled_at must be YYYY-MM-DD HH:MM:SS';
        }

        if (!is_numeric((string) $input['liters']) || (float) $input['liters'] <= 0) {
            return 'liters must be a positive number';
        }

        if (isset($input['odometer_km']) && trim((string) $input['odometer_km']) !== '' && (!is_numeric((string) $input['odometer_km']) || (float) $input['odometer_km'] < 0)) {
            return 'odometer_km must be a non-negative number';
        }

        if (isset($input['unit_price']) && trim((string) $input['unit_price']) !== '' && (!is_numeric((string) $input['unit_price']) || (float) $input['unit_price'] < 0)) {
            return 'unit_price must be a non-negative number';
        }

        if (isset($input['total_cost']) && trim((string) $input['total_cost']) !== '' && (!is_numeric((string) $input['total_cost']) || (float) $input['total_cost'] < 0)) {
            return 'total_cost must be a non-negative number';
        }

        return null;
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    private function normalizePayload(array $input, int $recordedBy): array
    {
        $liters = (float) $input['liters'];
        $unitPrice = $this->nullableFloat($input['unit_price'] ?? null);
        $totalCost = $this->nullableFloat($input['total_cost'] ?? null);

        if ($totalCost === null && $unitPrice !== null) {
            $totalCost = round($liters * $unitPrice, 2);
        }

        return [
            'vehicle_id' => (int) $input['vehicle_id'],
            'recorded_by' => $recordedBy > 0 ? $recordedBy : null,
            'fueled_at' => (string) $input['fueled_at'],
            'odometer_km' => $this->nullableFloat($input['odometer_km'] ?? null),
            'liters' => $liters,
            'unit_price' => $unitPrice,
            'total_cost' => $totalCost,
            'fuel_station' => $this->nullableString($input['fuel_station'] ?? null),
            'notes' => $this->nullableString($input['notes'] ?? null),
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

    private function isDateTime(string $value): bool
    {
        try {
            $date = new DateTimeImmutable($value);
            return $date->format('Y-m-d H:i:s') === $value;
        } catch (Exception) {
            return false;
        }
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
