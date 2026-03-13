<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\FuelLog;

class FuelLogRepository extends BaseRepository
{
    protected function table(): string
    {
        return 'fuel_logs';
    }

    /**
     * @return FuelLog[]
     */
    public function all(): array
    {
        return array_map(static fn(array $row): FuelLog => FuelLog::fromArray($row), $this->findAllRaw());
    }

    public function find(int $id): ?FuelLog
    {
        $row = $this->findByIdRaw($id);

        return $row ? FuelLog::fromArray($row) : null;
    }
}
