package com.vitalmesh.app.ui.screens.sync

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.vitalmesh.app.data.repository.HealthDataRepository
import com.vitalmesh.app.sync.SyncWorker
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class SyncStatusUiState(
    val isLoading: Boolean = true,
    val isSyncing: Boolean = false,
    val lastSyncAt: String? = null,
    val dataTypes: List<DataTypeSyncStatus> = emptyList(),
    val error: String? = null,
)

data class DataTypeSyncStatus(
    val dataType: String,
    val recordsSynced: Long,
    val lastSyncAt: String?,
    val status: String,
    val errorMessage: String?,
)

@HiltViewModel
class SyncStatusViewModel @Inject constructor(
    private val healthDataRepository: HealthDataRepository,
    @ApplicationContext private val context: Context,
) : ViewModel() {

    private val _state = MutableStateFlow(SyncStatusUiState())
    val state: StateFlow<SyncStatusUiState> = _state.asStateFlow()

    init {
        loadSyncState()
    }

    fun loadSyncState() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true) }
            val result = healthDataRepository.getSyncState()
            result.fold(
                onSuccess = { states ->
                    _state.update {
                        it.copy(
                            isLoading = false,
                            dataTypes = states.map { s ->
                                DataTypeSyncStatus(
                                    dataType = s.dataType,
                                    recordsSynced = s.recordsSynced,
                                    lastSyncAt = s.lastSyncAt,
                                    status = s.syncStatus,
                                    errorMessage = s.errorMessage,
                                )
                            }
                        )
                    }
                },
                onFailure = { error ->
                    _state.update { it.copy(isLoading = false, error = error.message) }
                }
            )
        }
    }

    fun syncNow() {
        _state.update { it.copy(isSyncing = true) }
        SyncWorker.enqueueOneTimeSync(context)
        // The sync result will be reflected when we reload
        viewModelScope.launch {
            kotlinx.coroutines.delay(2000)
            _state.update { it.copy(isSyncing = false) }
            loadSyncState()
        }
    }
}
