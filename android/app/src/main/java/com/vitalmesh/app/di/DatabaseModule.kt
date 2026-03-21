package com.vitalmesh.app.di

import android.content.Context
import androidx.room.Room
import com.vitalmesh.app.data.local.db.VitalMeshDatabase
import com.vitalmesh.app.data.local.db.dao.CachedDailySummaryDao
import com.vitalmesh.app.data.local.db.dao.SyncHistoryDao
import com.vitalmesh.app.data.local.db.dao.SyncQueueDao
import com.vitalmesh.app.data.local.db.dao.SyncStateLocalDao
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): VitalMeshDatabase {
        return Room.databaseBuilder(
            context,
            VitalMeshDatabase::class.java,
            "vitalmesh.db"
        ).fallbackToDestructiveMigration().build()
    }

    @Provides
    fun provideSyncQueueDao(database: VitalMeshDatabase): SyncQueueDao {
        return database.syncQueueDao()
    }

    @Provides
    fun provideCachedDailySummaryDao(database: VitalMeshDatabase): CachedDailySummaryDao {
        return database.cachedDailySummaryDao()
    }

    @Provides
    fun provideSyncStateLocalDao(database: VitalMeshDatabase): SyncStateLocalDao {
        return database.syncStateLocalDao()
    }

    @Provides
    fun provideSyncHistoryDao(database: VitalMeshDatabase): SyncHistoryDao {
        return database.syncHistoryDao()
    }
}
