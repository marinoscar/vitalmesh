package com.vitalmesh.app.data.repository

import com.vitalmesh.app.data.remote.api.HealthDataApi
import com.vitalmesh.app.data.remote.api.dto.*
import com.vitalmesh.app.domain.model.HealthSummary
import com.vitalmesh.app.domain.model.*
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class HealthDataRepository @Inject constructor(
    private val healthDataApi: HealthDataApi,
) {
    suspend fun syncMetrics(request: SyncMetricsRequest): Result<SyncResponse> {
        return try {
            val response = healthDataApi.syncMetrics(request)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!.data)
            } else {
                Result.failure(Exception("Sync metrics failed: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun syncSleep(request: SyncSleepRequest): Result<SyncResponse> {
        return try {
            val response = healthDataApi.syncSleep(request)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!.data)
            } else {
                Result.failure(Exception("Sync sleep failed: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun syncExercise(request: SyncExerciseRequest): Result<SyncResponse> {
        return try {
            val response = healthDataApi.syncExercise(request)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!.data)
            } else {
                Result.failure(Exception("Sync exercise failed: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun syncNutrition(request: SyncNutritionRequest): Result<SyncResponse> {
        return try {
            val response = healthDataApi.syncNutrition(request)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!.data)
            } else {
                Result.failure(Exception("Sync nutrition failed: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun syncCycle(request: SyncCycleRequest): Result<SyncResponse> {
        return try {
            val response = healthDataApi.syncCycle(request)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!.data)
            } else {
                Result.failure(Exception("Sync cycle failed: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getSummary(date: String? = null, range: String = "day"): Result<HealthSummary> {
        return try {
            val response = healthDataApi.getSummary(date, range)
            if (response.isSuccessful && response.body() != null) {
                val data = response.body()!!.data
                Result.success(mapToHealthSummary(data))
            } else {
                Result.failure(Exception("Get summary failed: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getSyncState(deviceId: String? = null): Result<List<SyncStateResponse>> {
        return try {
            val response = healthDataApi.getSyncState(deviceId)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!.data)
            } else {
                Result.failure(Exception("Get sync state failed: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun updateSyncState(request: UpdateSyncStateRequest): Result<List<SyncStateResponse>> {
        return try {
            val response = healthDataApi.updateSyncState(request)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!.data)
            } else {
                Result.failure(Exception("Update sync state failed: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun queryMetrics(
        metric: String? = null, from: String? = null, to: String? = null,
        page: Int = 1, pageSize: Int = 50,
    ): Result<List<HealthMetricRecord>> {
        return try {
            val response = healthDataApi.queryMetrics(metric, from, to, page, pageSize)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!.data)
            } else {
                Result.failure(Exception("Query metrics failed: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun queryGroupedMetrics(
        metric: String? = null, from: String? = null, to: String? = null,
        page: Int = 1, pageSize: Int = 20,
    ): Result<GroupedMetricsResponse> {
        return try {
            val response = healthDataApi.queryGroupedMetrics(metric, from, to, page, pageSize)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!.data)
            } else {
                Result.failure(Exception("Query grouped metrics failed: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun querySleep(
        from: String? = null, to: String? = null,
        page: Int = 1, pageSize: Int = 20,
    ): Result<List<HealthSleepRecord>> {
        return try {
            val response = healthDataApi.querySleep(from, to, page, pageSize)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!.data)
            } else {
                Result.failure(Exception("Query sleep failed: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun queryExercise(
        exerciseType: String? = null, from: String? = null, to: String? = null,
        page: Int = 1, pageSize: Int = 20,
    ): Result<List<HealthExerciseRecord>> {
        return try {
            val response = healthDataApi.queryExercise(exerciseType, from, to, page, pageSize)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!.data)
            } else {
                Result.failure(Exception("Query exercise failed: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun queryNutrition(
        mealType: String? = null, from: String? = null, to: String? = null,
        page: Int = 1, pageSize: Int = 20,
    ): Result<List<HealthNutritionRecord>> {
        return try {
            val response = healthDataApi.queryNutrition(mealType, from, to, page, pageSize)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!.data)
            } else {
                Result.failure(Exception("Query nutrition failed: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun queryCycle(
        eventType: String? = null, from: String? = null, to: String? = null,
        page: Int = 1, pageSize: Int = 20,
    ): Result<List<HealthCycleRecord>> {
        return try {
            val response = healthDataApi.queryCycle(eventType, from, to, page, pageSize)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!.data)
            } else {
                Result.failure(Exception("Query cycle failed: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    private fun mapToHealthSummary(response: HealthSummaryResponse): HealthSummary {
        return HealthSummary(
            steps = StepsSummary(response.steps.total, response.steps.average, response.steps.latest),
            heartRate = HeartRateSummary(response.heartRate.min, response.heartRate.max, response.heartRate.average, response.heartRate.resting, response.heartRate.latest),
            sleep = SleepSummary(response.sleep.totalDurationMs, response.sleep.stages),
            weight = WeightSummary(response.weight.latest),
            bloodPressure = BloodPressureSummary(response.bloodPressure.latest?.systolic, response.bloodPressure.latest?.diastolic),
            activeCalories = CaloriesSummary(response.activeCalories.total),
            exercise = ExerciseSummary(response.exercise.sessions, response.exercise.totalDurationMs),
        )
    }
}
