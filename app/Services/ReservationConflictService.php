<?php

declare(strict_types=1);

namespace App\Services;

use App\Repositories\ReservationRepository;

class ReservationConflictService
{
    public function __construct(private readonly ReservationRepository $reservationRepository)
    {
    }

    /**
     * @return array<string, mixed>
     */
    public function check(int $vehicleId, string $startAt, string $endAt, ?int $excludeReservationId = null): array
    {
        $conflicts = $this->reservationRepository->findOverlappingByVehicle(
            $vehicleId,
            $startAt,
            $endAt,
            $excludeReservationId
        );

        return [
            'has_conflict' => count($conflicts) > 0,
            'conflict_count' => count($conflicts),
            'conflicts' => $conflicts,
        ];
    }
}
