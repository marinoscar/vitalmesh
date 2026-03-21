package com.vitalmesh.app.data.local.db.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "cached_daily_summary")
data class CachedDailySummary(
    @PrimaryKey
    @ColumnInfo(name = "date") val date: String, // "2026-03-21"

    @ColumnInfo(name = "steps_total") val stepsTotal: Double? = null,
    @ColumnInfo(name = "steps_average") val stepsAverage: Double? = null,
    @ColumnInfo(name = "steps_latest") val stepsLatest: Double? = null,

    @ColumnInfo(name = "heart_rate_min") val heartRateMin: Double? = null,
    @ColumnInfo(name = "heart_rate_max") val heartRateMax: Double? = null,
    @ColumnInfo(name = "heart_rate_avg") val heartRateAvg: Double? = null,
    @ColumnInfo(name = "heart_rate_resting") val heartRateResting: Double? = null,
    @ColumnInfo(name = "heart_rate_latest") val heartRateLatest: Double? = null,

    @ColumnInfo(name = "sleep_duration_ms") val sleepDurationMs: Long? = null,

    @ColumnInfo(name = "weight_latest") val weightLatest: Double? = null,

    @ColumnInfo(name = "bp_systolic") val bpSystolic: Double? = null,
    @ColumnInfo(name = "bp_diastolic") val bpDiastolic: Double? = null,

    @ColumnInfo(name = "active_calories_total") val activeCaloriesTotal: Double? = null,

    @ColumnInfo(name = "exercise_sessions") val exerciseSessions: Int? = null,
    @ColumnInfo(name = "exercise_duration_ms") val exerciseDurationMs: Long? = null,

    @ColumnInfo(name = "updated_at") val updatedAt: Long = System.currentTimeMillis(),
)
