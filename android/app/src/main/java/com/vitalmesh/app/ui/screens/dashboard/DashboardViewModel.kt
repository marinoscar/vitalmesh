package com.vitalmesh.app.ui.screens.dashboard

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.vitalmesh.app.data.repository.HealthDataRepository
import com.vitalmesh.app.domain.model.HealthSummary
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.time.LocalDate
import javax.inject.Inject

data class DashboardUiState(
    val isLoading: Boolean = true,
    val summary: HealthSummary = HealthSummary(),
    val selectedDate: LocalDate = LocalDate.now(),
    val error: String? = null,
)

@HiltViewModel
class DashboardViewModel @Inject constructor(
    private val healthDataRepository: HealthDataRepository,
) : ViewModel() {

    private val _state = MutableStateFlow(DashboardUiState())
    val state: StateFlow<DashboardUiState> = _state.asStateFlow()

    init {
        loadSummary()
    }

    fun loadSummary(date: LocalDate = _state.value.selectedDate) {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null, selectedDate = date) }
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
    }

    fun onDateChanged(date: LocalDate) {
        loadSummary(date)
    }

    fun refresh() {
        loadSummary()
    }
}
