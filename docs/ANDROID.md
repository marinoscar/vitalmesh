# Android App - Development Guide

This document covers everything a developer needs to build, run, debug, and extend the VitalMesh Android app.

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Project Setup](#2-project-setup)
3. [Building & Running](#3-building--running)
4. [Architecture Overview](#4-architecture-overview)
5. [Key Components](#5-key-components)
6. [Health Connect Integration](#6-health-connect-integration)
7. [Authentication Flow](#7-authentication-flow)
8. [Sync Engine](#8-sync-engine)
9. [Debugging](#9-debugging)
10. [Testing](#10-testing)
11. [Common Issues & Solutions](#11-common-issues--solutions)

---

## 1. Prerequisites

### Required Tools

| Tool | Version | Notes |
|------|---------|-------|
| Android Studio | Ladybug (2024.2) or newer | Required for Compose tooling |
| JDK | 17 | Configured via Android Studio settings |
| Android SDK | 35 (API 35) | compileSdk and targetSdk |
| Kotlin | 2.1.10 | Set in project-level `build.gradle.kts` |
| KSP | 2.1.10-1.0.31 | Must match Kotlin version exactly |

### Device Requirements

- Android 9 (API 28) or higher — this is `minSdk`
- Health Connect installed (built into Android 14+; install from Play Store on Android 9-13)
- Google Play Services (required for Health Connect on older APIs)

### API Server

The app communicates with the VitalMesh API. For local development:

- Docker stack must be running (see [main README](../README.md))
- Default URL from emulator: `http://10.0.2.2:3535/api`
- Default URL from physical device: your machine's LAN IP, e.g. `http://192.168.1.x:3535/api`

---

## 2. Project Setup

### Step 1 — Open the project

Open the `android/` subdirectory (not the repo root) in Android Studio:

```
File > Open > [repo-root]/android
```

Android Studio will detect `build.gradle.kts` and begin Gradle sync automatically.

### Step 2 — Wait for Gradle sync

First sync downloads all dependencies and may take several minutes. Subsequent syncs are faster. If sync fails, see [Gradle Sync Fails](#gradle-sync-fails).

### Step 3 — Configure API base URL (if needed)

The default `API_BASE_URL` is set in `app/build.gradle.kts`:

```kotlin
buildConfigField("String", "API_BASE_URL", "\"http://10.0.2.2:3535/api\"")
```

- `10.0.2.2` is the special emulator loopback address for the host machine's `localhost`
- For a physical device, change this to your machine's LAN IP before building

### Step 4 — Verify the API server is running

```bash
# From repo root — start the full Docker stack
cd infra/compose
docker compose -f base.compose.yml -f dev.compose.yml up
```

Confirm the API is reachable:

```bash
curl http://localhost:3535/api/health/live
```

---

## 3. Building & Running

### Debug Build (command line)

```bash
cd android
./gradlew assembleDebug
```

APK output: `app/build/outputs/apk/debug/app-debug.apk`

### Install on Connected Device

```bash
cd android
./gradlew installDebug
```

Requires a device connected via USB with USB debugging enabled, or a running emulator.

### Run from Android Studio

1. Select a device or emulator from the toolbar dropdown
2. Click Run (green play button) or press **Shift+F10**

### Release Build

```bash
cd android
./gradlew assembleRelease
```

A signing configuration is required before the release build will be installable. Signing is not yet set up in this project.

### Clean Build

If you encounter stale build artifacts:

```bash
cd android
./gradlew clean assembleDebug
```

---

## 4. Architecture Overview

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Language | Kotlin |
| UI | Jetpack Compose + Material Design 3 |
| Dependency Injection | Hilt (Dagger) |
| Local Database | Room 2.6.1 |
| Networking | Retrofit 2.11.0 + OkHttp 4.12.0 + Moshi 1.15.2 |
| Background Jobs | WorkManager 2.10.0 |
| Health Data | Health Connect SDK 1.1.0-alpha13 |
| Charts | Vico 2.1.2 (compose-m3) |
| Token Storage | EncryptedSharedPreferences |
| Browser Auth | AndroidX Browser 1.8.0 (Custom Tabs) |

### Package Structure

```
com.vitalmesh.app/
├── di/                          # Hilt modules
│   ├── NetworkModule            # Moshi, OkHttpClient, Retrofit, API interfaces
│   ├── DatabaseModule           # Room database instance, DAOs
│   └── HealthConnectModule      # HealthConnectManager
│
├── data/
│   ├── local/
│   │   ├── db/                  # Room: SyncQueueEntry, SyncQueueDao, VitalMeshDatabase
│   │   └── preferences/         # TokenManager (encrypted token storage)
│   ├── remote/
│   │   ├── api/                 # Retrofit interfaces: AuthApi, HealthDataApi
│   │   │   └── dto/             # API request/response data classes
│   │   └── interceptor/         # AuthInterceptor (Bearer token injection + refresh)
│   ├── healthconnect/           # HealthConnectManager, RecordMapper
│   └── repository/              # AuthRepository, HealthDataRepository
│
├── domain/model/                # Domain models: User, HealthMetricRecord, SyncState, HealthSummary
│
├── sync/                        # SyncManager (orchestration), SyncWorker (WorkManager)
│
└── ui/
    ├── navigation/              # Screen route definitions, NavHost
    ├── theme/                   # M3 colors, typography, dynamic color support
    ├── screens/                 # Screen composables + ViewModels
    │   ├── onboarding/
    │   ├── auth/
    │   ├── permissions/
    │   ├── dashboard/
    │   ├── detail/
    │   ├── sync/
    │   ├── settings/
    │   └── profile/
    └── components/              # Shared composables (e.g. HealthCard)
```

### Application Entry Point

`VitalMeshApp` extends `Application` and implements `Configuration.Provider` to wire Hilt into WorkManager:

```kotlin
@HiltAndroidApp
class VitalMeshApp : Application(), Configuration.Provider {

    @Inject
    lateinit var workerFactory: HiltWorkerFactory

    override val workManagerConfiguration: Configuration
        get() = Configuration.Builder()
            .setWorkerFactory(workerFactory)
            .build()
}
```

WorkManager initialization is handled manually (the default `WorkManagerInitializer` is removed from the manifest) so Hilt-injected workers function correctly.

### Data Flow Diagram

```
Health Connect SDK
      |
      v
HealthConnectManager  ---reads--->  RecordMapper
                                        |
                                        v
                                    SyncManager  ---HTTP POST--->  VitalMesh API
                                        |
                                   (on failure)
                                        v
                                  SyncQueueDao (Room)
                                        |
                              (next WorkManager run)
                                        v
                                   SyncWorker  ---HTTP POST--->  VitalMesh API
```

---

## 5. Key Components

### Dependency Injection (Hilt)

Hilt modules live in `di/` and are annotated with `@Module` + `@InstallIn`.

| Module | Provides |
|--------|---------|
| `NetworkModule` | `Moshi`, `OkHttpClient` (with `AuthInterceptor`), `Retrofit`, `AuthApi`, `HealthDataApi` |
| `DatabaseModule` | `VitalMeshDatabase`, `SyncQueueDao` |
| `HealthConnectModule` | `HealthConnectManager` |

### AuthInterceptor

Located at `data/remote/interceptor/AuthInterceptor.kt`. Runs on every outbound HTTP request:

1. Reads the current access token from `TokenManager`
2. Attaches `Authorization: Bearer <token>` header
3. On 401 response, attempts a token refresh via `AuthApi`
4. On successful refresh, retries the original request once
5. On failed refresh, clears stored tokens and signals the UI to re-authenticate

### TokenManager

Located at `data/local/preferences/TokenManager.kt`. Uses `EncryptedSharedPreferences` backed by the Android Keystore to store access and refresh tokens at rest.

### Navigation

Screen routes are defined as sealed classes or string constants in `ui/navigation/`. The top-level `NavHost` in `MainActivity` handles all navigation transitions. Navigation is driven by ViewModel state — screens emit navigation events that the composable layer observes.

---

## 6. Health Connect Integration

### How Permissions Work

All Health Connect read permissions are declared in `AndroidManifest.xml` under `<uses-permission>`. The app currently requests 44 permissions across these categories:

| Category | Permissions |
|----------|------------|
| Activity | Steps, distance, elevation, floors, active/total calories, speed, power, cadence, wheelchair pushes, exercise |
| Body Metrics | Weight, height, body fat, bone mass, lean body mass, body water mass, BMR, waist/hip circumference |
| Vitals | Heart rate, resting heart rate, HRV, blood pressure, blood glucose, SpO2, respiratory rate, body/skin/basal temperature, VO2 max |
| Sleep | Sleep sessions and stages |
| Nutrition | Nutrition records, hydration |
| Cycle Tracking | Menstruation, cervical mucus, ovulation test, intermenstrual bleeding, sexual activity, basal body temperature |
| Background / History | Background data reads, historical data access |
| Mindfulness | Mindfulness sessions, planned exercise |

The `MainActivity` declares the `androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE` intent filter and the `health_permissions` metadata resource, which Health Connect uses to display the permissions rationale screen.

### Requesting Permissions at Runtime

`HealthConnectManager` wraps `HealthConnectClient` and provides a `requestPermissions()` method. The permissions screen composable in `ui/screens/permissions/` calls this method and handles the result.

### Reading Health Data

`HealthConnectManager` exposes typed read functions that return Health Connect record objects. These are passed to `RecordMapper` for conversion to API DTOs.

### RecordMapper

`RecordMapper.kt` converts Health Connect record types to API request DTOs:

| Source Type | Output | Notes |
|-------------|--------|-------|
| 18 instantaneous record types | `SyncMetricItem` | Single timestamp |
| 8 interval record types | `SyncMetricItem` | `startTime` + `endTime` |
| 6 series record types | Multiple `SyncMetricItem` per record | One item per sample |
| `SleepSessionRecord` | `SyncSleepSession` + stages | Stages mapped separately |
| `ExerciseSessionRecord` | `SyncExerciseSession` + segments/laps/route | Full session detail |
| `NutritionRecord` | `SyncNutritionEntry` | 17 nutrient fields mapped |
| 6 cycle tracking types | `SyncCycleEvent` | Typed event per record |

### Setting Up Health Connect on an Emulator

1. Create an AVD with API 28 or higher and Google Play Store enabled
2. On API 28-33: install Health Connect from the Play Store inside the emulator
3. On API 34+: Health Connect is built into the OS
4. Open Health Connect, accept the terms of service
5. Install a health data producer (e.g. Google Fit, Samsung Health) to generate test data, or write a small test app that inserts records directly via the Health Connect SDK

Health Connect does not support inserting data via `adb shell` commands. The SDK write API from within an app is the only supported path for creating test data.

### Checking SDK Availability

Before making any Health Connect calls, `HealthConnectManager` checks availability:

```kotlin
val status = HealthConnectClient.getSdkStatus(context)
// SDK_AVAILABLE, SDK_UNAVAILABLE, or SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED
```

`SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED` means Health Connect is present but outdated — prompt the user to update it from the Play Store.

---

## 7. Authentication Flow

The app uses RFC 8628 Device Authorization Grant, which avoids embedding OAuth credentials in the APK and delegates the browser-based sign-in to the user's existing session on their phone or desktop.

### Flow Steps

```
1. App calls POST /api/auth/device/code
        |
        v
2. Server returns:
   - userCode      (e.g. "ABCD-1234")
   - verificationUri  (e.g. "https://yourdomain.com/activate")
   - deviceCode    (opaque, kept by app)
   - expiresIn / interval
        |
        v
3. App shows the userCode + "Open in Browser" button
        |
        v
4. User opens verificationUri in Chrome Custom Tab,
   signs in with Google, enters the userCode
        |
        v
5. App polls POST /api/auth/device/token every 5 seconds
        |
   (authorization_pending) -----> keep polling
        |
   (success)
        v
6. Server returns accessToken + refreshToken
        |
        v
7. Tokens saved to EncryptedSharedPreferences via TokenManager
        |
        v
8. AuthInterceptor injects Bearer token on all subsequent requests
```

### Token Refresh

`AuthInterceptor` handles refresh transparently. On any 401 response:

1. Calls `POST /api/auth/refresh` with the stored refresh token
2. If successful, updates stored tokens and retries the original request
3. If the refresh token is expired or invalid, clears all tokens and navigates to the auth screen

### Debugging Auth Issues

- Filter Logcat by tag `AuthRepository` to see device code requests, polling results, and token storage events
- Verify the Docker stack is running and reachable from the device/emulator
- Emulator must use `http://10.0.2.2:3535/api` — not `localhost` or `127.0.0.1`
- Physical device must use the host machine's LAN IP and both must be on the same network
- Clear app data to force re-authentication: `adb shell pm clear com.vitalmesh.app`

---

## 8. Sync Engine

### Overview

The sync engine reads health data from Health Connect and uploads it to the VitalMesh API. It operates in two modes: scheduled background sync via WorkManager and on-demand manual sync triggered by the user.

### WorkManager Schedule

`SyncWorker` is scheduled as a periodic task with a 15-minute minimum interval. The actual execution interval may be longer depending on battery optimization and Doze mode.

The app uses manual `Configuration.Provider` initialization (via `VitalMeshApp`) so that `SyncWorker` can receive Hilt-injected dependencies.

### Sync Sequence

```
SyncWorker.doWork()
    |
    v
1. Process offline queue (retry failed items from Room sync_queue table)
    |
    v
2. Read last 30 days of data from Health Connect
    |
    v
3. RecordMapper converts records to API DTOs
    |
    v
4. Batch upload:
   - Metrics:  500 records per POST /api/health-data/sync/metrics
   - Sessions: 100 records per POST /api/health-data/sync/sessions
    |
   (success) --> done
   (failure)
    |
    v
5. Serialize failed payload to JSON
    |
    v
6. Insert into Room sync_queue with status=pending
```

### Offline Queue Schema

The `sync_queue` Room table stores failed sync payloads for retry:

| Column | Type | Description |
|--------|------|-------------|
| `id` | Long (PK) | Auto-increment |
| `status` | String | `pending`, `sending`, `failed` |
| `payload` | String | JSON of the original request body |
| `retry_count` | Int | Incremented on each failed retry |
| `created_at` | Long | Unix timestamp |
| `last_attempted_at` | Long | Timestamp of most recent attempt |

Entries are deleted on successful upload. There is no upper bound on retry count by default — entries accumulate until the upload succeeds.

### Triggering Manual Sync

Users can initiate a sync from:

- Pull-to-refresh on the Dashboard screen (planned)
- "Sync Now" button on the Sync Status screen

Manual syncs call `SyncManager` directly, bypassing WorkManager scheduling.

### Debugging Sync

```bash
# Stream sync-related log tags
adb logcat -s SyncManager:V SyncWorker:V

# Check WorkManager job scheduler state
adb shell dumpsys jobscheduler | grep vitalmesh

# Inspect Room database via Android Studio
# View > Tool Windows > App Inspection > Database Inspector
# Select the running app process, then open the sync_queue table
```

---

## 9. Debugging

### Logcat Tags

| Tag | Component |
|-----|-----------|
| `SyncManager` | Sync orchestration, batching, queue management |
| `SyncWorker` | WorkManager execution lifecycle |
| `AuthRepository` | Device code request, polling, token storage |
| `HealthConnectManager` | Permission checks, SDK availability, data reads |

Filter in Android Studio Logcat by entering a tag in the search box, e.g. `tag:SyncManager`.

### OkHttp Network Logging

In debug builds, OkHttp logging is enabled at `BODY` level. Every request URL, headers, and response body appear in Logcat under the `OkHttp` tag. This is disabled in release builds.

Use Android Studio's **Network Inspector** for a structured visual view:

```
View > Tool Windows > App Inspection > Network Inspector
```

### Android Studio Developer Tools

| Tool | Location | Use For |
|------|----------|---------|
| Layout Inspector | Tools > Layout Inspector | Compose layout hierarchy, recomposition counts |
| Database Inspector | App Inspection > Database Inspector | Live browse of Room tables, run SQL queries |
| Network Inspector | App Inspection > Network Inspector | HTTP traffic timeline, request/response viewer |
| Profiler | View > Tool Windows > Profiler | CPU, memory, energy, and network profiling |

### Common adb Commands

```bash
# Stream app logs
adb logcat -s VitalMesh:* SyncManager:* SyncWorker:* AuthRepository:*

# Clear all app data and storage (forces re-login and permission re-grant)
adb shell pm clear com.vitalmesh.app

# Force stop the app
adb shell am force-stop com.vitalmesh.app

# Open Health Connect settings
adb shell am start -a android.health.connect.action.HEALTH_HOME_SETTINGS

# List granted permissions for the app
adb shell dumpsys package com.vitalmesh.app | grep health

# Install a debug APK manually
adb install -r app/build/outputs/apk/debug/app-debug.apk

# View WorkManager job state
adb shell dumpsys jobscheduler | grep vitalmesh
```

---

## 10. Testing

### Unit Tests (JVM)

```bash
cd android
./gradlew test
```

Unit tests run on the JVM without a device. They are located in `app/src/test/`.

### Instrumentation Tests (Device)

```bash
cd android
./gradlew connectedAndroidTest
```

Requires a connected device or running emulator. Tests are located in `app/src/androidTest/`.

### Planned Test Structure

```
app/src/test/                    # JVM unit tests
  viewmodel/                     # ViewModel tests with mocked repositories
  repository/                    # Repository tests with mocked Retrofit/OkHttp
  mapper/                        # RecordMapper conversion tests

app/src/androidTest/             # Instrumentation tests (on device)
  ui/                            # Compose UI tests (createComposeRule)
  db/                            # Room DAO tests (in-memory database)
```

### Testing Tips

**Hilt in tests:**

Use `@HiltAndroidTest` + `HiltAndroidRule` for instrumentation tests that need DI:

```kotlin
@HiltAndroidTest
class MyRepositoryTest {
    @get:Rule val hiltRule = HiltAndroidRule(this)
    // ...
}
```

**Health Connect mocking:**

`HealthConnectClient` is an interface. Provide a mock via Hilt test module to avoid requiring a real device with Health Connect installed.

**Room in-memory database:**

For DAO tests, build the database with `Room.inMemoryDatabaseBuilder()` so the test database is isolated and cleaned up automatically.

**Compose UI tests:**

```kotlin
@get:Rule val composeTestRule = createComposeRule()

@Test
fun dashboardShowsMetrics() {
    composeTestRule.setContent {
        DashboardScreen(viewModel = fakeViewModel)
    }
    composeTestRule.onNodeWithText("Steps").assertIsDisplayed()
}
```

**WorkManager tests:**

Use `TestListenableWorkerBuilder` from `work-testing` to run a worker directly without the WorkManager scheduler:

```kotlin
val worker = TestListenableWorkerBuilder<SyncWorker>(context).build()
val result = worker.doWork()
assertThat(result).isInstanceOf(ListenableWorker.Result.Success::class.java)
```

---

## 11. Common Issues & Solutions

### "Health Connect not available"

**Symptom:** App shows an error on the permissions screen or `HealthConnectManager` returns `SDK_UNAVAILABLE`.

**Causes and fixes:**
- Emulator API < 28 — create an AVD with API 28+
- Health Connect not installed — install from Play Store (required on API 28-33)
- Health Connect outdated — `SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED` — update from Play Store
- No Google Play Services on emulator — use an AVD image that includes Play Store

### "Network error" / "Connection refused"

**Symptom:** Auth polling or health data upload fails with a network error.

**Fixes by device type:**

| Device | Correct API_BASE_URL |
|--------|---------------------|
| Emulator | `http://10.0.2.2:3535/api` |
| Physical device (USB) | `http://<host-LAN-IP>:3535/api` |
| Physical device (same Wi-Fi) | `http://<host-LAN-IP>:3535/api` |

Do not use `localhost` or `127.0.0.1` from an emulator or physical device — these resolve to the device itself, not the host machine.

Confirm the Docker stack is running:

```bash
docker compose -f infra/compose/base.compose.yml -f infra/compose/dev.compose.yml ps
```

### "Authorization failed" / 401 Errors

**Symptom:** API calls return 401 after the user was previously logged in.

**Fixes:**
- Access tokens expire after 15 minutes — `AuthInterceptor` should refresh automatically; check Logcat for refresh errors
- Refresh token may be expired (default: 14 days) — clear app data and re-authenticate
- Server may have been restarted with a new `JWT_SECRET` — clear app data

```bash
adb shell pm clear com.vitalmesh.app
```

### Gradle Sync Fails

**Symptom:** Android Studio shows Gradle sync errors on project open.

**Fixes in order:**

1. Confirm JDK 17 is selected:
   `File > Settings > Build, Execution, Deployment > Build Tools > Gradle > Gradle JDK`

2. Invalidate caches:
   `File > Invalidate Caches > Invalidate and Restart`

3. Stop the Gradle daemon and clean:
   ```bash
   cd android
   ./gradlew --stop
   ./gradlew clean
   ```

4. Check for KSP/Kotlin version mismatch (see next section).

### Build Errors: KSP / Kotlin Version Mismatch

KSP must match the Kotlin version exactly. The correct versions are pinned in `build.gradle.kts`:

```kotlin
// Project-level build.gradle.kts
id("org.jetbrains.kotlin.android") version "2.1.10"
id("com.google.devtools.ksp")      version "2.1.10-1.0.31"
```

If you update Kotlin, update the KSP version to match. Check current KSP releases at https://github.com/google/ksp/releases.

### Compose Compiler Errors

The Compose Compiler plugin version must match the Kotlin version:

```kotlin
id("org.jetbrains.kotlin.plugin.compose") version "2.1.10"
```

This is already wired correctly. If you see Compose-related compilation errors after a Kotlin upgrade, update this plugin version to match.

### Health Connect Permissions Not Persisting After Reinstall

Health Connect permissions are tied to the app installation. Uninstalling and reinstalling the app resets all granted permissions. Users must go through the permissions screen again after a fresh install.

To check which Health Connect permissions are currently granted:

```bash
adb shell dumpsys package com.vitalmesh.app | grep health
```

### WorkManager Not Executing

**Symptom:** `SyncWorker` does not run on schedule.

**Fixes:**
- Battery optimization may be delaying or preventing execution — go to device Settings > Battery > Battery Optimization and set VitalMesh to "Not optimized"
- Doze mode restricts background execution — connect the device to power or use `adb shell dumpsys deviceidle disable` during development
- Check that WorkManager enqueued successfully:
  ```bash
  adb shell dumpsys jobscheduler | grep vitalmesh
  ```

### Room Database Schema Mismatch

**Symptom:** App crashes on launch with `Room database schema mismatch`.

**Cause:** The Room database schema was changed without providing a migration.

**Fix for development:** Uninstall the app (which deletes the database) and reinstall:

```bash
adb shell pm clear com.vitalmesh.app
./gradlew installDebug
```

For production releases, always provide a `Migration` object or enable `fallbackToDestructiveMigration()` (destroys existing data — only appropriate during development).

---

## Resources

- [Health Connect documentation](https://developer.android.com/health-and-fitness/guides/health-connect)
- [Jetpack Compose documentation](https://developer.android.com/develop/ui/compose/documentation)
- [Hilt documentation](https://dagger.dev/hilt/)
- [Room documentation](https://developer.android.com/training/data-storage/room)
- [WorkManager documentation](https://developer.android.com/topic/libraries/architecture/workmanager)
- [RFC 8628 — OAuth Device Authorization Grant](https://www.rfc-editor.org/rfc/rfc8628)
- [VitalMesh API Reference](./API.md)
- [VitalMesh Architecture](./ARCHITECTURE.md)
- [VitalMesh Security](./SECURITY.md)
