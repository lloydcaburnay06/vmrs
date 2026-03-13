<?php

declare(strict_types=1);

namespace App\Models;

class Vehicle
{
    public function __construct(
        public readonly int $id,
        public readonly string $vehicleCode,
        public readonly string $plateNo,
        public readonly ?string $vin,
        public readonly int $typeId,
        public readonly string $serviceType,
        public readonly ?int $currentLocationId,
        public readonly string $make,
        public readonly string $model,
        public readonly ?int $year,
        public readonly ?string $color,
        public readonly ?string $transmission,
        public readonly ?string $fuelType,
        public readonly ?int $seats,
        public readonly ?float $payloadKg,
        public readonly float $odometerKm,
        public readonly string $status,
        public readonly ?string $registrationExpiry,
        public readonly ?string $insuranceExpiry,
        public readonly ?string $notes,
        public readonly string $createdAt,
        public readonly string $updatedAt,
    ) {
    }

    public static function fromArray(array $row): self
    {
        return new self(
            (int) $row['id'],
            (string) $row['vehicle_code'],
            (string) $row['plate_no'],
            $row['vin'] ?? null,
            (int) $row['type_id'],
            (string) ($row['service_type'] ?? 'administrative'),
            isset($row['current_location_id']) ? (int) $row['current_location_id'] : null,
            (string) $row['make'],
            (string) $row['model'],
            isset($row['year']) ? (int) $row['year'] : null,
            $row['color'] ?? null,
            $row['transmission'] ?? null,
            $row['fuel_type'] ?? null,
            isset($row['seats']) ? (int) $row['seats'] : null,
            isset($row['payload_kg']) ? (float) $row['payload_kg'] : null,
            (float) $row['odometer_km'],
            (string) $row['status'],
            $row['registration_expiry'] ?? null,
            $row['insurance_expiry'] ?? null,
            $row['notes'] ?? null,
            (string) $row['created_at'],
            (string) $row['updated_at']
        );
    }
}
