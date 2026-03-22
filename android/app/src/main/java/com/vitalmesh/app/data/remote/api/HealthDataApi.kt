package com.vitalmesh.app.data.remote.api

import com.vitalmesh.app.data.remote.api.dto.*
import retrofit2.Response
import retrofit2.http.*

interface HealthDataApi {
    @POST("health-data/metrics")
    suspend fun syncMetrics(@Body request: SyncMetricsRequest): Response<ApiResponse<SyncResponse>>

    @POST("health-data/sleep")
    suspend fun syncSleep(@Body request: SyncSleepRequest): Response<ApiResponse<SyncResponse>>

    @POST("health-data/exercise")
    suspend fun syncExercise(@Body request: SyncExerciseRequest): Response<ApiResponse<SyncResponse>>

    @POST("health-data/nutrition")
    suspend fun syncNutrition(@Body request: SyncNutritionRequest): Response<ApiResponse<SyncResponse>>

    @POST("health-data/cycle")
    suspend fun syncCycle(@Body request: SyncCycleRequest): Response<ApiResponse<SyncResponse>>

    @GET("health-data/summary")
    suspend fun getSummary(
        @Query("date") date: String? = null,
        @Query("range") range: String = "day"
    ): Response<ApiResponse<HealthSummaryResponse>>

    @GET("health-data/sync/state")
    suspend fun getSyncState(@Query("deviceId") deviceId: String? = null): Response<ApiResponse<List<SyncStateResponse>>>

    @PUT("health-data/sync/state")
    suspend fun updateSyncState(@Body request: UpdateSyncStateRequest): Response<ApiResponse<List<SyncStateResponse>>>

    // Query endpoints
    @GET("health-data/metrics")
    suspend fun queryMetrics(
        @Query("metric") metric: String? = null,
        @Query("from") from: String? = null,
        @Query("to") to: String? = null,
        @Query("page") page: Int = 1,
        @Query("pageSize") pageSize: Int = 20,
        @Query("sortOrder") sortOrder: String = "desc",
    ): Response<PaginatedResponse<List<MetricQueryRecord>>>

    @GET("health-data/metrics/grouped")
    suspend fun queryGroupedMetrics(
        @Query("metric") metric: String? = null,
        @Query("from") from: String? = null,
        @Query("to") to: String? = null,
        @Query("page") page: Int = 1,
        @Query("pageSize") pageSize: Int = 20,
    ): Response<ApiResponse<GroupedMetricsResponse>>

    @GET("health-data/sleep")
    suspend fun querySleep(
        @Query("from") from: String? = null,
        @Query("to") to: String? = null,
        @Query("page") page: Int = 1,
        @Query("pageSize") pageSize: Int = 20,
        @Query("sortOrder") sortOrder: String = "desc",
    ): Response<PaginatedResponse<List<HealthSleepRecord>>>

    @GET("health-data/exercise")
    suspend fun queryExercise(
        @Query("exerciseType") exerciseType: String? = null,
        @Query("from") from: String? = null,
        @Query("to") to: String? = null,
        @Query("page") page: Int = 1,
        @Query("pageSize") pageSize: Int = 20,
        @Query("sortOrder") sortOrder: String = "desc",
    ): Response<PaginatedResponse<List<HealthExerciseRecord>>>

    @GET("health-data/nutrition")
    suspend fun queryNutrition(
        @Query("mealType") mealType: String? = null,
        @Query("from") from: String? = null,
        @Query("to") to: String? = null,
        @Query("page") page: Int = 1,
        @Query("pageSize") pageSize: Int = 20,
        @Query("sortOrder") sortOrder: String = "desc",
    ): Response<PaginatedResponse<List<HealthNutritionRecord>>>

    @GET("health-data/cycle")
    suspend fun queryCycle(
        @Query("eventType") eventType: String? = null,
        @Query("from") from: String? = null,
        @Query("to") to: String? = null,
        @Query("page") page: Int = 1,
        @Query("pageSize") pageSize: Int = 20,
        @Query("sortOrder") sortOrder: String = "desc",
    ): Response<PaginatedResponse<List<HealthCycleRecord>>>
}
