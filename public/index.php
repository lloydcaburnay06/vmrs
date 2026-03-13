<?php

declare(strict_types=1);

use App\Controllers\Api\AuthController;
use App\Controllers\Api\AuditLogsController;
use App\Controllers\Api\DashboardController;
use App\Controllers\Api\DriversController;
use App\Controllers\Api\DriverSchedulesController;
use App\Controllers\Api\DriverWorkSchedulesController;
use App\Controllers\Api\FuelLogsController;
use App\Controllers\Api\LocationsController;
use App\Controllers\Api\LocationsAdminController;
use App\Controllers\Api\MaintenanceRecordsController;
use App\Controllers\Api\ReservationController;
use App\Controllers\Api\RolesController;
use App\Controllers\Api\ScheduleGeneratorController;
use App\Controllers\Api\TravelRequestsController;
use App\Controllers\Api\TripLogsController;
use App\Controllers\Api\VehicleTypesAdminController;
use App\Controllers\Api\VehicleTypesController;
use App\Controllers\Api\VehiclesController;
use App\Controllers\Api\UsersController;
use App\Core\Database;
use App\Core\Response;
use App\Core\Router;
use App\Repositories\AuthRepository;
use App\Repositories\AuditLogRepository;
use App\Repositories\DashboardRepository;
use App\Repositories\DriverRepository;
use App\Repositories\DriverWorkScheduleRepository;
use App\Repositories\FuelLogRepository;
use App\Repositories\ReservationRepository;
use App\Repositories\RoleRepository;
use App\Repositories\TravelRequestRepository;
use App\Repositories\TripLogRepository;
use App\Repositories\UserRepository;
use App\Repositories\VehicleRepository;
use App\Repositories\VehicleTypeRepository;
use App\Repositories\LocationRepository;
use App\Repositories\MaintenanceRecordRepository;
use App\Services\ReservationConflictService;
use App\Services\AuditLogger;
use App\Services\GreedyScheduleGeneratorService;
use App\Services\DriverWorkScheduleGeneratorService;

session_start();

spl_autoload_register(static function (string $class): void {
    $prefix = 'App\\';
    $baseDir = __DIR__ . '/../app/';

    if (strncmp($prefix, $class, strlen($prefix)) !== 0) {
        return;
    }

    $relativeClass = substr($class, strlen($prefix));
    $file = $baseDir . str_replace('\\', '/', $relativeClass) . '.php';

    if (file_exists($file)) {
        require $file;
    }
});

$config = require __DIR__ . '/../config/app.php';
$dbConfig = require __DIR__ . '/../config/database.php';

try {
    $db = Database::connection($dbConfig);
} catch (Throwable $error) {
    Response::json([
        'error' => 'Database connection failed',
        'message' => $error->getMessage(),
    ], 500);
    exit;
}

$router = new Router();
$auditLogRepository = new AuditLogRepository($db);
$auditLogger = new AuditLogger($auditLogRepository);
$authController = new AuthController(new AuthRepository($db), $auditLogger);
$auditLogsController = new AuditLogsController($auditLogRepository);
$dashboardController = new DashboardController(new DashboardRepository($db));
$reservationController = new ReservationController(
    new ReservationConflictService(new ReservationRepository($db))
);
$fuelLogsController = new FuelLogsController(new FuelLogRepository($db), $auditLogger);
$rolesController = new RolesController(new RoleRepository($db));
$usersController = new UsersController(new UserRepository($db), $auditLogger);
$vehicleTypesController = new VehicleTypesController(new VehicleTypeRepository($db));
$locationsController = new LocationsController(new LocationRepository($db));
$locationsAdminController = new LocationsAdminController(new LocationRepository($db), $auditLogger);
$maintenanceRecordsController = new MaintenanceRecordsController(new MaintenanceRecordRepository($db), $auditLogger);
$vehiclesController = new VehiclesController(new VehicleRepository($db), $auditLogger);
$driversController = new DriversController(new DriverRepository($db), $auditLogger);
$travelRequestsController = new TravelRequestsController(
    new TravelRequestRepository($db),
    new DriverRepository($db),
    new VehicleRepository($db),
    $auditLogger,
);
$tripLogsController = new TripLogsController(new TripLogRepository($db), $auditLogger);
$vehicleTypesAdminController = new VehicleTypesAdminController(new VehicleTypeRepository($db), $auditLogger);
$driverSchedulesController = new DriverSchedulesController(
    new TravelRequestRepository($db),
    new DriverRepository($db),
    $auditLogger,
);
$driverWorkSchedulesController = new DriverWorkSchedulesController(
    new DriverWorkScheduleRepository($db),
    new DriverRepository($db),
    new DriverWorkScheduleGeneratorService(
        new DriverRepository($db),
        new DriverWorkScheduleRepository($db),
    ),
    $auditLogger,
);
$scheduleGeneratorController = new ScheduleGeneratorController(
    new GreedyScheduleGeneratorService(
        new TravelRequestRepository($db),
        new DriverWorkScheduleRepository($db),
    )
);

