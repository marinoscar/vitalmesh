package com.vitalmesh.app.sync

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import com.vitalmesh.app.data.local.db.dao.SyncQueueDao
import com.vitalmesh.app.data.local.logging.AppLogger
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ConnectivityRetryCallback @Inject constructor(
    private val syncQueueDao: SyncQueueDao,
    private val appLogger: AppLogger,
) {
    companion object {
        private const val TAG = "ConnectivityRetry"
    }

    private var registered = false

    fun register(context: Context) {
        if (registered) return
        registered = true

        val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val request = NetworkRequest.Builder()
            .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            .build()

        connectivityManager.registerNetworkCallback(request, object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) {
                appLogger.d(TAG, "Network available, checking pending queue")
                CoroutineScope(Dispatchers.IO).launch {
                    val pendingCount = syncQueueDao.getPendingCount()
                    if (pendingCount > 0) {
                        appLogger.i(TAG, "$pendingCount pending entries, enqueuing retry sync")
                        SyncWorker.enqueueRetrySync(context)
                    }
                }
            }
        })

        appLogger.d(TAG, "Registered connectivity callback")
    }
}
