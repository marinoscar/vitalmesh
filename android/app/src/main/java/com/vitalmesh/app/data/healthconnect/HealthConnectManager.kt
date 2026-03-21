package com.vitalmesh.app.data.healthconnect

import android.content.Context
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.*
import androidx.health.connect.client.request.ChangesTokenRequest
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import com.vitalmesh.app.data.local.logging.AppLogger
import dagger.hilt.android.qualifiers.ApplicationContext
import java.time.Instant
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.reflect.KClass

@Singleton
class HealthConnectManager @Inject constructor(
    @ApplicationContext private val context: Context,
    private val appLogger: AppLogger,
) {
    private val client: HealthConnectClient by lazy {
        HealthConnectClient.getOrCreate(context)
    }

    suspend fun isAvailable(): Boolean {
        val status = HealthConnectClient.getSdkStatus(context)
        val available = status == HealthConnectClient.SDK_AVAILABLE
        appLogger.i(TAG, "Health Connect availability check: available=$available (status=$status)")
        return available
    }

    suspend fun hasAllPermissions(permissions: Set<String>): Boolean {
        val granted = client.permissionController.getGrantedPermissions()
        val hasAll = granted.containsAll(permissions)
        appLogger.d(TAG, "Permissions check: has all=${hasAll}, granted=${granted.size}/${permissions.size}")
        return hasAll
    }

    suspend fun getGrantedPermissions(): Set<String> {
        val granted = client.permissionController.getGrantedPermissions()
        appLogger.d(TAG, "Granted permissions: ${granted.size}")
        return granted
    }

    // Read records of any type within a time range (paginated to avoid Samsung HC bugs)
    suspend fun <T : Record> readRecords(
        recordType: KClass<T>,
        startTime: Instant,
        endTime: Instant,
    ): List<T> {
        val allRecords = mutableListOf<T>()
        var pageToken: String? = null

        do {
            val request = ReadRecordsRequest(
                recordType = recordType,
                timeRangeFilter = TimeRangeFilter.between(startTime, endTime),
                pageSize = 1000,
                pageToken = pageToken,
            )
            val response = client.readRecords(request)
            allRecords.addAll(response.records)
            pageToken = response.pageToken
        } while (pageToken != null)

        appLogger.d(TAG, "Read ${allRecords.size} ${recordType.simpleName} records")
        return allRecords
    }

    // Get a changes token for differential sync
    suspend fun getChangesToken(recordTypes: Set<KClass<out Record>>): String {
        val response = client.getChangesToken(
            ChangesTokenRequest(recordTypes = recordTypes)
        )
        return response
    }

    // Get changes since a token
    suspend fun getChanges(token: String): HealthConnectChanges {
        var currentToken = token
        val upsertedRecords = mutableListOf<Record>()
        val deletedIds = mutableListOf<String>()

        do {
            val response = client.getChanges(currentToken)
            for (change in response.changes) {
                when (change) {
                    is androidx.health.connect.client.changes.UpsertionChange -> {
                        upsertedRecords.add(change.record)
                    }
                    is androidx.health.connect.client.changes.DeletionChange -> {
                        deletedIds.add(change.recordId)
                    }
                }
            }
            currentToken = response.nextChangesToken
        } while (response.hasMore)

        return HealthConnectChanges(
            records = upsertedRecords,
            deletedIds = deletedIds,
            nextToken = currentToken,
        )
    }

    companion object {
        private const val TAG = "HealthConnectManager"

        // All supported record types
        val ALL_RECORD_TYPES: Set<KClass<out Record>> = setOf(
            // Instantaneous
            WeightRecord::class,
            HeightRecord::class,
            BodyFatRecord::class,
            BoneMassRecord::class,
            LeanBodyMassRecord::class,
            BodyWaterMassRecord::class,
            BasalMetabolicRateRecord::class,
            Vo2MaxRecord::class,
            BloodPressureRecord::class,
            BloodGlucoseRecord::class,
            BodyTemperatureRecord::class,
            BasalBodyTemperatureRecord::class,
            OxygenSaturationRecord::class,
            RespiratoryRateRecord::class,
            RestingHeartRateRecord::class,
            HeartRateVariabilityRmssdRecord::class,
            // Interval
            StepsRecord::class,
            ActiveCaloriesBurnedRecord::class,
            TotalCaloriesBurnedRecord::class,
            DistanceRecord::class,
            ElevationGainedRecord::class,
            FloorsClimbedRecord::class,
            HydrationRecord::class,
            WheelchairPushesRecord::class,
            // Series
            HeartRateRecord::class,
            SpeedRecord::class,
            PowerRecord::class,
            StepsCadenceRecord::class,
            CyclingPedalingCadenceRecord::class,
            SkinTemperatureRecord::class,
            // Complex
            SleepSessionRecord::class,
            ExerciseSessionRecord::class,
            NutritionRecord::class,
            // Cycle
            MenstruationFlowRecord::class,
            MenstruationPeriodRecord::class,
            OvulationTestRecord::class,
            CervicalMucusRecord::class,
            IntermenstrualBleedingRecord::class,
            SexualActivityRecord::class,
        )

        fun buildPermissions(): Set<String> {
            return ALL_RECORD_TYPES.map { recordType ->
                HealthPermission.getReadPermission(recordType)
            }.toSet()
        }
    }
}

data class HealthConnectChanges(
    val records: List<Record>,
    val deletedIds: List<String>,
    val nextToken: String,
)