$requireAuth = static function (): void {
    if (!isset($_SESSION['auth_user']) || !is_array($_SESSION['auth_user'])) {
        Response::json(['error' => 'Unauthorized'], 401);
        exit;
    }
};

$requireAdmin = static function () use ($requireAuth): void {
    $requireAuth();

    if (!isset($_SESSION['auth_user']['role']) || (string) $_SESSION['auth_user']['role'] !== 'admin') {
        Response::json(['error' => 'Forbidden'], 403);
        exit;
    }
};

$requireManagerOrAdmin = static function () use ($requireAuth): void {
    $requireAuth();

    $role = (string) ($_SESSION['auth_user']['role'] ?? '');
    if (!in_array($role, ['admin', 'manager'], true)) {
        Response::json(['error' => 'Forbidden'], 403);
        exit;
    }
};

$requireManagerAdminOrCao = static function () use ($requireAuth): void {
    $requireAuth();

    $role = (string) ($_SESSION['auth_user']['role'] ?? '');
    if (!in_array($role, ['admin', 'manager', 'cao'], true)) {
        Response::json(['error' => 'Forbidden'], 403);
        exit;
    }
};

$requireAdminOrCao = static function () use ($requireAuth): void {
    $requireAuth();

    $role = (string) ($_SESSION['auth_user']['role'] ?? '');
    if (!in_array($role, ['admin', 'cao'], true)) {
        Response::json(['error' => 'Forbidden'], 403);
        exit;
    }
};

$authUser = static fn(): array => is_array($_SESSION['auth_user'] ?? null) ? $_SESSION['auth_user'] : [];

$router->get('/api/health', static fn() => Response::json([
    'app' => $config['name'],
    'status' => 'ok',
    'timestamp' => date(DATE_ATOM),
]));

$router->post('/api/auth/login', static fn() => $authController->login());
$router->get('/api/auth/me', static fn() => $authController->me());
$router->post('/api/auth/logout', static fn() => $authController->logout());
$router->get('/api/auth/profile', static function () use ($requireAuth, $authUser, $authController): void {
    $requireAuth();
    $authController->profile($authUser());
});
$router->put('/api/auth/profile', static function () use ($requireAuth, $authUser, $authController): void {
    $requireAuth();
    $authController->updateProfile($authUser());
});

$router->get('/api/dashboard/summary', static function () use ($requireAuth, $authUser, $dashboardController): void {
    $requireAuth();
    $dashboardController->summary($authUser());
});

$router->get('/api/audit-logs', static function () use ($requireManagerOrAdmin, $auditLogsController): void {
    $requireManagerOrAdmin();
    $auditLogsController->index();
});

$router->get('/api/audit-logs/item', static function () use ($requireManagerOrAdmin, $auditLogsController): void {
    $requireManagerOrAdmin();
    $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;

    if ($id <= 0) {
        Response::json(['error' => 'id is required'], 422);
        return;
    }

    $auditLogsController->show($id);
});

$router->get('/api/reservations/conflicts', static function () use ($requireAuth, $reservationController): void {
    $requireAuth();
    $reservationController->conflicts();
});

$router->get('/api/roles', static function () use ($requireAdmin, $rolesController): void {
    $requireAdmin();
    $rolesController->index();
});

$router->get('/api/users', static function () use ($requireAdmin, $usersController): void {
    $requireAdmin();
    $usersController->index();
});

$router->get('/api/users/item', static function () use ($requireAdmin, $usersController): void {
    $requireAdmin();
    $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;

    if ($id <= 0) {
        Response::json(['error' => 'id is required'], 422);
        return;
    }

    $usersController->show($id);
});

$router->post('/api/users', static function () use ($requireAdmin, $usersController): void {
    $requireAdmin();
    $usersController->store();
});

