package com.vitalmesh.app.ui.screens.sync

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.vitalmesh.app.data.local.db.dao.SyncHistoryDao
import com.vitalmesh.app.data.local.db.dao.SyncQueueDao
import com.vitalmesh.app.data.local.db.entity.SyncHistoryEntry
import com.vitalmesh.app.data.local.preferences.SyncPreferences
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
    val syncRangeDays: Int = 30,
    val syncHistory: List<SyncHistoryEntry> = emptyList(),
    val pendingQueueCount: Int = 0,
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
    private val syncPreferences: SyncPreferences,
    private val syncHistoryDao: SyncHistoryDao,
    private val syncQueueDao: SyncQueueDao,
    @ApplicationContext private val context: Context,
) : ViewModel() {

    private val _state = MutableStateFlow(SyncStatusUiState())
    val state: StateFlow<SyncStatusUiState> = _state.asStateFlow()

    init {
        loadAll()
        observeSyncRange()
    }

    private fun observeSyncRange() {
        viewModelScope.launch {
            syncPreferences.syncRangeDaysFlow.collect { days ->
                _state.update { it.copy(syncRangeDays = days) }
            }
        }
    }

    private fun loadAll() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true) }

            // Load sync state from server
            val result = healthDataRepository.getSyncState()
            result.fold(
                onSuccess = { states ->
                    _state.update {
                        it.copy(
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
                    _state.update { it.copy(error = error.message) }
                }
            )

            // Load sync history from local DB
            val history = syncHistoryDao.getRecent(20)
            val pendingCount = syncQueueDao.getPendingCount()

            _state.update {
                it.copy(
                    isLoading = false,
                    syncHistory = history,
                    pendingQueueCount = pendingCount,
                )
            }
        }
    }

    fun loadSyncState() {
        loadAll()
    }

    fun syncNow() {
        _state.update { it.copy(isSyncing = true) }
        SyncWorker.enqueueOneTimeSync(context)
        viewModelScope.launch {
            kotlinx.coroutines.delay(2000)
            _state.update { it.copy(isSyncing = false) }
            loadAll()
        }
    }

    fun setSyncRange(days: Int) {
        viewModelScope.launch {
            syncPreferences.setSyncRangeDays(days)
        }
    }
}
