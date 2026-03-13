<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\MaintenanceRecord;

class MaintenanceRecordRepository extends BaseRepository
{
    protected function table(): string
    {
        return 'maintenance_records';
    }

    /**
     * @return MaintenanceRecord[]
     */
    public function all(): array
    {
        return array_map(static fn(array $row): MaintenanceRecord => MaintenanceRecord::fromArray($row), $this->findAllRaw());
    }

    public function find(int $id): ?MaintenanceRecord
    {
        $row = $this->findByIdRaw($id);

        return $row ? MaintenanceRecord::fromArray($row) : null;
    }
}
