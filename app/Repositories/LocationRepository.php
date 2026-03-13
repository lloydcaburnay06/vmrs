<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\Location;
use PDO;

class LocationRepository extends BaseRepository
{
    protected function table(): string
    {
        return 'locations';
    }

    /**
     * @return Location[]
     */
    public function all(): array
    {
        return array_map(static fn(array $row): Location => Location::fromArray($row), $this->findAllRaw());
    }

    public function find(int $id): ?Location
    {
        $row = $this->findByIdRaw($id);

        return $row ? Location::fromArray($row) : null;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function options(): array
    {
        $statement = $this->db->prepare('SELECT id, name FROM locations WHERE is_active = 1 ORDER BY name ASC');
        $statement->execute();

        return $statement->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function allForAdmin(): array
    {
        $statement = $this->db->prepare(
            'SELECT id, name, address_line, city, state, postal_code, is_active, created_at, updated_at
             FROM locations
             ORDER BY is_active DESC, name ASC'
        );
        $statement->execute();

        return $statement->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * @return array<string, mixed>|null
     */
    public function findForAdmin(int $id): ?array
    {
        $statement = $this->db->prepare(
            'SELECT id, name, address_line, city, state, postal_code, is_active, created_at, updated_at
             FROM locations
             WHERE id = :id
             LIMIT 1'
        );
        $statement->bindValue(':id', $id, PDO::PARAM_INT);
        $statement->execute();
        $row = $statement->fetch(PDO::FETCH_ASSOC);

        return is_array($row) ? $row : null;
    }

    /**
     * @param array<string, mixed> $input
     */
    public function create(array $input): int
    {
        $statement = $this->db->prepare(
            'INSERT INTO locations (name, address_line, city, state, postal_code, is_active)
             VALUES (:name, :address_line, :city, :state, :postal_code, :is_active)'
        );
        $this->bindPayload($statement, $input);
        $statement->execute();

        return (int) $this->db->lastInsertId();
    }

    /**
     * @param array<string, mixed> $input
     */
    public function updateById(int $id, array $input): bool
    {
        $statement = $this->db->prepare(
            'UPDATE locations
             SET name = :name,
                 address_line = :address_line,
                 city = :city,
                 state = :state,
                 postal_code = :postal_code,
                 is_active = :is_active,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = :id'
        );
        $this->bindPayload($statement, $input);
        $statement->bindValue(':id', $id, PDO::PARAM_INT);

        return $statement->execute();
    }

    public function deleteById(int $id): bool
    {
        $statement = $this->db->prepare('DELETE FROM locations WHERE id = :id');
        $statement->bindValue(':id', $id, PDO::PARAM_INT);

        return $statement->execute();
    }

    /**
     * @param array<string, mixed> $input
     */
    private function bindPayload(\PDOStatement $statement, array $input): void
    {
        $statement->bindValue(':name', $input['name']);
        $statement->bindValue(':address_line', $input['address_line']);
        $statement->bindValue(':city', $input['city']);
        $statement->bindValue(':state', $input['state']);
        $statement->bindValue(':postal_code', $input['postal_code']);
        $statement->bindValue(':is_active', (int) $input['is_active'], PDO::PARAM_INT);
    }
}
