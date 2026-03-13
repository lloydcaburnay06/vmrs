<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\User;
use PDO;

class UserRepository extends BaseRepository
{
    protected function table(): string
    {
        return 'users';
    }

    /**
     * @return User[]
     */
    public function all(): array
    {
        return array_map(static fn(array $row): User => User::fromArray($row), $this->findAllRaw());
    }

    public function find(int $id): ?User
    {
        $row = $this->findByIdRaw($id);

        return $row ? User::fromArray($row) : null;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function allForAdmin(): array
    {
        $sql = "SELECT u.id, u.role_id, r.name AS role_name, u.employee_no, u.first_name, u.last_name, u.email, u.phone, u.status, u.created_at, u.updated_at
                FROM users u
                INNER JOIN roles r ON r.id = u.role_id
                ORDER BY u.id DESC";

        return $this->db->query($sql)->fetchAll();
    }

    /**
     * @return array<string, mixed>|null
     */
    public function findForAdmin(int $id): ?array
    {
        $sql = "SELECT u.id, u.role_id, r.name AS role_name, u.employee_no, u.first_name, u.last_name, u.email, u.phone, u.status, u.created_at, u.updated_at
                FROM users u
                INNER JOIN roles r ON r.id = u.role_id
                WHERE u.id = :id
                LIMIT 1";

        $statement = $this->db->prepare($sql);
        $statement->bindValue(':id', $id, PDO::PARAM_INT);
        $statement->execute();
        $row = $statement->fetch();

        return is_array($row) ? $row : null;
    }

    /**
     * @param array<string, mixed> $input
     */
    public function create(array $input): int
    {
        $sql = "INSERT INTO users (role_id, employee_no, first_name, last_name, email, password_hash, phone, status)
                VALUES (:role_id, :employee_no, :first_name, :last_name, :email, :password_hash, :phone, :status)";

        $statement = $this->db->prepare($sql);
        $statement->bindValue(':role_id', (int) $input['role_id'], PDO::PARAM_INT);
        $statement->bindValue(':employee_no', $input['employee_no']);
        $statement->bindValue(':first_name', $input['first_name']);
        $statement->bindValue(':last_name', $input['last_name']);
        $statement->bindValue(':email', $input['email']);
        $statement->bindValue(':password_hash', $input['password_hash']);
        $statement->bindValue(':phone', $input['phone']);
        $statement->bindValue(':status', $input['status']);
        $statement->execute();

        return (int) $this->db->lastInsertId();
    }

    /**
     * @param array<string, mixed> $input
     */
    public function updateById(int $id, array $input): bool
    {
        $baseSql = "UPDATE users
                    SET role_id = :role_id,
                        employee_no = :employee_no,
                        first_name = :first_name,
                        last_name = :last_name,
                        email = :email,
                        phone = :phone,
                        status = :status";

        if (isset($input['password_hash']) && is_string($input['password_hash']) && $input['password_hash'] !== '') {
            $baseSql .= ", password_hash = :password_hash";
        }

        $baseSql .= " WHERE id = :id";

        $statement = $this->db->prepare($baseSql);
        $statement->bindValue(':id', $id, PDO::PARAM_INT);
        $statement->bindValue(':role_id', (int) $input['role_id'], PDO::PARAM_INT);
        $statement->bindValue(':employee_no', $input['employee_no']);
        $statement->bindValue(':first_name', $input['first_name']);
        $statement->bindValue(':last_name', $input['last_name']);
        $statement->bindValue(':email', $input['email']);
        $statement->bindValue(':phone', $input['phone']);
        $statement->bindValue(':status', $input['status']);

        if (isset($input['password_hash']) && is_string($input['password_hash']) && $input['password_hash'] !== '') {
            $statement->bindValue(':password_hash', $input['password_hash']);
        }

        return $statement->execute();
    }

    public function deleteById(int $id): bool
    {
        $statement = $this->db->prepare("DELETE FROM users WHERE id = :id");
        $statement->bindValue(':id', $id, PDO::PARAM_INT);

        return $statement->execute();
    }
}
