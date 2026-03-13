<?php

declare(strict_types=1);

namespace App\Controllers\Api;

use App\Core\Response;
use App\Repositories\UserRepository;
use App\Services\AuditLogger;

class RegistrationApprovalsController
{
    public function __construct(
        private readonly UserRepository $userRepository,
        private readonly AuditLogger $auditLogger,
    )
    {
    }

    public function index(): void
    {
        Response::json(['data' => $this->userRepository->pendingRegistrations()]);
    }

    public function approve(int $id): void
    {
        $registration = $this->userRepository->findForAdmin($id);

        if (!$registration) {
            Response::json(['error' => 'Registration not found'], 404);
            return;
        }

        if ((string) $registration['status'] !== 'pending') {
            Response::json(['error' => 'Only pending registrations can be approved'], 422);
            return;
        }

        $this->userRepository->updateStatusById($id, 'active');
        $this->auditLogger->record($this->authUser(), 'registration.approved', 'user', $id, [
            'email' => (string) $registration['email'],
            'role_name' => (string) $registration['role_name'],
        ]);

        Response::json([
            'message' => 'Registration approved',
            'data' => $this->userRepository->findForAdmin($id),
        ]);
    }

    public function reject(int $id): void
    {
        $registration = $this->userRepository->findForAdmin($id);

        if (!$registration) {
            Response::json(['error' => 'Registration not found'], 404);
            return;
        }

        if ((string) $registration['status'] !== 'pending') {
            Response::json(['error' => 'Only pending registrations can be rejected'], 422);
            return;
        }

        $this->userRepository->updateStatusById($id, 'inactive');
        $this->auditLogger->record($this->authUser(), 'registration.rejected', 'user', $id, [
            'email' => (string) $registration['email'],
            'role_name' => (string) $registration['role_name'],
        ]);

        Response::json([
            'message' => 'Registration rejected',
            'data' => $this->userRepository->findForAdmin($id),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function authUser(): array
    {
        return is_array($_SESSION['auth_user'] ?? null) ? $_SESSION['auth_user'] : [];
    }
}
