<?php

declare(strict_types=1);

namespace App\Models;

class AuditLog
{
    public function __construct(
        public readonly int $id,
        public readonly ?int $userId,
        public readonly string $action,
        public readonly string $entityType,
        public readonly ?int $entityId,
        public readonly ?string $ipAddress,
        public readonly ?string $userAgent,
        public readonly ?string $payload,
        public readonly string $createdAt,
    ) {
    }

    public static function fromArray(array $row): self
    {
        return new self(
            (int) $row['id'],
            isset($row['user_id']) ? (int) $row['user_id'] : null,
            (string) $row['action'],
            (string) $row['entity_type'],
            isset($row['entity_id']) ? (int) $row['entity_id'] : null,
            $row['ip_address'] ?? null,
            $row['user_agent'] ?? null,
            isset($row['payload']) ? (string) $row['payload'] : null,
            (string) $row['created_at']
        );
    }
}
