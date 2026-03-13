<?php

declare(strict_types=1);

namespace App\Models;

class VehicleType
{
    public function __construct(
        public readonly int $id,
        public readonly string $name,
        public readonly ?string $description,
        public readonly string $createdAt,
        public readonly string $updatedAt,
    ) {
    }

    public static function fromArray(array $row): self
    {
        return new self((int) $row['id'], (string) $row['name'], $row['description'] ?? null, (string) $row['created_at'], (string) $row['updated_at']);
    }
}
