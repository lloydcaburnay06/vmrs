<?php

declare(strict_types=1);

namespace App\Controllers\Api;

use App\Core\Response;
use App\Repositories\AuditLogRepository;

class AuditLogsController
{
    public function __construct(private readonly AuditLogRepository $repository)
    {
    }

    public function index(): void
    {
        $action = isset($_GET['action']) ? trim((string) $_GET['action']) : null;
        $entityType = isset($_GET['entity_type']) ? trim((string) $_GET['entity_type']) : null;
        $search = isset($_GET['search']) ? trim((string) $_GET['search']) : null;

        Response::json([
            'data' => $this->repository->allDetailed($action, $entityType, $search),
        ]);
    }

    public function show(int $id): void
    {
        $row = $this->repository->findDetailed($id);

        if ($row === null) {
            Response::json(['error' => 'Audit log not found'], 404);
            return;
        }

        Response::json(['data' => $row]);
    }
}
