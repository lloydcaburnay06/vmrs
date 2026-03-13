<?php

declare(strict_types=1);

namespace App\Services;

use App\Repositories\AuditLogRepository;
use JsonException;

class AuditLogger
{
    public function __construct(private readonly AuditLogRepository $repository)
    {
    }

    /**
     * @param array<string, mixed> $authUser
     * @param array<string, mixed>|null $payload
     */
    public function record(array $authUser, string $action, string $entityType, ?int $entityId = null, ?array $payload = null): void
    {
        try {
            $this->repository->createEntry([
                'user_id' => isset($authUser['id']) ? (int) $authUser['id'] : null,
                'action' => $action,
                'entity_type' => $entityType,
                'entity_id' => $entityId,
                'ip_address' => isset($_SERVER['REMOTE_ADDR']) ? (string) $_SERVER['REMOTE_ADDR'] : null,
                'user_agent' => isset($_SERVER['HTTP_USER_AGENT']) ? (string) $_SERVER['HTTP_USER_AGENT'] : null,
                'payload' => $payload !== null ? $this->encodePayload($payload) : null,
            ]);
        } catch (\Throwable) {
            // Audit logging should not block primary actions.
        }
    }

    /**
     * @param array<string, mixed> $payload
     */
    private function encodePayload(array $payload): string
    {
        try {
            return json_encode($payload, JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            return '{"error":"Failed to encode audit payload"}';
        }
    }
}
