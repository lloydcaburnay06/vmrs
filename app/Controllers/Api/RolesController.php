<?php

declare(strict_types=1);

namespace App\Controllers\Api;

use App\Core\Response;
use App\Repositories\RoleRepository;

class RolesController
{
    public function __construct(private readonly RoleRepository $roleRepository)
    {
    }

    public function index(): void
    {
        Response::json(['data' => $this->roleRepository->options()]);
    }
}
