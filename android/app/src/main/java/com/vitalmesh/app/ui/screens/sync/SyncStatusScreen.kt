package com.vitalmesh.app.ui.screens.sync

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SyncStatusScreen(
    onBack: () -> Unit,
    viewModel: SyncStatusViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Sync Status") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back")
                    }
                }
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier.fillMaxSize().padding(paddingValues).padding(16.dp),
        ) {
            // Sync now button
            Button(
                onClick = { viewModel.syncNow() },
                modifier = Modifier.fillMaxWidth(),
                enabled = !state.isSyncing,
            ) {
                if (state.isSyncing) {
                    CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                    Spacer(modifier = Modifier.width(8.dp))
                }
                Text(if (state.isSyncing) "Syncing..." else "Sync Now")
            }

            Spacer(modifier = Modifier.height(16.dp))

            if (state.isLoading) {
                Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            } else if (state.dataTypes.isEmpty()) {
                Text("No sync data available yet", style = MaterialTheme.typography.bodyLarge)
            } else {
                LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(state.dataTypes) { dataType ->
                        Card(modifier = Modifier.fillMaxWidth()) {
                            Row(
                                modifier = Modifier.padding(16.dp).fillMaxWidth(),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                // Status chip
                                val chipColor = when (dataType.status) {
                                    "idle" -> MaterialTheme.colorScheme.primary
                                    "syncing" -> MaterialTheme.colorScheme.tertiary
                                    "error" -> MaterialTheme.colorScheme.error
                                    else -> MaterialTheme.colorScheme.outline
                                }
                                Surface(
                                    color = chipColor.copy(alpha = 0.1f),
                                    shape = MaterialTheme.shapes.small,
                                ) {
                                    Text(
                                        dataType.status.uppercase(),
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                        color = chipColor,
                                        style = MaterialTheme.typography.labelSmall,
                                    )
                                }
                                Spacer(modifier = Modifier.width(12.dp))
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        dataType.dataType.replace("_", " ").replaceFirstChar { it.uppercase() },
                                        style = MaterialTheme.typography.titleSmall,
                                    )
                                    Text(
                                        "${dataType.recordsSynced} records",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                    dataType.lastSyncAt?.let {
                                        Text("Last: $it", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    }
                                }
                                if (dataType.errorMessage != null) {
                                    Icon(Icons.Default.Warning, "Error", tint = MaterialTheme.colorScheme.error)
                                } else {
                                    Icon(Icons.Default.CheckCircle, "OK", tint = MaterialTheme.colorScheme.primary)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
