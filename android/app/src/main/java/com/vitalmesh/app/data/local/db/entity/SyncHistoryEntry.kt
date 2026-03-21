package com.vitalmesh.app.data.local.db.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "sync_history")
data class SyncHistoryEntry(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,

    @ColumnInfo(name = "started_at") val startedAt: Long,
    @ColumnInfo(name = "completed_at") val completedAt: Long? = null,
    @ColumnInfo(name = "records_synced") val recordsSynced: Int = 0,
    @ColumnInfo(name = "records_failed") val recordsFailed: Int = 0,
    @ColumnInfo(name = "errors") val errors: String? = null,
    @ColumnInfo(name = "status") val status: String = "running", // running, success, partial, failed
    @ColumnInfo(name = "duration_ms") val durationMs: Long? = null,
)