$router->put('/api/users/item', static function () use ($requireAdmin, $usersController): void {
    $requireAdmin();
    $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;

    if ($id <= 0) {
        Response::json(['error' => 'id is required'], 422);
        return;
    }

    $usersController->update($id);
});

$router->delete('/api/users/item', static function () use ($requireAdmin, $usersController): void {
    $requireAdmin();
    $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;

    if ($id <= 0) {
        Response::json(['error' => 'id is required'], 422);
        return;
    }

    $usersController->destroy($id);
});

$router->get('/api/vehicle-types', static function () use ($requireAuth, $vehicleTypesController): void {
    $requireAuth();
    $vehicleTypesController->index();
});

$router->get('/api/admin/vehicle-types', static function () use ($requireManagerOrAdmin, $vehicleTypesAdminController): void {
    $requireManagerOrAdmin();
    $vehicleTypesAdminController->index();
});

$router->get('/api/admin/vehicle-types/item', static function () use ($requireManagerOrAdmin, $vehicleTypesAdminController): void {
    $requireManagerOrAdmin();
    $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;

    if ($id <= 0) {
        Response::json(['error' => 'id is required'], 422);
        return;
    }

    $vehicleTypesAdminController->show($id);
});

$router->post('/api/admin/vehicle-types', static function () use ($requireManagerOrAdmin, $vehicleTypesAdminController): void {
    $requireManagerOrAdmin();
    $vehicleTypesAdminController->store();
});

$router->put('/api/admin/vehicle-types/item', static function () use ($requireManagerOrAdmin, $vehicleTypesAdminController): void {
    $requireManagerOrAdmin();
    $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;

    if ($id <= 0) {
        Response::json(['error' => 'id is required'], 422);
        return;
    }

    $vehicleTypesAdminController->update($id);
});

$router->delete('/api/admin/vehicle-types/item', static function () use ($requireManagerOrAdmin, $vehicleTypesAdminController): void {
    $requireManagerOrAdmin();
    $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;

    if ($id <= 0) {
        Response::json(['error' => 'id is required'], 422);
        return;
    }

    $vehicleTypesAdminController->destroy($id);
});

$router->get('/api/locations', static function () use ($requireAuth, $locationsController): void {
    $requireAuth();
    $locationsController->index();
});

$router->get('/api/admin/locations', static function () use ($requireManagerOrAdmin, $locationsAdminController): void {
    $requireManagerOrAdmin();
    $locationsAdminController->index();
});

$router->get('/api/admin/locations/item', static function () use ($requireManagerOrAdmin, $locationsAdminController): void {
    $requireManagerOrAdmin();
    $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;

    if ($id <= 0) {
        Response::json(['error' => 'id is required'], 422);
        return;
    }

    $locationsAdminController->show($id);
});

$router->post('/api/admin/locations', static function () use ($requireManagerOrAdmin, $locationsAdminController): void {
    $requireManagerOrAdmin();
    $locationsAdminController->store();
});

$router->put('/api/admin/locations/item', static function () use ($requireManagerOrAdmin, $locationsAdminController): void {
    $requireManagerOrAdmin();
    $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;

    if ($id <= 0) {
        Response::json(['error' => 'id is required'], 422);
        return;
    }

    $locationsAdminController->update($id);
});

$router->delete('/api/admin/locations/item', static function () use ($requireManagerOrAdmin, $locationsAdminController): void {
    $requireManagerOrAdmin();
    $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;

    if ($id <= 0) {
        Response::json(['error' => 'id is required'], 422);
        return;
    }

    $locationsAdminController->destroy($id);
});

$router->get('/api/vehicles', static function () use ($requireAuth, $vehiclesController): void {
    $requireAuth();
    $vehiclesController->index();
});

$router->get('/api/fuel-logs', static function () use ($requireManagerOrAdmin, $fuelLogsController): void {
    $requireManagerOrAdmin();
    $fuelLogsController->index();
});

$router->get('/api/fuel-logs/item', static function () use ($requireManagerOrAdmin, $fuelLogsController): void {
    $requireManagerOrAdmin();
    $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;

    if ($id <= 0) {
        Response::json(['error' => 'id is required'], 422);
        return;
    }

    $fuelLogsController->show($id);
});

$router->post('/api/fuel-logs', static function () use ($requireManagerOrAdmin, $authUser, $fuelLogsController): void {
    $requireManagerOrAdmin();
    $fuelLogsController->store($authUser());
});

