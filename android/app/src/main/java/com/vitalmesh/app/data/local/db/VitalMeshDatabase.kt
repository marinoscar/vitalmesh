package com.vitalmesh.app.data.local.db

import androidx.room.Database
import androidx.room.RoomDatabase
import androidx.room.TypeConverters
import com.vitalmesh.app.data.local.db.converter.Converters
import com.vitalmesh.app.data.local.db.dao.CachedDailySummaryDao
import com.vitalmesh.app.data.local.db.dao.SyncHistoryDao
import com.vitalmesh.app.data.local.db.dao.SyncQueueDao
import com.vitalmesh.app.data.local.db.dao.SyncStateLocalDao
import com.vitalmesh.app.data.local.db.entity.CachedDailySummary
import com.vitalmesh.app.data.local.db.entity.SyncHistoryEntry
import com.vitalmesh.app.data.local.db.entity.SyncQueueEntry
import com.vitalmesh.app.data.local.db.entity.SyncStateLocal

@Database(
    entities = [
        SyncQueueEntry::class,
        CachedDailySummary::class,
        SyncStateLocal::class,
        SyncHistoryEntry::class,
    ],
    version = 2,
    exportSchema = false
)
@TypeConverters(Converters::class)
abstract class VitalMeshDatabase : RoomDatabase() {
    abstract fun syncQueueDao(): SyncQueueDao
    abstract fun cachedDailySummaryDao(): CachedDailySummaryDao
    abstract fun syncStateLocalDao(): SyncStateLocalDao
    abstract fun syncHistoryDao(): SyncHistoryDao
}
