package com.vitalmesh.app.data.remote.api.dto

import com.squareup.moshi.JsonClass

// Generic wrapper
@JsonClass(generateAdapter = true)
data class ApiResponse<T>(val data: T)

// Auth DTOs
@JsonClass(generateAdapter = true)
data class DeviceCodeRequest(val clientInfo: ClientInfo)

@JsonClass(generateAdapter = true)
data class ClientInfo(
    val platform: String = "android",
    val deviceName: String,
    val deviceModel: String? = null,
    val deviceManufacturer: String? = null,
    val deviceOs: String? = null,
    val appVersion: String? = null,
)

@JsonClass(generateAdapter = true)
data class DeviceCodeResponse(
    val deviceCode: String,
    val userCode: String,
    val verificationUri: String,
    val expiresIn: Int,
    val interval: Int,
)

@JsonClass(generateAdapter = true)
data class DeviceTokenRequest(val deviceCode: String)

@JsonClass(generateAdapter = true)
data class DeviceTokenResponse(
    val accessToken: String,
    val refreshToken: String,
    val tokenType: String = "Bearer",
    val expiresIn: Int,
)

@JsonClass(generateAdapter = true)
data class RefreshTokenRequest(val refreshToken: String)

@JsonClass(generateAdapter = true)
data class RefreshTokenResponse(
    val accessToken: String,
    val refreshToken: String,
    val expiresIn: Int,
)

@JsonClass(generateAdapter = true)
data class UserResponse(
    val id: String,
    val email: String,
    val displayName: String?,
    val profileImageUrl: String?,
)

// Sync DTOs
@JsonClass(generateAdapter = true)
data class SyncSource(
    val deviceName: String,
    val deviceModel: String? = null,
    val deviceManufacturer: String? = null,
    val deviceOs: String? = null,
    val deviceType: String? = null,
    val appVersion: String? = null,
    val appPackage: String? = null,
)

@JsonClass(generateAdapter = true)
data class SyncMetricsRequest(
    val source: SyncSource,
    val metrics: List<SyncMetricItem>,
)

@JsonClass(generateAdapter = true)
data class SyncMetricItem(
    val metric: String,
    val value: Double,
    val unit: String,
    val timestamp: String,
    val endTime: String? = null,
    val source: String? = null,
    val groupId: String? = null,
    val tags: Map<String, Any>? = null,
    val clientRecordId: String? = null,
    val zoneOffset: String? = null,
    val endZoneOffset: String? = null,
    val dataOrigin: String? = null,
    val recordingMethod: String? = null,
    val deviceType: String? = null,
    val metadata: Map<String, Any>? = null,
    val notes: String? = null,
)

@JsonClass(generateAdapter = true)
data class SyncSleepRequest(val source: SyncSource, val sessions: List<SyncSleepSession>)

@JsonClass(generateAdapter = true)
data class SyncSleepSession(
    val startTime: String,
    val endTime: String,
    val durationMs: Long? = null,
    val title: String? = null,
    val notes: String? = null,
    val stages: List<SyncSleepStage>? = null,
    val source: String? = null,
    val clientRecordId: String? = null,
    val zoneOffset: String? = null,
    val endZoneOffset: String? = null,
    val dataOrigin: String? = null,
    val recordingMethod: String? = null,
    val metadata: Map<String, Any>? = null,
)

@JsonClass(generateAdapter = true)
data class SyncSleepStage(val stage: String, val startTime: String, val endTime: String)

@JsonClass(generateAdapter = true)
data class SyncExerciseRequest(val source: SyncSource, val sessions: List<SyncExerciseSession>)

@JsonClass(generateAdapter = true)
data class SyncExerciseSession(
    val exerciseType: String,
    val startTime: String,
    val endTime: String,
    val title: String? = null,
    val isPlanned: Boolean? = null,
    val attributes: Map<String, Any> = emptyMap(),
    val source: String? = null,
    val clientRecordId: String? = null,
    val zoneOffset: String? = null,
    val endZoneOffset: String? = null,
    val dataOrigin: String? = null,
    val recordingMethod: String? = null,
    val metadata: Map<String, Any>? = null,
    val notes: String? = null,
)

@JsonClass(generateAdapter = true)
data class SyncNutritionRequest(val source: SyncSource, val entries: List<SyncNutritionEntry>)

@JsonClass(generateAdapter = true)
data class SyncNutritionEntry(
    val startTime: String,
    val endTime: String,
    val mealType: String? = null,
    val name: String? = null,
    val nutrients: Map<String, Double> = emptyMap(),
    val source: String? = null,
    val clientRecordId: String? = null,
    val zoneOffset: String? = null,
    val endZoneOffset: String? = null,
    val dataOrigin: String? = null,
    val recordingMethod: String? = null,
    val metadata: Map<String, Any>? = null,
)

@JsonClass(generateAdapter = true)
data class SyncCycleRequest(val source: SyncSource, val events: List<SyncCycleEvent>)

