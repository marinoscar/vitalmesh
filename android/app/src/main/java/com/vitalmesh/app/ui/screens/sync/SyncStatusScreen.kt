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
import com.vitalmesh.app.data.local.db.entity.SyncHistoryEntry
import java.text.SimpleDateFormat
import java.util.*

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
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(paddingValues).padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
            contentPadding = PaddingValues(vertical = 16.dp),
        ) {
            // Sync range selector
            item {
                SyncRangeSelector(
                    selectedDays = state.syncRangeDays,
                    onSelectDays = { viewModel.setSyncRange(it) },
                )
            }

            // Sync now button with pending badge
            item {
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
                    if (state.pendingQueueCount > 0) {
                        Spacer(modifier = Modifier.width(8.dp))
                        Badge { Text("${state.pendingQueueCount}") }
                    }
                }
            }

            // Loading / data type status
            if (state.isLoading) {
                item {
                    Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator()
                    }
                }
            } else if (state.dataTypes.isEmpty()) {
                item {
                    Text("No sync data available yet", style = MaterialTheme.typography.bodyLarge)
                }
            } else {
                items(state.dataTypes) { dataType ->
                    DataTypeCard(dataType)
                }
            }

            // Sync History section
            if (state.syncHistory.isNotEmpty()) {
                item {
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        "Sync History",
                        style = MaterialTheme.typography.titleMedium,
                    )
                }

                items(state.syncHistory) { entry ->
                    SyncHistoryCard(entry)
                }
            }
        }
    }
}

@Composable
private fun SyncRangeSelector(
    selectedDays: Int,
    onSelectDays: (Int) -> Unit,
) {
    var expanded by remember { mutableStateOf(false) }
    val options = listOf(
        7 to "7 Days",
        30 to "30 Days",
        90 to "3 Months",
        180 to "6 Months",
        -1 to "All Time",
    )
    val selectedLabel = options.find { it.first == selectedDays }?.second ?: "30 Days"

    Card(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.padding(16.dp).fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Column {
                Text("Sync Range", style = MaterialTheme.typography.titleSmall)
                Text(
                    "How far back to read health data",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Box {
                OutlinedButton(onClick = { expanded = true }) {
                    Text(selectedLabel)
                    Icon(Icons.Default.ArrowDropDown, "Expand", modifier = Modifier.size(18.dp))
                }
                DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                    options.forEach { (days, label) ->
                        DropdownMenuItem(
                            text = { Text(label) },
                            onClick = {
                                onSelectDays(days)
                                expanded = false
                            },
                            leadingIcon = {
                                if (days == selectedDays) {
                                    Icon(Icons.Default.Check, "Selected", modifier = Modifier.size(18.dp))
                                }
                            }
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun DataTypeCard(dataType: DataTypeSyncStatus) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.padding(16.dp).fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
        ) {
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

@Composable
private fun SyncHistoryCard(entry: SyncHistoryEntry) {
    val dateFormat = remember { SimpleDateFormat("MMM dd, HH:mm", Locale.getDefault()) }
    val statusColor = when (entry.status) {
        "success" -> MaterialTheme.colorScheme.primary
        "partial" -> MaterialTheme.colorScheme.tertiary
        "failed" -> MaterialTheme.colorScheme.error
        else -> MaterialTheme.colorScheme.outline
    }

    Card(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.padding(12.dp).fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    dateFormat.format(Date(entry.startedAt)),
                    style = MaterialTheme.typography.bodyMedium,
                )
                Text(
                    buildString {
                        append("${entry.recordsSynced} records")
                        entry.durationMs?.let { append(" in ${it / 1000}s") }
                        if (entry.recordsFailed > 0) append(" (${entry.recordsFailed} failed)")
                    },
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Surface(
                color = statusColor.copy(alpha = 0.1f),
                shape = MaterialTheme.shapes.small,
            ) {
                Text(
                    entry.status.uppercase(),
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                    color = statusColor,
                    style = MaterialTheme.typography.labelSmall,
                )
            }
        }
    }
}
