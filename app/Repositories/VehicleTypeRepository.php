<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\VehicleType;
use PDO;

class VehicleTypeRepository extends BaseRepository
{
    protected function table(): string
    {
        return 'vehicle_types';
    }

    /**
     * @return VehicleType[]
     */
    public function all(): array
    {
        return array_map(static fn(array $row): VehicleType => VehicleType::fromArray($row), $this->findAllRaw());
    }

    public function find(int $id): ?VehicleType
    {
        $row = $this->findByIdRaw($id);

        return $row ? VehicleType::fromArray($row) : null;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function options(): array
    {
        $statement = $this->db->prepare('SELECT id, name FROM vehicle_types ORDER BY name ASC');
        $statement->execute();

        return $statement->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function allForAdmin(): array
    {
        $statement = $this->db->prepare(
            'SELECT id, name, description, created_at, updated_at
             FROM vehicle_types
             ORDER BY name ASC'
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
            'SELECT id, name, description, created_at, updated_at
             FROM vehicle_types
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
            'INSERT INTO vehicle_types (name, description)
             VALUES (:name, :description)'
        );
        $statement->bindValue(':name', $input['name']);
        $statement->bindValue(':description', $input['description']);
        $statement->execute();

        return (int) $this->db->lastInsertId();
    }

    /**
     * @param array<string, mixed> $input
     */
    public function updateById(int $id, array $input): bool
    {
        $statement = $this->db->prepare(
            'UPDATE vehicle_types
             SET name = :name,
                 description = :description,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = :id'
        );
        $statement->bindValue(':id', $id, PDO::PARAM_INT);
        $statement->bindValue(':name', $input['name']);
        $statement->bindValue(':description', $input['description']);

        return $statement->execute();
    }

    public function deleteById(int $id): bool
    {
        $statement = $this->db->prepare('DELETE FROM vehicle_types WHERE id = :id');
        $statement->bindValue(':id', $id, PDO::PARAM_INT);

        return $statement->execute();
    }
}
