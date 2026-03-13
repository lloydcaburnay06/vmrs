<?php

declare(strict_types=1);

namespace App\Controllers\Api;

use App\Core\Response;
use App\Repositories\DriverRepository;
use App\Repositories\TravelRequestRepository;
use DateTimeImmutable;
use Exception;

class DriverSchedulesController
{
    public function __construct(
        private readonly TravelRequestRepository $travelRequestRepository,
        private readonly DriverRepository $driverRepository,
    ) {
    }

    public function index(array $authUser): void
    {
        if (!$this->isManagerOrAdmin($authUser)) {
            Response::json(['error' => 'Only manager/admin can manage driver schedules'], 403);
            return;
        }

        $startDate = isset($_GET['start_date']) ? trim((string) $_GET['start_date']) : date('Y-m-01');
        $endDate = isset($_GET['end_date']) ? trim((string) $_GET['end_date']) : date('Y-m-t');

        if (!$this->isDate($startDate) || !$this->isDate($endDate)) {
            Response::json(['error' => 'start_date and end_date must be YYYY-MM-DD'], 422);
            return;
        }

        if (strtotime($endDate) < strtotime($startDate)) {
            Response::json(['error' => 'end_date must be on or after start_date'], 422);
            return;
        }

        Response::json([
            'data' => $this->travelRequestRepository->driverSchedules($startDate, $endDate),
            'range' => ['start_date' => $startDate, 'end_date' => $endDate],
        ]);
    }

    public function reassign(int $id, array $authUser): void
    {
        if (!$this->isManagerOrAdmin($authUser)) {
            Response::json(['error' => 'Only manager/admin can reassign drivers'], 403);
            return;
        }

        $input = $this->readJsonInput();
        $driverId = isset($input['driver_id']) ? (int) $input['driver_id'] : 0;

        if ($driverId <= 0) {
            Response::json(['error' => 'driver_id is required'], 422);
            return;
        }

        if (!$this->driverRepository->isDriver($driverId)) {
            Response::json(['error' => 'driver_id is not a valid driver account'], 422);
            return;
        }

        $updated = $this->travelRequestRepository->reassignApprovedDriver($id, $driverId);

        if (!$updated) {
            Response::json(['error' => 'Only approved requests can be reassigned'], 409);
            return;
        }

        Response::json(['message' => 'Driver reassigned']);
    }

    public function unassign(int $id, array $authUser): void
    {
        if (!$this->isManagerOrAdmin($authUser)) {
            Response::json(['error' => 'Only manager/admin can unassign drivers'], 403);
            return;
        }

        $updated = $this->travelRequestRepository->unassignApprovedDriver($id);

        if (!$updated) {
            Response::json(['error' => 'Only approved requests can be unassigned'], 409);
            return;
        }

        Response::json(['message' => 'Driver unassigned']);
    }

    private function isManagerOrAdmin(array $authUser): bool
    {
        $role = (string) ($authUser['role'] ?? '');

        return in_array($role, ['manager', 'admin'], true);
    }

    /**
     * @return array<string, mixed>
     */
    private function readJsonInput(): array
    {
        $raw = file_get_contents('php://input');

        if (!is_string($raw) || trim($raw) === '') {
            return [];
        }

        $decoded = json_decode($raw, true);

        return is_array($decoded) ? $decoded : [];
    }

    private function isDate(string $value): bool
    {
        try {
            $date = new DateTimeImmutable($value);
            return $date->format('Y-m-d') === $value;
        } catch (Exception) {
            return false;
        }
    }
}
