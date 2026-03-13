<?php

declare(strict_types=1);

namespace App\Repositories;

use PDO;

class DashboardRepository
{
    public function __construct(private readonly PDO $db)
    {
    }

    public function getSummaryForUser(string $role, int $userId): array
    {
        $today = new \DateTimeImmutable('today');
        $monthStart = $today->modify('first day of this month')->format('Y-m-d');
        $monthEnd = $today->modify('last day of this month')->format('Y-m-d');
        $trendStart = $today->modify('-20 days')->format('Y-m-d');
        $trendEnd = $today->format('Y-m-d');

        $requestFilter = $this->reservationFilter($role);
        $tripFilter = $this->tripFilter($role);
        $requestParams = $this->scopeParams($role, $userId);
        $tripParams = $this->scopeParams($role, $userId);

        $totalRequests = $this->fetchCount(
            "SELECT COUNT(*)
             FROM reservations r
             WHERE {$requestFilter}",
            $requestParams
        );
        $pendingRequests = $this->fetchCount(
            "SELECT COUNT(*)
             FROM reservations r
             WHERE {$requestFilter}
               AND r.status = 'pending'",
            $requestParams
        );
        $approvedUnassigned = $this->fetchCount(
            "SELECT COUNT(*)
             FROM reservations r
             WHERE {$requestFilter}
               AND r.status = 'approved'
               AND r.assigned_driver_id IS NULL",
            $requestParams
        );
        $activeTrips = $this->fetchCount(
            "SELECT COUNT(*)
             FROM reservations r
             WHERE {$requestFilter}
               AND r.status = 'active'",
            $requestParams
        );
        $completedThisMonth = $this->fetchCount(
            "SELECT COUNT(*)
             FROM reservations r
             WHERE {$requestFilter}
               AND r.status = 'completed'
               AND DATE(COALESCE(r.actual_end_at, r.end_at)) BETWEEN :month_start AND :month_end",
            $requestParams + [
                'month_start' => $monthStart,
                'month_end' => $monthEnd,
            ]
        );

        $availableVehicles = $this->fetchCount(
            "SELECT COUNT(*)
             FROM vehicles
             WHERE status = 'available'"
        );
        $vehiclesInMaintenance = $this->fetchCount(
            "SELECT COUNT(*)
             FROM vehicles
             WHERE status = 'maintenance'"
        );
        $activeDrivers = $this->fetchCount(
            "SELECT COUNT(*)
             FROM users u
             INNER JOIN roles r ON r.id = u.role_id
             WHERE r.name = 'driver'
               AND u.status = 'active'"
        );

        $fuelSnapshot = $this->fetchRow(
            "SELECT COUNT(*) AS entries_this_month,
                    COALESCE(SUM(liters), 0) AS liters_this_month,
                    COALESCE(SUM(total_cost), 0) AS cost_this_month
             FROM fuel_logs
             WHERE DATE(fueled_at) BETWEEN :month_start AND :month_end",
            [
                'month_start' => $monthStart,
                'month_end' => $monthEnd,
            ]
        );
        $maintenanceSnapshot = $this->fetchRow(
            "SELECT SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) AS open_count,
                    SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress_count,
                    SUM(
                        CASE
                            WHEN status = 'completed'
                             AND service_date BETWEEN :month_start AND :month_end
                            THEN 1
                            ELSE 0
                        END
                    ) AS completed_this_month
             FROM maintenance_records",
            [
                'month_start' => $monthStart,
                'month_end' => $monthEnd,
            ]
        );

        return [
            'scopeLabel' => $this->scopeLabel($role),
            'metrics' => [
                'total_requests' => $totalRequests,
                'pending_requests' => $pendingRequests,
                'approved_unassigned' => $approvedUnassigned,
                'active_trips' => $activeTrips,
                'completed_this_month' => $completedThisMonth,
                'available_vehicles' => $availableVehicles,
                'vehicles_in_maintenance' => $vehiclesInMaintenance,
                'active_drivers' => $activeDrivers,
            ],
            'fuel_snapshot' => [
                'entries_this_month' => (int) ($fuelSnapshot['entries_this_month'] ?? 0),
                'liters_this_month' => (float) ($fuelSnapshot['liters_this_month'] ?? 0),
                'cost_this_month' => (float) ($fuelSnapshot['cost_this_month'] ?? 0),
            ],
            'maintenance_snapshot' => [
                'open' => (int) ($maintenanceSnapshot['open_count'] ?? 0),
                'in_progress' => (int) ($maintenanceSnapshot['in_progress_count'] ?? 0),
                'completed_this_month' => (int) ($maintenanceSnapshot['completed_this_month'] ?? 0),
            ],
            'request_statuses' => $this->requestStatusCounts($requestFilter, $requestParams),
            'fleet_statuses' => $this->fleetStatusCounts(),
            'daily_trip_counts' => $this->dailyTripCounts(
                $tripFilter,
                $tripParams + [
                    'trend_start' => $trendStart,
                    'trend_end' => $trendEnd,
                ],
                $trendStart,
                $trendEnd
            ),
            'urgent_items' => [
                'vehicle_documents' => $this->vehicleDocumentAlerts(),
                'driver_licenses' => $this->driverLicenseAlerts(),
                'maintenance_due' => $this->maintenanceDueAlerts(),
            ],
            'recent_requests' => $this->recentRequests($requestFilter, $requestParams),
            'recent_trips' => $this->recentTrips($tripFilter, $tripParams),
        ];
    }

