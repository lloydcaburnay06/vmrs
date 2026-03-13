<?php

declare(strict_types=1);

namespace App\Services;

use App\Repositories\DriverWorkScheduleRepository;
use App\Repositories\TravelRequestRepository;

class GreedyScheduleGeneratorService
{
    public function __construct(
        private readonly TravelRequestRepository $travelRequestRepository,
        private readonly DriverWorkScheduleRepository $driverWorkScheduleRepository,
    ) {
    }

    /**
     * @return array<string, mixed>
     */
    public function generate(string $startDate, string $endDate): array
    {
        $requests = $this->travelRequestRepository->approvedUnassignedBetweenDates($startDate, $endDate);

        $assigned = [];
        $unassigned = [];
        $dailyCache = [];

        foreach ($requests as $request) {
            $requestId = (int) $request['id'];
            $startAt = (string) $request['start_at'];
            $endAt = (string) $request['end_at'];
            $workDate = substr($startAt, 0, 10);
            $startTime = substr($startAt, 11, 8);
            $endTime = substr($endAt, 11, 8);

            if (substr($endAt, 0, 10) !== $workDate) {
                $unassigned[] = [
                    'request_id' => $requestId,
                    'reservation_no' => (string) $request['reservation_no'],
                    'reason' => 'Request crosses multiple days; generator currently supports same-day windows only.',
                ];
                continue;
            }

            $durationHours = $this->hoursBetween($startAt, $endAt);
            if ($durationHours <= 0 || $durationHours > 8) {
                $unassigned[] = [
                    'request_id' => $requestId,
                    'reservation_no' => (string) $request['reservation_no'],
                    'reason' => 'Invalid duration or exceeds 8-hour daily limit.',
                ];
                continue;
            }

            $candidates = $this->driverWorkScheduleRepository->availableDriversForWindow($workDate, $startTime, $endTime);

            if (count($candidates) === 0) {
                $unassigned[] = [
                    'request_id' => $requestId,
                    'reservation_no' => (string) $request['reservation_no'],
                    'reason' => 'No drivers available in work schedule window.',
                ];
                continue;
            }

            $bestDriver = null;
            $bestDriverHours = PHP_FLOAT_MAX;

            foreach ($candidates as $candidate) {
                $driverId = (int) $candidate['driver_id'];
                $cacheKey = sprintf('%d:%s', $driverId, $workDate);

                if (!isset($dailyCache[$cacheKey])) {
                    $dailyCache[$cacheKey] = $this->travelRequestRepository->driverAssignmentsForDate($driverId, $workDate);
                }

                $assignments = $dailyCache[$cacheKey];

                if ($this->hasOverlap($startAt, $endAt, $assignments)) {
                    continue;
                }

                $currentHours = $this->sumHours($assignments);
                $newHours = $currentHours + $durationHours;

                if ($newHours > 8.0) {
                    continue;
                }

                if ($newHours < $bestDriverHours) {
                    $bestDriverHours = $newHours;
                    $bestDriver = [
                        'id' => $driverId,
                        'name' => (string) $candidate['driver_name'],
                    ];
                }
            }

            if ($bestDriver === null) {
                $unassigned[] = [
                    'request_id' => $requestId,
                    'reservation_no' => (string) $request['reservation_no'],
                    'reason' => 'No candidate driver can take this request without overlap/8h violation.',
                ];
                continue;
            }

            $applied = $this->travelRequestRepository->assignDriverIfUnassigned($requestId, (int) $bestDriver['id']);

            if (!$applied) {
                $unassigned[] = [
                    'request_id' => $requestId,
                    'reservation_no' => (string) $request['reservation_no'],
                    'reason' => 'Assignment skipped because request changed while generating.',
                ];
                continue;
            }

            $cacheKey = sprintf('%d:%s', (int) $bestDriver['id'], $workDate);
            $dailyCache[$cacheKey][] = [
                'start_at' => $startAt,
                'end_at' => $endAt,
            ];

            $assigned[] = [
                'request_id' => $requestId,
                'reservation_no' => (string) $request['reservation_no'],
                'driver_id' => (int) $bestDriver['id'],
                'driver_name' => (string) $bestDriver['name'],
                'hours_after_assignment' => round($bestDriverHours, 2),
            ];
        }

        return [
            'range' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
            ],
            'processed' => count($requests),
            'assigned_count' => count($assigned),
            'unassigned_count' => count($unassigned),
            'assigned' => $assigned,
            'unassigned' => $unassigned,
        ];
    }

    /**
     * @param array<int, array<string, mixed>> $assignments
     */
    private function sumHours(array $assignments): float
    {
        $hours = 0.0;

        foreach ($assignments as $assignment) {
            $hours += $this->hoursBetween((string) $assignment['start_at'], (string) $assignment['end_at']);
        }

        return $hours;
    }

    /**
     * @param array<int, array<string, mixed>> $assignments
     */
    private function hasOverlap(string $startAt, string $endAt, array $assignments): bool
    {
        foreach ($assignments as $assignment) {
            $existingStart = (string) $assignment['start_at'];
            $existingEnd = (string) $assignment['end_at'];

            if ($startAt < $existingEnd && $endAt > $existingStart) {
                return true;
            }
        }

        return false;
    }

    private function hoursBetween(string $startAt, string $endAt): float
    {
        $start = strtotime($startAt);
        $end = strtotime($endAt);

        if ($start === false || $end === false || $end <= $start) {
            return 0.0;
        }

        return ($end - $start) / 3600;
    }
}
