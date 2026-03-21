package com.vitalmesh.app.data.healthconnect

import androidx.health.connect.client.records.*
import androidx.health.connect.client.records.MealType
import com.vitalmesh.app.data.remote.api.dto.*
import java.util.UUID

/**
 * Maps Health Connect records to VitalMesh API DTOs.
 * Handles all 50+ HC record types across metrics, sleep, exercise, nutrition, and cycle endpoints.
 */
object RecordMapper {

    // Map a Record to a list of SyncMetricItem (some records produce multiple items)
    fun toMetricItems(record: Record): List<SyncMetricItem> {
        return when (record) {
            // === INSTANTANEOUS RECORDS ===
            is WeightRecord -> listOf(instantaneous(record, "weight", record.weight.inKilograms, "kg"))
            is HeightRecord -> listOf(instantaneous(record, "height", record.height.inMeters, "m"))
            is BodyFatRecord -> listOf(instantaneous(record, "body_fat", record.percentage.value, "%"))
            is BoneMassRecord -> listOf(instantaneous(record, "bone_mass", record.mass.inKilograms, "kg"))
            is LeanBodyMassRecord -> listOf(instantaneous(record, "lean_body_mass", record.mass.inKilograms, "kg"))
            is BodyWaterMassRecord -> listOf(instantaneous(record, "body_water_mass", record.mass.inKilograms, "kg"))
            is BasalMetabolicRateRecord -> listOf(instantaneous(record, "bmr", record.basalMetabolicRate.inKilocaloriesPerDay, "kcal/day"))
            is Vo2MaxRecord -> listOf(instantaneous(record, "vo2_max", record.vo2MillilitersPerMinuteKilogram, "mL/kg/min"))
            is OxygenSaturationRecord -> listOf(instantaneous(record, "spo2", record.percentage.value, "%"))
            is RespiratoryRateRecord -> listOf(instantaneous(record, "respiratory_rate", record.rate, "brpm"))
            is RestingHeartRateRecord -> listOf(instantaneous(record, "resting_heart_rate", record.beatsPerMinute.toDouble(), "bpm"))
            is HeartRateVariabilityRmssdRecord -> listOf(instantaneous(record, "hrv_rmssd", record.heartRateVariabilityMillis, "ms"))

            is BloodPressureRecord -> {
                val groupId = UUID.randomUUID().toString()
                val tags = buildMap<String, Any> {
                    record.bodyPosition?.let { put("body_position", it.toString()) }
                    record.measurementLocation?.let { put("measurement_location", it.toString()) }
                }
                listOf(
                    instantaneous(record, "systolic_bp", record.systolic.inMillimetersOfMercury, "mmHg", groupId, tags.ifEmpty { null }),
                    instantaneous(record, "diastolic_bp", record.diastolic.inMillimetersOfMercury, "mmHg", groupId, tags.ifEmpty { null }),
                )
            }

            is BloodGlucoseRecord -> {
                val tags = buildMap<String, Any> {
                    record.specimenSource?.let { put("specimen_source", it.toString()) }
                    record.mealType?.let { put("meal_type", it.toString()) }
                    record.relationToMeal?.let { put("relation_to_meal", it.toString()) }
                }
                listOf(instantaneous(record, "blood_glucose", record.level.inMillimolesPerLiter, "mmol/L", tags = tags.ifEmpty { null }))
            }

            is BodyTemperatureRecord -> {
                val tags = record.measurementLocation?.let { mapOf("measurement_location" to it.toString()) }
                listOf(instantaneous(record, "body_temperature", record.temperature.inCelsius, "C", tags = tags))
            }

            is BasalBodyTemperatureRecord -> {
                val tags = record.measurementLocation?.let { mapOf("measurement_location" to it.toString()) }
                listOf(instantaneous(record, "basal_body_temperature", record.temperature.inCelsius, "C", tags = tags))
            }

            // === INTERVAL RECORDS ===
            is StepsRecord -> listOf(interval(record, "steps", record.count.toDouble(), "count"))
            is ActiveCaloriesBurnedRecord -> listOf(interval(record, "active_calories", record.energy.inKilocalories, "kcal"))
            is TotalCaloriesBurnedRecord -> listOf(interval(record, "total_calories", record.energy.inKilocalories, "kcal"))
            is DistanceRecord -> listOf(interval(record, "distance", record.distance.inKilometers, "km"))
            is ElevationGainedRecord -> listOf(interval(record, "elevation_gained", record.elevation.inMeters, "m"))
            is FloorsClimbedRecord -> listOf(interval(record, "floors_climbed", record.floors.toDouble(), "count"))
            is HydrationRecord -> listOf(interval(record, "hydration", record.volume.inLiters, "L"))
            is WheelchairPushesRecord -> listOf(interval(record, "wheelchair_pushes", record.count.toDouble(), "count"))

            // === SERIES RECORDS (multiple samples per record) ===
            is HeartRateRecord -> record.samples.map { sample ->
                SyncMetricItem(
                    metric = "heart_rate",
                    value = sample.beatsPerMinute.toDouble(),
                    unit = "bpm",
                    timestamp = sample.time.toString(),
                    clientRecordId = "${record.metadata.id}-${sample.time.toEpochMilli()}",
                    dataOrigin = record.metadata.dataOrigin.packageName,
                    recordingMethod = record.metadata.recordingMethod.toString(),
                )
            }

            is SpeedRecord -> record.samples.map { sample ->
                SyncMetricItem(
                    metric = "speed",
                    value = sample.speed.inMetersPerSecond,
                    unit = "m/s",
                    timestamp = sample.time.toString(),
                    clientRecordId = "${record.metadata.id}-${sample.time.toEpochMilli()}",
                    dataOrigin = record.metadata.dataOrigin.packageName,
                )
            }

            is PowerRecord -> record.samples.map { sample ->
                SyncMetricItem(
                    metric = "power",
                    value = sample.power.inWatts,
                    unit = "W",
                    timestamp = sample.time.toString(),
                    clientRecordId = "${record.metadata.id}-${sample.time.toEpochMilli()}",
                    dataOrigin = record.metadata.dataOrigin.packageName,
                )
            }

            is StepsCadenceRecord -> record.samples.map { sample ->
                SyncMetricItem(
                    metric = "steps_cadence",
                    value = sample.rate,
                    unit = "rpm",
                    timestamp = sample.time.toString(),
                    clientRecordId = "${record.metadata.id}-${sample.time.toEpochMilli()}",
                    dataOrigin = record.metadata.dataOrigin.packageName,
                )
            }

            is CyclingPedalingCadenceRecord -> record.samples.map { sample ->
                SyncMetricItem(
                    metric = "cycling_cadence",
                    value = sample.revolutionsPerMinute,
                    unit = "rpm",
                    timestamp = sample.time.toString(),
                    clientRecordId = "${record.metadata.id}-${sample.time.toEpochMilli()}",
                    dataOrigin = record.metadata.dataOrigin.packageName,
                )
            }

            is SkinTemperatureRecord -> record.deltas.map { delta ->
                SyncMetricItem(
                    metric = "skin_temperature_delta",
                    value = delta.delta.inCelsius,
                    unit = "C",
                    timestamp = delta.time.toString(),
                    clientRecordId = "${record.metadata.id}-${delta.time.toEpochMilli()}",
                    dataOrigin = record.metadata.dataOrigin.packageName,
                    tags = record.baseline?.let { mapOf("baseline_celsius" to it.inCelsius) },
                )
            }

            else -> emptyList() // Non-metric records handled by other mappers
        }
    }

