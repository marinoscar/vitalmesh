package com.vitalmesh.app.data.local.db.dao

import androidx.room.*
import com.vitalmesh.app.data.local.db.entity.CachedDailySummary

@Dao
interface CachedDailySummaryDao {
    @Query("SELECT * FROM cached_daily_summary WHERE date = :date")
    suspend fun getByDate(date: String): CachedDailySummary?

    @Upsert
    suspend fun upsert(summary: CachedDailySummary)

    @Query("DELETE FROM cached_daily_summary WHERE updated_at < :cutoffMs")
    suspend fun cleanupOlderThan(cutoffMs: Long)
}
