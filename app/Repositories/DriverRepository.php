<?php

declare(strict_types=1);

namespace App\Repositories;

use PDO;
use RuntimeException;

class DriverRepository
{
    public function __construct(private readonly PDO $db)
    {
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function all(): array
    {
        $sql = "SELECT u.id, u.employee_no, u.first_name, u.last_name, u.email, u.phone, u.status,
                       dp.dl_id_number, dp.license_expiry, dp.assignment_type, u.created_at, u.updated_at
                FROM users u
                INNER JOIN roles r ON r.id = u.role_id AND r.name = 'driver'
                LEFT JOIN driver_profiles dp ON dp.user_id = u.id
                ORDER BY u.id DESC";

        return $this->db->query($sql)->fetchAll();
    }

    /**
     * @return array<string, mixed>|null
     */
    public function find(int $id): ?array
    {
        $sql = "SELECT u.id, u.employee_no, u.first_name, u.last_name, u.email, u.phone, u.status,
                       dp.dl_id_number, dp.license_expiry, dp.assignment_type, u.created_at, u.updated_at
                FROM users u
                INNER JOIN roles r ON r.id = u.role_id AND r.name = 'driver'
                LEFT JOIN driver_profiles dp ON dp.user_id = u.id
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
        $driverRoleId = $this->getDriverRoleId();

        $this->db->beginTransaction();

        try {
            $statement = $this->db->prepare(
                'INSERT INTO users (role_id, employee_no, first_name, last_name, email, password_hash, phone, status)
                 VALUES (:role_id, :employee_no, :first_name, :last_name, :email, :password_hash, :phone, :status)'
            );
            $statement->bindValue(':role_id', $driverRoleId, PDO::PARAM_INT);
            $statement->bindValue(':employee_no', $input['employee_no']);
            $statement->bindValue(':first_name', $input['first_name']);
            $statement->bindValue(':last_name', $input['last_name']);
            $statement->bindValue(':email', $input['email']);
            $statement->bindValue(':password_hash', $input['password_hash']);
            $statement->bindValue(':phone', $input['phone']);
            $statement->bindValue(':status', $input['status']);
            $statement->execute();

            $userId = (int) $this->db->lastInsertId();

            $profileStatement = $this->db->prepare(
                'INSERT INTO driver_profiles (user_id, dl_id_number, license_expiry, assignment_type)
                 VALUES (:user_id, :dl_id_number, :license_expiry, :assignment_type)'
            );
            $profileStatement->bindValue(':user_id', $userId, PDO::PARAM_INT);
            $profileStatement->bindValue(':dl_id_number', $input['dl_id_number']);
            $profileStatement->bindValue(':license_expiry', $input['license_expiry']);
            $profileStatement->bindValue(':assignment_type', $input['assignment_type']);
            $profileStatement->execute();

            $this->db->commit();

            return $userId;
        } catch (\Throwable $error) {
            $this->db->rollBack();
            throw $error;
        }
    }

    /**
     * @param array<string, mixed> $input
     */
    public function update(int $id, array $input): void
    {
        $driverRoleId = $this->getDriverRoleId();

        $this->db->beginTransaction();

        try {
            $sql = 'UPDATE users
                    SET role_id = :role_id,
                        employee_no = :employee_no,
                        first_name = :first_name,
                        last_name = :last_name,
                        email = :email,
                        phone = :phone,
                        status = :status';

            if (isset($input['password_hash']) && is_string($input['password_hash']) && $input['password_hash'] !== '') {
                $sql .= ', password_hash = :password_hash';
            }

            $sql .= ' WHERE id = :id';

            $statement = $this->db->prepare($sql);
            $statement->bindValue(':id', $id, PDO::PARAM_INT);
            $statement->bindValue(':role_id', $driverRoleId, PDO::PARAM_INT);
            $statement->bindValue(':employee_no', $input['employee_no']);
            $statement->bindValue(':first_name', $input['first_name']);
            $statement->bindValue(':last_name', $input['last_name']);
            $statement->bindValue(':email', $input['email']);
            $statement->bindValue(':phone', $input['phone']);
            $statement->bindValue(':status', $input['status']);

            if (isset($input['password_hash']) && is_string($input['password_hash']) && $input['password_hash'] !== '') {
                $statement->bindValue(':password_hash', $input['password_hash']);
            }

            $statement->execute();

            $profileStatement = $this->db->prepare(
                'UPDATE driver_profiles
                 SET dl_id_number = :dl_id_number,
                     license_expiry = :license_expiry,
                     assignment_type = :assignment_type
                 WHERE user_id = :user_id'
            );
            $profileStatement->bindValue(':user_id', $id, PDO::PARAM_INT);
            $profileStatement->bindValue(':dl_id_number', $input['dl_id_number']);
            $profileStatement->bindValue(':license_expiry', $input['license_expiry']);
            $profileStatement->bindValue(':assignment_type', $input['assignment_type']);
            $profileStatement->execute();

            $this->db->commit();
        } catch (\Throwable $error) {
            $this->db->rollBack();
            throw $error;
        }
    }

    public function delete(int $id): void
    {
        $statement = $this->db->prepare(
            "DELETE u FROM users u
             INNER JOIN roles r ON r.id = u.role_id AND r.name = 'driver'
             WHERE u.id = :id"
        );
        $statement->bindValue(':id', $id, PDO::PARAM_INT);
        $statement->execute();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function options(): array
    {
        $statement = $this->db->prepare(
            "SELECT u.id, CONCAT(u.first_name, ' ', u.last_name) AS name, COALESCE(dp.assignment_type, 'ambulance') AS assignment_type
             FROM users u
             INNER JOIN roles r ON r.id = u.role_id
             LEFT JOIN driver_profiles dp ON dp.user_id = u.id
             WHERE r.name = 'driver' AND u.status = 'active'
             ORDER BY u.first_name ASC, u.last_name ASC"
        );
        $statement->execute();

        return $statement->fetchAll();
    }

    public function isDriver(int $userId): bool
    {
        $statement = $this->db->prepare(
            "SELECT COUNT(*)
             FROM users u
             INNER JOIN roles r ON r.id = u.role_id
             WHERE u.id = :id AND r.name = 'driver'"
        );
        $statement->bindValue(':id', $userId, PDO::PARAM_INT);
        $statement->execute();

        return (int) $statement->fetchColumn() > 0;
    }

    /**
     * @return array<int, int>
     */
    public function activeDriverIds(): array
    {
        $statement = $this->db->prepare(
            "SELECT u.id
             FROM users u
             INNER JOIN roles r ON r.id = u.role_id
             WHERE r.name = 'driver' AND u.status = 'active'
             ORDER BY u.id ASC"
        );
        $statement->execute();

        return array_map(static fn(array $row): int => (int) $row['id'], $statement->fetchAll());
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function activeDriversForScheduling(): array
    {
        $statement = $this->db->prepare(
            "SELECT u.id,
                    CONCAT(u.first_name, ' ', u.last_name) AS name,
                    COALESCE(dp.assignment_type, 'ambulance') AS assignment_type
             FROM users u
             INNER JOIN roles r ON r.id = u.role_id
             LEFT JOIN driver_profiles dp ON dp.user_id = u.id
             WHERE r.name = 'driver' AND u.status = 'active'
             ORDER BY u.id ASC"
        );
        $statement->execute();

        return $statement->fetchAll();
    }

    private function getDriverRoleId(): int
    {
        $statement = $this->db->prepare("SELECT id FROM roles WHERE name = 'driver' LIMIT 1");
        $statement->execute();
        $id = $statement->fetchColumn();

        if (!$id) {
            throw new RuntimeException('Driver role not found.');
        }

        return (int) $id;
    }
}
