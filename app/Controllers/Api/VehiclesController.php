<?php

declare(strict_types=1);

namespace App\Controllers\Api;

use App\Core\Response;
use App\Repositories\VehicleRepository;
use DateTimeImmutable;
use Exception;
use PDOException;

class VehiclesController
{
    public function __construct(private readonly VehicleRepository $vehicleRepository)
    {
    }

    public function index(): void
    {
        Response::json(['data' => $this->vehicleRepository->allForAdmin()]);
    }

    public function show(int $id): void
    {
        $vehicle = $this->vehicleRepository->findForAdmin($id);

        if (!$vehicle) {
            Response::json(['error' => 'Vehicle not found'], 404);
            return;
        }

        Response::json(['data' => $vehicle]);
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
            $id = $this->vehicleRepository->create($payload);
        } catch (PDOException $exception) {
            $dbError = $this->handleDbError($exception);
            if ($dbError !== null) {
                Response::json(['error' => $dbError], 409);
                return;
            }

            throw $exception;
        }

        Response::json(['data' => $this->vehicleRepository->findForAdmin($id)], 201);
    }

    public function update(int $id): void
    {
        $existing = $this->vehicleRepository->findForAdmin($id);

        if (!$existing) {
            Response::json(['error' => 'Vehicle not found'], 404);
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
            $this->vehicleRepository->updateById($id, $payload);
        } catch (PDOException $exception) {
            $dbError = $this->handleDbError($exception);
            if ($dbError !== null) {
                Response::json(['error' => $dbError], 409);
                return;
            }

            throw $exception;
        }

        Response::json(['data' => $this->vehicleRepository->findForAdmin($id)]);
    }

    public function destroy(int $id): void
    {
        $existing = $this->vehicleRepository->findForAdmin($id);

        if (!$existing) {
            Response::json(['error' => 'Vehicle not found'], 404);
            return;
        }

        try {
            $this->vehicleRepository->deleteById($id);
        } catch (PDOException $exception) {
            if ((int) ($exception->errorInfo[1] ?? 0) === 1451) {
                Response::json(['error' => 'Vehicle cannot be deleted because it is referenced by other records'], 409);
                return;
            }

            throw $exception;
        }

        Response::json(['message' => 'Vehicle deleted']);
    }

    /**
     * @param array<string, mixed> $input
     */
    private function validate(array $input): ?string
    {
        $required = ['vehicle_code', 'plate_no', 'type_id', 'service_type', 'make', 'model', 'odometer_km', 'status'];

        foreach ($required as $field) {
            if (!isset($input[$field]) || trim((string) $input[$field]) === '') {
                return sprintf('%s is required', $field);
            }
        }

        if ((int) $input['type_id'] <= 0) {
            return 'type_id must be a valid ID';
        }

        if (!is_numeric((string) $input['odometer_km']) || (float) $input['odometer_km'] < 0) {
            return 'odometer_km must be a non-negative number';
        }

        if (isset($input['year']) && trim((string) $input['year']) !== '' && !preg_match('/^\d{4}$/', (string) $input['year'])) {
            return 'year must be a 4-digit number';
        }

        if (isset($input['seats']) && trim((string) $input['seats']) !== '' && (!is_numeric((string) $input['seats']) || (int) $input['seats'] <= 0)) {
            return 'seats must be a positive number';
        }

        if (isset($input['payload_kg']) && trim((string) $input['payload_kg']) !== '' && !is_numeric((string) $input['payload_kg'])) {
            return 'payload_kg must be numeric';
        }

        if (!in_array((string) $input['status'], ['available', 'reserved', 'in_use', 'maintenance', 'inactive'], true)) {
            return 'status is invalid';
        }

        if (!in_array((string) $input['service_type'], ['ambulance', 'administrative'], true)) {
            return 'service_type is invalid';
        }

        if (isset($input['transmission']) && trim((string) $input['transmission']) !== ''
            && !in_array((string) $input['transmission'], ['manual', 'automatic', 'cvt', 'other'], true)) {
            return 'transmission is invalid';
        }

        if (isset($input['fuel_type']) && trim((string) $input['fuel_type']) !== ''
            && !in_array((string) $input['fuel_type'], ['gasoline', 'diesel', 'electric', 'hybrid', 'lpg', 'other'], true)) {
            return 'fuel_type is invalid';
        }

        if (!$this->isNullableDate($input['registration_expiry'] ?? null) || !$this->isNullableDate($input['insurance_expiry'] ?? null)) {
            return 'registration_expiry and insurance_expiry must be YYYY-MM-DD';
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
            'vehicle_code' => strtoupper(trim((string) $input['vehicle_code'])),
            'plate_no' => strtoupper(trim((string) $input['plate_no'])),
            'vin' => $this->nullableString($input['vin'] ?? null),
            'type_id' => (int) $input['type_id'],
            'service_type' => (string) $input['service_type'],
            'current_location_id' => $this->nullableInt($input['current_location_id'] ?? null),
            'make' => trim((string) $input['make']),
            'model' => trim((string) $input['model']),
            'year' => $this->nullableInt($input['year'] ?? null),
            'color' => $this->nullableString($input['color'] ?? null),
            'transmission' => $this->nullableString($input['transmission'] ?? null),
            'fuel_type' => $this->nullableString($input['fuel_type'] ?? null),
            'seats' => $this->nullableInt($input['seats'] ?? null),
            'payload_kg' => $this->nullableFloat($input['payload_kg'] ?? null),
            'odometer_km' => (float) $input['odometer_km'],
            'status' => (string) $input['status'],
            'registration_expiry' => $this->nullableString($input['registration_expiry'] ?? null),
            'insurance_expiry' => $this->nullableString($input['insurance_expiry'] ?? null),
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

    private function nullableInt(mixed $value): ?int
    {
        if ($value === null || trim((string) $value) === '') {
            return null;
        }

        return (int) $value;
    }

    private function nullableFloat(mixed $value): ?float
    {
        if ($value === null || trim((string) $value) === '') {
            return null;
        }

        return (float) $value;
    }

    private function isNullableDate(mixed $value): bool
    {
        if ($value === null || trim((string) $value) === '') {
            return true;
        }

        try {
            $date = new DateTimeImmutable((string) $value);
            return $date->format('Y-m-d') === (string) $value;
        } catch (Exception) {
            return false;
        }
    }

    private function handleDbError(PDOException $exception): ?string
    {
        $code = (int) ($exception->errorInfo[1] ?? 0);

        if ($code === 1062) {
            return 'Duplicate vehicle_code, plate_no, or vin';
        }

        if ($code === 1452) {
            return 'Invalid type_id or current_location_id';
        }

        return null;
    }
}
