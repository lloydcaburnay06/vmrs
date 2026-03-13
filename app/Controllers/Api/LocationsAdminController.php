<?php

declare(strict_types=1);

namespace App\Controllers\Api;

use App\Core\Response;
use App\Repositories\LocationRepository;
use App\Services\AuditLogger;
use PDOException;

class LocationsAdminController
{
    public function __construct(
        private readonly LocationRepository $repository,
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
        $location = $this->repository->findForAdmin($id);

        if (!$location) {
            Response::json(['error' => 'Location not found'], 404);
            return;
        }

        Response::json(['data' => $location]);
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

        $this->auditLogger->record($this->authUser(), 'location.created', 'location', $id, [
            'name' => $payload['name'],
            'is_active' => $payload['is_active'],
        ]);
        Response::json(['data' => $this->repository->findForAdmin($id)], 201);
    }

    public function update(int $id): void
    {
        $existing = $this->repository->findForAdmin($id);

        if (!$existing) {
            Response::json(['error' => 'Location not found'], 404);
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

        $this->auditLogger->record($this->authUser(), 'location.updated', 'location', $id, [
            'name' => $payload['name'],
            'is_active' => $payload['is_active'],
        ]);
        Response::json(['data' => $this->repository->findForAdmin($id)]);
    }

    public function destroy(int $id): void
    {
        $existing = $this->repository->findForAdmin($id);

        if (!$existing) {
            Response::json(['error' => 'Location not found'], 404);
            return;
        }

        try {
            $this->repository->deleteById($id);
        } catch (PDOException $exception) {
            if ((int) ($exception->errorInfo[1] ?? 0) === 1451) {
                Response::json(['error' => 'Location cannot be deleted because it is referenced by other records'], 409);
                return;
            }

            throw $exception;
        }

        $this->auditLogger->record($this->authUser(), 'location.deleted', 'location', $id, [
            'name' => (string) $existing['name'],
        ]);
        Response::json(['message' => 'Location deleted']);
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
            'address_line' => $this->nullableString($input['address_line'] ?? null),
            'city' => $this->nullableString($input['city'] ?? null),
            'state' => $this->nullableString($input['state'] ?? null),
            'postal_code' => $this->nullableString($input['postal_code'] ?? null),
            'is_active' => !empty($input['is_active']) ? 1 : 0,
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
            return 'Location name already exists';
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
