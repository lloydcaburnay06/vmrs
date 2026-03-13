<?php

declare(strict_types=1);

namespace App\Controllers\Api;

use App\Core\Response;
use App\Services\ReservationConflictService;
use DateTimeImmutable;
use Exception;

class ReservationController
{
    public function __construct(private readonly ReservationConflictService $conflictService)
    {
    }

    public function conflicts(): void
    {
        $vehicleId = isset($_GET['vehicle_id']) ? (int) $_GET['vehicle_id'] : 0;
        $startAt = isset($_GET['start_at']) ? trim((string) $_GET['start_at']) : '';
        $endAt = isset($_GET['end_at']) ? trim((string) $_GET['end_at']) : '';
        $excludeId = isset($_GET['exclude_id']) ? (int) $_GET['exclude_id'] : null;

        if ($vehicleId <= 0 || $startAt === '' || $endAt === '') {
            Response::json([
                'error' => 'vehicle_id, start_at, and end_at are required query params',
                'example' => '/api/reservations/conflicts?vehicle_id=1&start_at=2026-02-20%2009:00:00&end_at=2026-02-20%2012:00:00',
            ], 422);
            return;
        }

        if (!$this->isValidDateTime($startAt) || !$this->isValidDateTime($endAt)) {
            Response::json([
                'error' => 'start_at and end_at must be valid DATETIME values (YYYY-MM-DD HH:MM:SS)',
            ], 422);
            return;
        }

        if (strtotime($endAt) <= strtotime($startAt)) {
            Response::json([
                'error' => 'end_at must be later than start_at',
            ], 422);
            return;
        }

        $result = $this->conflictService->check($vehicleId, $startAt, $endAt, $excludeId);
        Response::json($result);
    }

    private function isValidDateTime(string $value): bool
    {
        try {
            $date = new DateTimeImmutable($value);
            return $date->format('Y-m-d H:i:s') === $value;
        } catch (Exception) {
            return false;
        }
    }
}
