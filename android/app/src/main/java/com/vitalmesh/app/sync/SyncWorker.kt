package com.vitalmesh.app.sync

import android.content.Context
import android.util.Log
import androidx.hilt.work.HiltWorker
import androidx.work.*
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject
import java.util.concurrent.TimeUnit

@HiltWorker
class SyncWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted params: WorkerParameters,
    private val syncManager: SyncManager,
) : CoroutineWorker(context, params) {

    companion object {
        const val TAG = "SyncWorker"
        const val UNIQUE_WORK_NAME = "vitalmesh_sync"
        private const val RETRY_WORK_NAME = "vitalmesh_sync_retry"

        fun enqueuePeriodicSync(context: Context, intervalMinutes: Long = 15) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

            val request = PeriodicWorkRequestBuilder<SyncWorker>(
                intervalMinutes, TimeUnit.MINUTES
            )
                .setConstraints(constraints)
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 1, TimeUnit.MINUTES)
                .addTag(TAG)
                .build()

            WorkManager.getInstance(context)
                .enqueueUniquePeriodicWork(
                    UNIQUE_WORK_NAME,
                    ExistingPeriodicWorkPolicy.KEEP,
                    request,
                )
        }

        fun enqueueOneTimeSync(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

            val request = OneTimeWorkRequestBuilder<SyncWorker>()
                .setConstraints(constraints)
                .addTag(TAG)
                .build()

            WorkManager.getInstance(context)
                .enqueue(request)
        }

        fun enqueueRetrySync(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

            val request = OneTimeWorkRequestBuilder<SyncWorker>()
                .setConstraints(constraints)
                .addTag("$TAG-retry")
                .build()

            WorkManager.getInstance(context)
                .enqueueUniqueWork(
                    RETRY_WORK_NAME,
                    ExistingWorkPolicy.KEEP,
                    request,
                )
        }

        fun cancelSync(context: Context) {
            WorkManager.getInstance(context)
                .cancelUniqueWork(UNIQUE_WORK_NAME)
        }
    }

    override suspend fun doWork(): Result {
        Log.i(TAG, "Starting health data sync")

        return try {
            // Process any queued entries first
            syncManager.processQueue()

            // Perform differential sync
            val report = syncManager.performSync()

            Log.i(TAG, "Sync complete: ${report.totalSynced} records synced")

            if (report.hasErrors) {
                Log.w(TAG, "Sync had errors: ${report.errors}")
                Result.success(workDataOf(
                    "synced" to report.totalSynced,
                    "errors" to report.errors.size,
                ))
            } else {
                Result.success(workDataOf("synced" to report.totalSynced))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Sync worker failed", e)
            if (runAttemptCount < 3) {
                Result.retry()
            } else {
                Result.failure(workDataOf("error" to (e.message ?: "Unknown error")))
            }
        }
    }
}
