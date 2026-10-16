# S4-06 — Tenant maintenance reports

## Included
- Tenant creates a report with device type, description, urgency (`NORMAL`/`URGENT`) and up to 3 JPG/PNG photos (5 MB per photo).
- Backend assigns a `BH-yyyyMM-xxxx` code and initial status `NEW`.
- Creation is allowed only for the authenticated `TENANT` with an `ACTIVE`, non-terminated rental contract whose dates include today's date in `Asia/Ho_Chi_Minh` and whose room is `RENTED`.
- Tenant can list and view their reports, status, photos and the latest manager response on `/tenant/maintenance-reports`.
- Photos are stored outside the public web root and can only be fetched by the tenant who owns the report.

## API
- `POST /api/maintenance-reports` — multipart fields `deviceType`, `description`, `urgency` (`NORMAL` or `URGENT`), optional repeated `photos` fields.
- `GET /api/maintenance-reports` — current tenant's reports.
- `GET /api/maintenance-reports/{id}` — a report belonging to the current tenant.
- `GET /api/maintenance-reports/{id}/photos/{photoId}` — protected photo download/view.

All endpoints require the existing bearer-token authentication. The manager-response field is ready to be populated by the manager workflow in S4-07; this S4-06 implementation does not add manager-side status changes or cost handling.

## Database
Hibernate's existing `spring.jpa.hibernate.ddl-auto=update` creates the new tables. `backend/migrations/V10__s4_06_maintenance_reports.sql` is also included as an additive schema script for environments that apply SQL migrations manually.