    /**
     * @param array<string, scalar|null> $params
     */
    private function fetchCount(string $sql, array $params = []): int
    {
        $statement = $this->db->prepare($sql);
        foreach ($params as $key => $value) {
            $statement->bindValue(':' . $key, $value);
        }
        $statement->execute();

        return (int) $statement->fetchColumn();
    }

    /**
     * @param array<string, scalar|null> $params
     * @return array<string, mixed>
     */
    private function fetchRow(string $sql, array $params = []): array
    {
        $statement = $this->db->prepare($sql);
        foreach ($params as $key => $value) {
            $statement->bindValue(':' . $key, $value);
        }
        $statement->execute();
        $row = $statement->fetch();

        return is_array($row) ? $row : [];
    }

    /**
     * @param array<string, scalar|null> $params
     * @return array<int, array<string, mixed>>
     */
    private function fetchAll(string $sql, array $params = []): array
    {
        $statement = $this->db->prepare($sql);
        foreach ($params as $key => $value) {
            $statement->bindValue(':' . $key, $value);
        }
        $statement->execute();

        return $statement->fetchAll();
    }

    private function reservationFilter(string $role): string
    {
        return match ($role) {
            'requester' => 'r.requester_id = :user_id',
            'driver' => 'r.assigned_driver_id = :user_id',
            default => '1 = 1',
        };
    }

    private function tripFilter(string $role): string
    {
        return match ($role) {
            'requester' => 'r.requester_id = :user_id',
            'driver' => 'COALESCE(tl.driver_id, r.assigned_driver_id) = :user_id',
            default => '1 = 1',
        };
    }

    /**
     * @return array<string, scalar|null>
     */
    private function scopeParams(string $role, int $userId): array
    {
        if (!in_array($role, ['requester', 'driver'], true)) {
            return [];
        }

        return ['user_id' => $userId];
    }

    private function scopeLabel(string $role): string
    {
        return match ($role) {
            'requester' => 'My travel requests',
            'driver' => 'My assigned trips',
            default => 'Hospital transport operations',
        };
    }

    /**
     * @param array<string, scalar|null> $params
     * @return array<int, array{status: string, count: int}>
     */
    private function requestStatusCounts(string $filter, array $params): array
    {
        $rows = $this->fetchAll(
            "SELECT r.status, COUNT(*) AS count
             FROM reservations r
             WHERE {$filter}
             GROUP BY r.status
             ORDER BY FIELD(
                r.status,
                'pending',
                'approved',
                'active',
                'completed',
                'rejected',
                'cancelled',
                'no_show'
             )",
            $params
        );

        return array_map(
            static fn(array $row): array => [
                'status' => (string) $row['status'],
                'count' => (int) $row['count'],
            ],
            $rows
        );
    }

    /**
     * @return array<int, array{status: string, count: int}>
     */
    private function fleetStatusCounts(): array
    {
        $rows = $this->db->query(
            "SELECT status, COUNT(*) AS count
             FROM vehicles
             GROUP BY status
             ORDER BY FIELD(status, 'available', 'reserved', 'in_use', 'maintenance', 'inactive')"
        )->fetchAll();

        return array_map(
            static fn(array $row): array => [
                'status' => (string) $row['status'],
                'count' => (int) $row['count'],
            ],
            $rows
        );
    }

