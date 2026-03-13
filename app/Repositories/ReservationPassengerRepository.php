<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\ReservationPassenger;

class ReservationPassengerRepository extends BaseRepository
{
    protected function table(): string
    {
        return 'reservation_passengers';
    }

    /**
     * @return ReservationPassenger[]
     */
    public function all(): array
    {
        return array_map(static fn(array $row): ReservationPassenger => ReservationPassenger::fromArray($row), $this->findAllRaw());
    }

    public function find(int $id): ?ReservationPassenger
    {
        $row = $this->findByIdRaw($id);

        return $row ? ReservationPassenger::fromArray($row) : null;
    }
}
