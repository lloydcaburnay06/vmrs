<?php

declare(strict_types=1);

use App\Controllers\Api\AuthController;
use App\Controllers\Api\DashboardController;
use App\Controllers\Api\DriversController;
use App\Controllers\Api\DriverSchedulesController;
use App\Controllers\Api\DriverWorkSchedulesController;
use App\Controllers\Api\LocationsController;
use App\Controllers\Api\ReservationController;
use App\Controllers\Api\RolesController;
use App\Controllers\Api\ScheduleGeneratorController;
use App\Controllers\Api\TravelRequestsController;
use App\Controllers\Api\VehicleTypesController;
use App\Controllers\Api\VehiclesController;
use App\Controllers\Api\UsersController;
use App\Core\Database;
use App\Core\Response;
use App\Core\Router;
use App\Repositories\AuthRepository;
use App\Repositories\DashboardRepository;
use App\Repositories\DriverRepository;
use App\Repositories\DriverWorkScheduleRepository;
use App\Repositories\ReservationRepository;
use App\Repositories\RoleRepository;
use App\Repositories\TravelRequestRepository;
use App\Repositories\UserRepository;
use App\Repositories\VehicleRepository;
use App\Repositories\VehicleTypeRepository;
use App\Repositories\LocationRepository;
use App\Services\ReservationConflictService;
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
$authController = new AuthController(new AuthRepository($db));
$dashboardController = new DashboardController(new DashboardRepository($db));
$reservationController = new ReservationController(
    new ReservationConflictService(new ReservationRepository($db))
);
$rolesController = new RolesController(new RoleRepository($db));
$usersController = new UsersController(new UserRepository($db));
$vehicleTypesController = new VehicleTypesController(new VehicleTypeRepository($db));
$locationsController = new LocationsController(new LocationRepository($db));
$vehiclesController = new VehiclesController(new VehicleRepository($db));
$driversController = new DriversController(new DriverRepository($db));
$travelRequestsController = new TravelRequestsController(
    new TravelRequestRepository($db),
    new DriverRepository($db),
);
$driverSchedulesController = new DriverSchedulesController(
    new TravelRequestRepository($db),
    new DriverRepository($db),
);
$driverWorkSchedulesController = new DriverWorkSchedulesController(
    new DriverWorkScheduleRepository($db),
    new DriverRepository($db),
    new DriverWorkScheduleGeneratorService(
        new DriverRepository($db),
        new DriverWorkScheduleRepository($db),
    ),
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

$authUser = static fn(): array => is_array($_SESSION['auth_user'] ?? null) ? $_SESSION['auth_user'] : [];

$router->get('/api/health', static fn() => Response::json([
    'app' => $config['name'],
    'status' => 'ok',
    'timestamp' => date(DATE_ATOM),
]));

$router->post('/api/auth/login', static fn() => $authController->login());
$router->get('/api/auth/me', static fn() => $authController->me());
$router->post('/api/auth/logout', static fn() => $authController->logout());

$router->get('/api/dashboard/summary', static function () use ($requireAuth, $dashboardController): void {
    $requireAuth();
    $dashboardController->summary();
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

$router->get('/api/locations', static function () use ($requireAuth, $locationsController): void {
    $requireAuth();
    $locationsController->index();
});

$router->get('/api/vehicles', static function () use ($requireAuth, $vehiclesController): void {
    $requireAuth();
    $vehiclesController->index();
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

$router->get('/api/drivers', static function () use ($requireAdmin, $driversController): void {
    $requireAdmin();
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

if ($path === '/') {
    Response::redirect('/admin/');
}

if ($path === '/admin' || str_starts_with($path, '/admin/')) {
    $adminEntry = __DIR__ . '/admin/index.html';

    if (file_exists($adminEntry)) {
        header('Content-Type: text/html; charset=utf-8');
        readfile($adminEntry);
        exit;
    }

    http_response_code(503);
    echo 'Admin frontend is not built yet. Run: cd frontend && npm run build';
    exit;
}

http_response_code(404);
echo 'Not Found';
