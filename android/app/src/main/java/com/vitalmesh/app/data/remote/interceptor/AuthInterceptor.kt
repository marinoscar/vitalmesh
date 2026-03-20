package com.vitalmesh.app.data.remote.interceptor

import com.vitalmesh.app.data.local.preferences.TokenManager
import kotlinx.coroutines.runBlocking
import okhttp3.Interceptor
import okhttp3.Response
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthInterceptor @Inject constructor(
    private val tokenManager: TokenManager,
) : Interceptor {
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

        // Don't try to refresh for auth endpoints
        if (response.code == 401 && !request.url.encodedPath.contains("/auth/")) {
            response.close()
            // Token might be expired - the app should handle re-auth
            // Token refresh will be handled at the repository level
        }

        return response
    }
}