    // Map SleepSessionRecord to SyncSleepSession
    fun toSleepSession(record: SleepSessionRecord): SyncSleepSession {
        return SyncSleepSession(
            startTime = record.startTime.toString(),
            endTime = record.endTime.toString(),
            durationMs = java.time.Duration.between(record.startTime, record.endTime).toMillis(),
            title = record.title,
            notes = record.notes,
            stages = record.stages.map { stage ->
                SyncSleepStage(
                    stage = mapSleepStageType(stage.stage),
                    startTime = stage.startTime.toString(),
                    endTime = stage.endTime.toString(),
                )
            },
            clientRecordId = record.metadata.id,
            dataOrigin = record.metadata.dataOrigin.packageName,
            recordingMethod = record.metadata.recordingMethod.toString(),
            zoneOffset = record.startZoneOffset?.toString(),
            endZoneOffset = record.endZoneOffset?.toString(),
        )
    }

    // Map ExerciseSessionRecord to SyncExerciseSession
    fun toExerciseSession(record: ExerciseSessionRecord): SyncExerciseSession {
        val attributes = buildMap<String, Any> {
            record.segments.takeIf { it.isNotEmpty() }?.let { segments ->
                put("segments", segments.map { seg ->
                    mapOf(
                        "type" to seg.segmentType.toString(),
                        "startTime" to seg.startTime.toString(),
                        "endTime" to seg.endTime.toString(),
                        "repetitions" to seg.repetitions,
                    )
                })
            }
            record.laps.takeIf { it.isNotEmpty() }?.let { laps ->
                put("laps", laps.map { lap ->
                    mapOf(
                        "startTime" to lap.startTime.toString(),
                        "endTime" to lap.endTime.toString(),
                    )
                })
            }
            // Note: Route data is accessed via ExerciseRouteRecord (separate record type).
            // It is not a direct property of ExerciseSessionRecord in HC 1.1.0.
        }

        return SyncExerciseSession(
            exerciseType = mapExerciseType(record.exerciseType),
            startTime = record.startTime.toString(),
            endTime = record.endTime.toString(),
            title = record.title,
            attributes = attributes,
            clientRecordId = record.metadata.id,
            dataOrigin = record.metadata.dataOrigin.packageName,
            recordingMethod = record.metadata.recordingMethod.toString(),
            notes = record.notes,
            zoneOffset = record.startZoneOffset?.toString(),
            endZoneOffset = record.endZoneOffset?.toString(),
        )
    }

