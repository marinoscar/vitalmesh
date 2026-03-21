package com.vitalmesh.app.data.repository

import android.os.Build
import com.vitalmesh.app.data.local.logging.AppLogger
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
    private val appLogger: AppLogger,
) {
    companion object {
        private const val TAG = "AuthRepository"
    }

    suspend fun requestDeviceCode(): Result<DeviceCodeResponse> {
        appLogger.i(TAG, "Requesting device code")
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
                appLogger.i(TAG, "Device code received successfully")
                Result.success(response.body()!!.data)
            } else {
                appLogger.e(TAG, "Failed to get device code: HTTP ${response.code()}")
                Result.failure(Exception("Failed to get device code: ${response.code()}"))
            }
        } catch (e: Exception) {
            appLogger.e(TAG, "Device code request failed", e)
            Result.failure(e)
        }
    }

    fun pollForAuthorization(deviceCode: String, interval: Int, expiresIn: Int): Flow<DeviceAuthState> = flow {
        appLogger.i(TAG, "Starting device authorization polling (interval=${interval}s, expires=${expiresIn}s)")
        val deadline = System.currentTimeMillis() + (expiresIn * 1000L)

        while (System.currentTimeMillis() < deadline) {
            delay(interval * 1000L)

            try {
                appLogger.d(TAG, "Polling for device authorization")
                val response = authApi.pollDeviceToken(DeviceTokenRequest(deviceCode))

                when (response.code()) {
                    200 -> {
                        val body = response.body()?.data
                        if (body != null) {
                            appLogger.i(TAG, "Device authorization granted, saving tokens")
                            tokenManager.saveTokens(body.accessToken, body.refreshToken)
                            val userResult = getCurrentUser()
                            if (userResult.isSuccess) {
                                appLogger.i(TAG, "User info fetched after device auth")
                                emit(DeviceAuthState.Authorized(userResult.getOrThrow()))
                            } else {
                                appLogger.w(TAG, "Authorized but failed to fetch user info")
                                emit(DeviceAuthState.Authorized(User("", "", null, null)))
                            }
                            return@flow
                        }
                    }
                    428 -> {
                        appLogger.d(TAG, "Authorization pending, continuing to poll")
                        continue
                    }
                    400 -> {
                        val errorBody = response.errorBody()?.string() ?: ""
                        when {
                            "slow_down" in errorBody -> {
                                appLogger.d(TAG, "Server requested slow down")
                                delay(5000)
                            }
                            "expired" in errorBody -> {
                                appLogger.w(TAG, "Device code expired")
                                emit(DeviceAuthState.Expired)
                                return@flow
                            }
                            "denied" in errorBody -> {
                                appLogger.w(TAG, "Authorization denied by user")
                                emit(DeviceAuthState.Error("Authorization denied"))
                                return@flow
                            }
                            else -> continue
                        }
                    }
                    else -> {
                        appLogger.e(TAG, "Unexpected polling response: ${response.code()}")
                        emit(DeviceAuthState.Error("Unexpected response: ${response.code()}"))
                        return@flow
                    }
                }
            } catch (e: Exception) {
                appLogger.w(TAG, "Poll network error, retrying", e)
                continue
            }
        }

        appLogger.w(TAG, "Device authorization polling timed out")
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
        appLogger.d(TAG, "Attempting token refresh")
        val refreshToken = tokenManager.getRefreshToken() ?: run {
            appLogger.w(TAG, "No refresh token available")
            return false
        }
        return try {
            val response = authApi.refreshToken(RefreshTokenRequest(refreshToken))
            if (response.isSuccessful && response.body() != null) {
                val body = response.body()!!.data
                tokenManager.saveTokens(body.accessToken, body.refreshToken)
                appLogger.i(TAG, "Token refresh successful")
                true
            } else {
                appLogger.e(TAG, "Token refresh failed: HTTP ${response.code()}")
                false
            }
        } catch (e: Exception) {
            appLogger.e(TAG, "Token refresh error", e)
            false
        }
    }

    suspend fun logout() {
        appLogger.i(TAG, "User logging out")
        tokenManager.clearTokens()
    }

    suspend fun isLoggedIn(): Boolean = tokenManager.isLoggedIn()
}
