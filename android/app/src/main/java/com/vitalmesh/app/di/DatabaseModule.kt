package com.vitalmesh.app.di

import android.content.Context
import androidx.room.Room
import com.vitalmesh.app.data.local.db.VitalMeshDatabase
import com.vitalmesh.app.data.local.db.dao.SyncQueueDao
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
        ).build()
    }

    @Provides
    fun provideSyncQueueDao(database: VitalMeshDatabase): SyncQueueDao {
        return database.syncQueueDao()
    }
}
