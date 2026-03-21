package com.vitalmesh.app.sync

import android.os.Build
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.*
import com.vitalmesh.app.data.healthconnect.HealthConnectManager
import com.vitalmesh.app.data.healthconnect.RecordMapper
import com.vitalmesh.app.data.local.db.dao.CachedDailySummaryDao
import com.vitalmesh.app.data.local.db.dao.SyncHistoryDao
import com.vitalmesh.app.data.local.db.dao.SyncQueueDao
import com.vitalmesh.app.data.local.db.dao.SyncStateLocalDao
import com.vitalmesh.app.data.local.db.entity.CachedDailySummary
import com.vitalmesh.app.data.local.db.entity.SyncHistoryEntry
import com.vitalmesh.app.data.local.db.entity.SyncStateLocal
import com.vitalmesh.app.data.local.logging.AppLogger
import com.vitalmesh.app.data.local.preferences.SyncPreferences
import com.vitalmesh.app.data.remote.api.dto.*
import com.vitalmesh.app.data.repository.HealthDataRepository
import com.squareup.moshi.Moshi
import kotlinx.coroutines.flow.first
import java.time.Instant
import java.time.LocalDate
import java.time.temporal.ChronoUnit
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SyncManager @Inject constructor(
    private val healthConnectManager: HealthConnectManager,
    private val healthDataRepository: HealthDataRepository,
    private val syncQueueDao: SyncQueueDao,
    private val syncStateLocalDao: SyncStateLocalDao,
    private val syncHistoryDao: SyncHistoryDao,
    private val cachedDailySummaryDao: CachedDailySummaryDao,
    private val syncPreferences: SyncPreferences,
    private val moshi: Moshi,
    private val appLogger: AppLogger,
) {
    companion object {
        private const val TAG = "SyncManager"
        private const val MAX_METRICS_PER_BATCH = 500
        private const val MAX_SESSIONS_PER_BATCH = 100
        private const val BUFFER_MINUTES = 1L
    }

    private val syncSource: SyncSource by lazy {
        SyncSource(
            deviceName = "${Build.MANUFACTURER} ${Build.MODEL}",
            deviceModel = Build.MODEL,
            deviceManufacturer = Build.MANUFACTURER,
            deviceOs = "Android ${Build.VERSION.RELEASE}",
            deviceType = "phone",
            appVersion = "1.0.0",
        )
    }

    /**
     * Returns the start time for reading HC data for a given data type.
     * If we have a previous sync, starts from lastRecordTimestamp + buffer.
     * Otherwise falls back to now - rangeDays.
     */
    private suspend fun getStartTimeForType(dataType: String, rangeDays: Int): Instant {
        val state = syncStateLocalDao.getByType(dataType)
        if (state?.lastRecordTimestamp != null) {
            // Start from last known record + 1 min buffer to avoid duplicates
            val resumeTime = Instant.ofEpochMilli(state.lastRecordTimestamp)
                .minus(BUFFER_MINUTES, ChronoUnit.MINUTES)
            appLogger.d(TAG, "Differential sync for $dataType: resuming from $resumeTime")
            return resumeTime
        }
        // First sync: use configured range
        val start = if (rangeDays == -1) {
            Instant.EPOCH
        } else {
            Instant.now().minus(rangeDays.toLong(), ChronoUnit.DAYS)
        }
        appLogger.d(TAG, "First sync for $dataType: reading last $rangeDays days")
        return start
    }

    /**
     * Updates local sync state after a successful batch.
     */
    private suspend fun updateSyncState(dataType: String, latestTimestamp: Long, count: Int) {
        val existing = syncStateLocalDao.getByType(dataType)
        if (existing != null) {
            syncStateLocalDao.updateAfterSync(
                dataType = dataType,
                syncedAt = System.currentTimeMillis(),
                lastRecordTimestamp = maxOf(existing.lastRecordTimestamp ?: 0, latestTimestamp),
                count = count.toLong(),
            )
        } else {
            syncStateLocalDao.upsert(
                SyncStateLocal(
                    dataType = dataType,
                    lastSyncAt = System.currentTimeMillis(),
                    lastRecordTimestamp = latestTimestamp,
                    recordsSynced = count.toLong(),
                )
            )
        }
    }

    /**
     * Main sync entry point. Uses differential sync based on local sync state.
     */
    suspend fun performSync(): SyncReport {
        val report = SyncReport()
        val syncStartTime = System.currentTimeMillis()
        appLogger.i(TAG, "Starting sync")

        // Record sync history entry
        val historyId = syncHistoryDao.insert(
            SyncHistoryEntry(startedAt = syncStartTime)
        )

        val available = healthConnectManager.isAvailable()
        appLogger.i(TAG, "Health Connect available: $available")
        if (!available) {
            appLogger.w(TAG, "Health Connect not available, aborting sync")
            report.errors.add("Health Connect not available")
            completeSyncHistory(historyId, syncStartTime, report)
            return report
        }

        val grantedPermissions = healthConnectManager.getGrantedPermissions()
        appLogger.i(TAG, "Granted permissions: ${grantedPermissions.size}")
        if (grantedPermissions.isEmpty()) {
            appLogger.w(TAG, "No Health Connect permissions granted.")
            report.errors.add("No Health Connect permissions granted. Go to Settings and grant access.")
            completeSyncHistory(historyId, syncStartTime, report)
            return report
        }

        val rangeDays = syncPreferences.syncRangeDaysFlow.first()
        val endTime = Instant.now()

        try {
            syncMetricRecords(rangeDays, endTime, report, grantedPermissions)
            syncSleepRecords(rangeDays, endTime, report, grantedPermissions)
            syncExerciseRecords(rangeDays, endTime, report, grantedPermissions)
            syncNutritionRecords(rangeDays, endTime, report, grantedPermissions)
            syncCycleRecords(rangeDays, endTime, report, grantedPermissions)
        } catch (e: Exception) {
            appLogger.e(TAG, "Sync failed", e)
            report.errors.add("Sync failed: ${e.message}")
        }

        // Cache today's summary from API
        try {
            cacheTodaySummary()
        } catch (e: Exception) {
            appLogger.w(TAG, "Failed to cache summary after sync", e)
        }

        completeSyncHistory(historyId, syncStartTime, report)
        appLogger.i(TAG, "Sync complete: ${report.totalSynced} synced, ${report.errors.size} errors")
        return report
    }

    /**
     * Backward-compatible alias.
     */
    suspend fun performFullSync(): SyncReport = performSync()

    private suspend fun completeSyncHistory(historyId: Long, startTime: Long, report: SyncReport) {
        val now = System.currentTimeMillis()
        val status = when {
            report.errors.isEmpty() && report.totalSynced > 0 -> "success"
            report.errors.isEmpty() && report.totalSynced == 0 -> "success"
            report.totalSynced > 0 && report.errors.isNotEmpty() -> "partial"
            else -> "failed"
        }
        syncHistoryDao.complete(
            id = historyId,
            completedAt = now,
            recordsSynced = report.totalSynced,
            recordsFailed = report.errors.size,
            errors = if (report.errors.isNotEmpty()) report.errors.joinToString("\n") else null,
            status = status,
            durationMs = now - startTime,
        )
        syncHistoryDao.retainOnly50()
    }

    /**
     * Fetches today's summary from the API and caches it locally.
     */
    private suspend fun cacheTodaySummary() {
        val today = LocalDate.now().toString()
        val dateParam = "${today}T00:00:00Z"
        val result = healthDataRepository.getSummary(dateParam, "day")
        result.onSuccess { summary ->
            cachedDailySummaryDao.upsert(
                CachedDailySummary(
                    date = today,
                    stepsTotal = summary.steps.total,
                    stepsAverage = summary.steps.average,
                    stepsLatest = summary.steps.latest,
                    heartRateMin = summary.heartRate.min,
                    heartRateMax = summary.heartRate.max,
                    heartRateAvg = summary.heartRate.average,
                    heartRateResting = summary.heartRate.resting,
                    heartRateLatest = summary.heartRate.latest,
                    sleepDurationMs = summary.sleep.totalDurationMs,
                    weightLatest = summary.weight.latest,
                    bpSystolic = summary.bloodPressure.systolic,
                    bpDiastolic = summary.bloodPressure.diastolic,
                    activeCaloriesTotal = summary.activeCalories.total,
                    exerciseSessions = summary.exercise.sessions,
                    exerciseDurationMs = summary.exercise.totalDurationMs,
                )
            )
            // Clean up entries older than 30 days
            val cutoff = System.currentTimeMillis() - (30L * 24 * 60 * 60 * 1000)
            cachedDailySummaryDao.cleanupOlderThan(cutoff)
            appLogger.d(TAG, "Cached summary for $today")
        }
    }

    private suspend fun syncMetricRecords(rangeDays: Int, endTime: Instant, report: SyncReport, grantedPermissions: Set<String>) {
        val startTime = getStartTimeForType("metrics", rangeDays)

        val metricRecordTypes = listOf(
            WeightRecord::class, HeightRecord::class, BodyFatRecord::class,
            BoneMassRecord::class, LeanBodyMassRecord::class, BodyWaterMassRecord::class,
            BasalMetabolicRateRecord::class, Vo2MaxRecord::class,
            BloodPressureRecord::class, BloodGlucoseRecord::class,
            BodyTemperatureRecord::class, BasalBodyTemperatureRecord::class,
            OxygenSaturationRecord::class, RespiratoryRateRecord::class,
            RestingHeartRateRecord::class, HeartRateVariabilityRmssdRecord::class,
            StepsRecord::class, ActiveCaloriesBurnedRecord::class,
            TotalCaloriesBurnedRecord::class, DistanceRecord::class,
            ElevationGainedRecord::class, FloorsClimbedRecord::class,
            HydrationRecord::class, WheelchairPushesRecord::class,
            HeartRateRecord::class, SpeedRecord::class, PowerRecord::class,
            StepsCadenceRecord::class, CyclingPedalingCadenceRecord::class,
            SkinTemperatureRecord::class,
        )

        val allMetricItems = mutableListOf<SyncMetricItem>()
        var latestTimestamp = 0L

        for (recordType in metricRecordTypes) {
            val requiredPermission = HealthPermission.getReadPermission(recordType)
            if (requiredPermission !in grantedPermissions) {
                appLogger.d(TAG, "Skipping ${recordType.simpleName} - no permission")
                continue
            }
            try {
                val records = healthConnectManager.readRecords(recordType, startTime, endTime)
                appLogger.d(TAG, "Read ${records.size} ${recordType.simpleName} records")
                for (record in records) {
                    allMetricItems.addAll(RecordMapper.toMetricItems(record))
                    // Track latest timestamp for differential sync
                    val recordTime = when (record) {
                        is Record -> record.metadata.lastModifiedTime.toEpochMilli()
                        else -> 0L
                    }
                    if (recordTime > latestTimestamp) latestTimestamp = recordTime
                }
            } catch (e: Exception) {
                appLogger.w(TAG, "Failed to read ${recordType.simpleName}", e)
            }
        }

        appLogger.i(TAG, "Sending ${allMetricItems.size} metric items in batches of $MAX_METRICS_PER_BATCH")
        for (batch in allMetricItems.chunked(MAX_METRICS_PER_BATCH)) {
            appLogger.d(TAG, "Sending metrics batch of ${batch.size}")
            val result = healthDataRepository.syncMetrics(
                SyncMetricsRequest(source = syncSource, metrics = batch)
            )
            result.fold(
                onSuccess = { resp ->
                    appLogger.d(TAG, "Metrics batch success: synced=${resp.synced}, created=${resp.created}, updated=${resp.updated}")
                    report.metricsSynced += resp.synced
                    report.metricsCreated += resp.created
                    report.metricsUpdated += resp.updated
                },
                onFailure = { error ->
                    appLogger.e(TAG, "Metrics batch failed", error)
                    val json = moshi.adapter(SyncMetricsRequest::class.java)
                        .toJson(SyncMetricsRequest(source = syncSource, metrics = batch))
                    syncQueueDao.insert(SyncQueueEntry(dataType = "metrics", payload = json))
                    report.errors.add("Metrics batch failed: ${error.message}")
                }
            )
        }

        if (allMetricItems.isNotEmpty() && latestTimestamp > 0) {
            updateSyncState("metrics", latestTimestamp, allMetricItems.size)
        }
    }

    private suspend fun syncSleepRecords(rangeDays: Int, endTime: Instant, report: SyncReport, grantedPermissions: Set<String>) {
        if (HealthPermission.getReadPermission(SleepSessionRecord::class) !in grantedPermissions) {
            appLogger.d(TAG, "Skipping sleep - no permission")
            return
        }
        val startTime = getStartTimeForType("sleep", rangeDays)
        var latestTimestamp = 0L
        try {
            val records = healthConnectManager.readRecords(SleepSessionRecord::class, startTime, endTime)
            appLogger.d(TAG, "Read ${records.size} sleep records")
            val sessions = records.map { record ->
                val ts = record.metadata.lastModifiedTime.toEpochMilli()
                if (ts > latestTimestamp) latestTimestamp = ts
                RecordMapper.toSleepSession(record)
            }

            for (batch in sessions.chunked(MAX_SESSIONS_PER_BATCH)) {
                val result = healthDataRepository.syncSleep(
                    SyncSleepRequest(source = syncSource, sessions = batch)
                )
                result.fold(
                    onSuccess = { resp -> report.sleepSynced += resp.synced },
                    onFailure = { error ->
                        appLogger.e(TAG, "Sleep batch failed", error)
                        val json = moshi.adapter(SyncSleepRequest::class.java)
                            .toJson(SyncSleepRequest(source = syncSource, sessions = batch))
                        syncQueueDao.insert(SyncQueueEntry(dataType = "sleep", payload = json))
                        report.errors.add("Sleep sync failed: ${error.message}")
                    }
                )
            }

            if (sessions.isNotEmpty() && latestTimestamp > 0) {
                updateSyncState("sleep", latestTimestamp, sessions.size)
            }
        } catch (e: Exception) {
            appLogger.w(TAG, "Failed to read sleep records", e)
        }
    }

    private suspend fun syncExerciseRecords(rangeDays: Int, endTime: Instant, report: SyncReport, grantedPermissions: Set<String>) {
        if (HealthPermission.getReadPermission(ExerciseSessionRecord::class) !in grantedPermissions) {
            appLogger.d(TAG, "Skipping exercise - no permission")
            return
        }
        val startTime = getStartTimeForType("exercise", rangeDays)
        var latestTimestamp = 0L
        try {
            val records = healthConnectManager.readRecords(ExerciseSessionRecord::class, startTime, endTime)
            appLogger.d(TAG, "Read ${records.size} exercise records")
            val sessions = records.map { record ->
                val ts = record.metadata.lastModifiedTime.toEpochMilli()
                if (ts > latestTimestamp) latestTimestamp = ts
                RecordMapper.toExerciseSession(record)
            }

            for (batch in sessions.chunked(MAX_SESSIONS_PER_BATCH)) {
                val result = healthDataRepository.syncExercise(
                    SyncExerciseRequest(source = syncSource, sessions = batch)
                )
                result.fold(
                    onSuccess = { resp -> report.exerciseSynced += resp.synced },
                    onFailure = { error ->
                        appLogger.e(TAG, "Exercise batch failed", error)
                        val json = moshi.adapter(SyncExerciseRequest::class.java)
                            .toJson(SyncExerciseRequest(source = syncSource, sessions = batch))
                        syncQueueDao.insert(SyncQueueEntry(dataType = "exercise", payload = json))
                        report.errors.add("Exercise sync failed: ${error.message}")
                    }
                )
            }

            if (sessions.isNotEmpty() && latestTimestamp > 0) {
                updateSyncState("exercise", latestTimestamp, sessions.size)
            }
        } catch (e: Exception) {
            appLogger.w(TAG, "Failed to read exercise records", e)
        }
    }

    private suspend fun syncNutritionRecords(rangeDays: Int, endTime: Instant, report: SyncReport, grantedPermissions: Set<String>) {
        if (HealthPermission.getReadPermission(NutritionRecord::class) !in grantedPermissions) {
            appLogger.d(TAG, "Skipping nutrition - no permission")
            return
        }
        val startTime = getStartTimeForType("nutrition", rangeDays)
        var latestTimestamp = 0L
        try {
            val records = healthConnectManager.readRecords(NutritionRecord::class, startTime, endTime)
            appLogger.d(TAG, "Read ${records.size} nutrition records")
            val entries = records.map { record ->
                val ts = record.metadata.lastModifiedTime.toEpochMilli()
                if (ts > latestTimestamp) latestTimestamp = ts
                RecordMapper.toNutritionEntry(record)
            }

            for (batch in entries.chunked(MAX_SESSIONS_PER_BATCH)) {
                val result = healthDataRepository.syncNutrition(
                    SyncNutritionRequest(source = syncSource, entries = batch)
                )
                result.fold(
                    onSuccess = { resp -> report.nutritionSynced += resp.synced },
                    onFailure = { error ->
                        appLogger.e(TAG, "Nutrition batch failed", error)
                        val json = moshi.adapter(SyncNutritionRequest::class.java)
                            .toJson(SyncNutritionRequest(source = syncSource, entries = batch))
                        syncQueueDao.insert(SyncQueueEntry(dataType = "nutrition", payload = json))
                        report.errors.add("Nutrition sync failed: ${error.message}")
                    }
                )
            }

            if (entries.isNotEmpty() && latestTimestamp > 0) {
                updateSyncState("nutrition", latestTimestamp, entries.size)
            }
        } catch (e: Exception) {
            appLogger.w(TAG, "Failed to read nutrition records", e)
        }
    }

    private suspend fun syncCycleRecords(rangeDays: Int, endTime: Instant, report: SyncReport, grantedPermissions: Set<String>) {
        val startTime = getStartTimeForType("cycle", rangeDays)

        val cycleRecordTypes = listOf(
            MenstruationFlowRecord::class, MenstruationPeriodRecord::class,
            OvulationTestRecord::class, CervicalMucusRecord::class,
            IntermenstrualBleedingRecord::class, SexualActivityRecord::class,
        )

        val allEvents = mutableListOf<SyncCycleEvent>()
        var latestTimestamp = 0L

        for (recordType in cycleRecordTypes) {
            val requiredPermission = HealthPermission.getReadPermission(recordType)
            if (requiredPermission !in grantedPermissions) {
                appLogger.d(TAG, "Skipping ${recordType.simpleName} - no permission")
                continue
            }
            try {
                val records = healthConnectManager.readRecords(recordType, startTime, endTime)
                for (record in records) {
                    val ts = record.metadata.lastModifiedTime.toEpochMilli()
                    if (ts > latestTimestamp) latestTimestamp = ts
                    RecordMapper.toCycleEvent(record)?.let { allEvents.add(it) }
                }
            } catch (e: Exception) {
                appLogger.w(TAG, "Failed to read ${recordType.simpleName}", e)
            }
        }

        if (allEvents.isNotEmpty()) {
            for (batch in allEvents.chunked(MAX_SESSIONS_PER_BATCH)) {
                val result = healthDataRepository.syncCycle(
                    SyncCycleRequest(source = syncSource, events = batch)
                )
                result.fold(
                    onSuccess = { resp -> report.cycleSynced += resp.synced },
                    onFailure = { error ->
                        appLogger.e(TAG, "Cycle batch failed", error)
                        val json = moshi.adapter(SyncCycleRequest::class.java)
                            .toJson(SyncCycleRequest(source = syncSource, events = batch))
                        syncQueueDao.insert(SyncQueueEntry(dataType = "cycle", payload = json))
                        report.errors.add("Cycle sync failed: ${error.message}")
                    }
                )
            }

            if (latestTimestamp > 0) {
                updateSyncState("cycle", latestTimestamp, allEvents.size)
            }
        }
    }

    /**
     * Process any entries in the offline sync queue (failed previous attempts).
     */
    suspend fun processQueue() {
        val pending = syncQueueDao.getPendingEntries(50)
        appLogger.i(TAG, "Processing sync queue: ${pending.size} pending entries")
        for (entry in pending) {
            if (entry.retryCount >= 5) {
                appLogger.w(TAG, "Queue entry ${entry.id} exceeded max retries, removing")
                syncQueueDao.deleteById(entry.id)
                continue
            }
            syncQueueDao.markSending(entry.id)
            try {
                val success = when (entry.dataType) {
                    "metrics" -> {
                        val request = moshi.adapter(SyncMetricsRequest::class.java).fromJson(entry.payload)
                        request?.let { healthDataRepository.syncMetrics(it).isSuccess } ?: false
                    }
                    "sleep" -> {
                        val request = moshi.adapter(SyncSleepRequest::class.java).fromJson(entry.payload)
                        request?.let { healthDataRepository.syncSleep(it).isSuccess } ?: false
                    }
                    "exercise" -> {
                        val request = moshi.adapter(SyncExerciseRequest::class.java).fromJson(entry.payload)
                        request?.let { healthDataRepository.syncExercise(it).isSuccess } ?: false
                    }
                    "nutrition" -> {
                        val request = moshi.adapter(SyncNutritionRequest::class.java).fromJson(entry.payload)
                        request?.let { healthDataRepository.syncNutrition(it).isSuccess } ?: false
                    }
                    "cycle" -> {
                        val request = moshi.adapter(SyncCycleRequest::class.java).fromJson(entry.payload)
                        request?.let { healthDataRepository.syncCycle(it).isSuccess } ?: false
                    }
                    else -> {
                        appLogger.w(TAG, "Unknown queue entry type: ${entry.dataType}, removing")
                        syncQueueDao.deleteById(entry.id)
                        continue
                    }
                }
                if (success) {
                    syncQueueDao.deleteById(entry.id)
                } else {
                    syncQueueDao.markFailed(entry.id, "Sync returned failure")
                }
            } catch (e: Exception) {
                syncQueueDao.markFailed(entry.id, e.message ?: "Unknown error")
            }
        }
    }
}

data class SyncReport(
    var metricsSynced: Int = 0,
    var metricsCreated: Int = 0,
    var metricsUpdated: Int = 0,
    var sleepSynced: Int = 0,
    var exerciseSynced: Int = 0,
    var nutritionSynced: Int = 0,
    var cycleSynced: Int = 0,
    val errors: MutableList<String> = mutableListOf(),
) {
    val totalSynced: Int get() = metricsSynced + sleepSynced + exerciseSynced + nutritionSynced + cycleSynced
    val hasErrors: Boolean get() = errors.isNotEmpty()
}
