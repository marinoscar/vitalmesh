package com.vitalmesh.app.data.local.db.dao

import androidx.room.*
import com.vitalmesh.app.data.local.db.entity.SyncQueueEntry

@Dao
interface SyncQueueDao {
    @Query("SELECT * FROM sync_queue WHERE status = 'pending' ORDER BY created_at ASC LIMIT :limit")
    suspend fun getPendingEntries(limit: Int = 50): List<SyncQueueEntry>

    @Insert
    suspend fun insert(entry: SyncQueueEntry): Long

    @Insert
    suspend fun insertAll(entries: List<SyncQueueEntry>)

    @Update
    suspend fun update(entry: SyncQueueEntry)

    @Query("DELETE FROM sync_queue WHERE id = :id")
    suspend fun deleteById(id: Long)

    @Query("DELETE FROM sync_queue WHERE status = 'pending' AND data_type = :dataType")
    suspend fun deleteByType(dataType: String)

    @Query("SELECT COUNT(*) FROM sync_queue WHERE status = 'pending'")
    suspend fun getPendingCount(): Int

    @Query("UPDATE sync_queue SET status = 'failed', last_error = :error, retry_count = retry_count + 1 WHERE id = :id")
    suspend fun markFailed(id: Long, error: String)

    @Query("UPDATE sync_queue SET status = 'sending' WHERE id = :id")
    suspend fun markSending(id: Long)
}
