<?php

declare(strict_types=1);

namespace App\Models;

class MaintenanceRecord
{
    public function __construct(
        public readonly int $id,
        public readonly int $vehicleId,
        public readonly ?int $recordedBy,
        public readonly string $maintenanceType,
        public readonly string $description,
        public readonly ?string $vendor,
        public readonly string $serviceDate,
        public readonly ?float $odometerKm,
        public readonly ?float $cost,
        public readonly ?string $nextServiceDate,
        public readonly string $status,
        public readonly string $createdAt,
        public readonly string $updatedAt,
    ) {
    }

    public static function fromArray(array $row): self
    {
        return new self(
            (int) $row['id'],
            (int) $row['vehicle_id'],
            isset($row['recorded_by']) ? (int) $row['recorded_by'] : null,
            (string) $row['maintenance_type'],
            (string) $row['description'],
            $row['vendor'] ?? null,
            (string) $row['service_date'],
            isset($row['odometer_km']) ? (float) $row['odometer_km'] : null,
            isset($row['cost']) ? (float) $row['cost'] : null,
            $row['next_service_date'] ?? null,
            (string) $row['status'],
            (string) $row['created_at'],
            (string) $row['updated_at']
        );
    }
}
