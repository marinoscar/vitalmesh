# VitalMesh Features

**Version:** 1.0
**Last Updated:** March 2026

Comprehensive inventory of all features implemented in VitalMesh.

---

## Table of Contents

1. [Authentication & Authorization](#1-authentication--authorization)
2. [Health Data Ingestion](#2-health-data-ingestion-sync)
3. [Health Data Queries & Analysis](#3-health-data-queries--analysis)
4. [Sleep Tracking](#4-sleep-tracking)
5. [Exercise & Activity Tracking](#5-exercise--activity-tracking)
6. [Nutrition Tracking](#6-nutrition-tracking)
7. [Cycle Tracking](#7-cycle-tracking)
8. [Lab Results & Blood Work](#8-lab-results--blood-work)
9. [Mood Tracking](#9-mood-tracking)
10. [Health Sessions (Record Grouping)](#10-health-sessions-record-grouping)
11. [Attachments & Media](#11-attachments--media)
12. [Comments & Notes](#12-comments--notes)
13. [Record Versioning & Audit Trail](#13-record-versioning--audit-trail)
14. [Device Management](#14-device-management)
15. [User Management](#15-user-management)
16. [Settings Framework](#16-settings-framework)
17. [Email Allowlist](#17-email-allowlist)
18. [File Storage](#18-file-storage)
19. [Android App](#19-android-app)
20. [Web Application](#20-web-application)
21. [Infrastructure & Observability](#21-infrastructure--observability)

---

## 1. Authentication & Authorization

### Google OAuth 2.0

- Sign in via Google accounts
- Automatic user provisioning on first login
- Profile syncing (name, avatar)

**Endpoints:**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/auth/providers` | List enabled OAuth providers (Public) |
| GET | `/api/auth/google` | Initiate Google OAuth flow |
| GET | `/api/auth/google/callback` | OAuth callback handler |
| GET | `/api/auth/me` | Get current authenticated user |

### Device Authorization (RFC 8628)

Enables input-constrained devices (Android app, CLI tools, IoT) to authenticate without requiring direct browser access on the device.

- Human-readable user codes (e.g., `ABCD-1234`) displayed on the device
- Configurable code expiry (`DEVICE_CODE_EXPIRY_MINUTES`, default: 15 minutes)
- Configurable polling interval (`DEVICE_CODE_POLL_INTERVAL`, default: 5 seconds)
- User approves or denies the device from any browser session
- Device receives long-lived access once approved

**Endpoints:**

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/device/code` | Generate device code (Public) |
| POST | `/api/auth/device/token` | Poll for authorization result (Public) |
| GET | `/api/auth/device/activate` | Get activation info for approval UI |
| POST | `/api/auth/device/authorize` | Approve or deny a device |
| GET | `/api/auth/device/sessions` | List authorized device sessions |
| DELETE | `/api/auth/device/sessions/{id}` | Revoke a device session |

### JWT Token Management

- Short-lived access tokens (default: 15 minutes, configurable via `JWT_ACCESS_TTL_MINUTES`)
- Long-lived refresh tokens (default: 14 days, configurable via `JWT_REFRESH_TTL_DAYS`)
- Refresh tokens stored in HttpOnly cookies to prevent XSS access
- Automatic token rotation on each refresh
- Reuse detection: a reused refresh token invalidates the entire token family, protecting against token theft

**Endpoints:**

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/refresh` | Refresh access token using refresh cookie |
| POST | `/api/auth/logout` | Logout and invalidate current session |
| POST | `/api/auth/logout-all` | Logout from all devices simultaneously |

### RBAC (Role-Based Access Control)

Three roles with granular permissions enforced server-side on every request:

| Role | Description | Health Data Access | User Management | Settings |
|------|-------------|-------------------|-----------------|----------|
| **Admin** | Full system access | Read/Write/Delete own + Read any user's data | Read/Write all users | System settings + User settings |
| **Contributor** | Standard user | Read/Write/Delete own data | None | User settings only |
| **Viewer** | Read-only (default) | Read own data only | None | User settings only |

**Permissions enforced:**

- `system_settings:read` / `system_settings:write`
- `user_settings:read` / `user_settings:write`
- `users:read` / `users:write`
- `rbac:manage`
- `allowlist:read` / `allowlist:write`
- `storage:read` / `storage:write` / `storage:delete` (own objects)
- `storage:read_any` / `storage:write_any` / `storage:delete_any` (Admin: all objects)
- `health_data:read` / `health_data:write` / `health_data:delete` (own data)
- `health_data:read_any` (Admin: any user's data)

### Email Allowlist

- Pre-authorize users by email before they can sign in
- Admin management UI with pending/claimed status tracking
- `INITIAL_ADMIN_EMAIL` always bypasses the allowlist check

---

## 2. Health Data Ingestion (Sync)

All sync endpoints accept batches from the Android app and support deduplication via client-supplied record IDs. All endpoints require the `health_data:write` permission.

### Supported Data Types

50+ Health Connect record types mapped across 6 sync endpoints:

#### Metrics (`POST /api/health-data/metrics`, max 500 records/request)

**Instantaneous measurements (18 types):**

| Metric | Description |
|--------|-------------|
| `weight` | Body weight in kg |
| `height` | Height in cm |
| `body_fat` | Body fat percentage |
| `bone_mass` | Bone mass in kg |
| `lean_body_mass` | Lean body mass in kg |
| `body_water_mass` | Body water mass in kg |
| `basal_metabolic_rate` | BMR in kcal/day |
| `vo2_max` | VO2 max in ml/kg/min |
| `blood_pressure_systolic` | Systolic pressure (mmHg), grouped with diastolic |
| `blood_pressure_diastolic` | Diastolic pressure (mmHg), grouped with systolic |
| `blood_glucose` | Blood glucose in mmol/L or mg/dL |
| `body_temperature` | Body temperature in Celsius |
| `basal_body_temperature` | Basal body temperature in Celsius |
| `oxygen_saturation` | SpO2 percentage |
| `respiratory_rate` | Breaths per minute |
| `resting_heart_rate` | Resting HR in bpm |
| `heart_rate_variability` | HRV RMSSD in ms |
| `waist_circumference` | Waist in cm |
| `hip_circumference` | Hip in cm |

**Interval measurements (8 types):**

| Metric | Description |
|--------|-------------|
| `steps` | Step count over a time interval |
| `active_calories_burned` | Active calories burned |
| `total_calories_burned` | Total calories burned |
| `distance` | Distance traveled in meters |
| `elevation_gained` | Elevation gain in meters |
| `floors_climbed` | Floors climbed count |
| `hydration` | Fluid intake in liters |
| `wheelchair_pushes` | Wheelchair push count |

**Series measurements (6 types, multiple rows per Health Connect record):**

| Metric | Description |
|--------|-------------|
| `heart_rate` | HR samples from a continuous recording |
| `speed` | Speed samples in m/s |
| `power` | Power output samples in watts |
| `steps_cadence` | Steps per minute samples |
| `cycling_cadence` | Cycling cadence samples in RPM |
| `skin_temperature` | Skin temperature delta samples |

#### Sleep (`POST /api/health-data/sleep`, max 100 sessions/request)

Sleep sessions with granular stage breakdowns. Each session contains a start/end time and an array of stage records.

**Stage types:** `unknown`, `awake`, `sleeping`, `out_of_bed`, `awake_in_bed`, `light`, `deep`, `rem`

#### Exercise (`POST /api/health-data/exercise`, max 100 sessions/request)

80+ exercise types from Android Health Connect including:

- Running, cycling, walking, hiking
- Swimming, rowing, kayaking
- Yoga, pilates, stretching
- Weightlifting, CrossFit, calisthenics
- Team sports (basketball, football, tennis, etc.)
- Mindfulness and meditation (mapped as exercise type)
- Planned exercise sessions with training blocks

Session attributes stored as JSONB: calories, distance, average/max heart rate, elevation, average speed, segments, laps, GPS routes.

#### Nutrition (`POST /api/health-data/nutrition`, max 100 entries/request)

Meal entries with start/end times, meal type classification, and 40+ nutrient fields stored as JSONB.

**Meal types:** `breakfast`, `lunch`, `dinner`, `snack`

#### Cycle (`POST /api/health-data/cycle`, max 100 events/request)

Six event types for reproductive health tracking with categorical data stored as JSONB per event type.

#### Labs (`POST /api/health-data/labs`, max 100 results/request)

Individual lab test results with numeric values, reference ranges, and status classification.

### Sync State Management

Per-device, per-data-type sync tracking to support differential sync from Android:

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health-data/sync/state` | Get sync state, optionally filtered by deviceId |
| PUT | `/api/health-data/sync/state` | Upsert sync state for one or more data types on a device |

**Tracked state per data type:**
- Last sync timestamp
- Change token for differential sync (Health Connect token-based pagination)
- Record count
- Status: `idle`, `syncing`, `error`

### Deduplication

- Client record ID-based upsert: `ON CONFLICT(user_id, client_record_id) DO UPDATE`
- Version counter incremented on each update
- Blood pressure uses `group_id` to pair systolic and diastolic readings atomically
- Series records use composite IDs (`{hc_record_id}-{sample_timestamp}`) for fine-grained deduplication

---

## 3. Health Data Queries & Analysis

All query endpoints require the `health_data:read` permission. Results are scoped to the authenticated user's data.

### Available Query Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health-data/metrics` | Query metrics with filters (metric name, time range), paginated |
| GET | `/api/health-data/metrics/grouped` | Query grouped metrics (e.g., blood pressure systolic/diastolic pairs) |
| GET | `/api/health-data/sleep` | Query sleep sessions with stages, paginated |
| GET | `/api/health-data/exercise` | Query exercise sessions, paginated |
| GET | `/api/health-data/nutrition` | Query nutrition entries, paginated |
| GET | `/api/health-data/cycle` | Query cycle tracking events, paginated |
| GET | `/api/health-data/labs` | Query lab results, paginated |
| GET | `/api/health-data/summary` | Aggregated dashboard summary for a date range |
| PATCH | `/api/health-data/:table/:id` | Update a health record with revision tracking |
| GET | `/api/health-data/:table/:id/revisions` | Get full revision history for a record |
| DELETE | `/api/health-data/metrics` | Delete metrics by metric name and time range |

### Dashboard Summary (`GET /api/health-data/summary`)

Aggregated view for `day`, `week`, or `month` ranges. Includes:

- **Steps:** total, daily average, latest reading
- **Heart rate:** min, max, average, resting, latest reading
- **Sleep:** total duration, stage breakdown
- **Weight:** latest measurement
- **Blood pressure:** latest systolic/diastolic pair
- **Active calories:** total burned
- **Exercise:** session count and total duration

### Grouped Metrics (`GET /api/health-data/metrics/grouped`)

Returns metric records grouped by `group_id`. Used primarily for blood pressure to return systolic and diastolic readings as matched pairs rather than separate unrelated rows.

---

## 4. Sleep Tracking

- Session-level tracking with start time, end time, and computed total duration
- 8 sleep stage types with individual start/end time ranges per stage within a session
- Source device and source app tracking (from Health Connect metadata)
- Historical queries with configurable time range filters and pagination
- Stages replaced atomically on re-sync (no partial stage state)

**Database tables:** `health_sleep_sessions`, `health_sleep_stages`

---

## 5. Exercise & Activity Tracking

- 80+ exercise type classifications sourced from Android Health Connect
- Session-level metadata: title, exercise type, start time, end time
- Computed attributes stored as JSONB: calories burned, distance, average heart rate, max heart rate, elevation gain, average speed
- Sub-structures stored as JSONB:
  - **Segments:** warmup, active cooldown intervals with type and duration
  - **Laps:** lap distance and time splits
  - **GPS routes:** array of (latitude, longitude, altitude, timestamp) waypoints
- Planned exercise sessions: future sessions with training block definitions
- Mindfulness sessions: mapped from Health Connect `MindfulnessSession` as a distinct exercise type

**Database table:** `health_exercise_sessions`

---

## 6. Nutrition Tracking

- Meal-level tracking with start and end timestamps
- Meal type classification: `breakfast`, `lunch`, `dinner`, `snack`
- Optional food or meal name for display
- 40+ nutrient fields stored as JSONB:
  - Macronutrients: energy (kcal/kJ), protein, total fat, saturated fat, unsaturated fat, trans fat, cholesterol, total carbohydrates, dietary fiber, total sugar
  - Micronutrients: sodium, potassium, calcium, iron, vitamin A, vitamin C, vitamin B6, and additional vitamins and minerals
- Source device and app tracking

**Database table:** `health_nutrition`

---

## 7. Cycle Tracking

Six event types covering the full spectrum of reproductive health data available in Android Health Connect:

| Event Type | Data Stored |
|------------|-------------|
| `menstruation_flow` | Flow level: `light`, `medium`, `heavy` |
| `menstruation_period` | Period start/end |
| `ovulation_test` | Result: `positive`, `high`, `negative`, `inconclusive` |
| `cervical_mucus` | Texture (5 types) and sensation (3 levels) |
| `intermenstrual_bleeding` | Bleeding occurrence with timestamp |
| `sexual_activity` | Occurrence record |

All categorical values are stored as JSONB per event type. Events are deduplicatable by client record ID.

**Database table:** `health_cycle_events`

---

## 8. Lab Results & Blood Work

- Individual test results with numeric value and unit
- Reference ranges: `range_low` and `range_high` for normal value indication
- Status classification: `normal`, `low`, `high`, `critical_low`, `critical_high`
- Panel grouping: lipid panel, CBC, metabolic panel, thyroid panel, liver panel, and custom panels
- Lab name and ordering provider tracking for context
- Source types: manual entry, PDF upload, or API integration
- Fasting status and specimen type via tags
- Queryable alongside all other health data types

**Database table:** `health_lab_results`

---

## 9. Mood Tracking

### Scale Definitions

User-defined mood scales allow personalized tracking across multiple dimensions:

- Custom scale name (e.g., "Happiness", "Anxiety", "Energy")
- Numeric range with configurable min and max
- Custom text labels per level (e.g., "1: Very Sad", "5: Very Happy")
- Optional icon identifiers for visual display
- Soft delete (deactivation) to preserve historical data while hiding from active use

**Endpoints:**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health-data/mood-scales` | List active mood scale definitions |
| POST | `/api/health-data/mood-scales` | Create a new mood scale |
| PATCH | `/api/health-data/mood-scales/:id` | Update mood scale name, labels, or icons |
| DELETE | `/api/health-data/mood-scales/:id` | Soft-delete (deactivate) a mood scale |

### Mood Entries

- Stored as time-series metrics using the naming convention `mood_{scale_name}`
- Numeric values correlate with scale definitions for consistent interpretation
- Tags include `scale_id` and the matching label text
- Fully queryable alongside all other metrics, enabling cross-correlation charts (e.g., mood vs. sleep duration, mood vs. exercise sessions)

**Database table:** `health_mood_scales` (definitions), `health_metrics` (entries)

---

## 10. Health Sessions (Record Grouping)

Named containers that group records from multiple health data types across arbitrary time spans.

**Example use cases:** "March Weight Loss Program", "Post-Surgery Recovery", "Marathon Training Block"

**Session features:**
- Name, description, date range, and status: `active`, `completed`, `archived`
- Custom tags for goal categorization
- Link or unlink records from any health table (metrics, sleep, exercise, nutrition, etc.)
- Query all linked records across tables in a single API call
- Summary view with record counts per linked data type

**Endpoints:**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health-data/sessions` | List sessions, paginated and filterable |
| POST | `/api/health-data/sessions` | Create a new session |
| GET | `/api/health-data/sessions/:id` | Get session details with summary |
| PATCH | `/api/health-data/sessions/:id` | Update session name, dates, status, or tags |
| DELETE | `/api/health-data/sessions/:id` | Delete a session (does not delete linked records) |
| GET | `/api/health-data/sessions/:id/records` | List all records linked to a session |
| POST | `/api/health-data/sessions/:id/records` | Link records to a session |
| DELETE | `/api/health-data/sessions/:id/records` | Unlink records from a session |

**Database tables:** `health_sessions`, `health_session_records`

---

## 11. Attachments & Media

Polymorphic attachment system that links stored files to any health record type.

- Attach photos, documents, or media to any health record
- Uses the existing storage system (S3-compatible, supports multipart uploads for large files)
- Polymorphic linking via `(table_name, record_id, storage_object_id)`
- Optional caption and sort ordering for multi-attachment records
- Ownership-verified deletion

**Use cases:** progress photos on weight records, workout selfies on exercise sessions, lab report PDFs on lab result records

**Endpoints:**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health-data/:table/:id/attachments` | List attachments for a health record |
| POST | `/api/health-data/:table/:id/attachments` | Add an attachment to a health record |
| DELETE | `/api/health-data/attachments/:attachmentId` | Remove an attachment by ID |

**Database table:** `health_record_attachments`

---

## 12. Comments & Notes

Threaded comment system supporting annotations on any health record from multiple roles.

**Comment types:**

| Type | Description |
|------|-------------|
| `note` | General personal observation |
| `doctor_note` | Annotation from a medical professional |
| `coach_feedback` | Feedback from a trainer or coach |
| `system` | Automatically generated system annotation |

**Features:**
- Pin important comments to surface them at the top
- Edit and delete with strict ownership verification
- Comments persist even if the author's role changes

**Endpoints:**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health-data/:table/:id/comments` | List comments for a health record |
| POST | `/api/health-data/:table/:id/comments` | Add a comment to a health record |
| PATCH | `/api/health-data/comments/:commentId` | Update a comment's content or pin status |
| DELETE | `/api/health-data/comments/:commentId` | Delete a comment by ID |

**Database table:** `health_record_comments`

---

## 13. Record Versioning & Audit Trail

### Record Updates

Every modification to a health record is version-tracked:

- Previous record state saved as a full JSONB snapshot before the update is applied
- `version` counter incremented on each update (starts at 1)
- Update source classification: `sync` (device re-sync), `manual` (user edit), `system`, `admin`
- Optional update comment field for explaining why a change was made

**Endpoint:**

| Method | Path | Description |
|--------|------|-------------|
| PATCH | `/api/health-data/:table/:id` | Update a record and record the prior state as a revision |

### Revision History

- Full JSONB snapshot of the record state before each modification
- Actor (who changed it), timestamp, source, and optional comment
- Queryable per record to see the full change history

**Endpoint:**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health-data/:table/:id/revisions` | Get all revisions for a specific record |

**Database table:** `health_record_revisions`

---

## 14. Device Management

### Device Registry

Devices are automatically registered when they complete the RFC 8628 device authorization flow.

- Device metadata captured: name, model, manufacturer, OS version, app version
- Last sync timestamp updated on each successful sync
- Unique constraint: `(user_id, device_name, device_model)` prevents duplicate registrations
- Soft deactivation preserves all historical sync data

**Endpoints:**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/devices` | List all devices registered to the authenticated user |
| PATCH | `/api/devices/:id` | Update device name or active status |
| DELETE | `/api/devices/:id` | Deactivate a device (soft delete) |

**Database table:** `user_devices`

### Data Source Tracking

Records which apps originally wrote data to Health Connect, enabling provenance tracking per health record.

- Source types: `android_health_connect`, `manual`, `api`, `lab_upload`
- Package name tracking for Health Connect data origins (e.g., `com.fitbit.FitbitMobile`)
- First seen and last seen timestamps per source

**Database table:** `health_data_sources`

---

## 15. User Management (Admin)

Admin-only operations for managing registered users. All endpoints require the `users:read` or `users:write` permission.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/users` | List all users (paginated) |
| GET | `/api/users/{id}` | Get user details by ID |
| PATCH | `/api/users/{id}` | Update user roles or activation status |
| PUT | `/api/users/{id}/roles` | Replace user role assignments |

---

## 16. Settings Framework

### System Settings

Global application configuration managed by admins.

- JSONB storage allows arbitrary configuration structure without migrations
- Versioned with change tracking
- Admin-only write access (`system_settings:write` permission required)
- Read access available to all authenticated users (`system_settings:read`)
- Supports UI configuration: theme overrides, feature flags, application behavior

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/system-settings` | Get current system settings |
| PUT | `/api/system-settings` | Replace system settings entirely (Admin) |
| PATCH | `/api/system-settings` | Partial update system settings (Admin) |

### User Settings

Per-user preferences managed by each user.

- JSONB storage for flexible preference structures
- Versioned independently per user
- Self-service: users manage their own settings without admin involvement
- Partial updates via PATCH to change individual keys without affecting others

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/user-settings` | Get the current user's settings |
| PUT | `/api/user-settings` | Replace user settings entirely |
| PATCH | `/api/user-settings` | Partial update user settings |

**Database tables:** `system_settings`, `user_settings`

---

## 17. Email Allowlist

Controls which users can sign in to the application.

- Admins pre-authorize email addresses before users can complete OAuth login
- Email check occurs during the OAuth callback — unauthorized emails are rejected with a clear error
- `INITIAL_ADMIN_EMAIL` is auto-seeded on database initialization and always bypasses the allowlist check

**Status tracking:**

| Status | Meaning |
|--------|---------|
| `pending` | Email added to allowlist; user has not yet logged in |
| `claimed` | User has successfully logged in and an account exists |

Claimed entries cannot be removed to prevent accidentally locking out existing users.

**Endpoints:**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/allowlist` | List allowlisted emails (paginated, filterable) |
| POST | `/api/allowlist` | Add an email address to the allowlist |
| DELETE | `/api/allowlist/{id}` | Remove a pending allowlist entry |

**Management UI:** `/admin/users` — Users and Allowlist tabs

**Database table:** `allowed_emails`

---

## 18. File Storage

S3-compatible object storage with support for both simple uploads and resumable multipart uploads for large files.

### Simple Upload

- `POST /api/storage/objects` — Upload a file directly in a single request
- Suitable for small files (profile photos, thumbnails, short documents)

### Resumable Multipart Upload

For large files (lab report PDFs, high-resolution images):

1. **Initialize:** `POST /api/storage/objects/upload/init` — Returns upload ID and presigned chunk URLs
2. **Upload chunks:** Client uploads directly to presigned URLs in parallel
3. **Check progress:** `GET /api/storage/objects/:id/upload/status` — Track bytes uploaded and chunk status
4. **Complete:** `POST /api/storage/objects/:id/upload/complete` — Assemble chunks into final object
5. **Abort:** `DELETE /api/storage/objects/:id/upload/abort` — Cancel and clean up a partial upload

### Object Management

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/storage/objects` | List storage objects (paginated) |
| GET | `/api/storage/objects/:id` | Get object metadata |
| GET | `/api/storage/objects/:id/download` | Get time-limited signed download URL |
| DELETE | `/api/storage/objects/:id` | Delete an object (own objects; Admin can delete any) |
| PATCH | `/api/storage/objects/:id/metadata` | Update object metadata (filename, description) |

**Access control:**
- Users can read, write, and delete their own objects (`storage:read/write/delete`)
- Admins can read, write, and delete any user's objects (`storage:read_any/write_any/delete_any`)

**Database tables:** `storage_objects`, `storage_object_chunks`

---

## 19. Android App

Native Android application that reads health data from Android Health Connect and syncs it to VitalMesh.

### User Experience

- 3-page onboarding flow: Welcome, Privacy disclosure, Health Connect permissions
- Device code sign-in via RFC 8628 — no password entry required on the device
- Health Connect permission management by category (Activity, Body, Sleep, Nutrition, Cycle, Labs)
- Dashboard with health summary cards: steps, heart rate, sleep, weight, blood pressure, active calories, exercise sessions
- Detail views for each data type with selectable time range tabs (day/week/month)
- Sync status screen with per-data-type indicators (idle, syncing, error, last sync time)
- Manual "Sync Now" button to trigger an immediate sync outside the automatic schedule
- Settings screen: sync frequency, WiFi-only sync toggle, notification preferences
- Profile screen with sign-out capability

### Technical Architecture

- **Language:** Kotlin with Jetpack Compose
- **UI system:** Material Design 3 with dynamic color theming
- **Dependency injection:** Hilt throughout all layers
- **Offline-first:** Room database sync queue persists unsynced records across app restarts
- **Background sync:** WorkManager periodic sync with configurable interval (default: 15 minutes)
- **Token storage:** EncryptedSharedPreferences for secure access token persistence
- **Health Connect:** 50+ record type mappers covering all supported data categories
- **Batch sizes:** 500 metrics / 100 sessions per API request
- **Retry policy:** Automatic exponential backoff on transient failures
- **Network:** Retrofit + OkHttp for API communication

### Data Flow

```
Health Connect SDK
       |
  HC Record Mappers (50+ types)
       |
  Room Sync Queue (offline buffer)
       |
  SyncWorker (WorkManager)
       |
  VitalMesh API (batch upsert)
       |
  Sync State Update (change token stored per data type)
```

---

## 20. Web Application

React + TypeScript frontend served at the application root via Nginx same-origin routing.

### Pages and Features

| Page | Access | Description |
|------|--------|-------------|
| Login | Public | Google OAuth sign-in button |
| Home / Dashboard | Authenticated | Overview of recent health activity |
| User Settings | Authenticated | Personal preferences management |
| Device Activation | Authenticated | RFC 8628 device approval UI |
| User Management | Admin | List and manage registered users |
| System Settings | Admin | Global application configuration |
| Allowlist Management | Admin | Pre-authorize emails; view pending/claimed status |

### Technology

- React 18 + TypeScript
- Material UI (MUI) component library
- Theme support with user preference override capability (light/dark/system)
- OpenAPI-generated or manually maintained API client

### Routing

- Application served at `/` via Nginx
- API proxied under `/api` by Nginx (same-origin, no CORS needed)
- Swagger UI available at `/api/docs`

---

## 21. Infrastructure & Observability

### Containerization

Docker Compose with layered compose files for clean environment separation:

| File | Purpose |
|------|---------|
| `base.compose.yml` | Core services: API, Web, PostgreSQL, Nginx |
| `dev.compose.yml` | Development overrides: hot reload, volume mounts |
| `prod.compose.yml` | Production overrides: resource limits, restart policies |
| `otel.compose.yml` | Observability stack: OTEL Collector, Uptrace, ClickHouse |

**Service URLs (Development):**
- Application: `http://localhost:3535`
- Swagger UI: `http://localhost:3535/api/docs`
- Uptrace: `http://localhost:14318` (when otel stack is running)

### Observability

- **OpenTelemetry** auto-instrumentation covers HTTP requests, database queries, and auth flows
- **Uptrace** for distributed trace and metrics visualization
- **ClickHouse** as the trace storage backend
- **Pino** structured JSON logging with correlation IDs linking logs to traces
- Log levels configurable via `LOG_LEVEL` environment variable
- Sensitive field redaction in logs (tokens, passwords, PII)

**Health check endpoints:**

| Endpoint | Description |
|----------|-------------|
| `GET /api/health/live` | Liveness: confirms the process is running |
| `GET /api/health/ready` | Readiness: confirms database connectivity |

### Nginx Reverse Proxy

- Routes `/api` to the NestJS backend, `/` to the React frontend
- Adds security headers: `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`
- Same-origin architecture eliminates cross-origin requests and simplifies CORS configuration
- Handles TLS termination in production deployments

### Security Infrastructure

- JWT with short-lived access tokens and rotating refresh tokens
- HttpOnly cookie storage prevents XSS token theft
- Input validation on all endpoints using Zod schemas
- Refresh token reuse detection for compromised token families
- File upload restrictions: allowed MIME types, size limits, randomized storage filenames
- Audit logging for all state-mutating operations
- Secrets managed exclusively via environment variables (never in source code)
