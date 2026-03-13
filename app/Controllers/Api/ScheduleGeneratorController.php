<?php

declare(strict_types=1);

namespace App\Controllers\Api;

use App\Core\Response;
use App\Services\GreedyScheduleGeneratorService;
use DateTimeImmutable;
use Exception;

class ScheduleGeneratorController
{
    public function __construct(private readonly GreedyScheduleGeneratorService $generatorService)
    {
    }

    public function generate(array $authUser): void
    {
        if (!$this->isManagerOrAdmin($authUser)) {
            Response::json(['error' => 'Only manager/admin can run schedule generation'], 403);
            return;
        }

        $input = $this->readJsonInput();
        $startDate = isset($input['start_date']) ? trim((string) $input['start_date']) : date('Y-m-01');
        $endDate = isset($input['end_date']) ? trim((string) $input['end_date']) : date('Y-m-t');

        if (!$this->isDate($startDate) || !$this->isDate($endDate)) {
            Response::json(['error' => 'start_date and end_date must be YYYY-MM-DD'], 422);
            return;
        }

        if (strtotime($endDate) < strtotime($startDate)) {
            Response::json(['error' => 'end_date must be on or after start_date'], 422);
            return;
        }

        $result = $this->generatorService->generate($startDate, $endDate);

        Response::json($result);
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

    private function isManagerOrAdmin(array $authUser): bool
    {
        $role = (string) ($authUser['role'] ?? '');

        return in_array($role, ['manager', 'admin'], true);
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
