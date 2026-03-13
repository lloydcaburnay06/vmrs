<?php

declare(strict_types=1);

namespace App\Models;

class User
{
    public function __construct(
        public readonly int $id,
        public readonly int $roleId,
        public readonly ?string $employeeNo,
        public readonly string $firstName,
        public readonly string $lastName,
        public readonly string $email,
        public readonly string $passwordHash,
        public readonly ?string $phone,
        public readonly string $status,
        public readonly string $createdAt,
        public readonly string $updatedAt,
    ) {
    }

    public static function fromArray(array $row): self
    {
        return new self(
            (int) $row['id'],
            (int) $row['role_id'],
            $row['employee_no'] ?? null,
            (string) $row['first_name'],
            (string) $row['last_name'],
            (string) $row['email'],
            (string) $row['password_hash'],
            $row['phone'] ?? null,
            (string) $row['status'],
            (string) $row['created_at'],
            (string) $row['updated_at']
        );
    }
}
