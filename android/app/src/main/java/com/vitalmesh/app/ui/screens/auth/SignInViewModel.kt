package com.vitalmesh.app.ui.screens.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.vitalmesh.app.data.repository.AuthRepository
import com.vitalmesh.app.data.repository.DeviceAuthState
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class SignInViewModel @Inject constructor(
    private val authRepository: AuthRepository,
) : ViewModel() {

    private val _state = MutableStateFlow<DeviceAuthState>(DeviceAuthState.Idle)
    val state: StateFlow<DeviceAuthState> = _state.asStateFlow()

    private var verificationUri: String? = null

    fun startSignIn() {
        viewModelScope.launch {
            val result = authRepository.requestDeviceCode()
            result.fold(
                onSuccess = { codeResponse ->
                    verificationUri = codeResponse.verificationUri
                    _state.value = DeviceAuthState.CodeReady(
                        userCode = codeResponse.userCode,
                        verificationUri = codeResponse.verificationUri,
                    )
                    // Start polling
                    authRepository.pollForAuthorization(
                        deviceCode = codeResponse.deviceCode,
                        interval = codeResponse.interval,
                        expiresIn = codeResponse.expiresIn,
                    ).collect { authState ->
                        _state.value = authState
                    }
                },
                onFailure = { error ->
                    _state.value = DeviceAuthState.Error(error.message ?: "Failed to start sign in")
                }
            )
        }
    }

    fun retry() {
        _state.value = DeviceAuthState.Idle
        startSignIn()
    }

    fun getVerificationUri(): String? = verificationUri
}