@JsonClass(generateAdapter = true)
data class SyncCycleEvent(
    val eventType: String,
    val timestamp: String,
    val endTime: String? = null,
    val data: Map<String, Any> = emptyMap(),
    val source: String? = null,
    val clientRecordId: String? = null,
    val zoneOffset: String? = null,
    val endZoneOffset: String? = null,
    val dataOrigin: String? = null,
    val recordingMethod: String? = null,
    val metadata: Map<String, Any>? = null,
)

@JsonClass(generateAdapter = true)
data class SyncResponse(val synced: Int, val created: Int, val updated: Int)

@JsonClass(generateAdapter = true)
data class HealthSummaryResponse(
    val period: PeriodResponse,
    val steps: StepsSummaryResponse,
    val heartRate: HeartRateSummaryResponse,
    val sleep: SleepSummaryResponse,
    val weight: WeightSummaryResponse,
    val bloodPressure: BloodPressureSummaryResponse,
    val activeCalories: CaloriesSummaryResponse,
    val exercise: ExerciseSummaryResponse,
)

@JsonClass(generateAdapter = true)
data class PeriodResponse(val from: String, val to: String)
@JsonClass(generateAdapter = true)
data class StepsSummaryResponse(val total: Double, val average: Double, val latest: Double?)
@JsonClass(generateAdapter = true)
data class HeartRateSummaryResponse(val min: Double?, val max: Double?, val average: Double?, val resting: Double?, val latest: Double?)
@JsonClass(generateAdapter = true)
data class SleepSummaryResponse(val totalDurationMs: Long, val stages: Map<String, Long>)
@JsonClass(generateAdapter = true)
data class WeightSummaryResponse(val latest: Double?)
@JsonClass(generateAdapter = true)
data class BloodPressureSummaryResponse(val latest: BpLatestResponse?)
@JsonClass(generateAdapter = true)
data class BpLatestResponse(val systolic: Double, val diastolic: Double?)
@JsonClass(generateAdapter = true)
data class CaloriesSummaryResponse(val total: Double)
@JsonClass(generateAdapter = true)
data class ExerciseSummaryResponse(val sessions: Int, val totalDurationMs: Long)

// Sync state
@JsonClass(generateAdapter = true)
data class SyncStateResponse(
    val dataType: String,
    val changeToken: String?,
    val lastSyncAt: String?,
    val lastRecordTime: String?,
    val recordsSynced: Long,
    val syncStatus: String,
    val errorMessage: String?,
)

@JsonClass(generateAdapter = true)
data class UpdateSyncStateRequest(val deviceId: String, val states: List<SyncStateItem>)

@JsonClass(generateAdapter = true)
data class SyncStateItem(
    val dataType: String,
    val changeToken: String? = null,
    val lastSyncAt: String? = null,
    val lastRecordTime: String? = null,
    val recordsSynced: Long? = null,
    val syncStatus: String? = null,
    val errorMessage: String? = null,
)

// Paginated response wrapper
@JsonClass(generateAdapter = true)
data class PaginatedResponse<T>(val data: T, val meta: PaginationMeta)

@JsonClass(generateAdapter = true)
data class PaginationMeta(
    val page: Int,
    val pageSize: Int,
    val totalItems: Int,
    val totalPages: Int,
)

// Query response DTOs
@JsonClass(generateAdapter = true)
data class MetricQueryRecord(
    val id: String,
    val timestamp: String,
    val endTime: String? = null,
    val metric: String,
    val value: Double,
    val unit: String,
    val source: String? = null,
    val groupId: String? = null,
    val tags: Map<String, Any>? = null,
    val dataOrigin: String? = null,
    val notes: String? = null,
    val createdAt: String? = null,
)

@JsonClass(generateAdapter = true)
data class HealthSleepRecord(
    val id: String,
    val startTime: String,
    val endTime: String,
    val durationMs: Long? = null,
    val title: String? = null,
    val notes: String? = null,
    val source: String? = null,
    val dataOrigin: String? = null,
    val stages: List<SleepStageRecord>? = null,
    val createdAt: String? = null,
)

@JsonClass(generateAdapter = true)
data class SleepStageRecord(
    val stage: String,
    val startTime: String,
    val endTime: String,
)

@JsonClass(generateAdapter = true)
data class HealthExerciseRecord(
    val id: String,
    val startTime: String,
    val endTime: String,
    val exerciseType: String,
    val title: String? = null,
    val attributes: Map<String, Any>? = null,
    val source: String? = null,
    val dataOrigin: String? = null,
    val notes: String? = null,
    val createdAt: String? = null,
)

@JsonClass(generateAdapter = true)
data class HealthNutritionRecord(
    val id: String,
    val startTime: String,
    val endTime: String,
    val mealType: String? = null,
    val name: String? = null,
    val nutrients: Map<String, Double>? = null,
    val source: String? = null,
    val dataOrigin: String? = null,
    val createdAt: String? = null,
)

@JsonClass(generateAdapter = true)
data class HealthCycleRecord(
    val id: String,
    val timestamp: String,
    val endTime: String? = null,
    val eventType: String,
    val data: Map<String, Any>? = null,
    val source: String? = null,
    val dataOrigin: String? = null,
    val createdAt: String? = null,
)

@JsonClass(generateAdapter = true)
data class GroupedMetricsResponse(
    val groups: List<List<MetricQueryRecord>>,
)
