<?php

declare(strict_types=1);

namespace App\Controllers\Api;

use App\Core\Response;
use App\Repositories\LocationRepository;

class LocationsController
{
    public function __construct(private readonly LocationRepository $locationRepository)
    {
    }

    public function index(): void
    {
        Response::json(['data' => $this->locationRepository->options()]);
    }
}
