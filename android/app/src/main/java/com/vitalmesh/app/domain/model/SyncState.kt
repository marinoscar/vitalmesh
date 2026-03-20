package com.vitalmesh.app.domain.model

import java.time.Instant

data class SyncState(
    val dataType: String,
    val changeToken: String? = null,
    val lastSyncAt: Instant? = null,
    val lastRecordTime: Instant? = null,
    val recordsSynced: Long = 0,
    val syncStatus: SyncStatus = SyncStatus.IDLE,
    val errorMessage: String? = null,
)

enum class SyncStatus {
    IDLE, SYNCING, ERROR
}
