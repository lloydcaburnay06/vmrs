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

    public function summary(): void
    {
        Response::json($this->repository->getSummary());
    }
}
