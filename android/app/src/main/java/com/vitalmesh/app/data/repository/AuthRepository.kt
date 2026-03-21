package com.vitalmesh.app.data.repository

import android.os.Build
import com.vitalmesh.app.data.local.preferences.TokenManager
import com.vitalmesh.app.data.remote.api.AuthApi
import com.vitalmesh.app.data.remote.api.dto.*
import com.vitalmesh.app.domain.model.User
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import javax.inject.Inject
import javax.inject.Singleton

sealed class DeviceAuthState {
    data object Idle : DeviceAuthState()
    data class CodeReady(val userCode: String, val verificationUri: String) : DeviceAuthState()
    data object Polling : DeviceAuthState()
    data class Authorized(val user: User) : DeviceAuthState()
    data class Error(val message: String) : DeviceAuthState()
    data object Expired : DeviceAuthState()
}

@Singleton
class AuthRepository @Inject constructor(
    private val authApi: AuthApi,
    private val tokenManager: TokenManager,
) {
    suspend fun requestDeviceCode(): Result<DeviceCodeResponse> {
        return try {
            val response = authApi.requestDeviceCode(
                DeviceCodeRequest(
                    clientInfo = ClientInfo(
                        platform = "android",
                        deviceName = "${Build.MANUFACTURER} ${Build.MODEL}",
                        deviceModel = Build.MODEL,
                        deviceManufacturer = Build.MANUFACTURER,
                        deviceOs = "Android ${Build.VERSION.RELEASE}",
                        appVersion = "1.0.0", // TODO: Get from BuildConfig
                    )
                )
            )
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!.data)
            } else {
                Result.failure(Exception("Failed to get device code: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    fun pollForAuthorization(deviceCode: String, interval: Int, expiresIn: Int): Flow<DeviceAuthState> = flow {
        // Don't emit Polling here — CodeReady state already shows a polling indicator
        val deadline = System.currentTimeMillis() + (expiresIn * 1000L)

        while (System.currentTimeMillis() < deadline) {
            delay(interval * 1000L)

            try {
                val response = authApi.pollDeviceToken(DeviceTokenRequest(deviceCode))

                when (response.code()) {
                    200 -> {
                        val body = response.body()?.data
                        if (body != null) {
                            tokenManager.saveTokens(body.accessToken, body.refreshToken)
                            // Fetch user info
                            val userResult = getCurrentUser()
                            if (userResult.isSuccess) {
                                emit(DeviceAuthState.Authorized(userResult.getOrThrow()))
                            } else {
                                emit(DeviceAuthState.Authorized(User("", "", null, null)))
                            }
                            return@flow
                        }
                    }
                    428 -> continue // authorization_pending - keep polling
                    400 -> {
                        // Could be slow_down, expired_token, or access_denied
                        val errorBody = response.errorBody()?.string() ?: ""
                        when {
                            "slow_down" in errorBody -> delay(5000) // wait extra
                            "expired" in errorBody -> {
                                emit(DeviceAuthState.Expired)
                                return@flow
                            }
                            "denied" in errorBody -> {
                                emit(DeviceAuthState.Error("Authorization denied"))
                                return@flow
                            }
                            else -> continue
                        }
                    }
                    else -> {
                        emit(DeviceAuthState.Error("Unexpected response: ${response.code()}"))
                        return@flow
                    }
                }
            } catch (e: Exception) {
                // Network error - keep trying until deadline
                continue
            }
        }

        emit(DeviceAuthState.Expired)
    }

    suspend fun getCurrentUser(): Result<User> {
        return try {
            val response = authApi.getCurrentUser()
            if (response.isSuccessful && response.body() != null) {
                val userData = response.body()!!.data
                Result.success(
                    User(
                        id = userData.id,
                        email = userData.email,
                        displayName = userData.displayName,
                        profileImageUrl = userData.profileImageUrl,
                    )
                )
            } else {
                Result.failure(Exception("Failed to get user: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun refreshToken(): Boolean {
        val refreshToken = tokenManager.getRefreshToken() ?: return false
        return try {
            val response = authApi.refreshToken(RefreshTokenRequest(refreshToken))
            if (response.isSuccessful && response.body() != null) {
                val body = response.body()!!.data
                tokenManager.saveTokens(body.accessToken, body.refreshToken)
                true
            } else {
                false
            }
        } catch (e: Exception) {
            false
        }
    }

    suspend fun logout() {
        tokenManager.clearTokens()
    }

    suspend fun isLoggedIn(): Boolean = tokenManager.isLoggedIn()
}