    /**
     * @param array<string, scalar|null> $params
     * @return array<int, array{date: string, label: string, count: int}>
     */
    private function dailyTripCounts(string $filter, array $params, string $trendStart, string $trendEnd): array
    {
        $rows = $this->fetchAll(
            "SELECT DATE(COALESCE(tl.check_out_at, r.actual_start_at, r.start_at)) AS trip_date,
                    COUNT(*) AS count
             FROM reservations r
             LEFT JOIN trip_logs tl ON tl.reservation_id = r.id
             WHERE {$filter}
               AND r.status IN ('active', 'completed', 'no_show')
               AND DATE(COALESCE(tl.check_out_at, r.actual_start_at, r.start_at)) BETWEEN :trend_start AND :trend_end
             GROUP BY DATE(COALESCE(tl.check_out_at, r.actual_start_at, r.start_at))
             ORDER BY trip_date ASC",
            $params
        );

        $counts = [];
        foreach ($rows as $row) {
            $counts[(string) $row['trip_date']] = (int) $row['count'];
        }

        $series = [];
        $cursor = new \DateTimeImmutable($trendStart);
        $end = new \DateTimeImmutable($trendEnd);

        while ($cursor <= $end) {
            $key = $cursor->format('Y-m-d');
            $series[] = [
                'date' => $key,
                'label' => $cursor->format('M j'),
                'count' => $counts[$key] ?? 0,
            ];
            $cursor = $cursor->modify('+1 day');
        }

        return $series;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function vehicleDocumentAlerts(): array
    {
        $rows = $this->db->query(
            "SELECT v.id,
                    v.vehicle_code,
                    CONCAT(v.make, ' ', v.model) AS vehicle_name,
                    v.registration_expiry,
                    v.insurance_expiry,
                    CASE
                        WHEN v.registration_expiry IS NULL THEN NULL
                        ELSE DATEDIFF(v.registration_expiry, CURDATE())
                    END AS days_to_registration,
                    CASE
                        WHEN v.insurance_expiry IS NULL THEN NULL
                        ELSE DATEDIFF(v.insurance_expiry, CURDATE())
                    END AS days_to_insurance
             FROM vehicles v
             WHERE (
                    v.registration_expiry IS NOT NULL
                    AND v.registration_expiry <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)
                )
                OR (
                    v.insurance_expiry IS NOT NULL
                    AND v.insurance_expiry <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)
                )
             ORDER BY LEAST(
                COALESCE(v.registration_expiry, '9999-12-31'),
                COALESCE(v.insurance_expiry, '9999-12-31')
             ) ASC
             LIMIT 6"
        )->fetchAll();

        return array_map(
            static fn(array $row): array => [
                'id' => (int) $row['id'],
                'vehicle_code' => (string) $row['vehicle_code'],
                'vehicle_name' => (string) $row['vehicle_name'],
                'registration_expiry' => $row['registration_expiry'] !== null ? (string) $row['registration_expiry'] : null,
                'insurance_expiry' => $row['insurance_expiry'] !== null ? (string) $row['insurance_expiry'] : null,
                'days_to_registration' => $row['days_to_registration'] !== null ? (int) $row['days_to_registration'] : null,
                'days_to_insurance' => $row['days_to_insurance'] !== null ? (int) $row['days_to_insurance'] : null,
            ],
            $rows
        );
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function driverLicenseAlerts(): array
    {
        $rows = $this->db->query(
            "SELECT u.id,
                    CONCAT(u.first_name, ' ', u.last_name) AS driver_name,
                    dp.license_expiry,
                    DATEDIFF(dp.license_expiry, CURDATE()) AS days_remaining
             FROM driver_profiles dp
             INNER JOIN users u ON u.id = dp.user_id
             INNER JOIN roles r ON r.id = u.role_id AND r.name = 'driver'
             WHERE u.status = 'active'
               AND dp.license_expiry <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)
             ORDER BY dp.license_expiry ASC
             LIMIT 6"
        )->fetchAll();

