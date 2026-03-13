<?php

declare(strict_types=1);

namespace App\Controllers\Api;

use App\Core\Response;
use App\Repositories\VehicleTypeRepository;
use App\Services\AuditLogger;
use PDOException;

class VehicleTypesAdminController
{
    public function __construct(
        private readonly VehicleTypeRepository $repository,
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
        $type = $this->repository->findForAdmin($id);

        if (!$type) {
            Response::json(['error' => 'Vehicle type not found'], 404);
            return;
        }

        Response::json(['data' => $type]);
    }

    public function store(): void
    {
        $input = $this->readJsonInput();
        $validationError = $this->validate($input);

        if ($validationError !== null) {
            Response::json(['error' => $validationError], 422);
            return;
        }

        $payload = $this->normalizePayload($input);

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

        $this->auditLogger->record($this->authUser(), 'vehicle_type.created', 'vehicle_type', $id, [
            'name' => $payload['name'],
        ]);
        Response::json(['data' => $this->repository->findForAdmin($id)], 201);
    }

    public function update(int $id): void
    {
        $existing = $this->repository->findForAdmin($id);

        if (!$existing) {
            Response::json(['error' => 'Vehicle type not found'], 404);
            return;
        }

        $input = $this->readJsonInput();
        $validationError = $this->validate($input);

        if ($validationError !== null) {
            Response::json(['error' => $validationError], 422);
            return;
        }

        $payload = $this->normalizePayload($input);

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

        $this->auditLogger->record($this->authUser(), 'vehicle_type.updated', 'vehicle_type', $id, [
            'name' => $payload['name'],
        ]);
        Response::json(['data' => $this->repository->findForAdmin($id)]);
    }

    public function destroy(int $id): void
    {
        $existing = $this->repository->findForAdmin($id);

        if (!$existing) {
            Response::json(['error' => 'Vehicle type not found'], 404);
            return;
        }

        try {
            $this->repository->deleteById($id);
        } catch (PDOException $exception) {
            if ((int) ($exception->errorInfo[1] ?? 0) === 1451) {
                Response::json(['error' => 'Vehicle type cannot be deleted because it is referenced by vehicles'], 409);
                return;
            }

            throw $exception;
        }

        $this->auditLogger->record($this->authUser(), 'vehicle_type.deleted', 'vehicle_type', $id, [
            'name' => (string) $existing['name'],
        ]);
        Response::json(['message' => 'Vehicle type deleted']);
    }

    /**
     * @param array<string, mixed> $input
     */
    private function validate(array $input): ?string
    {
        if (!isset($input['name']) || trim((string) $input['name']) === '') {
            return 'name is required';
        }

        return null;
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    private function normalizePayload(array $input): array
    {
        return [
            'name' => trim((string) $input['name']),
            'description' => $this->nullableString($input['description'] ?? null),
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

    private function handleDbError(PDOException $exception): ?string
    {
        if ((int) ($exception->errorInfo[1] ?? 0) === 1062) {
            return 'Vehicle type name already exists';
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
