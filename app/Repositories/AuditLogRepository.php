<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\AuditLog;
use PDO;

class AuditLogRepository extends BaseRepository
{
    protected function table(): string
    {
        return 'audit_logs';
    }

    /**
     * @return AuditLog[]
     */
    public function all(): array
    {
        return array_map(static fn(array $row): AuditLog => AuditLog::fromArray($row), $this->findAllRaw());
    }

    public function find(int $id): ?AuditLog
    {
        $row = $this->findByIdRaw($id);

        return $row ? AuditLog::fromArray($row) : null;
    }

    /**
     * @param array<string, mixed> $input
     */
    public function createEntry(array $input): int
    {
        $statement = $this->db->prepare(
            'INSERT INTO audit_logs (
                user_id, action, entity_type, entity_id, ip_address, user_agent, payload
            ) VALUES (
                :user_id, :action, :entity_type, :entity_id, :ip_address, :user_agent, :payload
            )'
        );
        $statement->bindValue(':user_id', $input['user_id'] ?? null, ($input['user_id'] ?? null) === null ? PDO::PARAM_NULL : PDO::PARAM_INT);
        $statement->bindValue(':action', (string) $input['action']);
        $statement->bindValue(':entity_type', (string) $input['entity_type']);
        $statement->bindValue(':entity_id', $input['entity_id'] ?? null, ($input['entity_id'] ?? null) === null ? PDO::PARAM_NULL : PDO::PARAM_INT);
        $statement->bindValue(':ip_address', $input['ip_address'] ?? null, ($input['ip_address'] ?? null) === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
        $statement->bindValue(':user_agent', $input['user_agent'] ?? null, ($input['user_agent'] ?? null) === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
        $statement->bindValue(':payload', $input['payload'] ?? null, ($input['payload'] ?? null) === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
        $statement->execute();

        return (int) $this->db->lastInsertId();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function allDetailed(?string $action = null, ?string $entityType = null, ?string $search = null): array
    {
        $sql = "SELECT al.id,
                       al.user_id,
                       CONCAT(u.first_name, ' ', u.last_name) AS user_name,
                       u.email AS user_email,
                       al.action,
                       al.entity_type,
                       al.entity_id,
                       al.ip_address,
                       al.user_agent,
                       al.payload,
                       al.created_at
                FROM audit_logs al
                LEFT JOIN users u ON u.id = al.user_id
                WHERE 1 = 1";

        $params = [];

        if ($action !== null && $action !== '') {
            $sql .= ' AND al.action = :action';
            $params['action'] = $action;
        }

        if ($entityType !== null && $entityType !== '') {
            $sql .= ' AND al.entity_type = :entity_type';
            $params['entity_type'] = $entityType;
        }

        if ($search !== null && trim($search) !== '') {
            $sql .= " AND (
                al.action LIKE :search
                OR al.entity_type LIKE :search
                OR CONCAT(u.first_name, ' ', u.last_name) LIKE :search
                OR u.email LIKE :search
                OR CAST(al.entity_id AS CHAR) LIKE :search
                OR al.payload LIKE :search
            )";
            $params['search'] = '%' . trim($search) . '%';
        }

        $sql .= ' ORDER BY al.created_at DESC, al.id DESC';

        $statement = $this->db->prepare($sql);
        foreach ($params as $key => $value) {
            $statement->bindValue(':' . $key, $value);
        }
        $statement->execute();

        return $statement->fetchAll();
    }

    /**
     * @return array<string, mixed>|null
     */
    public function findDetailed(int $id): ?array
    {
        $statement = $this->db->prepare(
            "SELECT al.id,
                    al.user_id,
                    CONCAT(u.first_name, ' ', u.last_name) AS user_name,
                    u.email AS user_email,
                    al.action,
                    al.entity_type,
                    al.entity_id,
                    al.ip_address,
                    al.user_agent,
                    al.payload,
                    al.created_at
             FROM audit_logs al
             LEFT JOIN users u ON u.id = al.user_id
             WHERE al.id = :id
             LIMIT 1"
        );
        $statement->bindValue(':id', $id, PDO::PARAM_INT);
        $statement->execute();
        $row = $statement->fetch();

        return is_array($row) ? $row : null;
    }
}