$router->put('/api/fuel-logs/item', static function () use ($requireManagerOrAdmin, $fuelLogsController): void {
    $requireManagerOrAdmin();
    $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;

    if ($id <= 0) {
        Response::json(['error' => 'id is required'], 422);
        return;
    }

    $fuelLogsController->update($id);
});

$router->delete('/api/fuel-logs/item', static function () use ($requireManagerOrAdmin, $fuelLogsController): void {
    $requireManagerOrAdmin();
    $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;

    if ($id <= 0) {
        Response::json(['error' => 'id is required'], 422);
        return;
    }

    $fuelLogsController->destroy($id);
});

$router->get('/api/maintenance-records', static function () use ($requireManagerAdminOrCao, $maintenanceRecordsController): void {
    $requireManagerAdminOrCao();
    $maintenanceRecordsController->index();
});

$router->get('/api/maintenance-records/item', static function () use ($requireManagerAdminOrCao, $maintenanceRecordsController): void {
    $requireManagerAdminOrCao();
    $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;

    if ($id <= 0) {
        Response::json(['error' => 'id is required'], 422);
        return;
    }

    $maintenanceRecordsController->show($id);
});

$router->post('/api/maintenance-records', static function () use ($requireManagerOrAdmin, $authUser, $maintenanceRecordsController): void {
    $requireManagerOrAdmin();
    $maintenanceRecordsController->store($authUser());
});

$router->put('/api/maintenance-records/item', static function () use ($requireManagerOrAdmin, $maintenanceRecordsController): void {
    $requireManagerOrAdmin();
    $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;

    if ($id <= 0) {
        Response::json(['error' => 'id is required'], 422);
        return;
    }

    $maintenanceRecordsController->update($id);
});

$router->delete('/api/maintenance-records/item', static function () use ($requireManagerOrAdmin, $maintenanceRecordsController): void {
    $requireManagerOrAdmin();
    $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;

    if ($id <= 0) {
        Response::json(['error' => 'id is required'], 422);
        return;
    }

    $maintenanceRecordsController->destroy($id);
});

$router->get('/api/vehicles/item', static function () use ($requireAdmin, $vehiclesController): void {
    $requireAdmin();
    $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;

    if ($id <= 0) {
        Response::json(['error' => 'id is required'], 422);
        return;
    }

    $vehiclesController->show($id);
});

$router->post('/api/vehicles', static function () use ($requireAdmin, $vehiclesController): void {
    $requireAdmin();
    $vehiclesController->store();
});

$router->put('/api/vehicles/item', static function () use ($requireAdmin, $vehiclesController): void {
    $requireAdmin();
    $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;

    if ($id <= 0) {
        Response::json(['error' => 'id is required'], 422);
        return;
    }

    $vehiclesController->update($id);
});

$router->delete('/api/vehicles/item', static function () use ($requireAdmin, $vehiclesController): void {
    $requireAdmin();
    $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;

    if ($id <= 0) {
        Response::json(['error' => 'id is required'], 422);
        return;
    }

    $vehiclesController->destroy($id);
});

$router->get('/api/drivers', static function () use ($requireAdminOrCao, $driversController): void {
    $requireAdminOrCao();
    $driversController->index();
});

$router->get('/api/drivers/item', static function () use ($requireAdmin, $driversController): void {
    $requireAdmin();
    $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;

    if ($id <= 0) {
        Response::json(['error' => 'id is required'], 422);
        return;
    }

    $driversController->show($id);
});

$router->post('/api/drivers', static function () use ($requireAdmin, $driversController): void {
    $requireAdmin();
    $driversController->store();
});

$router->put('/api/drivers/item', static function () use ($requireAdmin, $driversController): void {
    $requireAdmin();
    $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;

    if ($id <= 0) {
        Response::json(['error' => 'id is required'], 422);
        return;
    }

    $driversController->update($id);
});

$router->delete('/api/drivers/item', static function () use ($requireAdmin, $driversController): void {
    $requireAdmin();
    $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;

    if ($id <= 0) {
        Response::json(['error' => 'id is required'], 422);
        return;
    }

    $driversController->destroy($id);
});

$router->get('/api/travel-requests', static function () use ($requireAuth, $authUser, $travelRequestsController): void {
    $requireAuth();
    $travelRequestsController->index($authUser());
});

