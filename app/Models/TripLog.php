<?php

declare(strict_types=1);

namespace App\Models;

class TripLog
{
    public function __construct(
        public readonly int $id,
        public readonly int $reservationId,
        public readonly ?int $driverId,
        public readonly ?string $checkOutAt,
        public readonly ?string $checkInAt,
        public readonly ?float $startOdometerKm,
        public readonly ?float $endOdometerKm,
        public readonly ?float $distanceKm,
        public readonly ?float $fuelUsedLiters,
        public readonly ?string $incidentReport,
        public readonly string $createdAt,
        public readonly string $updatedAt,
    ) {
    }

    public static function fromArray(array $row): self
    {
        return new self(
            (int) $row['id'],
            (int) $row['reservation_id'],
            isset($row['driver_id']) ? (int) $row['driver_id'] : null,
            $row['check_out_at'] ?? null,
            $row['check_in_at'] ?? null,
            isset($row['start_odometer_km']) ? (float) $row['start_odometer_km'] : null,
            isset($row['end_odometer_km']) ? (float) $row['end_odometer_km'] : null,
            isset($row['distance_km']) ? (float) $row['distance_km'] : null,
            isset($row['fuel_used_liters']) ? (float) $row['fuel_used_liters'] : null,
            $row['incident_report'] ?? null,
            (string) $row['created_at'],
            (string) $row['updated_at']
        );
    }
}
