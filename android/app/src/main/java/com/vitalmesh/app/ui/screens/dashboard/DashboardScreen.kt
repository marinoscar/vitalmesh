package com.vitalmesh.app.ui.screens.dashboard

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@Composable
fun DashboardScreen(
    onMetricClick: (String) -> Unit,
    onNavigateToSync: () -> Unit,
    onNavigateToSettings: () -> Unit,
    onNavigateToProfile: () -> Unit,
) {
    Column(
        modifier = Modifier.fillMaxSize().padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text("Dashboard", style = MaterialTheme.typography.headlineLarge)
        Spacer(modifier = Modifier.height(24.dp))
        Button(onClick = { onMetricClick("steps") }) {
            Text("View Steps")
        }
        Spacer(modifier = Modifier.height(8.dp))
        Button(onClick = onNavigateToSync) {
            Text("Sync Status")
        }
        Spacer(modifier = Modifier.height(8.dp))
        Button(onClick = onNavigateToSettings) {
            Text("Settings")
        }
        Spacer(modifier = Modifier.height(8.dp))
        Button(onClick = onNavigateToProfile) {
            Text("Profile")
        }
    }
}