    // Map NutritionRecord to SyncNutritionEntry
    fun toNutritionEntry(record: NutritionRecord): SyncNutritionEntry {
        val nutrients = buildMap<String, Double> {
            record.energy?.let { put("energy_kcal", it.inKilocalories) }
            record.protein?.let { put("protein_g", it.inGrams) }
            record.totalFat?.let { put("total_fat_g", it.inGrams) }
            record.saturatedFat?.let { put("saturated_fat_g", it.inGrams) }
            record.unsaturatedFat?.let { put("unsaturated_fat_g", it.inGrams) }
            record.transFat?.let { put("trans_fat_g", it.inGrams) }
            record.cholesterol?.let { put("cholesterol_mg", it.inMilligrams) }
            record.sodium?.let { put("sodium_mg", it.inMilligrams) }
            record.potassium?.let { put("potassium_mg", it.inMilligrams) }
            record.totalCarbohydrate?.let { put("total_carbohydrate_g", it.inGrams) }
            record.dietaryFiber?.let { put("dietary_fiber_g", it.inGrams) }
            record.sugar?.let { put("sugar_g", it.inGrams) }
            record.vitaminA?.let { put("vitamin_a_mcg", it.inMicrograms) }
            record.vitaminC?.let { put("vitamin_c_mg", it.inMilligrams) }
            record.vitaminB6?.let { put("vitamin_b6_mg", it.inMilligrams) }
            record.calcium?.let { put("calcium_mg", it.inMilligrams) }
            record.iron?.let { put("iron_mg", it.inMilligrams) }
        }

        return SyncNutritionEntry(
            startTime = record.startTime.toString(),
            endTime = record.endTime.toString(),
            mealType = mapMealType(record.mealType),
            name = record.name,
            nutrients = nutrients,
            clientRecordId = record.metadata.id,
            dataOrigin = record.metadata.dataOrigin.packageName,
            zoneOffset = record.startZoneOffset?.toString(),
            endZoneOffset = record.endZoneOffset?.toString(),
        )
    }

    // Map cycle tracking records to SyncCycleEvent
    fun toCycleEvent(record: Record): SyncCycleEvent? {
        return when (record) {
            is MenstruationFlowRecord -> SyncCycleEvent(
                eventType = "menstruation_flow",
                timestamp = record.time.toString(),
                data = mapOf("flow" to mapMenstruationFlow(record.flow)),
                clientRecordId = record.metadata.id,
                dataOrigin = record.metadata.dataOrigin.packageName,
                zoneOffset = record.zoneOffset?.toString(),
            )
            is MenstruationPeriodRecord -> SyncCycleEvent(
                eventType = "menstruation_period",
                timestamp = record.startTime.toString(),
                endTime = record.endTime.toString(),
                data = emptyMap(),
                clientRecordId = record.metadata.id,
                dataOrigin = record.metadata.dataOrigin.packageName,
                zoneOffset = record.startZoneOffset?.toString(),
                endZoneOffset = record.endZoneOffset?.toString(),
            )
            is OvulationTestRecord -> SyncCycleEvent(
                eventType = "ovulation_test",
                timestamp = record.time.toString(),
                data = mapOf("result" to mapOvulationResult(record.result)),
                clientRecordId = record.metadata.id,
                dataOrigin = record.metadata.dataOrigin.packageName,
                zoneOffset = record.zoneOffset?.toString(),
            )
            is CervicalMucusRecord -> SyncCycleEvent(
                eventType = "cervical_mucus",
                timestamp = record.time.toString(),
                data = buildMap<String, Any> {
                    record.appearance?.let { put("texture", mapCervicalMucusTexture(it)) }
                    record.sensation?.let { put("sensation", mapCervicalMucusSensation(it)) }
                },
                clientRecordId = record.metadata.id,
                dataOrigin = record.metadata.dataOrigin.packageName,
                zoneOffset = record.zoneOffset?.toString(),
            )
            is IntermenstrualBleedingRecord -> SyncCycleEvent(
                eventType = "intermenstrual_bleeding",
                timestamp = record.time.toString(),
                data = emptyMap(),
                clientRecordId = record.metadata.id,
                dataOrigin = record.metadata.dataOrigin.packageName,
                zoneOffset = record.zoneOffset?.toString(),
            )
            is SexualActivityRecord -> SyncCycleEvent(
                eventType = "sexual_activity",
                timestamp = record.time.toString(),
                data = buildMap { record.protectionUsed?.let { put("protection_used", it.toString()) } },
                clientRecordId = record.metadata.id,
                dataOrigin = record.metadata.dataOrigin.packageName,
                zoneOffset = record.zoneOffset?.toString(),
            )
            else -> null
        }
    }

