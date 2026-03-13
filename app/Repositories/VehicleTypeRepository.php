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
}
