<?php

declare(strict_types=1);

namespace App\Repositories;

use PDO;

class AuthRepository
{
    public function __construct(private readonly PDO $db)
    {
    }

    /**
     * @return array<string, mixed>|null
     */
    public function findActiveUserByEmail(string $email): ?array
    {
        $sql = "SELECT u.id, u.first_name, u.last_name, u.email, u.password_hash, u.status, r.name AS role_name
                FROM users u
                INNER JOIN roles r ON r.id = u.role_id
                WHERE u.email = :email
                  AND u.status = 'active'
                LIMIT 1";

        $statement = $this->db->prepare($sql);
        $statement->bindValue(':email', $email);
        $statement->execute();
        $row = $statement->fetch();

        return is_array($row) ? $row : null;
    }

    /**
     * @return array<string, mixed>|null
     */
    public function findProfileById(int $id): ?array
    {
        $statement = $this->db->prepare(
            "SELECT u.id,
                    u.employee_no,
                    u.first_name,
                    u.last_name,
                    u.email,
                    u.phone,
                    u.status,
                    u.created_at,
                    u.updated_at,
                    r.name AS role
             FROM users u
             INNER JOIN roles r ON r.id = u.role_id
             WHERE u.id = :id
             LIMIT 1"
        );
        $statement->bindValue(':id', $id, PDO::PARAM_INT);
        $statement->execute();
        $row = $statement->fetch();

        return is_array($row) ? $row : null;
    }

    public function emailExistsForOtherUser(string $email, int $userId): bool
    {
        $statement = $this->db->prepare(
            'SELECT COUNT(*) FROM users WHERE email = :email AND id <> :id'
        );
        $statement->bindValue(':email', $email);
        $statement->bindValue(':id', $userId, PDO::PARAM_INT);
        $statement->execute();

        return (int) $statement->fetchColumn() > 0;
    }

    public function verifyPassword(int $userId, string $password): bool
    {
        $statement = $this->db->prepare(
            'SELECT password_hash FROM users WHERE id = :id LIMIT 1'
        );
        $statement->bindValue(':id', $userId, PDO::PARAM_INT);
        $statement->execute();
        $hash = $statement->fetchColumn();

        return is_string($hash) && password_verify($password, $hash);
    }

    /**
     * @param array<string, mixed> $input
     */
    public function updateProfile(int $userId, array $input): void
    {
        $sql = 'UPDATE users
                SET first_name = :first_name,
                    last_name = :last_name,
                    email = :email,
                    phone = :phone,
                    updated_at = CURRENT_TIMESTAMP';

        if (isset($input['password_hash']) && is_string($input['password_hash']) && $input['password_hash'] !== '') {
            $sql .= ', password_hash = :password_hash';
        }

        $sql .= ' WHERE id = :id';

        $statement = $this->db->prepare($sql);
        $statement->bindValue(':id', $userId, PDO::PARAM_INT);
        $statement->bindValue(':first_name', $input['first_name']);
        $statement->bindValue(':last_name', $input['last_name']);
        $statement->bindValue(':email', $input['email']);
        $statement->bindValue(':phone', $input['phone'], $input['phone'] === null ? PDO::PARAM_NULL : PDO::PARAM_STR);

        if (isset($input['password_hash']) && is_string($input['password_hash']) && $input['password_hash'] !== '') {
            $statement->bindValue(':password_hash', $input['password_hash']);
        }

        $statement->execute();
    }
}
