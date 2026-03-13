<?php

declare(strict_types=1);

namespace App\Repositories;

use PDO;

abstract class BaseRepository
{
    public function __construct(protected readonly PDO $db)
    {
    }

    abstract protected function table(): string;

    /**
     * @return array<int, array<string, mixed>>
     */
    public function findAllRaw(int $limit = 100, int $offset = 0): array
    {
        $sql = sprintf('SELECT * FROM %s ORDER BY id DESC LIMIT :limit OFFSET :offset', $this->table());
        $statement = $this->db->prepare($sql);
        $statement->bindValue(':limit', $limit, PDO::PARAM_INT);
        $statement->bindValue(':offset', $offset, PDO::PARAM_INT);
        $statement->execute();

        return $statement->fetchAll();
    }

    /**
     * @return array<string, mixed>|null
     */
    public function findByIdRaw(int $id): ?array
    {
        $sql = sprintf('SELECT * FROM %s WHERE id = :id LIMIT 1', $this->table());
        $statement = $this->db->prepare($sql);
        $statement->bindValue(':id', $id, PDO::PARAM_INT);
        $statement->execute();
        $row = $statement->fetch();

        return is_array($row) ? $row : null;
    }
}
