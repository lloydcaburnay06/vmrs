<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\AuditLog;

class AuditLogRepository extends BaseRepository
{
    protected function table(): string
    {
        return 'audit_logs';
    }

    /**
     * @return AuditLog[]
     */
    public function all(): array
    {
        return array_map(static fn(array $row): AuditLog => AuditLog::fromArray($row), $this->findAllRaw());
    }

    public function find(int $id): ?AuditLog
    {
        $row = $this->findByIdRaw($id);

        return $row ? AuditLog::fromArray($row) : null;
    }
}
