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
}
