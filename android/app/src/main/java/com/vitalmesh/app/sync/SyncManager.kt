package com.vitalmesh.app.sync

import android.os.Build
import android.util.Log
import androidx.health.connect.client.records.*
import com.vitalmesh.app.data.healthconnect.HealthConnectManager
import com.vitalmesh.app.data.healthconnect.RecordMapper
import com.vitalmesh.app.data.local.db.dao.SyncQueueDao
import com.vitalmesh.app.data.local.db.entity.SyncQueueEntry
import com.vitalmesh.app.data.remote.api.dto.*
import com.vitalmesh.app.data.repository.HealthDataRepository
import com.squareup.moshi.Moshi
import java.time.Instant
import java.time.temporal.ChronoUnit
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SyncManager @Inject constructor(
    private val healthConnectManager: HealthConnectManager,
    private val healthDataRepository: HealthDataRepository,
    private val syncQueueDao: SyncQueueDao,
    private val moshi: Moshi,
) {
    companion object {
        private const val TAG = "SyncManager"
        private const val MAX_METRICS_PER_BATCH = 500
        private const val MAX_SESSIONS_PER_BATCH = 100
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
     * Main sync entry point. Reads all health data from HC and sends to server.
     * Uses time-based fallback (reads last 30 days on first sync).
     */
    suspend fun performFullSync(): SyncReport {
        val report = SyncReport()

        if (!healthConnectManager.isAvailable()) {
            report.errors.add("Health Connect not available")
            return report
        }

        val endTime = Instant.now()
        val startTime = endTime.minus(30, ChronoUnit.DAYS)

        try {
            // Sync metrics (all numeric types)
            syncMetricRecords(startTime, endTime, report)

            // Sync sleep
            syncSleepRecords(startTime, endTime, report)

            // Sync exercise
            syncExerciseRecords(startTime, endTime, report)

            // Sync nutrition
            syncNutritionRecords(startTime, endTime, report)

            // Sync cycle
            syncCycleRecords(startTime, endTime, report)
        } catch (e: Exception) {
            Log.e(TAG, "Sync failed", e)
            report.errors.add("Sync failed: ${e.message}")
        }

        return report
    }

    private suspend fun syncMetricRecords(startTime: Instant, endTime: Instant, report: SyncReport) {
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

        for (recordType in metricRecordTypes) {
            try {
                val records = healthConnectManager.readRecords(recordType, startTime, endTime)
                for (record in records) {
                    allMetricItems.addAll(RecordMapper.toMetricItems(record))
                }
            } catch (e: Exception) {
                Log.w(TAG, "Failed to read ${recordType.simpleName}", e)
            }
        }

        // Send in batches of 500
        for (batch in allMetricItems.chunked(MAX_METRICS_PER_BATCH)) {
            val result = healthDataRepository.syncMetrics(
                SyncMetricsRequest(source = syncSource, metrics = batch)
            )
            result.fold(
                onSuccess = { resp ->
                    report.metricsSynced += resp.synced
                    report.metricsCreated += resp.created
                    report.metricsUpdated += resp.updated
                },
                onFailure = { error ->
                    Log.e(TAG, "Metrics batch failed", error)
                    // Queue for retry
                    val json = moshi.adapter(SyncMetricsRequest::class.java)
                        .toJson(SyncMetricsRequest(source = syncSource, metrics = batch))
                    syncQueueDao.insert(SyncQueueEntry(dataType = "metrics", payload = json))
                    report.errors.add("Metrics batch failed: ${error.message}")
                }
            )
        }
    }

    private suspend fun syncSleepRecords(startTime: Instant, endTime: Instant, report: SyncReport) {
        try {
            val records = healthConnectManager.readRecords(SleepSessionRecord::class, startTime, endTime)
            val sessions = records.map { RecordMapper.toSleepSession(it) }

            for (batch in sessions.chunked(MAX_SESSIONS_PER_BATCH)) {
                val result = healthDataRepository.syncSleep(
                    SyncSleepRequest(source = syncSource, sessions = batch)
                )
                result.fold(
                    onSuccess = { resp -> report.sleepSynced += resp.synced },
                    onFailure = { error ->
                        Log.e(TAG, "Sleep batch failed", error)
                        report.errors.add("Sleep sync failed: ${error.message}")
                    }
                )
            }
        } catch (e: Exception) {
            Log.w(TAG, "Failed to read sleep records", e)
        }
    }

    private suspend fun syncExerciseRecords(startTime: Instant, endTime: Instant, report: SyncReport) {
        try {
            val records = healthConnectManager.readRecords(ExerciseSessionRecord::class, startTime, endTime)
            val sessions = records.map { RecordMapper.toExerciseSession(it) }

            for (batch in sessions.chunked(MAX_SESSIONS_PER_BATCH)) {
                val result = healthDataRepository.syncExercise(
                    SyncExerciseRequest(source = syncSource, sessions = batch)
                )
                result.fold(
                    onSuccess = { resp -> report.exerciseSynced += resp.synced },
                    onFailure = { error ->
                        Log.e(TAG, "Exercise batch failed", error)
                        report.errors.add("Exercise sync failed: ${error.message}")
                    }
                )
            }
        } catch (e: Exception) {
            Log.w(TAG, "Failed to read exercise records", e)
        }
    }

    private suspend fun syncNutritionRecords(startTime: Instant, endTime: Instant, report: SyncReport) {
        try {
            val records = healthConnectManager.readRecords(NutritionRecord::class, startTime, endTime)
            val entries = records.map { RecordMapper.toNutritionEntry(it) }

            for (batch in entries.chunked(MAX_SESSIONS_PER_BATCH)) {
                val result = healthDataRepository.syncNutrition(
                    SyncNutritionRequest(source = syncSource, entries = batch)
                )
                result.fold(
                    onSuccess = { resp -> report.nutritionSynced += resp.synced },
                    onFailure = { error ->
                        Log.e(TAG, "Nutrition batch failed", error)
                        report.errors.add("Nutrition sync failed: ${error.message}")
                    }
                )
            }
        } catch (e: Exception) {
            Log.w(TAG, "Failed to read nutrition records", e)
        }
    }

    private suspend fun syncCycleRecords(startTime: Instant, endTime: Instant, report: SyncReport) {
        val cycleRecordTypes = listOf(
            MenstruationFlowRecord::class, MenstruationPeriodRecord::class,
            OvulationTestRecord::class, CervicalMucusRecord::class,
            IntermenstrualBleedingRecord::class, SexualActivityRecord::class,
        )

        val allEvents = mutableListOf<SyncCycleEvent>()

        for (recordType in cycleRecordTypes) {
            try {
                val records = healthConnectManager.readRecords(recordType, startTime, endTime)
                for (record in records) {
                    RecordMapper.toCycleEvent(record)?.let { allEvents.add(it) }
                }
            } catch (e: Exception) {
                Log.w(TAG, "Failed to read ${recordType.simpleName}", e)
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
                        Log.e(TAG, "Cycle batch failed", error)
                        report.errors.add("Cycle sync failed: ${error.message}")
                    }
                )
            }
        }
    }

    /**
     * Process any entries in the offline sync queue (failed previous attempts).
     */
    suspend fun processQueue() {
        val pending = syncQueueDao.getPendingEntries(50)
        for (entry in pending) {
            syncQueueDao.markSending(entry.id)
            try {
                when (entry.dataType) {
                    "metrics" -> {
                        val request = moshi.adapter(SyncMetricsRequest::class.java).fromJson(entry.payload)
                        if (request != null) {
                            val result = healthDataRepository.syncMetrics(request)
                            if (result.isSuccess) {
                                syncQueueDao.deleteById(entry.id)
                            } else {
                                syncQueueDao.markFailed(entry.id, result.exceptionOrNull()?.message ?: "Unknown error")
                            }
                        }
                    }
                    // Add cases for sleep, exercise, nutrition, cycle as needed
                    else -> syncQueueDao.deleteById(entry.id) // Unknown type, remove
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
