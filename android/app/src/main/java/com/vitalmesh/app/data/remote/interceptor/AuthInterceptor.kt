package com.vitalmesh.app.data.remote.interceptor

import com.vitalmesh.app.BuildConfig
import com.vitalmesh.app.data.local.logging.AppLogger
import com.vitalmesh.app.data.local.preferences.TokenManager
import kotlinx.coroutines.runBlocking
import okhttp3.Interceptor
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import org.json.JSONObject
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthInterceptor @Inject constructor(
    private val tokenManager: TokenManager,
    private val appLogger: AppLogger,
) : Interceptor {

    companion object {
        private const val TAG = "AuthInterceptor"
    }

    // Plain OkHttp client for refresh calls (no interceptors to avoid recursion)
    private val refreshClient = OkHttpClient()

    override fun intercept(chain: Interceptor.Chain): Response {
        val token = runBlocking { tokenManager.getAccessToken() }
        val request = if (token != null) {
            chain.request().newBuilder()
                .addHeader("Authorization", "Bearer $token")
                .build()
        } else {
            chain.request()
        }

        val response = chain.proceed(request)

        // If 401 and not already a refresh/auth request, try to refresh token
        if (response.code == 401 && !request.url.encodedPath.contains("/auth/")) {
            appLogger.i(TAG, "Got 401, attempting token refresh")

            val refreshed = runBlocking { attemptTokenRefresh() }
            if (refreshed) {
                appLogger.i(TAG, "Token refreshed, retrying request")
                response.close()

                // Retry with new token
                val newToken = runBlocking { tokenManager.getAccessToken() }
                val newRequest = request.newBuilder()
                    .removeHeader("Authorization")
                    .addHeader("Authorization", "Bearer $newToken")
                    .build()
                return chain.proceed(newRequest)
            } else {
                appLogger.w(TAG, "Token refresh failed, returning 401")
            }
        }

        return response
    }

    private suspend fun attemptTokenRefresh(): Boolean {
        val refreshToken = tokenManager.getRefreshToken() ?: return false

        return try {
            val json = JSONObject().put("refreshToken", refreshToken).toString()
            val body = json.toRequestBody("application/json".toMediaType())
            val refreshRequest = Request.Builder()
                .url("${BuildConfig.API_BASE_URL}/auth/refresh")
                .post(body)
                .build()

            val response = refreshClient.newCall(refreshRequest).execute()
            if (response.isSuccessful) {
                val responseBody = response.body?.string()
                if (responseBody != null) {
                    val data = JSONObject(responseBody).getJSONObject("data")
                    val newAccessToken = data.getString("accessToken")
                    val newRefreshToken = data.getString("refreshToken")
                    tokenManager.saveTokens(newAccessToken, newRefreshToken)
                    true
                } else false
            } else {
                appLogger.e(TAG, "Refresh endpoint returned ${response.code}")
                if (response.code == 401) {
                    // Refresh token is also expired — need to re-authenticate
                    tokenManager.clearTokens()
                }
                false
            }
        } catch (e: Exception) {
            appLogger.e(TAG, "Token refresh error", e)
            false
        }
    }
}
