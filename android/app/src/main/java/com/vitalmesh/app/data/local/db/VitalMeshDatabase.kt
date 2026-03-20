package com.vitalmesh.app.data.local.db

import androidx.room.Database
import androidx.room.RoomDatabase
import androidx.room.TypeConverters
import com.vitalmesh.app.data.local.db.dao.SyncQueueDao
import com.vitalmesh.app.data.local.db.entity.SyncQueueEntry
import com.vitalmesh.app.data.local.db.converter.Converters

@Database(
    entities = [SyncQueueEntry::class],
    version = 1,
    exportSchema = false
)
@TypeConverters(Converters::class)
abstract class VitalMeshDatabase : RoomDatabase() {
    abstract fun syncQueueDao(): SyncQueueDao
}
