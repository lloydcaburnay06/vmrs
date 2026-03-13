<?php

declare(strict_types=1);

namespace App\Controllers\Api;

use App\Core\Response;
use App\Repositories\DashboardRepository;

class DashboardController
{
    public function __construct(private readonly DashboardRepository $repository)
    {
    }

    /**
     * @param array<string, mixed> $authUser
     */
    public function summary(array $authUser): void
    {
        $role = isset($authUser['role']) ? (string) $authUser['role'] : 'requester';
        $userId = isset($authUser['id']) ? (int) $authUser['id'] : 0;

        Response::json($this->repository->getSummaryForUser($role, $userId));
    }
}
