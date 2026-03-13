<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\Role;
use PDO;

class RoleRepository extends BaseRepository
{
    protected function table(): string
    {
        return 'roles';
    }

    /**
     * @return Role[]
     */
    public function all(): array
    {
        return array_map(static fn(array $row): Role => Role::fromArray($row), $this->findAllRaw());
    }

    public function find(int $id): ?Role
    {
        $row = $this->findByIdRaw($id);

        return $row ? Role::fromArray($row) : null;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function options(): array
    {
        $statement = $this->db->prepare('SELECT id, name FROM roles ORDER BY name ASC');
        $statement->execute();

        return $statement->fetchAll(PDO::FETCH_ASSOC);
    }
}
