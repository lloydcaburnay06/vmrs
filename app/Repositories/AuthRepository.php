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
}
