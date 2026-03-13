<?php

declare(strict_types=1);

namespace App\Controllers\Api;

use App\Core\Response;
use App\Repositories\AuthRepository;

class AuthController
{
    public function __construct(private readonly AuthRepository $authRepository)
    {
    }

    public function login(): void
    {
        $input = $this->readJsonInput();

        $email = isset($input['email']) ? trim((string) $input['email']) : '';
        $password = isset($input['password']) ? (string) $input['password'] : '';

        if ($email === '' || $password === '') {
            Response::json(['error' => 'Email and password are required'], 422);
            return;
        }

        $user = $this->authRepository->findActiveUserByEmail($email);

        if (!$user || !password_verify($password, (string) $user['password_hash'])) {
            Response::json(['error' => 'Invalid credentials'], 401);
            return;
        }

        session_regenerate_id(true);

        $_SESSION['auth_user'] = [
            'id' => (int) $user['id'],
            'first_name' => (string) $user['first_name'],
            'last_name' => (string) $user['last_name'],
            'email' => (string) $user['email'],
            'role' => (string) $user['role_name'],
        ];

        Response::json(['user' => $_SESSION['auth_user']]);
    }

    public function me(): void
    {
        if (!isset($_SESSION['auth_user']) || !is_array($_SESSION['auth_user'])) {
            Response::json(['error' => 'Unauthorized'], 401);
            return;
        }

        Response::json(['user' => $_SESSION['auth_user']]);
    }

    public function logout(): void
    {
        $_SESSION = [];

        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], $params['secure'], $params['httponly']);
        }

        session_destroy();

        Response::json(['message' => 'Logged out']);
    }

    /**
     * @return array<string, mixed>
     */
    private function readJsonInput(): array
    {
        $raw = file_get_contents('php://input');

        if (!is_string($raw) || trim($raw) === '') {
            return [];
        }

        $decoded = json_decode($raw, true);

        return is_array($decoded) ? $decoded : [];
    }
}
