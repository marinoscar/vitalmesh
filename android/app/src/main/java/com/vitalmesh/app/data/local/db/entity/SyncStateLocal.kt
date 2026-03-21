package com.vitalmesh.app.data.local.db.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "sync_state_local")
data class SyncStateLocal(
    @PrimaryKey
    @ColumnInfo(name = "data_type") val dataType: String, // metrics, sleep, exercise, nutrition, cycle

    @ColumnInfo(name = "last_sync_at") val lastSyncAt: Long? = null,
    @ColumnInfo(name = "last_record_timestamp") val lastRecordTimestamp: Long? = null,
    @ColumnInfo(name = "records_synced") val recordsSynced: Long = 0,
    @ColumnInfo(name = "change_token") val changeToken: String? = null,
)
