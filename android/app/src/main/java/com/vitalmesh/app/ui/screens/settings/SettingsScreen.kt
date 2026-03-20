package com.vitalmesh.app.ui.screens.settings

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(onBack: () -> Unit) {
    var syncFrequency by remember { mutableStateOf("15 min") }
    var wifiOnly by remember { mutableStateOf(false) }
    var notificationsEnabled by remember { mutableStateOf(true) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Settings") },
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
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Text("Sync", style = MaterialTheme.typography.titleMedium)

            // Sync frequency
            ListItem(
                headlineContent = { Text("Sync Frequency") },
                supportingContent = { Text(syncFrequency) },
            )

            // WiFi only
            ListItem(
                headlineContent = { Text("WiFi Only") },
                supportingContent = { Text("Only sync when connected to WiFi") },
                trailingContent = {
                    Switch(checked = wifiOnly, onCheckedChange = { wifiOnly = it })
                }
            )

            HorizontalDivider()
            Text("Notifications", style = MaterialTheme.typography.titleMedium)

            ListItem(
                headlineContent = { Text("Sync Notifications") },
                supportingContent = { Text("Show notification after sync completes") },
                trailingContent = {
                    Switch(checked = notificationsEnabled, onCheckedChange = { notificationsEnabled = it })
                }
            )

            HorizontalDivider()
            Text("About", style = MaterialTheme.typography.titleMedium)

            ListItem(
                headlineContent = { Text("Version") },
                supportingContent = { Text("1.0.0") },
            )
        }
    }
}