    // === Helper functions ===

    private fun instantaneous(
        record: Record,
        metric: String,
        value: Double,
        unit: String,
        groupId: String? = null,
        tags: Map<String, Any>? = null,
    ): SyncMetricItem {
        val meta = record.metadata
        val time = when (record) {
            is WeightRecord -> record.time
            is HeightRecord -> record.time
            is BodyFatRecord -> record.time
            is BoneMassRecord -> record.time
            is LeanBodyMassRecord -> record.time
            is BodyWaterMassRecord -> record.time
            is BasalMetabolicRateRecord -> record.time
            is Vo2MaxRecord -> record.time
            is BloodPressureRecord -> record.time
            is BloodGlucoseRecord -> record.time
            is BodyTemperatureRecord -> record.time
            is BasalBodyTemperatureRecord -> record.time
            is OxygenSaturationRecord -> record.time
            is RespiratoryRateRecord -> record.time
            is RestingHeartRateRecord -> record.time
            is HeartRateVariabilityRmssdRecord -> record.time
            else -> java.time.Instant.now()
        }

        return SyncMetricItem(
            metric = metric,
            value = value,
            unit = unit,
            timestamp = time.toString(),
            groupId = groupId,
            tags = tags,
            clientRecordId = meta.id,
            dataOrigin = meta.dataOrigin.packageName,
            recordingMethod = meta.recordingMethod.toString(),
        )
    }

    private fun interval(
        record: Record,
        metric: String,
        value: Double,
        unit: String,
    ): SyncMetricItem {
        val meta = record.metadata
        val (startTime, endTime) = when (record) {
            is StepsRecord -> record.startTime to record.endTime
            is ActiveCaloriesBurnedRecord -> record.startTime to record.endTime
            is TotalCaloriesBurnedRecord -> record.startTime to record.endTime
            is DistanceRecord -> record.startTime to record.endTime
            is ElevationGainedRecord -> record.startTime to record.endTime
            is FloorsClimbedRecord -> record.startTime to record.endTime
            is HydrationRecord -> record.startTime to record.endTime
            is WheelchairPushesRecord -> record.startTime to record.endTime
            else -> java.time.Instant.now() to java.time.Instant.now()
        }

        return SyncMetricItem(
            metric = metric,
            value = value,
            unit = unit,
            timestamp = startTime.toString(),
            endTime = endTime.toString(),
            clientRecordId = meta.id,
            dataOrigin = meta.dataOrigin.packageName,
            recordingMethod = meta.recordingMethod.toString(),
        )
    }

    private fun mapSleepStageType(stageType: Int): String {
        return when (stageType) {
            SleepSessionRecord.STAGE_TYPE_AWAKE -> "awake"
            SleepSessionRecord.STAGE_TYPE_SLEEPING -> "sleeping"
            SleepSessionRecord.STAGE_TYPE_OUT_OF_BED -> "out_of_bed"
            SleepSessionRecord.STAGE_TYPE_AWAKE_IN_BED -> "awake_in_bed"
            SleepSessionRecord.STAGE_TYPE_LIGHT -> "light"
            SleepSessionRecord.STAGE_TYPE_DEEP -> "deep"
            SleepSessionRecord.STAGE_TYPE_REM -> "rem"
            else -> "unknown"
        }
    }

