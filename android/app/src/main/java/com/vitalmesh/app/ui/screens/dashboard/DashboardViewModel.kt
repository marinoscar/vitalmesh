package com.vitalmesh.app.ui.screens.dashboard

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.vitalmesh.app.data.repository.HealthDataRepository
import com.vitalmesh.app.domain.model.HealthSummary
import com.vitalmesh.app.sync.SyncManager
import com.vitalmesh.app.sync.SyncWorker
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.time.LocalDate
import javax.inject.Inject

data class DashboardUiState(
    val isLoading: Boolean = true,
    val isSyncing: Boolean = false,
    val summary: HealthSummary = HealthSummary(),
    val selectedDate: LocalDate = LocalDate.now(),
    val error: String? = null,
    val syncError: String? = null,
)

@HiltViewModel
class DashboardViewModel @Inject constructor(
    private val healthDataRepository: HealthDataRepository,
    private val syncManager: SyncManager,
    @ApplicationContext private val context: Context,
) : ViewModel() {

    private val _state = MutableStateFlow(DashboardUiState())
    val state: StateFlow<DashboardUiState> = _state.asStateFlow()

    init {
        // Start periodic sync on first dashboard load
        SyncWorker.enqueuePeriodicSync(context)
        // Sync then load
        syncAndLoad()
    }

    private fun syncAndLoad() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, isSyncing = true, error = null, syncError = null) }

            // Sync from Health Connect to API
            try {
                val report = syncManager.performFullSync()
                _state.update {
                    it.copy(
                        isSyncing = false,
                        syncError = if (report.hasErrors) "Sync had ${report.errors.size} error(s)" else null,
                    )
                }
            } catch (e: Exception) {
                _state.update { it.copy(isSyncing = false, syncError = e.message) }
            }

            // Load summary from API
            loadSummaryInternal(_state.value.selectedDate)
        }
    }

    private suspend fun loadSummaryInternal(date: LocalDate) {
        val dateStr = date.atStartOfDay().toString() + "Z"
        val result = healthDataRepository.getSummary(dateStr, "day")
        result.fold(
            onSuccess = { summary ->
                _state.update { it.copy(isLoading = false, summary = summary) }
            },
            onFailure = { error ->
                _state.update { it.copy(isLoading = false, error = error.message) }
            }
        )
    }

    fun loadSummary(date: LocalDate = _state.value.selectedDate) {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null, selectedDate = date) }
            loadSummaryInternal(date)
        }
    }

    fun onDateChanged(date: LocalDate) {
        loadSummary(date)
    }

    fun refresh() {
        syncAndLoad()
    }
}