        return array_map(
            static fn(array $row): array => [
                'id' => (int) $row['id'],
                'driver_name' => (string) $row['driver_name'],
                'license_expiry' => (string) $row['license_expiry'],
                'days_remaining' => (int) $row['days_remaining'],
            ],
            $rows
        );
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function maintenanceDueAlerts(): array
    {
        $rows = $this->db->query(
            "SELECT mr.id,
                    v.vehicle_code,
                    CONCAT(v.make, ' ', v.model) AS vehicle_name,
                    mr.next_service_date,
                    mr.status,
                    DATEDIFF(mr.next_service_date, CURDATE()) AS days_remaining
             FROM maintenance_records mr
             INNER JOIN vehicles v ON v.id = mr.vehicle_id
             WHERE mr.next_service_date IS NOT NULL
               AND mr.next_service_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)
             ORDER BY mr.next_service_date ASC
             LIMIT 6"
        )->fetchAll();

        return array_map(
            static fn(array $row): array => [
                'id' => (int) $row['id'],
                'vehicle_code' => (string) $row['vehicle_code'],
                'vehicle_name' => (string) $row['vehicle_name'],
                'next_service_date' => (string) $row['next_service_date'],
                'status' => (string) $row['status'],
                'days_remaining' => (int) $row['days_remaining'],
            ],
            $rows
        );
    }

    /**
     * @param array<string, scalar|null> $params
     * @return array<int, array<string, mixed>>
     */
    private function recentRequests(string $filter, array $params): array
    {
        $rows = $this->fetchAll(
            "SELECT r.id,
                    r.reservation_no,
                    CONCAT(req.first_name, ' ', req.last_name) AS requester_name,
                    v.vehicle_code,
                    r.purpose,
                    r.start_at,
                    r.status,
                    CONCAT(dr.first_name, ' ', dr.last_name) AS driver_name
             FROM reservations r
             INNER JOIN users req ON req.id = r.requester_id
             INNER JOIN vehicles v ON v.id = r.vehicle_id
             LEFT JOIN users dr ON dr.id = r.assigned_driver_id
             WHERE {$filter}
             ORDER BY r.created_at DESC
             LIMIT 6",
            $params
        );

        return array_map(
            static fn(array $row): array => [
                'id' => (int) $row['id'],
                'reservation_no' => (string) $row['reservation_no'],
                'requester_name' => (string) $row['requester_name'],
                'vehicle_code' => (string) $row['vehicle_code'],
                'purpose' => (string) $row['purpose'],
                'start_at' => (string) $row['start_at'],
                'status' => (string) $row['status'],
                'driver_name' => $row['driver_name'] !== null ? (string) $row['driver_name'] : null,
            ],
            $rows
        );
    }

    /**
     * @param array<string, scalar|null> $params
     * @return array<int, array<string, mixed>>
     */
    private function recentTrips(string $filter, array $params): array
    {
        $rows = $this->fetchAll(
            "SELECT tl.id,
                    r.reservation_no,
                    v.vehicle_code,
                    CONCAT(dr.first_name, ' ', dr.last_name) AS driver_name,
                    tl.check_out_at,
                    tl.check_in_at,
                    tl.distance_km,
                    r.status
             FROM trip_logs tl
             INNER JOIN reservations r ON r.id = tl.reservation_id
             INNER JOIN vehicles v ON v.id = r.vehicle_id
             LEFT JOIN users dr ON dr.id = COALESCE(tl.driver_id, r.assigned_driver_id)
             WHERE {$filter}
               AND r.status IN ('active', 'completed')
             ORDER BY COALESCE(tl.check_out_at, r.actual_start_at, r.start_at) DESC
             LIMIT 6",
            $params
        );

        return array_map(
            static fn(array $row): array => [
                'id' => (int) $row['id'],
                'reservation_no' => (string) $row['reservation_no'],
                'vehicle_code' => (string) $row['vehicle_code'],
                'driver_name' => $row['driver_name'] !== null ? (string) $row['driver_name'] : null,
                'check_out_at' => $row['check_out_at'] !== null ? (string) $row['check_out_at'] : null,
                'check_in_at' => $row['check_in_at'] !== null ? (string) $row['check_in_at'] : null,
                'distance_km' => $row['distance_km'] !== null ? (string) $row['distance_km'] : null,
                'status' => (string) $row['status'],
            ],
            $rows
        );
    }
}
