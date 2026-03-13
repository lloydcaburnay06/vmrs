<?php

declare(strict_types=1);

namespace App\Controllers\Api;

use App\Core\Response;
use App\Repositories\AuthRepository;
use App\Services\AuditLogger;

class AuthController
{
    public function __construct(
        private readonly AuthRepository $authRepository,
        private readonly AuditLogger $auditLogger,
    )
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

        $user = $this->authRepository->findUserByEmail($email);

        if (!$user || !password_verify($password, (string) $user['password_hash'])) {
            Response::json(['error' => 'Invalid credentials'], 401);
            return;
        }

        if ((string) $user['status'] === 'pending') {
            Response::json(['error' => 'Your registration is still pending admin approval'], 403);
            return;
        }

        if ((string) $user['status'] !== 'active') {
            Response::json(['error' => 'Your account is not active'], 403);
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

        $this->auditLogger->record($_SESSION['auth_user'], 'auth.login', 'auth', (int) $user['id'], [
            'email' => (string) $user['email'],
            'role' => (string) $user['role_name'],
        ]);

        Response::json(['user' => $_SESSION['auth_user']]);
    }

    public function register(): void
    {
        $input = $this->readJsonInput();

        $employeeNo = isset($input['employee_no']) ? trim((string) $input['employee_no']) : '';
        $firstName = isset($input['first_name']) ? trim((string) $input['first_name']) : '';
        $lastName = isset($input['last_name']) ? trim((string) $input['last_name']) : '';
        $email = isset($input['email']) ? strtolower(trim((string) $input['email'])) : '';
        $phone = isset($input['phone']) ? trim((string) $input['phone']) : '';
        $password = isset($input['password']) ? (string) $input['password'] : '';
        $passwordConfirmation = isset($input['password_confirmation']) ? (string) $input['password_confirmation'] : '';

        if ($employeeNo === '' || $firstName === '' || $lastName === '' || $email === '' || $phone === '' || $password === '' || $passwordConfirmation === '') {
            Response::json(['error' => 'All registration fields are required'], 422);
            return;
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            Response::json(['error' => 'A valid email address is required'], 422);
            return;
        }

        if (strlen($password) < 8) {
            Response::json(['error' => 'Password must be at least 8 characters long'], 422);
            return;
        }

        if ($password !== $passwordConfirmation) {
            Response::json(['error' => 'Password confirmation does not match'], 422);
            return;
        }

        if ($this->authRepository->emailExists($email)) {
            Response::json(['error' => 'Email address is already registered'], 409);
            return;
        }

        if ($this->authRepository->employeeNoExists($employeeNo)) {
            Response::json(['error' => 'Employee number is already registered'], 409);
            return;
        }

        $requesterRoleId = $this->authRepository->findRoleIdByName('requester');
        if ($requesterRoleId === null) {
            Response::json(['error' => 'Requester role is not configured'], 500);
            return;
        }

        $registrationId = $this->authRepository->createPendingRegistration([
            'role_id' => $requesterRoleId,
            'employee_no' => $employeeNo,
            'first_name' => $firstName,
            'last_name' => $lastName,
            'email' => $email,
            'password_hash' => password_hash($password, PASSWORD_DEFAULT),
            'phone' => $phone,
        ]);

        $this->auditLogger->record([], 'auth.registered', 'user', $registrationId, [
            'email' => $email,
            'role' => 'requester',
            'status' => 'pending',
        ]);

        Response::json([
            'message' => 'Registration submitted. Wait for admin approval before logging in.',
        ], 201);
    }

    public function me(): void
    {
        if (!isset($_SESSION['auth_user']) || !is_array($_SESSION['auth_user'])) {
            Response::json(['error' => 'Unauthorized'], 401);
            return;
        }

        Response::json(['user' => $_SESSION['auth_user']]);
    }

    /**
     * @param array<string, mixed> $authUser
     */
    public function profile(array $authUser): void
    {
        $userId = isset($authUser['id']) ? (int) $authUser['id'] : 0;
        $profile = $this->authRepository->findProfileById($userId);

        if ($profile === null) {
            Response::json(['error' => 'User not found'], 404);
            return;
        }

        Response::json(['user' => $profile]);
    }

    /**
     * @param array<string, mixed> $authUser
     */
    public function updateProfile(array $authUser): void
    {
        $userId = isset($authUser['id']) ? (int) $authUser['id'] : 0;
        $profile = $this->authRepository->findProfileById($userId);

        if ($profile === null) {
            Response::json(['error' => 'User not found'], 404);
            return;
        }

        $input = $this->readJsonInput();
        $firstName = isset($input['first_name']) ? trim((string) $input['first_name']) : '';
        $lastName = isset($input['last_name']) ? trim((string) $input['last_name']) : '';
        $email = isset($input['email']) ? trim((string) $input['email']) : '';
        $phone = isset($input['phone']) ? trim((string) $input['phone']) : '';
        $currentPassword = isset($input['current_password']) ? (string) $input['current_password'] : '';
        $newPassword = isset($input['new_password']) ? (string) $input['new_password'] : '';

        if ($firstName === '' || $lastName === '' || $email === '') {
            Response::json(['error' => 'First name, last name, and email are required'], 422);
            return;
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            Response::json(['error' => 'A valid email address is required'], 422);
            return;
        }

        if ($this->authRepository->emailExistsForOtherUser($email, $userId)) {
            Response::json(['error' => 'Email address is already in use'], 422);
            return;
        }

        $payload = [
            'first_name' => $firstName,
            'last_name' => $lastName,
            'email' => $email,
            'phone' => $phone === '' ? null : $phone,
        ];

        if ($newPassword !== '') {
            if (strlen($newPassword) < 8) {
                Response::json(['error' => 'New password must be at least 8 characters long'], 422);
                return;
            }

            if ($currentPassword === '' || !$this->authRepository->verifyPassword($userId, $currentPassword)) {
                Response::json(['error' => 'Current password is incorrect'], 422);
                return;
            }

            $payload['password_hash'] = password_hash($newPassword, PASSWORD_DEFAULT);
        }

        $this->authRepository->updateProfile($userId, $payload);
        $updatedProfile = $this->authRepository->findProfileById($userId);

        if ($updatedProfile === null) {
            Response::json(['error' => 'Failed to load updated profile'], 500);
            return;
        }

        $_SESSION['auth_user'] = [
            'id' => (int) $updatedProfile['id'],
            'first_name' => (string) $updatedProfile['first_name'],
            'last_name' => (string) $updatedProfile['last_name'],
            'email' => (string) $updatedProfile['email'],
            'role' => (string) $updatedProfile['role'],
        ];

        $this->auditLogger->record($_SESSION['auth_user'], 'auth.profile_updated', 'user', (int) $updatedProfile['id'], [
            'email' => (string) $updatedProfile['email'],
            'phone' => $updatedProfile['phone'] !== null ? (string) $updatedProfile['phone'] : null,
        ]);

        Response::json([
            'message' => 'Profile updated',
            'user' => $updatedProfile,
        ]);
    }

    public function logout(): void
    {
        $authUser = is_array($_SESSION['auth_user'] ?? null) ? $_SESSION['auth_user'] : [];
        if ($authUser !== []) {
            $this->auditLogger->record($authUser, 'auth.logout', 'auth', (int) ($authUser['id'] ?? 0), [
                'email' => (string) ($authUser['email'] ?? ''),
            ]);
        }

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
