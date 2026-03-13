<?php

declare(strict_types=1);

namespace App\Models;

class Reservation
{
    public function __construct(
        public readonly int $id,
        public readonly string $reservationNo,
        public readonly int $vehicleId,
        public readonly int $requesterId,
        public readonly ?int $approverId,
        public readonly ?int $pickupLocationId,
        public readonly ?int $dropoffLocationId,
        public readonly string $purpose,
        public readonly ?string $destination,
        public readonly string $startAt,
        public readonly string $endAt,
        public readonly ?string $actualStartAt,
        public readonly ?string $actualEndAt,
        public readonly ?int $passengers,
        public readonly string $priority,
        public readonly string $status,
        public readonly ?string $rejectionReason,
        public readonly ?string $remarks,
        public readonly string $createdAt,
        public readonly string $updatedAt,
        public readonly ?string $cancelledAt,
    ) {
    }

    public static function fromArray(array $row): self
    {
        return new self(
            (int) $row['id'],
            (string) $row['reservation_no'],
            (int) $row['vehicle_id'],
            (int) $row['requester_id'],
            isset($row['approver_id']) ? (int) $row['approver_id'] : null,
            isset($row['pickup_location_id']) ? (int) $row['pickup_location_id'] : null,
            isset($row['dropoff_location_id']) ? (int) $row['dropoff_location_id'] : null,
            (string) $row['purpose'],
            $row['destination'] ?? null,
            (string) $row['start_at'],
            (string) $row['end_at'],
            $row['actual_start_at'] ?? null,
            $row['actual_end_at'] ?? null,
            isset($row['passengers']) ? (int) $row['passengers'] : null,
            (string) $row['priority'],
            (string) $row['status'],
            $row['rejection_reason'] ?? null,
            $row['remarks'] ?? null,
            (string) $row['created_at'],
            (string) $row['updated_at'],
            $row['cancelled_at'] ?? null
        );
    }
}