$router->get('/api/travel-requests/item', static function () use ($requireAuth, $authUser, $travelRequestsController): void {
    $requireAuth();
    $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;

    if ($id <= 0) {
        Response::json(['error' => 'id is required'], 422);
        return;
    }

    $travelRequestsController->show($id, $authUser());
});

$router->post('/api/travel-requests', static function () use ($requireAuth, $authUser, $travelRequestsController): void {
    $requireAuth();
    $travelRequestsController->create($authUser());
});

$router->put('/api/travel-requests/item', static function () use ($requireAuth, $authUser, $travelRequestsController): void {
    $requireAuth();
    $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;

    if ($id <= 0) {
        Response::json(['error' => 'id is required'], 422);
        return;
    }

    $travelRequestsController->update($id, $authUser());
});

$router->post('/api/travel-requests/cancel', static function () use ($requireAuth, $authUser, $travelRequestsController): void {
    $requireAuth();
    $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;

    if ($id <= 0) {
        Response::json(['error' => 'id is required'], 422);
        return;
    }

    $travelRequestsController->cancel($id, $authUser());
});

$router->post('/api/travel-requests/approve', static function () use ($requireAuth, $authUser, $travelRequestsController): void {
    $requireAuth();
    $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;

    if ($id <= 0) {
        Response::json(['error' => 'id is required'], 422);
        return;
    }

    $travelRequestsController->approve($id, $authUser());
});

$router->post('/api/travel-requests/reject', static function () use ($requireAuth, $authUser, $travelRequestsController): void {
    $requireAuth();
    $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;

    if ($id <= 0) {
        Response::json(['error' => 'id is required'], 422);
        return;
    }

    $travelRequestsController->reject($id, $authUser());
});

$router->post('/api/travel-requests/assign-driver', static function () use ($requireAuth, $authUser, $travelRequestsController): void {
    $requireAuth();
    $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;

    if ($id <= 0) {
        Response::json(['error' => 'id is required'], 422);
        return;
    }

    $travelRequestsController->assignDriver($id, $authUser());
});

$router->post('/api/travel-requests/update-approved-assignment', static function () use ($requireAuth, $authUser, $travelRequestsController): void {
    $requireAuth();
    $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;

    if ($id <= 0) {
        Response::json(['error' => 'id is required'], 422);
        return;
    }

    $travelRequestsController->updateApprovedAssignment($id, $authUser());
});

$router->post('/api/travel-requests/manager-cancel', static function () use ($requireAuth, $authUser, $travelRequestsController): void {
    $requireAuth();
    $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;

    if ($id <= 0) {
        Response::json(['error' => 'id is required'], 422);
        return;
    }

    $travelRequestsController->managerCancelApproved($id, $authUser());
});

$router->get('/api/travel-requests/driver-options', static function () use ($requireAuth, $authUser, $travelRequestsController): void {
    $requireAuth();
    $travelRequestsController->driverOptions($authUser());
});

$router->get('/api/travel-requests/calendar', static function () use ($requireAuth, $authUser, $travelRequestsController): void {
    $requireAuth();
    $travelRequestsController->calendar($authUser());
});

$router->get('/api/travel-requests/available-vehicles', static function () use ($requireAuth, $travelRequestsController): void {
    $requireAuth();
    $travelRequestsController->availableVehicles();
});

$router->get('/api/trip-logs', static function () use ($requireAuth, $authUser, $tripLogsController): void {
    $requireAuth();
    $tripLogsController->index($authUser());
});

$router->get('/api/trip-logs/item', static function () use ($requireAuth, $authUser, $tripLogsController): void {
    $requireAuth();
    $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;

    if ($id <= 0) {
        Response::json(['error' => 'id is required'], 422);
        return;
    }

    $tripLogsController->show($id, $authUser());
});

$router->post('/api/trip-logs/complete', static function () use ($requireAuth, $authUser, $tripLogsController): void {
    $requireAuth();
    $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;

    if ($id <= 0) {
        Response::json(['error' => 'id is required'], 422);
        return;
    }

    $tripLogsController->complete($id, $authUser());
});

$router->get('/api/driver-schedules', static function () use ($requireAuth, $authUser, $driverSchedulesController): void {
    $requireAuth();
    $driverSchedulesController->index($authUser());
});

$router->post('/api/driver-schedules/reassign', static function () use ($requireAuth, $authUser, $driverSchedulesController): void {
    $requireAuth();
    $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;

    if ($id <= 0) {
        Response::json(['error' => 'id is required'], 422);
        return;
    }

    $driverSchedulesController->reassign($id, $authUser());
});

