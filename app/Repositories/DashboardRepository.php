<?php

declare(strict_types=1);

namespace App\Repositories;

use PDO;

class DashboardRepository
{
    public function __construct(private readonly PDO $db)
    {
    }

    public function getSummary(): array
    {
        $users = (int) $this->db->query('SELECT COUNT(*) FROM users')->fetchColumn();
        $orders = (int) $this->db->query('SELECT COUNT(*) FROM reservations')->fetchColumn();

        $activeTrips = (int) $this->db
            ->query("SELECT COUNT(*) FROM reservations WHERE status IN ('approved', 'active')")
            ->fetchColumn();

        $conversionRate = $orders > 0
            ? number_format(($activeTrips / $orders) * 100, 1) . '%'
            : '0.0%';

        $latest = $this->db->query(
            "SELECT r.reservation_no, CONCAT(u.first_name, ' ', u.last_name) AS customer, r.status, r.start_at
             FROM reservations r
             INNER JOIN users u ON u.id = r.requester_id
             ORDER BY r.start_at DESC
             LIMIT 5"
        )->fetchAll();

        $latestOrders = array_map(
            static fn(array $row): array => [
                'id' => (string) $row['reservation_no'],
                'customer' => (string) $row['customer'],
                'amount' => date('M d, Y', strtotime((string) $row['start_at'])),
                'status' => ucfirst((string) $row['status']),
            ],
            $latest
        );

        return [
            'revenue' => (string) $activeTrips,
            'orders' => $orders,
            'users' => $users,
            'conversionRate' => $conversionRate,
            'latestOrders' => $latestOrders,
        ];
    }
}
