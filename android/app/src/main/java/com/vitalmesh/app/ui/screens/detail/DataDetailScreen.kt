package com.vitalmesh.app.ui.screens.detail

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DataDetailScreen(
    metric: String,
    onBack: () -> Unit,
) {
    val title = metric.replace("_", " ").replaceFirstChar { it.uppercase() }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(title) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back")
                    }
                }
            )
        }
    ) { paddingValues ->
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(paddingValues).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            // Time range tabs
            item {
                var selectedTab by remember { mutableIntStateOf(0) }
                TabRow(selectedTabIndex = selectedTab) {
                    listOf("Day", "Week", "Month", "Year").forEachIndexed { index, label ->
                        Tab(selected = selectedTab == index, onClick = { selectedTab = index }) {
                            Text(label, modifier = Modifier.padding(16.dp))
                        }
                    }
                }
            }

            // Chart placeholder
            item {
                Card(modifier = Modifier.fillMaxWidth().height(200.dp)) {
                    Box(modifier = Modifier.fillMaxSize().padding(16.dp)) {
                        Text("Chart for $title", style = MaterialTheme.typography.bodyLarge)
                    }
                }
            }

            // Stats row
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceEvenly,
                ) {
                    StatItem("Min", "—")
                    StatItem("Max", "—")
                    StatItem("Avg", "—")
                    StatItem("Latest", "—")
                }
            }

            // Data list placeholder
            item {
                Text("Recent Records", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            }
            items(5) { index ->
                Card(modifier = Modifier.fillMaxWidth()) {
                    Text(
                        "Record ${index + 1}",
                        modifier = Modifier.padding(16.dp),
                        style = MaterialTheme.typography.bodyMedium,
                    )
                }
            }
        }
    }
}

@Composable
private fun StatItem(label: String, value: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
    }
}
