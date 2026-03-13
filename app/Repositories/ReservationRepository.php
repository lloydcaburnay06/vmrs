<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\Reservation;
use PDO;

class ReservationRepository extends BaseRepository
{
    protected function table(): string
    {
        return 'reservations';
    }

    /**
     * @return Reservation[]
     */
    public function all(): array
    {
        return array_map(static fn(array $row): Reservation => Reservation::fromArray($row), $this->findAllRaw());
    }

    public function find(int $id): ?Reservation
    {
        $row = $this->findByIdRaw($id);

        return $row ? Reservation::fromArray($row) : null;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function findOverlappingByVehicle(
        int $vehicleId,
        string $startAt,
        string $endAt,
        ?int $excludeReservationId = null
    ): array {
        $sql = 'SELECT id, reservation_no, start_at, end_at, status
                FROM reservations
                WHERE vehicle_id = :vehicle_id
                  AND status IN ("pending", "approved", "active")
                  AND :start_at < end_at
                  AND :end_at > start_at';

        if ($excludeReservationId !== null) {
            $sql .= ' AND id <> :exclude_id';
        }

        $sql .= ' ORDER BY start_at ASC';

        $statement = $this->db->prepare($sql);
        $statement->bindValue(':vehicle_id', $vehicleId, PDO::PARAM_INT);
        $statement->bindValue(':start_at', $startAt);
        $statement->bindValue(':end_at', $endAt);

        if ($excludeReservationId !== null) {
            $statement->bindValue(':exclude_id', $excludeReservationId, PDO::PARAM_INT);
        }

        $statement->execute();

        return $statement->fetchAll();
    }
}
