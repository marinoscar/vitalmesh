package com.vitalmesh.app.ui.screens.detail

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.vitalmesh.app.data.remote.api.dto.*
import com.vitalmesh.app.data.repository.HealthDataRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit
import javax.inject.Inject

enum class TimeRange(val label: String, val days: Long) {
    DAY("Day", 1),
    WEEK("Week", 7),
    MONTH("Month", 30),
    YEAR("Year", 365),
}

/** A unified record for display in the recent records list. */
data class DetailRecord(
    val id: String,
    val timestamp: String,
    val title: String,
    val subtitle: String,
    val value: String,
)

data class DetailStats(
    val min: String = "—",
    val max: String = "—",
    val avg: String = "—",
    val latest: String = "—",
)

data class DataDetailUiState(
    val isLoading: Boolean = true,
    val metric: String = "",
    val timeRange: TimeRange = TimeRange.DAY,
    val stats: DetailStats = DetailStats(),
    val records: List<DetailRecord> = emptyList(),
    val error: String? = null,
)

@HiltViewModel
class DataDetailViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val healthDataRepository: HealthDataRepository,
) : ViewModel() {

    private val metric: String = savedStateHandle["metric"] ?: ""
    private val _state = MutableStateFlow(DataDetailUiState(metric = metric))
    val state: StateFlow<DataDetailUiState> = _state.asStateFlow()

    init {
        loadData()
    }

    fun setTimeRange(range: TimeRange) {
        _state.update { it.copy(timeRange = range) }
        loadData()
    }

    private fun loadData() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }

            val range = _state.value.timeRange
            val now = Instant.now()
            val from = now.minus(range.days, ChronoUnit.DAYS)
            val fromStr = from.toString()
            val toStr = now.toString()

            try {
                when (metric) {
                    "sleep" -> loadSleep(fromStr, toStr)
                    "exercise" -> loadExercise(fromStr, toStr)
                    "nutrition" -> loadNutrition(fromStr, toStr)
                    "cycle" -> loadCycle(fromStr, toStr)
                    "systolic_bp" -> loadBloodPressure(fromStr, toStr)
                    else -> loadMetrics(metric, fromStr, toStr)
                }
            } catch (e: Exception) {
                _state.update { it.copy(isLoading = false, error = e.message) }
            }
        }
    }

    private suspend fun loadMetrics(metricName: String, from: String, to: String) {
        val result = healthDataRepository.queryMetrics(
            metric = metricName, from = from, to = to, pageSize = 100
        )
        result.fold(
            onSuccess = { records ->
                val unit = records.firstOrNull()?.unit ?: ""
                val values = records.map { it.value }
                val stats = if (values.isNotEmpty()) {
                    DetailStats(
                        min = formatMetricValue(values.min(), unit),
                        max = formatMetricValue(values.max(), unit),
                        avg = formatMetricValue(values.average(), unit),
                        latest = formatMetricValue(values.first(), unit),
                    )
                } else DetailStats()

                val displayRecords = records.map { record ->
                    DetailRecord(
                        id = record.id,
                        timestamp = record.timestamp,
                        title = formatMetricValue(record.value, record.unit),
                        subtitle = formatTimestamp(record.timestamp),
                        value = record.unit,
                    )
                }

                _state.update { it.copy(isLoading = false, stats = stats, records = displayRecords) }
            },
            onFailure = { error ->
                _state.update { it.copy(isLoading = false, error = error.message) }
            }
        )
    }

    private suspend fun loadBloodPressure(from: String, to: String) {
        val result = healthDataRepository.queryGroupedMetrics(
            metric = "systolic_bp", from = from, to = to, pageSize = 50
        )
        result.fold(
            onSuccess = { grouped ->
                val displayRecords = grouped.groups.map { group ->
                    val systolic = group.find { it.metric == "systolic_bp" }
                    val diastolic = group.find { it.metric == "diastolic_bp" }
                    val sysVal = systolic?.value?.toInt() ?: 0
                    val diaVal = diastolic?.value?.toInt() ?: 0
                    DetailRecord(
                        id = systolic?.id ?: "",
                        timestamp = systolic?.timestamp ?: "",
                        title = "$sysVal/$diaVal mmHg",
                        subtitle = formatTimestamp(systolic?.timestamp ?: ""),
                        value = "mmHg",
                    )
                }

                val systolicValues = grouped.groups.mapNotNull { g ->
                    g.find { it.metric == "systolic_bp" }?.value
                }
                val diastolicValues = grouped.groups.mapNotNull { g ->
                    g.find { it.metric == "diastolic_bp" }?.value
                }

                val stats = if (systolicValues.isNotEmpty()) {
                    DetailStats(
                        min = "${systolicValues.min().toInt()}/${diastolicValues.minOrNull()?.toInt() ?: "—"}",
                        max = "${systolicValues.max().toInt()}/${diastolicValues.maxOrNull()?.toInt() ?: "—"}",
                        avg = "${systolicValues.average().toInt()}/${diastolicValues.takeIf { it.isNotEmpty() }?.average()?.toInt() ?: "—"}",
                        latest = "${systolicValues.first().toInt()}/${diastolicValues.firstOrNull()?.toInt() ?: "—"}",
                    )
                } else DetailStats()

                _state.update { it.copy(isLoading = false, stats = stats, records = displayRecords) }
            },
            onFailure = { error ->
                // Fall back to regular metrics query
                loadMetrics("systolic_bp", from, to)
            }
        )
    }

    private suspend fun loadSleep(from: String, to: String) {
        val result = healthDataRepository.querySleep(from = from, to = to, pageSize = 50)
        result.fold(
            onSuccess = { records ->
                val durations = records.mapNotNull { it.durationMs }
                val stats = if (durations.isNotEmpty()) {
                    DetailStats(
                        min = formatDuration(durations.min()),
                        max = formatDuration(durations.max()),
                        avg = formatDuration(durations.average().toLong()),
                        latest = formatDuration(durations.first()),
                    )
                } else DetailStats()

                val displayRecords = records.map { record ->
                    val duration = record.durationMs?.let { formatDuration(it) } ?: "—"
                    val stageInfo = record.stages?.groupBy { it.stage }?.entries
                        ?.joinToString(" · ") { (stage, stages) ->
                            val mins = stages.sumOf { s ->
                                val start = Instant.parse(s.startTime).toEpochMilli()
                                val end = Instant.parse(s.endTime).toEpochMilli()
                                (end - start) / 60000
                            }
                            "${stage}: ${mins}m"
                        } ?: ""

                    DetailRecord(
                        id = record.id,
                        timestamp = record.startTime,
                        title = duration,
                        subtitle = buildString {
                            append(formatTimestamp(record.startTime))
                            if (stageInfo.isNotEmpty()) append(" — $stageInfo")
                        },
                        value = "",
                    )
                }

                _state.update { it.copy(isLoading = false, stats = stats, records = displayRecords) }
            },
            onFailure = { error ->
                _state.update { it.copy(isLoading = false, error = error.message) }
            }
        )
    }

    private suspend fun loadExercise(from: String, to: String) {
        val result = healthDataRepository.queryExercise(from = from, to = to, pageSize = 50)
        result.fold(
            onSuccess = { records ->
                val durations = records.map { r ->
                    val start = Instant.parse(r.startTime).toEpochMilli()
                    val end = Instant.parse(r.endTime).toEpochMilli()
                    end - start
                }
                val stats = if (durations.isNotEmpty()) {
                    DetailStats(
                        min = formatDuration(durations.min()),
                        max = formatDuration(durations.max()),
                        avg = formatDuration(durations.average().toLong()),
                        latest = formatDuration(durations.first()),
                    )
                } else DetailStats()

                val displayRecords = records.map { record ->
                    val start = Instant.parse(record.startTime).toEpochMilli()
                    val end = Instant.parse(record.endTime).toEpochMilli()
                    val duration = formatDuration(end - start)
                    val type = record.exerciseType.replace("_", " ").replaceFirstChar { it.uppercase() }

                    DetailRecord(
                        id = record.id,
                        timestamp = record.startTime,
                        title = record.title ?: type,
                        subtitle = "${formatTimestamp(record.startTime)} — $duration",
                        value = type,
                    )
                }

                _state.update { it.copy(isLoading = false, stats = stats, records = displayRecords) }
            },
            onFailure = { error ->
                _state.update { it.copy(isLoading = false, error = error.message) }
            }
        )
    }

    private suspend fun loadNutrition(from: String, to: String) {
        val result = healthDataRepository.queryNutrition(from = from, to = to, pageSize = 50)
        result.fold(
            onSuccess = { records ->
                val calories = records.mapNotNull { it.nutrients?.get("calories") }
                val stats = if (calories.isNotEmpty()) {
                    DetailStats(
                        min = "${calories.min().toInt()} kcal",
                        max = "${calories.max().toInt()} kcal",
                        avg = "${calories.average().toInt()} kcal",
                        latest = "${calories.first().toInt()} kcal",
                    )
                } else DetailStats()

                val displayRecords = records.map { record ->
                    val cal = record.nutrients?.get("calories")?.toInt()
                    val meal = record.mealType?.replace("_", " ")?.replaceFirstChar { it.uppercase() } ?: ""

                    DetailRecord(
                        id = record.id,
                        timestamp = record.startTime,
                        title = record.name ?: meal.ifEmpty { "Meal" },
                        subtitle = buildString {
                            append(formatTimestamp(record.startTime))
                            if (meal.isNotEmpty()) append(" — $meal")
                            cal?.let { append(" — $it kcal") }
                        },
                        value = cal?.let { "$it kcal" } ?: "",
                    )
                }

                _state.update { it.copy(isLoading = false, stats = stats, records = displayRecords) }
            },
            onFailure = { error ->
                _state.update { it.copy(isLoading = false, error = error.message) }
            }
        )
    }

    private suspend fun loadCycle(from: String, to: String) {
        val result = healthDataRepository.queryCycle(from = from, to = to, pageSize = 50)
        result.fold(
            onSuccess = { records ->
                val stats = DetailStats(latest = if (records.isNotEmpty()) "${records.size} events" else "—")

                val displayRecords = records.map { record ->
                    val type = record.eventType.replace("_", " ").replaceFirstChar { it.uppercase() }
                    DetailRecord(
                        id = record.id,
                        timestamp = record.timestamp,
                        title = type,
                        subtitle = formatTimestamp(record.timestamp),
                        value = "",
                    )
                }

                _state.update { it.copy(isLoading = false, stats = stats, records = displayRecords) }
            },
            onFailure = { error ->
                _state.update { it.copy(isLoading = false, error = error.message) }
            }
        )
    }

    companion object {
        private val displayFormatter = DateTimeFormatter.ofPattern("MMM dd, HH:mm")

        fun formatTimestamp(iso: String): String {
            return try {
                val instant = Instant.parse(iso)
                val local = instant.atZone(ZoneId.systemDefault()).toLocalDateTime()
                local.format(displayFormatter)
            } catch (e: Exception) {
                iso.take(16)
            }
        }

        fun formatMetricValue(value: Double, unit: String): String {
            val formatted = if (value == value.toLong().toDouble()) {
                value.toLong().toString()
            } else {
                String.format("%.1f", value)
            }
            return if (unit.isNotEmpty()) "$formatted $unit" else formatted
        }

        fun formatDuration(ms: Long): String {
            val totalMinutes = ms / 60000
            val hours = totalMinutes / 60
            val minutes = totalMinutes % 60
            return if (hours > 0) "${hours}h ${minutes}m" else "${minutes}m"
        }
    }
}
