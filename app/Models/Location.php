<?php

declare(strict_types=1);

namespace App\Models;

class Location
{
    public function __construct(
        public readonly int $id,
        public readonly string $name,
        public readonly ?string $addressLine,
        public readonly ?string $city,
        public readonly ?string $state,
        public readonly ?string $postalCode,
        public readonly bool $isActive,
        public readonly string $createdAt,
        public readonly string $updatedAt,
    ) {
    }

    public static function fromArray(array $row): self
    {
        return new self(
            (int) $row['id'],
            (string) $row['name'],
            $row['address_line'] ?? null,
            $row['city'] ?? null,
            $row['state'] ?? null,
            $row['postal_code'] ?? null,
            (bool) $row['is_active'],
            (string) $row['created_at'],
            (string) $row['updated_at']
        );
    }
}
