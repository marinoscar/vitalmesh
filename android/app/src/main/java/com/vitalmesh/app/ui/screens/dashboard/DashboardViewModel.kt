package com.vitalmesh.app.ui.screens.dashboard

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.vitalmesh.app.data.local.logging.AppLogger
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
    val syncMessage: String? = null,
)

@HiltViewModel
class DashboardViewModel @Inject constructor(
    private val healthDataRepository: HealthDataRepository,
    private val syncManager: SyncManager,
    @ApplicationContext private val context: Context,
    private val appLogger: AppLogger,
) : ViewModel() {

    private val _state = MutableStateFlow(DashboardUiState())
    val state: StateFlow<DashboardUiState> = _state.asStateFlow()

    companion object {
        private const val TAG = "DashboardViewModel"
    }

    init {
        SyncWorker.enqueuePeriodicSync(context)
        syncAndLoad()
    }

    private fun syncAndLoad() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, isSyncing = true, error = null, syncMessage = "Reading health data...") }

            try {
                val syncStart = System.currentTimeMillis()
                appLogger.i(TAG, "Sync starting")
                val report = syncManager.performFullSync()
                val syncDuration = System.currentTimeMillis() - syncStart
                appLogger.i(TAG, "Sync complete in ${syncDuration}ms: ${report.totalSynced} synced, ${report.errors.size} errors")

                val message = buildString {
                    if (report.totalSynced > 0) {
                        append("Synced ${report.totalSynced} records")
                        val parts = mutableListOf<String>()
                        if (report.metricsSynced > 0) parts.add("${report.metricsSynced} metrics")
                        if (report.sleepSynced > 0) parts.add("${report.sleepSynced} sleep")
                        if (report.exerciseSynced > 0) parts.add("${report.exerciseSynced} exercise")
                        if (report.nutritionSynced > 0) parts.add("${report.nutritionSynced} nutrition")
                        if (report.cycleSynced > 0) parts.add("${report.cycleSynced} cycle")
                        if (parts.isNotEmpty()) append(" (${parts.joinToString(", ")})")
                    } else {
                        append("No new data to sync")
                    }
                    if (report.hasErrors) {
                        append("\n")
                        report.errors.forEach { append("\n• $it") }
                    }
                }

                _state.update { it.copy(isSyncing = false, syncMessage = message) }
            } catch (e: Exception) {
                appLogger.e(TAG, "Sync failed", e)
                _state.update { it.copy(isSyncing = false, syncMessage = "Sync failed: ${e.message}") }
            }

            loadSummaryInternal(_state.value.selectedDate)
        }
    }

    private suspend fun loadSummaryInternal(date: LocalDate) {
        val dateStr = date.atStartOfDay().toString() + "Z"
        val result = healthDataRepository.getSummary(dateStr, "day")
        result.fold(
            onSuccess = { summary ->
                appLogger.d(TAG, "Summary loaded for $date")
                _state.update { it.copy(isLoading = false, summary = summary) }
            },
            onFailure = { error ->
                appLogger.e(TAG, "Failed to load summary", error)
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
