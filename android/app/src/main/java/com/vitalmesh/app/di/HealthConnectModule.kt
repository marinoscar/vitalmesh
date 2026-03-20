package com.vitalmesh.app.di

import android.content.Context
import com.vitalmesh.app.data.healthconnect.HealthConnectManager
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object HealthConnectModule {

    @Provides
    @Singleton
    fun provideHealthConnectManager(
        @ApplicationContext context: Context,
    ): HealthConnectManager {
        return HealthConnectManager(context)
    }
}
