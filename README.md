# VMRS Admin Template (Bluegreen)

Stack implemented:
- PHP 8.2+ MVC-style skeleton (front controller + lightweight router)
- React + TypeScript SPA (Vite)
- TailwindCSS

## Structure
- `public/index.php` PHP front controller
- `public/.htaccess` Apache rewrite rules
- `dist/` built React SPA assets
- `src/` React source code
- `app/Controllers/Api/` API controllers
- `app/Models/` table-aligned model classes
- `app/Repositories/` repository layer
- `app/Services/` domain services
- `database/vmrs_schema.sql` schema
- `database/vmrs_seed.sql` seed data
- `database/run_sql.php` SQL import runner

## Run (XAMPP / Apache)
1. Point your Apache virtual host document root to `vmrs/public` (recommended).
2. Open `/admin` for the SPA.
3. API endpoints are available under `/api/...`.

If you cannot change vhost root, access via `/vmrs/public/admin`.

## Frontend development
- `npm install`
- `npm run dev`

## Build frontend
- `npm run build`

The frontend build output is written to `dist/`, and `public/index.php` serves those built files.

If your frontend and PHP API do not share the same base path in production, set `VITE_API_BASE_URL` before building.
Example: `VITE_API_BASE_URL=/public npm run build`

The frontend also retries API requests against `/public/api/...` automatically when a same-origin `/api/...` request returns `404`.

## Database setup
- Schema: `php database/run_sql.php database/vmrs_schema.sql`
- Seed: `php database/run_sql.php database/vmrs_seed.sql`
- New travel flow migration (existing DBs): `php database/run_sql.php database/migrate_add_travel_request_flow.sql`

## Seeded login users
Password for all seeded users: `password123`
- `admin@vmrs.local`
- `manager@vmrs.local`
- `driver1@vmrs.local`
- `requester1@vmrs.local`
- `requester2@vmrs.local`

## API routes
- `GET /api/health`
- `GET /api/dashboard/summary`
- `GET /api/reservations/conflicts?vehicle_id=2&start_at=2026-02-26%2010:00:00&end_at=2026-02-26%2011:00:00`
- `GET /api/roles` (admin only)
- `GET /api/users` (admin only)
- `GET /api/users/item?id=1` (admin only)
- `POST /api/users` (admin only)
- `PUT /api/users/item?id=1` (admin only)
- `DELETE /api/users/item?id=1` (admin only)
- `GET /api/vehicle-types` (admin only)
- `GET /api/locations` (admin only)
- `GET /api/vehicles` (admin only)
- `GET /api/vehicles/item?id=1` (admin only)
- `POST /api/vehicles` (admin only)
- `PUT /api/vehicles/item?id=1` (admin only)
- `DELETE /api/vehicles/item?id=1` (admin only)
- `GET /api/drivers` (admin only)
- `GET /api/drivers/item?id=1` (admin only)
- `POST /api/drivers` (admin only)
- `PUT /api/drivers/item?id=1` (admin only)
- `DELETE /api/drivers/item?id=1` (admin only)
- `GET /api/travel-requests` (role-aware)
- `GET /api/travel-requests/item?id=1` (role-aware)
- `POST /api/travel-requests` (requestor)
- `PUT /api/travel-requests/item?id=1` (requestor, pending only)
- `POST /api/travel-requests/cancel?id=1` (requestor, pending only)
- `POST /api/travel-requests/approve?id=1` (manager/admin)
- `POST /api/travel-requests/reject?id=1` (manager/admin, with `reason`)
- `POST /api/travel-requests/assign-driver?id=1` (manager/admin, approved only)
- `GET /api/travel-requests/driver-options` (manager/admin)
- `POST /api/travel-requests/manager-cancel?id=1` (manager/admin, approved only)
- `GET /api/driver-schedules` (manager/admin)
- `POST /api/driver-schedules/reassign?id=1` (manager/admin, approved only)
- `POST /api/driver-schedules/unassign?id=1` (manager/admin, approved only)
- `GET /api/driver-work-schedules` (manager/admin)
- `GET /api/driver-work-schedules/item?id=1` (manager/admin)
- `POST /api/driver-work-schedules` (manager/admin)
- `PUT /api/driver-work-schedules/item?id=1` (manager/admin)
- `DELETE /api/driver-work-schedules/item?id=1` (manager/admin)
- `POST /api/schedule/generate` (manager/admin, greedy assignment with 8h/day enforcement)

`/api/schedule/generate` request body:
- `start_date` (optional, `YYYY-MM-DD`, default first day of current month)
- `end_date` (optional, `YYYY-MM-DD`, default last day of current month)

Greedy generator rules:
- Processes `approved` and unassigned travel requests within the date range.
- Candidate drivers must have matching `driver_work_schedules` rows:
  - same `work_date`
  - `status = scheduled`
  - `shift_type IN (regular, overtime)`
  - request time window fully inside shift window.
- Enforces:
  - no overlapping request assignments for the same driver
  - max `8` assigned travel hours per driver per day
- Returns:
  - `processed`, `assigned_count`, `unassigned_count`
  - lists of assigned and unassigned requests (with reasons).

`/api/reservations/conflicts` query params:
- `vehicle_id` (required)
- `start_at` (required, format `YYYY-MM-DD HH:MM:SS`)
- `end_at` (required, format `YYYY-MM-DD HH:MM:SS`)
- `exclude_id` (optional, for update scenarios)

## Next extension points
- Add create/update repositories and API endpoints for full CRUD.
- Add auth middleware/session guards on `/admin` and `/api` routes.
- Add database migrations workflow for team environments.
