package com.vitalmesh.app.data.local.db.dao

import androidx.room.*
import com.vitalmesh.app.data.local.db.entity.SyncHistoryEntry

@Dao
interface SyncHistoryDao {
    @Insert
    suspend fun insert(entry: SyncHistoryEntry): Long

    @Query("SELECT * FROM sync_history ORDER BY started_at DESC LIMIT :limit")
    suspend fun getRecent(limit: Int = 20): List<SyncHistoryEntry>

    @Query("""
        UPDATE sync_history
        SET completed_at = :completedAt,
            records_synced = :recordsSynced,
            records_failed = :recordsFailed,
            errors = :errors,
            status = :status,
            duration_ms = :durationMs
        WHERE id = :id
    """)
    suspend fun complete(
        id: Long,
        completedAt: Long,
        recordsSynced: Int,
        recordsFailed: Int,
        errors: String?,
        status: String,
        durationMs: Long,
    )

    @Query("""
        DELETE FROM sync_history WHERE id NOT IN (
            SELECT id FROM sync_history ORDER BY started_at DESC LIMIT 50
        )
    """)
    suspend fun retainOnly50()
}
