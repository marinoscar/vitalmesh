package com.vitalmesh.app.domain.model

import java.time.Instant

data class HealthMetricRecord(
    val id: String? = null,
    val metric: String,
    val value: Double,
    val unit: String,
    val timestamp: Instant,
    val endTime: Instant? = null,
    val source: String? = null,
    val groupId: String? = null,
    val tags: Map<String, Any>? = null,
    val clientRecordId: String? = null,
    val zoneOffset: String? = null,
    val endZoneOffset: String? = null,
    val dataOrigin: String? = null,
    val recordingMethod: String? = null,
    val deviceType: String? = null,
    val metadata: Map<String, Any>? = null,
    val notes: String? = null,
)
