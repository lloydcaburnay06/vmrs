<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\TripLog;

class TripLogRepository extends BaseRepository
{
    protected function table(): string
    {
        return 'trip_logs';
    }

    /**
     * @return TripLog[]
     */
    public function all(): array
    {
        return array_map(static fn(array $row): TripLog => TripLog::fromArray($row), $this->findAllRaw());
    }

    public function find(int $id): ?TripLog
    {
        $row = $this->findByIdRaw($id);

        return $row ? TripLog::fromArray($row) : null;
    }
}
