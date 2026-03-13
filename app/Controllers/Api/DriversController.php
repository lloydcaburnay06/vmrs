<?php

declare(strict_types=1);

namespace App\Controllers\Api;

use App\Core\Response;
use App\Repositories\DriverRepository;
use DateTimeImmutable;
use Exception;
use PDOException;

class DriversController
{
    public function __construct(private readonly DriverRepository $driverRepository)
    {
    }

    public function index(): void
    {
        Response::json(['data' => $this->driverRepository->all()]);
    }

    public function show(int $id): void
    {
        $driver = $this->driverRepository->find($id);

        if (!$driver) {
            Response::json(['error' => 'Driver not found'], 404);
            return;
        }

        Response::json(['data' => $driver]);
    }

    public function store(): void
    {
        $input = $this->readJsonInput();
        $error = $this->validateCreate($input);

        if ($error !== null) {
            Response::json(['error' => $error], 422);
            return;
        }

        $payload = [
            'employee_no' => $this->nullableString($input['employee_no'] ?? null),
            'first_name' => trim((string) $input['first_name']),
            'last_name' => trim((string) $input['last_name']),
            'email' => strtolower(trim((string) $input['email'])),
            'password_hash' => password_hash((string) $input['password'], PASSWORD_BCRYPT),
            'phone' => $this->nullableString($input['phone'] ?? null),
            'status' => (string) $input['status'],
            'dl_id_number' => strtoupper(trim((string) $input['dl_id_number'])),
            'license_expiry' => (string) $input['license_expiry'],
            'assignment_type' => (string) ($input['assignment_type'] ?? 'ambulance'),
        ];

        try {
            $id = $this->driverRepository->create($payload);
        } catch (PDOException $exception) {
            if ((int) ($exception->errorInfo[1] ?? 0) === 1062) {
                Response::json(['error' => 'Duplicate email, employee number, or DL ID number'], 409);
                return;
            }

            throw $exception;
        }

        Response::json(['data' => $this->driverRepository->find($id)], 201);
    }

    public function update(int $id): void
    {
        $existing = $this->driverRepository->find($id);

        if (!$existing) {
            Response::json(['error' => 'Driver not found'], 404);
            return;
        }

        $input = $this->readJsonInput();
        $error = $this->validateUpdate($input);

        if ($error !== null) {
            Response::json(['error' => $error], 422);
            return;
        }

        $payload = [
            'employee_no' => $this->nullableString($input['employee_no'] ?? null),
            'first_name' => trim((string) $input['first_name']),
            'last_name' => trim((string) $input['last_name']),
            'email' => strtolower(trim((string) $input['email'])),
            'phone' => $this->nullableString($input['phone'] ?? null),
            'status' => (string) $input['status'],
            'dl_id_number' => strtoupper(trim((string) $input['dl_id_number'])),
            'license_expiry' => (string) $input['license_expiry'],
            'assignment_type' => (string) ($input['assignment_type'] ?? 'ambulance'),
        ];

        if (isset($input['password']) && trim((string) $input['password']) !== '') {
            $payload['password_hash'] = password_hash((string) $input['password'], PASSWORD_BCRYPT);
        }

        try {
            $this->driverRepository->update($id, $payload);
        } catch (PDOException $exception) {
            if ((int) ($exception->errorInfo[1] ?? 0) === 1062) {
                Response::json(['error' => 'Duplicate email, employee number, or DL ID number'], 409);
                return;
            }

            throw $exception;
        }

        Response::json(['data' => $this->driverRepository->find($id)]);
    }

    public function destroy(int $id): void
    {
        $existing = $this->driverRepository->find($id);

        if (!$existing) {
            Response::json(['error' => 'Driver not found'], 404);
            return;
        }

        $this->driverRepository->delete($id);
        Response::json(['message' => 'Driver deleted']);
    }

    /**
     * @param array<string, mixed> $input
     */
    private function validateCreate(array $input): ?string
    {
        $base = $this->validateBase($input);

        if ($base !== null) {
            return $base;
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
        $base = $this->validateBase($input);

        if ($base !== null) {
            return $base;
        }

        if (isset($input['password']) && trim((string) $input['password']) !== '' && strlen((string) $input['password']) < 8) {
            return 'password must be at least 8 characters';
        }

        return null;
    }

    /**
     * @param array<string, mixed> $input
     */
    private function validateBase(array $input): ?string
    {
        $required = ['first_name', 'last_name', 'email', 'status', 'dl_id_number', 'license_expiry'];

        foreach ($required as $field) {
            if (!isset($input[$field]) || trim((string) $input[$field]) === '') {
                return sprintf('%s is required', $field);
            }
        }

        if (!filter_var((string) $input['email'], FILTER_VALIDATE_EMAIL)) {
            return 'email is invalid';
        }

        if (!in_array((string) $input['status'], ['active', 'inactive', 'suspended'], true)) {
            return 'status is invalid';
        }

        if (!$this->isDate((string) $input['license_expiry'])) {
            return 'license_expiry must be YYYY-MM-DD';
        }

        if (isset($input['assignment_type']) && !in_array((string) $input['assignment_type'], ['administrative', 'ambulance'], true)) {
            return 'assignment_type is invalid';
        }

        return null;
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

    private function isDate(string $value): bool
    {
        try {
            $date = new DateTimeImmutable($value);
            return $date->format('Y-m-d') === $value;
        } catch (Exception) {
            return false;
        }
    }
}
