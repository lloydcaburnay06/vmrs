<?php

declare(strict_types=1);

namespace App\Models;

class FuelLog
{
    public function __construct(
        public readonly int $id,
        public readonly int $vehicleId,
        public readonly ?int $recordedBy,
        public readonly string $fueledAt,
        public readonly ?float $odometerKm,
        public readonly float $liters,
        public readonly ?float $unitPrice,
        public readonly ?float $totalCost,
        public readonly ?string $fuelStation,
        public readonly ?string $notes,
        public readonly string $createdAt,
    ) {
    }

    public static function fromArray(array $row): self
    {
        return new self(
            (int) $row['id'],
            (int) $row['vehicle_id'],
            isset($row['recorded_by']) ? (int) $row['recorded_by'] : null,
            (string) $row['fueled_at'],
            isset($row['odometer_km']) ? (float) $row['odometer_km'] : null,
            (float) $row['liters'],
            isset($row['unit_price']) ? (float) $row['unit_price'] : null,
            isset($row['total_cost']) ? (float) $row['total_cost'] : null,
            $row['fuel_station'] ?? null,
            $row['notes'] ?? null,
            (string) $row['created_at']
        );
    }
}
