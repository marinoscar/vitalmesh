package com.vitalmesh.app.data.remote.api

import com.vitalmesh.app.data.remote.api.dto.*
import retrofit2.Response
import retrofit2.http.*

interface AuthApi {
    @POST("auth/device/code")
    suspend fun requestDeviceCode(@Body request: DeviceCodeRequest): Response<DeviceCodeResponse>

    @POST("auth/device/token")
    suspend fun pollDeviceToken(@Body request: DeviceTokenRequest): Response<DeviceTokenResponse>

    @POST("auth/refresh")
    suspend fun refreshToken(@Body request: RefreshTokenRequest): Response<RefreshTokenResponse>

    @GET("auth/me")
    suspend fun getCurrentUser(): Response<ApiResponse<UserResponse>>
}
