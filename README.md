# VitalMesh

> Your health data, your control. A unified platform for ingesting, owning, and analyzing biometric data from all your devices.

## Overview

VitalMesh is a health data ownership platform that gives users a single, private repository of all their health data. Users install the Android app, which reads biometric data from Android Health Connect (aggregating data from Fitbit, Samsung Health, Google Fit, Garmin, and more) and syncs it to the VitalMesh API.

**Key capabilities:**
- Ingest health data from 50+ Health Connect record types
- Time-series metrics, sleep sessions, exercise, nutrition, cycle tracking, and lab results
- Offline-first sync with automatic retry
- Dashboard summaries and historical analysis
- Full revision history for every health record
- Attachments (photos, documents) and notes on any record
- Custom mood tracking with user-defined scales

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────────┐     ┌────────────┐
│ Android App │────▶│   Nginx     │────▶│  NestJS API     │────▶│ PostgreSQL │
│ (Kotlin +   │     │  Reverse    │     │  (Fastify)      │     │  (Prisma)  │
│  Compose)   │     │  Proxy      │     │                 │     │            │
└─────────────┘     │  :3535      │     │  /api/*         │     │  30+ tables│
                    │             │     └─────────────────┘     └────────────┘
┌─────────────┐     │             │
│ React Web   │────▶│  /*         │
│ (MUI)       │     └─────────────┘
└─────────────┘
```

## Tech Stack

### Backend
| Technology | Purpose |
|-----------|---------|
| Node.js + TypeScript | Runtime |
| NestJS + Fastify | API framework |
| PostgreSQL + Prisma | Database + ORM |
| Passport.js | Google OAuth 2.0 |
| JWT | Authentication tokens |
| Zod | Request validation |
| OpenTelemetry + Pino | Observability and structured logging |

### Frontend
| Technology | Purpose |
|-----------|---------|
| React + TypeScript | Web UI |
| Material UI (MUI) | Component library |

### Android
| Technology | Purpose |
|-----------|---------|
| Kotlin 2.1 | Language |
| Jetpack Compose | UI framework |
| Hilt | Dependency injection |
| Health Connect SDK | Biometric data access |
| Room | Local offline sync queue |
| Retrofit + Moshi | API client |
| WorkManager | Background sync scheduling |

### Infrastructure
| Technology | Purpose |
|-----------|---------|
| Docker + Docker Compose | Containerization |
| Nginx | Reverse proxy |
| Uptrace + OTEL Collector | Observability |

## Getting Started

### Prerequisites
- Node.js 18+
- Docker Desktop
- Google OAuth credentials

### Quick Start

```bash
# 1. Clone the repo
git clone <repo-url> && cd vitalmesh

# 2. Set up environment
cp infra/compose/.env.example infra/compose/.env
# Edit .env with your Google OAuth credentials and JWT secret

# 3. Start development stack
cd infra/compose && docker compose -f base.compose.yml -f dev.compose.yml up

# 4. Access the app
# Web UI:    http://localhost:3535
# API Docs:  http://localhost:3535/api/docs
```

### Android App Setup

```bash
# Open in Android Studio
# File > Open > select the `android/` directory
# Wait for Gradle sync, then Run

# Or build from CLI
cd android && ./gradlew assembleDebug
```

See [docs/ANDROID.md](docs/ANDROID.md) for full Android setup instructions, including Health Connect emulator setup, device URL configuration, and debugging.

## API Endpoints

### Authentication
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/auth/providers` | List enabled OAuth providers (Public) |
| GET | `/api/auth/google` | Initiate Google OAuth |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/logout` | Logout and invalidate session |
| POST | `/api/auth/logout-all` | Logout from all devices |
| GET | `/api/auth/me` | Get current user |

### Device Authorization (RFC 8628)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/device/code` | Generate device code (Public) |
| POST | `/api/auth/device/token` | Poll for authorization (Public) |
| GET | `/api/auth/device/activate` | Get activation info |
| POST | `/api/auth/device/authorize` | Approve or deny device |
| GET | `/api/auth/device/sessions` | List active device sessions |
| DELETE | `/api/auth/device/sessions/{id}` | Revoke device session |

### Health Data Sync
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/health-data/metrics` | Batch upsert time-series metrics (max 500) |
| POST | `/api/health-data/sleep` | Batch upsert sleep sessions and stages |
| POST | `/api/health-data/exercise` | Batch upsert exercise sessions |
| POST | `/api/health-data/nutrition` | Batch upsert nutrition entries |
| POST | `/api/health-data/cycle` | Batch upsert cycle tracking events |
| POST | `/api/health-data/labs` | Batch upsert lab results |
| GET | `/api/health-data/sync/state` | Get sync state per data type |
| PUT | `/api/health-data/sync/state` | Update sync state |

### Health Data Query
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health-data/metrics` | Query metrics (filterable, paginated) |
| GET | `/api/health-data/metrics/grouped` | Query grouped metrics (e.g., BP pairs) |
| GET | `/api/health-data/summary` | Aggregated dashboard data |
| GET | `/api/health-data/sleep` | Query sleep sessions with stages |
| GET | `/api/health-data/exercise` | Query exercise sessions |
| GET | `/api/health-data/nutrition` | Query nutrition entries |
| GET | `/api/health-data/cycle` | Query cycle events |
| GET | `/api/health-data/labs` | Query lab results |
| PATCH | `/api/health-data/:table/:id` | Update a health record |
| GET | `/api/health-data/:table/:id/revisions` | Get revision history |
| DELETE | `/api/health-data/metrics` | Delete metrics by type and time range |

### Additional Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET/POST/PATCH/DELETE | `/api/health-data/mood-scales/*` | Mood scale definitions |
| GET/POST/PATCH/DELETE | `/api/health-data/sessions/*` | Record grouping sessions |
| GET/POST/DELETE | `/api/health-data/:table/:id/attachments` | Media attachments |
| GET/POST/PATCH/DELETE | `/api/health-data/:table/:id/comments` | Notes and comments |
| GET/PATCH/DELETE | `/api/devices/*` | Device management |
| GET/PATCH/PUT | `/api/users/*` | User management (Admin) |
| GET/PUT/PATCH | `/api/user-settings` | User preferences |
| GET/PUT/PATCH | `/api/system-settings` | System configuration (Admin) |
| GET/POST/DELETE | `/api/allowlist/*` | Email allowlist management (Admin) |
| POST/GET/DELETE | `/api/storage/objects/*` | File storage |
| GET | `/api/health/live` | Liveness check |
| GET | `/api/health/ready` | Readiness check (includes DB) |

## Health Data Types

VitalMesh ingests 50+ Health Connect record types:

| Category | Types |
|----------|-------|
| **Activity** | Steps, Distance, Calories (Active/Total), Elevation, Floors, Wheelchair Pushes |
| **Body** | Weight, Height, Body Fat, Bone Mass, Lean Body Mass, Body Water, BMR, Waist/Hip Circumference |
| **Vitals** | Heart Rate (series), Resting HR, HRV, Blood Pressure, Blood Glucose, SpO2, Respiratory Rate, Body Temperature, VO2 Max |
| **Sleep** | Sessions with stages (Awake, Light, Deep, REM, Out of Bed) |
| **Exercise** | 80+ exercise types with segments, laps, and GPS routes |
| **Nutrition** | Meals with 40+ nutrient fields |
| **Cycle** | Menstruation, Ovulation, Cervical Mucus, Intermenstrual Bleeding, Sexual Activity |
| **Series** | Heart Rate, Speed, Power, Steps Cadence, Cycling Cadence, Skin Temperature |

## RBAC Model

| Role | Permissions |
|------|------------|
| **Admin** | Full access: users, system settings, RBAC, allowlist, all health data |
| **Contributor** | Own health data (read/write/delete), own settings, storage |
| **Viewer** | Own health data (read only), own settings |

## Database

30+ PostgreSQL tables managed by Prisma ORM:

- **Core**: `users`, `user_identities`, `roles`, `permissions`, `user_roles`, `role_permissions`
- **Auth**: `refresh_tokens`, `device_codes`, `allowed_emails`
- **Settings**: `system_settings`, `user_settings`
- **Health Data**: `health_metrics`, `health_sleep_sessions`, `health_sleep_stages`, `health_exercise_sessions`, `health_nutrition`, `health_cycle_events`, `health_lab_results`
- **Health Features**: `health_mood_scales`, `health_sessions`, `health_session_records`, `health_record_attachments`, `health_record_comments`, `health_record_revisions`
- **Infrastructure**: `user_devices`, `health_data_sources`, `health_sync_state`
- **Storage**: `storage_objects`, `storage_object_chunks`
- **Audit**: `audit_events`

## Key Commands

```bash
# Development stack
cd infra/compose && docker compose -f base.compose.yml -f dev.compose.yml up

# With observability (Uptrace at http://localhost:14318)
cd infra/compose && docker compose -f base.compose.yml -f dev.compose.yml -f otel.compose.yml up

# Production stack
cd infra/compose && docker compose -f base.compose.yml -f prod.compose.yml up

# API tests
cd apps/api && npm test

# Web tests
cd apps/web && npm test

# Prisma: generate client after schema changes
cd apps/api && npm run prisma:generate

# Prisma: create a migration
cd apps/api && npm run prisma:migrate:dev -- --name <migration_name>

# Prisma: apply migrations (production)
cd apps/api && npm run prisma:migrate

# Android: debug build
cd android && ./gradlew assembleDebug

# Android: install on connected device
cd android && ./gradlew installDebug

# Android: run unit tests
cd android && ./gradlew test
```

## Service URLs (Development)

| Service | URL |
|---------|-----|
| Web UI | http://localhost:3535 |
| API | http://localhost:3535/api |
| Swagger UI | http://localhost:3535/api/docs |
| Uptrace (observability) | http://localhost:14318 |

## Documentation

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | System architecture and design decisions |
| [DEVELOPMENT.md](docs/DEVELOPMENT.md) | Development setup and patterns |
| [ANDROID.md](docs/ANDROID.md) | Android app build, debug, and test guide |
| [API.md](docs/API.md) | API reference documentation |
| [SECURITY-ARCHITECTURE.md](docs/SECURITY-ARCHITECTURE.md) | Security model and threat analysis |
| [TESTING.md](docs/TESTING.md) | Testing framework and conventions |
| [DEVICE-AUTH.md](docs/DEVICE-AUTH.md) | RFC 8628 device authorization flow |

## License

Private - All rights reserved.
