package com.vitalmesh.app.ui.screens.dashboard

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.vitalmesh.app.ui.components.HealthCard

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(
    onMetricClick: (String) -> Unit,
    onNavigateToSync: () -> Unit,
    onNavigateToSettings: () -> Unit,
    onNavigateToProfile: () -> Unit,
    viewModel: DashboardViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("VitalMesh", fontWeight = FontWeight.Bold) },
                actions = {
                    IconButton(onClick = onNavigateToProfile) {
                        Icon(Icons.Default.AccountCircle, "Profile")
                    }
                }
            )
        },
        bottomBar = {
            NavigationBar {
                NavigationBarItem(
                    selected = true,
                    onClick = {},
                    icon = { Icon(Icons.Default.Dashboard, "Dashboard") },
                    label = { Text("Dashboard") }
                )
                NavigationBarItem(
                    selected = false,
                    onClick = { onMetricClick("steps") },
                    icon = { Icon(Icons.Default.Explore, "Browse") },
                    label = { Text("Browse") }
                )
                NavigationBarItem(
                    selected = false,
                    onClick = onNavigateToSync,
                    icon = { Icon(Icons.Default.Sync, "Sync") },
                    label = { Text("Sync") }
                )
                NavigationBarItem(
                    selected = false,
                    onClick = onNavigateToSettings,
                    icon = { Icon(Icons.Default.Settings, "Settings") },
                    label = { Text("Settings") }
                )
            }
        }
    ) { paddingValues ->
        if (state.isLoading && !state.isSyncing) {
            Box(modifier = Modifier.fillMaxSize().padding(paddingValues), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize().padding(paddingValues).padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
                contentPadding = PaddingValues(vertical = 16.dp),
            ) {
                // Syncing indicator
                if (state.isSyncing) {
                    item {
                        Card(
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
                        ) {
                            Row(
                                modifier = Modifier.padding(16.dp).fillMaxWidth(),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(20.dp),
                                    strokeWidth = 2.dp,
                                )
                                Spacer(modifier = Modifier.width(12.dp))
                                Text(
                                    "Syncing health data from your devices...",
                                    style = MaterialTheme.typography.bodyMedium,
                                )
                            }
                        }
                    }
                }

                // Date header
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(
                            text = state.selectedDate.toString(),
                            style = MaterialTheme.typography.titleMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        TextButton(onClick = { viewModel.refresh() }) {
                            Icon(Icons.Default.Refresh, "Refresh", modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Sync")
                        }
                    }
                }

                // Sync error banner
                state.syncError?.let { syncError ->
                    item {
                        Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.tertiaryContainer)) {
                            Text(syncError, modifier = Modifier.padding(16.dp), color = MaterialTheme.colorScheme.onTertiaryContainer)
                        }
                    }
                }

                // Error banner
                state.error?.let { error ->
                    item {
                        Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer)) {
                            Text(error, modifier = Modifier.padding(16.dp), color = MaterialTheme.colorScheme.onErrorContainer)
                        }
                    }
                }

                // Steps card
                item {
                    HealthCard(
                        title = "Steps",
                        value = "${state.summary.steps.total.toInt()}",
                        subtitle = "avg ${state.summary.steps.average.toInt()}/period",
                        icon = Icons.Default.DirectionsWalk,
                        onClick = { onMetricClick("steps") },
                    )
                }

                // Heart Rate card
                item {
                    HealthCard(
                        title = "Heart Rate",
                        value = state.summary.heartRate.latest?.let { "${it.toInt()} bpm" } ?: "—",
                        subtitle = buildString {
                            state.summary.heartRate.min?.let { append("${it.toInt()}") }
                            append(" – ")
                            state.summary.heartRate.max?.let { append("${it.toInt()} bpm") }
                        },
                        icon = Icons.Default.FavoriteBorder,
                        onClick = { onMetricClick("heart_rate") },
                    )
                }

                // Sleep card
                item {
                    val sleepHours = state.summary.sleep.totalDurationMs / 3600000.0
                    HealthCard(
                        title = "Sleep",
                        value = String.format("%.1fh", sleepHours),
                        subtitle = state.summary.sleep.stages.entries.joinToString(" · ") {
                            "${it.key}: ${it.value / 60000}m"
                        }.ifEmpty { "No stage data" },
                        icon = Icons.Default.Bedtime,
                        onClick = { onMetricClick("sleep") },
                    )
                }

                // Weight card
                item {
                    HealthCard(
                        title = "Weight",
                        value = state.summary.weight.latest?.let { String.format("%.1f kg", it) } ?: "—",
                        subtitle = "",
                        icon = Icons.Default.MonitorWeight,
                        onClick = { onMetricClick("weight") },
                    )
                }

                // Blood Pressure card
                item {
                    HealthCard(
                        title = "Blood Pressure",
                        value = if (state.summary.bloodPressure.systolic != null)
                            "${state.summary.bloodPressure.systolic!!.toInt()}/${state.summary.bloodPressure.diastolic?.toInt() ?: "—"}"
                        else "—",
                        subtitle = "mmHg",
                        icon = Icons.Default.Bloodtype,
                        onClick = { onMetricClick("systolic_bp") },
                    )
                }

                // Calories card
                item {
                    HealthCard(
                        title = "Active Calories",
                        value = "${state.summary.activeCalories.total.toInt()} kcal",
                        subtitle = "",
                        icon = Icons.Default.LocalFireDepartment,
                        onClick = { onMetricClick("active_calories") },
                    )
                }

                // Exercise card
                item {
                    val exerciseMin = state.summary.exercise.totalDurationMs / 60000
                    HealthCard(
                        title = "Exercise",
                        value = "${state.summary.exercise.sessions} sessions",
                        subtitle = "${exerciseMin} min total",
                        icon = Icons.Default.FitnessCenter,
                        onClick = { onMetricClick("exercise") },
                    )
                }
            }
        }
    }
}
