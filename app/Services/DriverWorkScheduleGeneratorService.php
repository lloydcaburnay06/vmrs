<?php

declare(strict_types=1);

namespace App\Services;

use App\Repositories\DriverRepository;
use App\Repositories\DriverWorkScheduleRepository;
use DateTimeImmutable;
use Exception;

class DriverWorkScheduleGeneratorService
{
    private const SHIFT_S8_5 = 'S8_5';
    private const SHIFT_S6_2 = 'S6_2';
    private const SHIFT_S2_10 = 'S2_10';
    private const SHIFT_S10_6 = 'S10_6';
    private const SHIFT_OFF = 'OFF';
    private const SHIFT_H_OFF = 'H_OFF';
    private const SHIFT_CO = 'CO';

    public function __construct(
        private readonly DriverRepository $driverRepository,
        private readonly DriverWorkScheduleRepository $driverWorkScheduleRepository,
    ) {
    }

    /**
     * @return array<string, mixed>
     */
    public function generate(string $startDate, string $endDate, array $options = []): array
    {
        $activeDrivers = $this->driverRepository->activeDriversForScheduling();
        $adminDrivers = array_values(array_filter(
            $activeDrivers,
            static fn(array $driver): bool => (string) ($driver['assignment_type'] ?? 'ambulance') === 'administrative'
        ));
        $ambulanceDrivers = array_values(array_filter(
            $activeDrivers,
            static fn(array $driver): bool => (string) ($driver['assignment_type'] ?? 'ambulance') !== 'administrative'
        ));

        $allDriverIds = array_map(static fn(array $driver): int => (int) $driver['id'], $activeDrivers);
        $historyStart = $this->subtractDays($startDate, 14);
        $existingSchedules = $this->driverWorkScheduleRepository->schedulesByDriversAndDateRange(
            $allDriverIds,
            $historyStart,
            $endDate
        );

        $existingByDriverDate = [];
        foreach ($existingSchedules as $row) {
            $existingByDriverDate[(int) $row['driver_id']][(string) $row['work_date']] = [
                'shift_code' => (string) ($row['shift_code'] ?? self::SHIFT_S8_5),
                'status' => (string) ($row['status'] ?? 'scheduled'),
            ];
        }

        $state = $this->buildInitialState($allDriverIds, $existingByDriverDate, $startDate);
        $maxConsecutive = (int) ($options['max_consecutive_days'] ?? 5);
        $weekdayOffRatio = (float) ($options['weekday_off_ratio'] ?? 0.15);
        $weekendOffRatio = (float) ($options['weekend_off_ratio'] ?? 0.30);

        $created = 0;
        $skippedExisting = 0;
        $summaryByCode = [
            self::SHIFT_S8_5 => 0,
            self::SHIFT_S6_2 => 0,
            self::SHIFT_S2_10 => 0,
            self::SHIFT_S10_6 => 0,
            self::SHIFT_OFF => 0,
            self::SHIFT_H_OFF => 0,
            self::SHIFT_CO => 0,
        ];

        foreach ($this->eachDate($startDate, $endDate) as $workDate) {
            $weekday = (int) (new DateTimeImmutable($workDate))->format('N');
            $isWeekend = $weekday >= 6;

            foreach ($adminDrivers as $driver) {
                $driverId = (int) $driver['id'];
                if (isset($existingByDriverDate[$driverId][$workDate])) {
                    $skippedExisting++;
                    $this->updateStateFromShift($state, $driverId, (string) $existingByDriverDate[$driverId][$workDate]['shift_code'], $isWeekend);
                    continue;
                }

                $shiftCode = $isWeekend ? self::SHIFT_OFF : self::SHIFT_S8_5;
                $this->createShiftRow($driverId, $workDate, $shiftCode);
                $created++;
                $summaryByCode[$shiftCode]++;
                $this->updateStateFromShift($state, $driverId, $shiftCode, $isWeekend);
            }

            $eligibleAmbulanceDrivers = [];
            foreach ($ambulanceDrivers as $driver) {
                $driverId = (int) $driver['id'];
                if (isset($existingByDriverDate[$driverId][$workDate])) {
                    $skippedExisting++;
                    $this->updateStateFromShift($state, $driverId, (string) $existingByDriverDate[$driverId][$workDate]['shift_code'], $isWeekend);
                    continue;
                }
                $eligibleAmbulanceDrivers[] = $driverId;
            }

            if ($eligibleAmbulanceDrivers === []) {
                continue;
            }

            $offTarget = (int) floor(count($eligibleAmbulanceDrivers) * ($isWeekend ? $weekendOffRatio : $weekdayOffRatio));
            $offTarget = max(1, $offTarget);
            $offTarget = min($offTarget, count($eligibleAmbulanceDrivers) - 1);
            $forcedOff = [];

            foreach ($eligibleAmbulanceDrivers as $driverId) {
                if (($state[$driverId]['consecutive_days'] ?? 0) >= $maxConsecutive) {
                    $forcedOff[] = $driverId;
                }
            }

            $offDrivers = $forcedOff;
            $remainingForOff = max(0, $offTarget - count($offDrivers));
            if ($remainingForOff > 0) {
                $candidatesForOff = array_values(array_diff($eligibleAmbulanceDrivers, $offDrivers));
                usort($candidatesForOff, function (int $left, int $right) use ($state): int {
                    $leftScore = (($state[$left]['total_shifts'] ?? 0) * 10) + (($state[$left]['consecutive_days'] ?? 0) * 8);
                    $rightScore = (($state[$right]['total_shifts'] ?? 0) * 10) + (($state[$right]['consecutive_days'] ?? 0) * 8);

                    return $rightScore <=> $leftScore;
                });

                $offDrivers = array_merge($offDrivers, array_slice($candidatesForOff, 0, $remainingForOff));
            }

            $offDrivers = array_values(array_unique($offDrivers));
            foreach ($offDrivers as $driverId) {
                $this->createShiftRow($driverId, $workDate, self::SHIFT_OFF);
                $created++;
                $summaryByCode[self::SHIFT_OFF]++;
                $this->updateStateFromShift($state, $driverId, self::SHIFT_OFF, $isWeekend);
            }

            $workingDrivers = array_values(array_diff($eligibleAmbulanceDrivers, $offDrivers));
            if ($workingDrivers === []) {
                continue;
            }

            $targetShiftCounts = $this->buildTargetShiftCounts(count($workingDrivers), $isWeekend);
            $actualShiftCounts = [
                self::SHIFT_S6_2 => 0,
                self::SHIFT_S8_5 => 0,
                self::SHIFT_S2_10 => 0,
                self::SHIFT_S10_6 => 0,
            ];

            foreach ($workingDrivers as $driverId) {
                $bestShift = null;
                $bestScore = PHP_INT_MAX;

                foreach (array_keys($actualShiftCounts) as $shiftCode) {
                    $score = $this->scoreShiftAssignment(
                        $state,
                        $driverId,
                        $shiftCode,
                        $isWeekend,
                        $actualShiftCounts,
                        $targetShiftCounts
                    );

                    if ($score < $bestScore) {
                        $bestScore = $score;
                        $bestShift = $shiftCode;
                    }
                }

                if ($bestShift === null) {
                    $bestShift = self::SHIFT_S8_5;
                }

                $this->createShiftRow($driverId, $workDate, $bestShift);
                $created++;
                $summaryByCode[$bestShift]++;
                $actualShiftCounts[$bestShift]++;
                $this->updateStateFromShift($state, $driverId, $bestShift, $isWeekend);
            }
        }

        return [
            'range' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
            ],
            'active_drivers' => count($activeDrivers),
            'administrative_drivers' => count($adminDrivers),
            'ambulance_drivers' => count($ambulanceDrivers),
            'created' => $created,
            'skipped_existing' => $skippedExisting,
            'generated_by_shift_code' => $summaryByCode,
            'options' => [
                'max_consecutive_days' => $maxConsecutive,
                'weekday_off_ratio' => $weekdayOffRatio,
                'weekend_off_ratio' => $weekendOffRatio,
            ],
        ];
    }

    /**
     * @param array<int, array<string, array<string, string>>> $existingByDriverDate
     * @return array<int, array<string, mixed>>
     */
    private function buildInitialState(array $driverIds, array $existingByDriverDate, string $startDate): array
    {
        $state = [];

        foreach ($driverIds as $driverId) {
            $state[$driverId] = [
                'last_shift_code' => null,
                'consecutive_days' => 0,
                'total_shifts' => 0,
                'weekend_shifts' => 0,
                'night_shifts' => 0,
                'shift_counts' => [
                    self::SHIFT_S6_2 => 0,
                    self::SHIFT_S8_5 => 0,
                    self::SHIFT_S2_10 => 0,
                    self::SHIFT_S10_6 => 0,
                ],
            ];

            if (!isset($existingByDriverDate[$driverId])) {
                continue;
            }

            $driverDates = array_keys($existingByDriverDate[$driverId]);
            sort($driverDates);

            foreach ($driverDates as $date) {
                if ($date >= $startDate) {
                    break;
                }

                $shiftCode = (string) $existingByDriverDate[$driverId][$date]['shift_code'];
                $isWeekend = (int) (new DateTimeImmutable($date))->format('N') >= 6;
                $this->updateStateFromShift($state, $driverId, $shiftCode, $isWeekend);
            }
        }

        return $state;
    }

    /**
     * @param array<int, array<string, mixed>> $state
     * @param array<string, int> $actualShiftCounts
     * @param array<string, int> $targetShiftCounts
     */
    private function scoreShiftAssignment(
        array $state,
        int $driverId,
        string $shiftCode,
        bool $isWeekend,
        array $actualShiftCounts,
        array $targetShiftCounts
    ): int {
        $driverState = $state[$driverId] ?? [];
        $score = 0;

        $score += (int) (($driverState['total_shifts'] ?? 0) * 10);
        $score += (int) (($driverState['shift_counts'][$shiftCode] ?? 0) * 12);
        $score += (int) (($driverState['consecutive_days'] ?? 0) * 5);

        if ($isWeekend) {
            $score += (int) (($driverState['weekend_shifts'] ?? 0) * 14);
        }

        if ($shiftCode === self::SHIFT_S10_6) {
            $score += (int) (($driverState['night_shifts'] ?? 0) * 15);
        }

        $lastShift = (string) ($driverState['last_shift_code'] ?? '');
        if ($lastShift === self::SHIFT_S10_6 && $shiftCode === self::SHIFT_S6_2) {
            $score += 1000;
        }

        $deficit = ($targetShiftCounts[$shiftCode] ?? 0) - ($actualShiftCounts[$shiftCode] ?? 0);
        if ($deficit > 0) {
            $score -= $deficit * 20;
        } else {
            $score += abs($deficit) * 8;
        }

        $score += random_int(0, 5);

        return $score;
    }

    /**
     * @return array<string, int>
     */
    private function buildTargetShiftCounts(int $workingDriversCount, bool $isWeekend): array
    {
        $weights = $isWeekend
            ? [
                self::SHIFT_S6_2 => 0.30,
                self::SHIFT_S8_5 => 0.15,
                self::SHIFT_S2_10 => 0.30,
                self::SHIFT_S10_6 => 0.25,
            ]
            : [
                self::SHIFT_S6_2 => 0.25,
                self::SHIFT_S8_5 => 0.30,
                self::SHIFT_S2_10 => 0.25,
                self::SHIFT_S10_6 => 0.20,
            ];

        $targets = [];
        $remaining = $workingDriversCount;
        foreach ($weights as $code => $weight) {
            $targets[$code] = (int) floor($workingDriversCount * $weight);
            $remaining -= $targets[$code];
        }

        $priority = [self::SHIFT_S6_2, self::SHIFT_S8_5, self::SHIFT_S2_10, self::SHIFT_S10_6];
        $index = 0;
        while ($remaining > 0) {
            $targets[$priority[$index % count($priority)]]++;
            $remaining--;
            $index++;
        }

        if ($workingDriversCount >= 4) {
            foreach ($targets as $code => $value) {
                if ($value === 0) {
                    $targets[$code] = 1;
                    $targets[self::SHIFT_S8_5] = max(0, ($targets[self::SHIFT_S8_5] ?? 0) - 1);
                }
            }
        }

        return $targets;
    }

    /**
     * @param array<int, array<string, mixed>> $state
     */
    private function updateStateFromShift(array &$state, int $driverId, string $shiftCode, bool $isWeekend): void
    {
        if (!isset($state[$driverId])) {
            return;
        }

        $offLike = in_array($shiftCode, [self::SHIFT_OFF, self::SHIFT_H_OFF, self::SHIFT_CO], true);

        if ($offLike) {
            $state[$driverId]['consecutive_days'] = 0;
            $state[$driverId]['last_shift_code'] = $shiftCode;
            return;
        }

        $state[$driverId]['total_shifts']++;
        $state[$driverId]['consecutive_days']++;
        $state[$driverId]['last_shift_code'] = $shiftCode;

        if ($isWeekend) {
            $state[$driverId]['weekend_shifts']++;
        }

        if ($shiftCode === self::SHIFT_S10_6) {
            $state[$driverId]['night_shifts']++;
        }

        if (isset($state[$driverId]['shift_counts'][$shiftCode])) {
            $state[$driverId]['shift_counts'][$shiftCode]++;
        }
    }

    private function createShiftRow(int $driverId, string $workDate, string $shiftCode): void
    {
        $times = $this->shiftTimes($shiftCode);
        $shiftType = in_array($shiftCode, [self::SHIFT_OFF, self::SHIFT_H_OFF, self::SHIFT_CO], true) ? 'off' : 'regular';

        $this->driverWorkScheduleRepository->create([
            'driver_id' => $driverId,
            'work_date' => $workDate,
            'start_time' => $times['start_time'],
            'end_time' => $times['end_time'],
            'shift_code' => $shiftCode,
            'shift_type' => $shiftType,
            'status' => 'scheduled',
            'notes' => 'Auto-generated weekly schedule',
        ]);
    }

    /**
     * @return array{start_time: ?string, end_time: ?string}
     */
    private function shiftTimes(string $shiftCode): array
    {
        return match ($shiftCode) {
            self::SHIFT_S6_2 => ['start_time' => '06:00:00', 'end_time' => '14:00:00'],
            self::SHIFT_S8_5 => ['start_time' => '08:00:00', 'end_time' => '17:00:00'],
            self::SHIFT_S2_10 => ['start_time' => '14:00:00', 'end_time' => '22:00:00'],
            self::SHIFT_S10_6 => ['start_time' => '22:00:00', 'end_time' => '06:00:00'],
            default => ['start_time' => null, 'end_time' => null],
        };
    }

    /**
     * @return array<int, string>
     */
    private function eachDate(string $startDate, string $endDate): array
    {
        $dates = [];
        $current = strtotime($startDate);
        $end = strtotime($endDate);

        while ($current !== false && $end !== false && $current <= $end) {
            $dates[] = date('Y-m-d', $current);
            $current = strtotime('+1 day', $current);
        }

        return $dates;
    }

    private function subtractDays(string $date, int $days): string
    {
        try {
            return (new DateTimeImmutable($date))->modify('-' . $days . ' days')->format('Y-m-d');
        } catch (Exception) {
            return $date;
        }
    }
}
