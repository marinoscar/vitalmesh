package com.vitalmesh.app.data.local.preferences

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

private val Context.syncDataStore: DataStore<Preferences> by preferencesDataStore(name = "sync_preferences")

@Singleton
class SyncPreferences @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    companion object {
        private val KEY_SYNC_RANGE_DAYS = intPreferencesKey("sync_range_days")
        const val DEFAULT_SYNC_RANGE_DAYS = 30
    }

    val syncRangeDaysFlow: Flow<Int> = context.syncDataStore.data.map { prefs ->
        prefs[KEY_SYNC_RANGE_DAYS] ?: DEFAULT_SYNC_RANGE_DAYS
    }

    suspend fun setSyncRangeDays(days: Int) {
        require(days in listOf(7, 30, 90, 180, -1)) { "Invalid sync range: $days" }
        context.syncDataStore.edit { prefs ->
            prefs[KEY_SYNC_RANGE_DAYS] = days
        }
    }
}
