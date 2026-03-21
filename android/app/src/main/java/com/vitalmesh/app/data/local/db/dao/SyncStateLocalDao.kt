package com.vitalmesh.app.data.local.db.dao

import androidx.room.*
import com.vitalmesh.app.data.local.db.entity.SyncStateLocal

@Dao
interface SyncStateLocalDao {
    @Query("SELECT * FROM sync_state_local WHERE data_type = :dataType")
    suspend fun getByType(dataType: String): SyncStateLocal?

    @Query("SELECT * FROM sync_state_local")
    suspend fun getAll(): List<SyncStateLocal>

    @Upsert
    suspend fun upsert(state: SyncStateLocal)

    @Query("""
        UPDATE sync_state_local
        SET last_sync_at = :syncedAt,
            last_record_timestamp = :lastRecordTimestamp,
            records_synced = records_synced + :count
        WHERE data_type = :dataType
    """)
    suspend fun updateAfterSync(dataType: String, syncedAt: Long, lastRecordTimestamp: Long, count: Long)
}
