<?php

declare(strict_types=1);

namespace App\Controllers\Api;

use App\Core\Response;
use App\Repositories\DriverRepository;
use App\Repositories\DriverWorkScheduleRepository;
use App\Services\AuditLogger;
use App\Services\DriverWorkScheduleGeneratorService;
use DateTimeImmutable;
use Exception;
use PDOException;

class DriverWorkSchedulesController
{
    private const WEEKLY_MAX_WORK_HOURS = 48;

    public function __construct(
        private readonly DriverWorkScheduleRepository $repository,
        private readonly DriverRepository $driverRepository,
        private readonly DriverWorkScheduleGeneratorService $generatorService,
        private readonly AuditLogger $auditLogger,
    ) {
    }

    public function index(array $authUser): void
    {
        if (!$this->isManagerOrAdmin($authUser)) {
            Response::json(['error' => 'Only manager/admin can manage driver work schedules'], 403);
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

        Response::json(['data' => $this->repository->all($startDate, $endDate)]);
    }

    public function show(int $id, array $authUser): void
    {
        if (!$this->isManagerOrAdmin($authUser)) {
            Response::json(['error' => 'Only manager/admin can manage driver work schedules'], 403);
            return;
        }

        $row = $this->repository->find($id);

        if (!$row) {
            Response::json(['error' => 'Work schedule not found'], 404);
            return;
        }

        Response::json(['data' => $row]);
    }

    public function store(array $authUser): void
    {
        if (!$this->isManagerOrAdmin($authUser)) {
            Response::json(['error' => 'Only manager/admin can manage driver work schedules'], 403);
            return;
        }

        $input = $this->readJsonInput();
        $error = $this->validate($input);

        if ($error !== null) {
            Response::json(['error' => $error], 422);
            return;
        }

        $payload = $this->normalize($input);

        $id = $this->repository->create($payload);
        $this->auditLogger->record($authUser, 'driver_work_schedule.created', 'driver_work_schedule', $id, [
            'driver_id' => $payload['driver_id'],
            'work_date' => $payload['work_date'],
            'shift_code' => $payload['shift_code'],
        ]);
        Response::json(['data' => $this->repository->find($id)], 201);
    }

    public function update(int $id, array $authUser): void
    {
        if (!$this->isManagerOrAdmin($authUser)) {
            Response::json(['error' => 'Only manager/admin can manage driver work schedules'], 403);
            return;
        }

        if (!$this->repository->find($id)) {
            Response::json(['error' => 'Work schedule not found'], 404);
            return;
        }

        $input = $this->readJsonInput();
        $error = $this->validate($input);

        if ($error !== null) {
            Response::json(['error' => $error], 422);
            return;
        }

        $payload = $this->normalize($input);
        $this->repository->update($id, $payload);
        $this->auditLogger->record($authUser, 'driver_work_schedule.updated', 'driver_work_schedule', $id, [
            'driver_id' => $payload['driver_id'],
            'work_date' => $payload['work_date'],
            'shift_code' => $payload['shift_code'],
        ]);
        Response::json(['data' => $this->repository->find($id)]);
    }

    public function destroy(int $id, array $authUser): void
    {
        if (!$this->isManagerOrAdmin($authUser)) {
            Response::json(['error' => 'Only manager/admin can manage driver work schedules'], 403);
            return;
        }

        if (!$this->repository->delete($id)) {
            Response::json(['error' => 'Work schedule not found'], 404);
            return;
        }

        $this->auditLogger->record($authUser, 'driver_work_schedule.deleted', 'driver_work_schedule', $id, null);
        Response::json(['message' => 'Work schedule deleted']);
    }

    public function generate(array $authUser): void
    {
        if (!$this->isManagerOrAdmin($authUser)) {
            Response::json(['error' => 'Only manager/admin can manage driver work schedules'], 403);
            return;
        }

        $range = $this->firstAvailableWeekRange();
        $result = $this->generatorService->generate($range['start_date'], $range['end_date']);
        $this->auditLogger->record($authUser, 'driver_work_schedule.generated', 'driver_work_schedule', null, [
            'start_date' => $range['start_date'],
            'end_date' => $range['end_date'],
        ]);
        Response::json($result);
    }

    public function upsertWeekly(array $authUser): void
    {
        if (!$this->isManagerOrAdmin($authUser)) {
            Response::json(['error' => 'Only manager/admin can manage driver work schedules'], 403);
            return;
        }

        $input = $this->readJsonInput();
        $weekStart = isset($input['week_start']) ? trim((string) $input['week_start']) : '';
        $cells = $input['cells'] ?? null;

        if (!$this->isDate($weekStart)) {
            Response::json(['error' => 'week_start must be YYYY-MM-DD'], 422);
            return;
        }

        $weekStartDate = new DateTimeImmutable($weekStart);
        if ((int) $weekStartDate->format('w') !== 0) {
            Response::json(['error' => 'week_start must be a Sunday'], 422);
            return;
        }

        if (!is_array($cells) || $cells === []) {
            Response::json(['error' => 'cells is required and must not be empty'], 422);
            return;
        }

        $weekEnd = $weekStartDate->modify('+6 days')->format('Y-m-d');
        $weekDates = [];
        for ($index = 0; $index < 7; $index++) {
            $weekDates[] = $weekStartDate->modify('+' . $index . ' days')->format('Y-m-d');
        }

        $allowedCodes = ['S8_5', 'S6_2', 'S2_10', 'S10_6', 'OFF', 'H_OFF', 'CO', 'LEAVE', 'OB', 'OT', 'UNSET'];
        $normalizedCells = [];
        $seenCellKeys = [];
        $driverIds = [];

        foreach ($cells as $cell) {
            if (!is_array($cell)) {
                Response::json(['error' => 'cells must be an array of objects'], 422);
                return;
            }

            $driverId = (int) ($cell['driver_id'] ?? 0);
            $workDate = trim((string) ($cell['work_date'] ?? ''));
            $shiftCode = trim((string) ($cell['shift_code'] ?? ''));

            if ($driverId <= 0 || !$this->driverRepository->isDriver($driverId)) {
                Response::json(['error' => 'cells contains invalid driver_id'], 422);
                return;
            }

            if (!$this->isDate($workDate) || $workDate < $weekStart || $workDate > $weekEnd) {
                Response::json(['error' => 'cells contains work_date outside the selected week'], 422);
                return;
            }

            if (!in_array($shiftCode, $allowedCodes, true)) {
                Response::json(['error' => 'cells contains invalid shift_code'], 422);
                return;
            }

            $cellKey = $driverId . '|' . $workDate;
            if (isset($seenCellKeys[$cellKey])) {
                Response::json(['error' => 'Duplicate driver/date cell in payload is not allowed'], 422);
                return;
            }

            $seenCellKeys[$cellKey] = true;
            $driverIds[$driverId] = true;
            $normalizedCells[] = [
                'driver_id' => $driverId,
                'work_date' => $workDate,
                'shift_code' => $shiftCode,
            ];
        }

        $driverIdList = array_map('intval', array_keys($driverIds));
        $existingRows = $this->repository->schedulesByDriversAndDateRange($driverIdList, $weekStart, $weekEnd);
        $targetByDriverDate = [];
        foreach ($existingRows as $row) {
            $targetByDriverDate[(int) $row['driver_id']][(string) $row['work_date']] = (string) ($row['shift_code'] ?? 'S8_5');
        }

        foreach ($normalizedCells as $cell) {
            $driverId = (int) $cell['driver_id'];
            $workDate = (string) $cell['work_date'];
            $shiftCode = (string) $cell['shift_code'];

            if ($shiftCode === 'UNSET') {
                unset($targetByDriverDate[$driverId][$workDate]);
                continue;
            }

            $targetByDriverDate[$driverId][$workDate] = $shiftCode;
        }

        foreach ($driverIdList as $driverId) {
            $weeklyHours = 0;
            foreach ($weekDates as $workDate) {
                $shiftCode = $targetByDriverDate[$driverId][$workDate] ?? null;
                if (!is_string($shiftCode)) {
                    continue;
                }
                $weeklyHours += $this->shiftHours($shiftCode);
            }

            if ($weeklyHours > self::WEEKLY_MAX_WORK_HOURS) {
                Response::json([
                    'error' => sprintf(
                        'Driver ID %d exceeds max weekly hours (%d > %d)',
                        $driverId,
                        $weeklyHours,
                        self::WEEKLY_MAX_WORK_HOURS
                    ),
                ], 422);
                return;
            }
        }

        $applied = 0;
        foreach ($normalizedCells as $cell) {
            $driverId = (int) $cell['driver_id'];
            $workDate = (string) $cell['work_date'];
            $shiftCode = (string) $cell['shift_code'];
            $existing = $this->repository->findByDriverDate($driverId, $workDate);

            if ($shiftCode === 'UNSET') {
                if ($existing) {
                    $this->repository->delete((int) $existing['id']);
                    $applied++;
                }
                continue;
            }

            $normalizedShift = $this->shiftCodeToPayload($shiftCode);
            $payload = [
                'driver_id' => $driverId,
                'work_date' => $workDate,
                'start_time' => $normalizedShift['start_time'],
                'end_time' => $normalizedShift['end_time'],
                'shift_code' => $shiftCode,
                'shift_type' => $normalizedShift['shift_type'],
                'status' => 'scheduled',
                'notes' => 'Edited from weekly grid',
            ];

            try {
                if ($existing) {
                    $this->repository->update((int) $existing['id'], $payload);
                } else {
                    $this->repository->create($payload);
                }
            } catch (PDOException $exception) {
                if ((int) ($exception->errorInfo[1] ?? 0) === 1062) {
                    Response::json(['error' => 'Duplicate schedule detected for driver/date'], 409);
                    return;
                }

                throw $exception;
            }

            $applied++;
        }

        $this->auditLogger->record($authUser, 'driver_work_schedule.weekly_upserted', 'driver_work_schedule', null, [
            'week_start' => $weekStart,
            'week_end' => $weekEnd,
            'applied' => $applied,
        ]);

        Response::json([
            'message' => 'Weekly schedule updates applied',
            'week_start' => $weekStart,
            'week_end' => $weekEnd,
            'applied' => $applied,
        ]);
    }

    /**
     * @param array<string, mixed> $input
     */
    private function validate(array $input): ?string
    {
        $required = ['driver_id', 'work_date', 'shift_type', 'status'];

        foreach ($required as $field) {
            if (!isset($input[$field]) || trim((string) $input[$field]) === '') {
                return sprintf('%s is required', $field);
            }
        }

        $driverId = (int) $input['driver_id'];

        if ($driverId <= 0 || !$this->driverRepository->isDriver($driverId)) {
            return 'driver_id must be a valid driver account';
        }

        if (!$this->isDate((string) $input['work_date'])) {
            return 'work_date must be YYYY-MM-DD';
        }

        $shiftCode = isset($input['shift_code']) ? (string) $input['shift_code'] : null;
        $allowedShiftCodes = ['S8_5', 'S6_2', 'S2_10', 'S10_6', 'OFF', 'H_OFF', 'CO', 'LEAVE', 'OB', 'OT'];
        if ($shiftCode !== null && !in_array($shiftCode, $allowedShiftCodes, true)) {
            return 'shift_code is invalid';
        }

        $startTime = isset($input['start_time']) ? (string) $input['start_time'] : '';
        $endTime = isset($input['end_time']) ? (string) $input['end_time'] : '';
        $isOffLikeCode = in_array($shiftCode, ['OFF', 'H_OFF', 'CO', 'LEAVE'], true);
        $isUntimedWorkCode = in_array($shiftCode, ['OB', 'OT'], true);
        $requiresTimeRange = !$isOffLikeCode && !$isUntimedWorkCode;

        if ($requiresTimeRange) {
            if (!$this->isTime($startTime) || !$this->isTime($endTime)) {
                return 'start_time and end_time must be HH:MM:SS';
            }
        }

        if (!in_array((string) $input['shift_type'], ['regular', 'overtime', 'off', 'leave'], true)) {
            return 'shift_type is invalid';
        }

        if ($isOffLikeCode && !in_array((string) $input['shift_type'], ['off', 'leave'], true)) {
            return 'shift_type must be off/leave for off-like shift_code';
        }

        if ($isUntimedWorkCode && (string) $input['shift_type'] !== 'regular') {
            return 'shift_type must be regular for OB/OT shift_code';
        }

        if (!in_array((string) $input['status'], ['scheduled', 'completed', 'cancelled'], true)) {
            return 'status is invalid';
        }

        return null;
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    private function normalize(array $input): array
    {
        $shiftCode = isset($input['shift_code']) && trim((string) $input['shift_code']) !== ''
            ? (string) $input['shift_code']
            : $this->inferShiftCode((string) ($input['start_time'] ?? ''), (string) ($input['end_time'] ?? ''), (string) $input['shift_type']);

        $isOffLikeCode = in_array($shiftCode, ['OFF', 'H_OFF', 'CO', 'LEAVE'], true);
        $isUntimedWorkCode = in_array($shiftCode, ['OB', 'OT'], true);

        return [
            'driver_id' => (int) $input['driver_id'],
            'work_date' => (string) $input['work_date'],
            'start_time' => ($isOffLikeCode || $isUntimedWorkCode) ? null : (string) ($input['start_time'] ?? null),
            'end_time' => ($isOffLikeCode || $isUntimedWorkCode) ? null : (string) ($input['end_time'] ?? null),
            'shift_code' => $shiftCode,
            'shift_type' => (string) $input['shift_type'],
            'status' => (string) $input['status'],
            'notes' => $this->nullableString($input['notes'] ?? null),
        ];
    }

    private function inferShiftCode(string $startTime, string $endTime, string $shiftType): string
    {
        if (in_array($shiftType, ['off', 'leave'], true)) {
            return $shiftType === 'leave' ? 'LEAVE' : 'OFF';
        }

        $key = $startTime . '|' . $endTime;
        return match ($key) {
            '06:00:00|14:00:00' => 'S6_2',
            '08:00:00|17:00:00' => 'S8_5',
            '14:00:00|22:00:00' => 'S2_10',
            '22:00:00|06:00:00' => 'S10_6',
            default => 'S8_5',
        };
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

    private function nullableString(mixed $value): ?string
    {
        if (!is_string($value)) {
            return null;
        }

        $trimmed = trim($value);

        return $trimmed === '' ? null : $trimmed;
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

    private function isTime(string $value): bool
    {
        return (bool) preg_match('/^(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d$/', $value);
    }

    /**
     * @return array{start_date: string, end_date: string}
     */
    private function nextWeekSundayToSaturdayRange(): array
    {
        $today = new DateTimeImmutable('today');
        $dayOfWeek = (int) $today->format('w'); // 0=Sunday ... 6=Saturday
        $daysUntilNextSunday = $dayOfWeek === 0 ? 7 : (7 - $dayOfWeek);

        $start = $today->modify('+' . $daysUntilNextSunday . ' days');
        $end = $start->modify('+6 days');

        return [
            'start_date' => $start->format('Y-m-d'),
            'end_date' => $end->format('Y-m-d'),
        ];
    }

    /**
     * @return array{start_date: string, end_date: string}
     */
    private function firstAvailableWeekRange(): array
    {
        $range = $this->nextWeekSundayToSaturdayRange();
        $start = new DateTimeImmutable($range['start_date']);

        for ($index = 0; $index < 104; $index++) {
            $end = $start->modify('+6 days');
            $startDate = $start->format('Y-m-d');
            $endDate = $end->format('Y-m-d');

            if (!$this->repository->hasSchedulesInRange($startDate, $endDate)) {
                return [
                    'start_date' => $startDate,
                    'end_date' => $endDate,
                ];
            }

            $start = $start->modify('+7 days');
        }

        return $range;
    }

    private function shiftHours(string $shiftCode): int
    {
        return match ($shiftCode) {
            'S8_5', 'S6_2', 'S2_10', 'S10_6', 'OB', 'OT' => 8,
            default => 0,
        };
    }

    /**
     * @return array{start_time: ?string, end_time: ?string, shift_type: string}
     */
    private function shiftCodeToPayload(string $shiftCode): array
    {
        return match ($shiftCode) {
            'S6_2' => ['start_time' => '06:00:00', 'end_time' => '14:00:00', 'shift_type' => 'regular'],
            'S8_5' => ['start_time' => '08:00:00', 'end_time' => '17:00:00', 'shift_type' => 'regular'],
            'S2_10' => ['start_time' => '14:00:00', 'end_time' => '22:00:00', 'shift_type' => 'regular'],
            'S10_6' => ['start_time' => '22:00:00', 'end_time' => '06:00:00', 'shift_type' => 'regular'],
            'OB', 'OT' => ['start_time' => null, 'end_time' => null, 'shift_type' => 'regular'],
            'LEAVE' => ['start_time' => null, 'end_time' => null, 'shift_type' => 'leave'],
            default => ['start_time' => null, 'end_time' => null, 'shift_type' => 'off'],
        };
    }
}