$router->post('/api/driver-schedules/unassign', static function () use ($requireAuth, $authUser, $driverSchedulesController): void {
    $requireAuth();
    $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;

    if ($id <= 0) {
        Response::json(['error' => 'id is required'], 422);
        return;
    }

    $driverSchedulesController->unassign($id, $authUser());
});

$router->post('/api/driver-schedules/start-travel', static function () use ($requireAuth, $authUser, $driverSchedulesController): void {
    $requireAuth();
    $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;

    if ($id <= 0) {
        Response::json(['error' => 'id is required'], 422);
        return;
    }

    $driverSchedulesController->startTravel($id, $authUser());
});

$router->get('/api/driver-work-schedules', static function () use ($requireAuth, $authUser, $driverWorkSchedulesController): void {
    $requireAuth();
    $driverWorkSchedulesController->index($authUser());
});

$router->get('/api/driver-work-schedules/item', static function () use ($requireAuth, $authUser, $driverWorkSchedulesController): void {
    $requireAuth();
    $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;

    if ($id <= 0) {
        Response::json(['error' => 'id is required'], 422);
        return;
    }

    $driverWorkSchedulesController->show($id, $authUser());
});

$router->post('/api/driver-work-schedules', static function () use ($requireAuth, $authUser, $driverWorkSchedulesController): void {
    $requireAuth();
    $driverWorkSchedulesController->store($authUser());
});

$router->put('/api/driver-work-schedules/item', static function () use ($requireAuth, $authUser, $driverWorkSchedulesController): void {
    $requireAuth();
    $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;

    if ($id <= 0) {
        Response::json(['error' => 'id is required'], 422);
        return;
    }

    $driverWorkSchedulesController->update($id, $authUser());
});

$router->delete('/api/driver-work-schedules/item', static function () use ($requireAuth, $authUser, $driverWorkSchedulesController): void {
    $requireAuth();
    $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;

    if ($id <= 0) {
        Response::json(['error' => 'id is required'], 422);
        return;
    }

    $driverWorkSchedulesController->destroy($id, $authUser());
});

$router->post('/api/driver-work-schedules/generate', static function () use ($requireAuth, $authUser, $driverWorkSchedulesController): void {
    $requireAuth();
    $driverWorkSchedulesController->generate($authUser());
});

$router->post('/api/driver-work-schedules/upsert-weekly', static function () use ($requireAuth, $authUser, $driverWorkSchedulesController): void {
    $requireAuth();
    $driverWorkSchedulesController->upsertWeekly($authUser());
});

$router->post('/api/schedule/generate', static function () use ($requireAuth, $authUser, $scheduleGeneratorController): void {
    $requireAuth();
    $scheduleGeneratorController->generate($authUser());
});

$requestMethod = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$requestUri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$basePath = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/')), '/');

$path = $basePath && str_starts_with($requestUri, $basePath)
    ? substr($requestUri, strlen($basePath))
    : $requestUri;

$path = '/' . ltrim($path, '/');

if ($path === '/index.php') {
    $path = '/';
}

if (str_starts_with($path, '/api/')) {
    if (!$router->dispatch($requestMethod, $path)) {
        Response::json(['error' => 'Not Found'], 404);
    }

    exit;
}

$spaEntry = __DIR__ . '/index.html';
$publicBasePath = $basePath === '/' ? '' : $basePath;

if ($path === '/admin' || str_starts_with($path, '/admin/')) {
    $legacyPath = substr($path, strlen('/admin'));
    $redirectPath = $legacyPath === '' ? '/' : $legacyPath;
    Response::redirect($publicBasePath . $redirectPath);
}

if (file_exists($spaEntry)) {
    $html = file_get_contents($spaEntry);

    if (is_string($html)) {
        $basePathScript = sprintf(
            '<script>window.__VMRS_BASE_PATH__ = %s;</script>',
            json_encode($publicBasePath, JSON_THROW_ON_ERROR)
        );
        header('Content-Type: text/html; charset=utf-8');
        echo str_replace('</head>', $basePathScript . PHP_EOL . '</head>', $html);
        exit;
    }

    http_response_code(500);
    echo 'Unable to read built frontend entry.';
    exit;
}

http_response_code(503);
echo 'Frontend is not built yet. Run: npm run build';
