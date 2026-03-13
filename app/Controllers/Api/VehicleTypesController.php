<?php

declare(strict_types=1);

namespace App\Controllers\Api;

use App\Core\Response;
use App\Repositories\VehicleTypeRepository;

class VehicleTypesController
{
    public function __construct(private readonly VehicleTypeRepository $vehicleTypeRepository)
    {
    }

    public function index(): void
    {
        Response::json(['data' => $this->vehicleTypeRepository->options()]);
    }
}
