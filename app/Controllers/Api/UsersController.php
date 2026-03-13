<?php

declare(strict_types=1);

namespace App\Controllers\Api;

use App\Core\Response;
use App\Repositories\UserRepository;
use App\Services\AuditLogger;
use PDOException;

class UsersController
{
    public function __construct(
        private readonly UserRepository $userRepository,
        private readonly AuditLogger $auditLogger,
    )
    {
    }

    public function index(): void
    {
        Response::json(['data' => $this->userRepository->allForAdmin()]);
    }

    public function show(int $id): void
    {
        $user = $this->userRepository->findForAdmin($id);

        if (!$user) {
            Response::json(['error' => 'User not found'], 404);
            return;
        }

        Response::json(['data' => $user]);
    }

    public function store(): void
    {
        $input = $this->readJsonInput();
        $validationError = $this->validateCreate($input);

        if ($validationError !== null) {
            Response::json(['error' => $validationError], 422);
            return;
        }

        $payload = [
            'role_id' => (int) $input['role_id'],
            'employee_no' => $this->nullableString($input['employee_no'] ?? null),
            'first_name' => trim((string) $input['first_name']),
            'last_name' => trim((string) $input['last_name']),
            'email' => strtolower(trim((string) $input['email'])),
            'password_hash' => password_hash((string) $input['password'], PASSWORD_BCRYPT),
            'phone' => $this->nullableString($input['phone'] ?? null),
            'status' => (string) $input['status'],
        ];

        try {
            $id = $this->userRepository->create($payload);
        } catch (PDOException $exception) {
            if ($this->isDuplicateKeyError($exception)) {
                Response::json(['error' => 'Email or employee number already exists'], 409);
                return;
            }

            throw $exception;
        }

        $created = $this->userRepository->findForAdmin($id);
        $this->auditLogger->record($this->authUser(), 'user.created', 'user', $id, [
            'email' => $payload['email'],
            'role_id' => $payload['role_id'],
            'status' => $payload['status'],
        ]);
        Response::json(['data' => $created], 201);
    }

    public function update(int $id): void
    {
        $existing = $this->userRepository->findForAdmin($id);

        if (!$existing) {
            Response::json(['error' => 'User not found'], 404);
            return;
        }

        $input = $this->readJsonInput();
        $validationError = $this->validateUpdate($input);

        if ($validationError !== null) {
            Response::json(['error' => $validationError], 422);
            return;
        }

        $payload = [
            'role_id' => (int) $input['role_id'],
            'employee_no' => $this->nullableString($input['employee_no'] ?? null),
            'first_name' => trim((string) $input['first_name']),
            'last_name' => trim((string) $input['last_name']),
            'email' => strtolower(trim((string) $input['email'])),
            'phone' => $this->nullableString($input['phone'] ?? null),
            'status' => (string) $input['status'],
        ];

        if (isset($input['password']) && trim((string) $input['password']) !== '') {
            $payload['password_hash'] = password_hash((string) $input['password'], PASSWORD_BCRYPT);
        }

        try {
            $this->userRepository->updateById($id, $payload);
        } catch (PDOException $exception) {
            if ($this->isDuplicateKeyError($exception)) {
                Response::json(['error' => 'Email or employee number already exists'], 409);
                return;
            }

            throw $exception;
        }

        $updated = $this->userRepository->findForAdmin($id);
        $this->auditLogger->record($this->authUser(), 'user.updated', 'user', $id, [
            'email' => $payload['email'],
            'role_id' => $payload['role_id'],
            'status' => $payload['status'],
        ]);
        Response::json(['data' => $updated]);
    }

    public function destroy(int $id): void
    {
        $existing = $this->userRepository->findForAdmin($id);

        if (!$existing) {
            Response::json(['error' => 'User not found'], 404);
            return;
        }

        if (isset($_SESSION['auth_user']['id']) && (int) $_SESSION['auth_user']['id'] === $id) {
            Response::json(['error' => 'You cannot delete your own account'], 422);
            return;
        }

        $this->userRepository->deleteById($id);
        $this->auditLogger->record($this->authUser(), 'user.deleted', 'user', $id, [
            'email' => (string) $existing['email'],
            'role_name' => (string) $existing['role_name'],
        ]);
        Response::json(['message' => 'User deleted']);
    }

    /**
     * @param array<string, mixed> $input
     */
    private function validateCreate(array $input): ?string
    {
        if (!$this->validateBase($input)) {
            return 'role_id, first_name, last_name, email, and status are required';
        }

        if (!isset($input['password']) || trim((string) $input['password']) === '') {
            return 'password is required';
        }

        if (strlen((string) $input['password']) < 8) {
            return 'password must be at least 8 characters';
        }

        return null;
    }

    /**
     * @param array<string, mixed> $input
     */
    private function validateUpdate(array $input): ?string
    {
        if (!$this->validateBase($input)) {
            return 'role_id, first_name, last_name, email, and status are required';
        }

        if (isset($input['password']) && trim((string) $input['password']) !== '' && strlen((string) $input['password']) < 8) {
            return 'password must be at least 8 characters';
        }

        return null;
    }

    /**
     * @param array<string, mixed> $input
     */
    private function validateBase(array $input): bool
    {
        if (!isset($input['role_id'], $input['first_name'], $input['last_name'], $input['email'], $input['status'])) {
            return false;
        }

        if ((int) $input['role_id'] <= 0) {
            return false;
        }

        if (trim((string) $input['first_name']) === '' || trim((string) $input['last_name']) === '') {
            return false;
        }

        if (!filter_var((string) $input['email'], FILTER_VALIDATE_EMAIL)) {
            return false;
        }

        return in_array((string) $input['status'], ['active', 'inactive', 'suspended'], true);
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

    private function isDuplicateKeyError(PDOException $exception): bool
    {
        return (int) $exception->errorInfo[1] === 1062;
    }

    /**
     * @return array<string, mixed>
     */
    private function authUser(): array
    {
        return is_array($_SESSION['auth_user'] ?? null) ? $_SESSION['auth_user'] : [];
    }
}