    private fun mapExerciseType(type: Int): String {
        return when (type) {
            ExerciseSessionRecord.EXERCISE_TYPE_RUNNING -> "running"
            ExerciseSessionRecord.EXERCISE_TYPE_WALKING -> "walking"
            ExerciseSessionRecord.EXERCISE_TYPE_BIKING -> "cycling"
            ExerciseSessionRecord.EXERCISE_TYPE_SWIMMING_POOL -> "swimming_pool"
            ExerciseSessionRecord.EXERCISE_TYPE_SWIMMING_OPEN_WATER -> "swimming_open_water"
            ExerciseSessionRecord.EXERCISE_TYPE_YOGA -> "yoga"
            ExerciseSessionRecord.EXERCISE_TYPE_HIKING -> "hiking"
            ExerciseSessionRecord.EXERCISE_TYPE_WEIGHTLIFTING -> "weightlifting"
            ExerciseSessionRecord.EXERCISE_TYPE_PILATES -> "pilates"
            ExerciseSessionRecord.EXERCISE_TYPE_DANCING -> "dancing"
            ExerciseSessionRecord.EXERCISE_TYPE_ELLIPTICAL -> "elliptical"
            ExerciseSessionRecord.EXERCISE_TYPE_ROWING_MACHINE -> "rowing_machine"
            ExerciseSessionRecord.EXERCISE_TYPE_STAIR_CLIMBING -> "stair_climbing"
            ExerciseSessionRecord.EXERCISE_TYPE_BADMINTON -> "badminton"
            ExerciseSessionRecord.EXERCISE_TYPE_TENNIS -> "tennis"
            ExerciseSessionRecord.EXERCISE_TYPE_BASKETBALL -> "basketball"
            ExerciseSessionRecord.EXERCISE_TYPE_SOCCER -> "soccer"
            ExerciseSessionRecord.EXERCISE_TYPE_GOLF -> "golf"
            ExerciseSessionRecord.EXERCISE_TYPE_MARTIAL_ARTS -> "martial_arts"
            ExerciseSessionRecord.EXERCISE_TYPE_CALISTHENICS -> "calisthenics"
            ExerciseSessionRecord.EXERCISE_TYPE_STRETCHING -> "stretching"
            ExerciseSessionRecord.EXERCISE_TYPE_HIGH_INTENSITY_INTERVAL_TRAINING -> "hiit"
            else -> "other_${type}"
        }
    }

    private fun mapMealType(mealType: Int): String? {
        return when (mealType) {
            MealType.MEAL_TYPE_BREAKFAST -> "breakfast"
            MealType.MEAL_TYPE_LUNCH -> "lunch"
            MealType.MEAL_TYPE_DINNER -> "dinner"
            MealType.MEAL_TYPE_SNACK -> "snack"
            else -> "unknown"
        }
    }

    private fun mapMenstruationFlow(flow: Int): String {
        return when (flow) {
            MenstruationFlowRecord.FLOW_LIGHT -> "light"
            MenstruationFlowRecord.FLOW_MEDIUM -> "medium"
            MenstruationFlowRecord.FLOW_HEAVY -> "heavy"
            else -> "unknown"
        }
    }

    private fun mapOvulationResult(result: Int): String {
        return when (result) {
            OvulationTestRecord.RESULT_POSITIVE -> "positive"
            OvulationTestRecord.RESULT_HIGH -> "high"
            OvulationTestRecord.RESULT_NEGATIVE -> "negative"
            else -> "inconclusive"
        }
    }

    private fun mapCervicalMucusTexture(texture: Int): String {
        return when (texture) {
            CervicalMucusRecord.APPEARANCE_DRY -> "dry"
            CervicalMucusRecord.APPEARANCE_STICKY -> "sticky"
            CervicalMucusRecord.APPEARANCE_CREAMY -> "creamy"
            CervicalMucusRecord.APPEARANCE_WATERY -> "watery"
            CervicalMucusRecord.APPEARANCE_EGG_WHITE -> "egg_white"
            else -> "unknown"
        }
    }

    private fun mapCervicalMucusSensation(sensation: Int): String {
        return when (sensation) {
            CervicalMucusRecord.SENSATION_LIGHT -> "light"
            CervicalMucusRecord.SENSATION_MEDIUM -> "medium"
            CervicalMucusRecord.SENSATION_HEAVY -> "heavy"
            else -> "unknown"
        }
    }
}
