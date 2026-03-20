package com.vitalmesh.app.data.healthconnect

import android.content.Context
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.*
import androidx.health.connect.client.request.ChangesTokenRequest
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import dagger.hilt.android.qualifiers.ApplicationContext
import java.time.Instant
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.reflect.KClass

@Singleton
class HealthConnectManager @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    private val client: HealthConnectClient by lazy {
        HealthConnectClient.getOrCreate(context)
    }

    suspend fun isAvailable(): Boolean {
        return HealthConnectClient.getSdkStatus(context) == HealthConnectClient.SDK_AVAILABLE
    }

    suspend fun hasAllPermissions(permissions: Set<String>): Boolean {
        val granted = client.permissionController.getGrantedPermissions()
        return granted.containsAll(permissions)
    }

    suspend fun getGrantedPermissions(): Set<String> {
        return client.permissionController.getGrantedPermissions()
    }

    // Read records of any type within a time range
    suspend fun <T : Record> readRecords(
        recordType: KClass<T>,
        startTime: Instant,
        endTime: Instant,
    ): List<T> {
        val response = client.readRecords(
            ReadRecordsRequest(
                recordType = recordType,
                timeRangeFilter = TimeRangeFilter.between(startTime, endTime),
            )
        )
        return response.records
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
