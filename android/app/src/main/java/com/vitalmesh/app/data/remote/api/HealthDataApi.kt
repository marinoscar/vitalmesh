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
}
