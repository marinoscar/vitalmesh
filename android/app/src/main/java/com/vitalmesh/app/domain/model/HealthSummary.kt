package com.vitalmesh.app.domain.model

data class HealthSummary(
    val steps: StepsSummary = StepsSummary(),
    val heartRate: HeartRateSummary = HeartRateSummary(),
    val sleep: SleepSummary = SleepSummary(),
    val weight: WeightSummary = WeightSummary(),
    val bloodPressure: BloodPressureSummary = BloodPressureSummary(),
    val activeCalories: CaloriesSummary = CaloriesSummary(),
    val exercise: ExerciseSummary = ExerciseSummary(),
)

data class StepsSummary(val total: Double = 0.0, val average: Double = 0.0, val latest: Double? = null)
data class HeartRateSummary(val min: Double? = null, val max: Double? = null, val average: Double? = null, val resting: Double? = null, val latest: Double? = null)
data class SleepSummary(val totalDurationMs: Long = 0, val stages: Map<String, Long> = emptyMap())
data class WeightSummary(val latest: Double? = null)
data class BloodPressureSummary(val systolic: Double? = null, val diastolic: Double? = null)
data class CaloriesSummary(val total: Double = 0.0)
data class ExerciseSummary(val sessions: Int = 0, val totalDurationMs: Long = 0)
