<?php

declare(strict_types=1);

namespace App\Models;

class ReservationPassenger
{
    public function __construct(
        public readonly int $id,
        public readonly int $reservationId,
        public readonly string $fullName,
        public readonly ?string $contactNo,
        public readonly ?string $notes,
        public readonly string $createdAt,
    ) {
    }

    public static function fromArray(array $row): self
    {
        return new self(
            (int) $row['id'],
            (int) $row['reservation_id'],
            (string) $row['full_name'],
            $row['contact_no'] ?? null,
            $row['notes'] ?? null,
            (string) $row['created_at']
        );
    }
}
