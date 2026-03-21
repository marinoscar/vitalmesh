package com.vitalmesh.app.ui.screens.splash

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.vitalmesh.app.data.healthconnect.HealthConnectManager
import com.vitalmesh.app.data.local.logging.AppLogger
import com.vitalmesh.app.data.repository.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

enum class SplashState {
    Loading, Authenticated, NeedsPermissions, Unauthenticated
}

@HiltViewModel
class SplashViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val healthConnectManager: HealthConnectManager,
    private val appLogger: AppLogger,
) : ViewModel() {

    private val _state = MutableStateFlow(SplashState.Loading)
    val state: StateFlow<SplashState> = _state.asStateFlow()

    companion object {
        private const val TAG = "SplashViewModel"
    }

    init {
        checkAuthAndPermissions()
    }

    private fun checkAuthAndPermissions() {
        viewModelScope.launch {
            val loggedIn = authRepository.isLoggedIn()
            appLogger.i(TAG, "Auth check: loggedIn=$loggedIn")

            if (!loggedIn) {
                _state.value = SplashState.Unauthenticated
                return@launch
            }

            // Check Health Connect permissions
            try {
                val available = healthConnectManager.isAvailable()
                appLogger.i(TAG, "Health Connect available: $available")

                if (available) {
                    val granted = healthConnectManager.getGrantedPermissions()
                    appLogger.i(TAG, "Health Connect permissions granted: ${granted.size}")

                    if (granted.isEmpty()) {
                        appLogger.w(TAG, "No HC permissions granted, routing to permissions screen")
                        _state.value = SplashState.NeedsPermissions
                        return@launch
                    }
                }
            } catch (e: Exception) {
                appLogger.w(TAG, "Failed to check HC permissions, proceeding to dashboard", e)
            }

            _state.value = SplashState.Authenticated
        }
    }
}
