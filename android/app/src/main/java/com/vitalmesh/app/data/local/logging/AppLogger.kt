package com.vitalmesh.app.data.local.logging

import android.content.Context
import android.util.Log
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import javax.inject.Inject
import javax.inject.Singleton

enum class LogLevel(val priority: Int, val label: String) {
    VERBOSE(0, "V"),
    DEBUG(1, "D"),
    INFO(2, "I"),
    WARN(3, "W"),
    ERROR(4, "E"),
    OFF(5, "OFF");
}

data class LogEntry(
    val timestamp: Instant,
    val level: LogLevel,
    val tag: String,
    val message: String,
    val throwable: String? = null,
)

@Singleton
class AppLogger @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    private val _logs = MutableStateFlow<List<LogEntry>>(emptyList())
    val logs: StateFlow<List<LogEntry>> = _logs.asStateFlow()

    private var _level = MutableStateFlow(LogLevel.INFO)
    val level: StateFlow<LogLevel> = _level.asStateFlow()

    private val maxEntries = 2000

    private val formatter = DateTimeFormatter.ofPattern("HH:mm:ss.SSS")
        .withZone(ZoneId.systemDefault())

    fun setLevel(level: LogLevel) {
        _level.value = level
        if (level != LogLevel.OFF) {
            i("AppLogger", "Log level set to ${level.label}")
        }
    }

    fun v(tag: String, message: String, throwable: Throwable? = null) = log(LogLevel.VERBOSE, tag, message, throwable)
    fun d(tag: String, message: String, throwable: Throwable? = null) = log(LogLevel.DEBUG, tag, message, throwable)
    fun i(tag: String, message: String, throwable: Throwable? = null) = log(LogLevel.INFO, tag, message, throwable)
    fun w(tag: String, message: String, throwable: Throwable? = null) = log(LogLevel.WARN, tag, message, throwable)
    fun e(tag: String, message: String, throwable: Throwable? = null) = log(LogLevel.ERROR, tag, message, throwable)

    private fun log(level: LogLevel, tag: String, message: String, throwable: Throwable? = null) {
        // Always log to Android logcat
        when (level) {
            LogLevel.VERBOSE -> Log.v(tag, message, throwable)
            LogLevel.DEBUG -> Log.d(tag, message, throwable)
            LogLevel.INFO -> Log.i(tag, message, throwable)
            LogLevel.WARN -> Log.w(tag, message, throwable)
            LogLevel.ERROR -> Log.e(tag, message, throwable)
            LogLevel.OFF -> return
        }

        // Skip in-memory storage if level is below threshold or OFF
        if (_level.value == LogLevel.OFF || level.priority < _level.value.priority) return

        val entry = LogEntry(
            timestamp = Instant.now(),
            level = level,
            tag = tag,
            message = message,
            throwable = throwable?.stackTraceToString(),
        )

        synchronized(this) {
            val current = _logs.value.toMutableList()
            current.add(entry)
            // Trim if exceeding max
            if (current.size > maxEntries) {
                _logs.value = current.drop(current.size - maxEntries)
            } else {
                _logs.value = current
            }
        }
    }

    fun clear() {
        _logs.value = emptyList()
    }

    fun getLogsAsText(): String {
        return _logs.value.joinToString("\n") { entry ->
            val time = formatter.format(entry.timestamp)
            val throwableStr = entry.throwable?.let { "\n  $it" } ?: ""
            "$time ${entry.level.label}/${entry.tag}: ${entry.message}$throwableStr"
        }
    }

    fun getEntryCount(): Int = _logs.value.size
}
