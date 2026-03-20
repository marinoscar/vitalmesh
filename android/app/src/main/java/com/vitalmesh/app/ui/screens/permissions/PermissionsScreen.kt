package com.vitalmesh.app.ui.screens.permissions

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.health.connect.client.PermissionController
import androidx.hilt.navigation.compose.hiltViewModel

data class PermissionCategory(
    val name: String,
    val description: String,
    val permissions: Set<String>,
    val icon: @Composable () -> Unit,
)

@Composable
fun PermissionsScreen(
    onComplete: () -> Unit,
    viewModel: PermissionsViewModel = hiltViewModel(),
) {
    val granted by viewModel.grantedPermissions.collectAsState()
    val isAvailable by viewModel.isAvailable.collectAsState()

    val permissionsLauncher = rememberLauncherForActivityResult(
        contract = PermissionController.createRequestPermissionResultContract()
    ) { grantedPerms ->
        viewModel.onPermissionsResult(grantedPerms)
    }

    LaunchedEffect(Unit) {
        viewModel.checkPermissions()
    }

    Column(
        modifier = Modifier.fillMaxSize().padding(24.dp),
    ) {
        Text("Connect Your Health Data", style = MaterialTheme.typography.headlineMedium)
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            "Grant access to the health data you want to sync",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(modifier = Modifier.height(24.dp))

        if (!isAvailable) {
            Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer)) {
                Text(
                    "Health Connect is not available on this device",
                    modifier = Modifier.padding(16.dp),
                    color = MaterialTheme.colorScheme.onErrorContainer,
                )
            }
        } else {
            LazyColumn(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                items(viewModel.categories) { category ->
                    val isGranted = granted.containsAll(category.permissions)
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(
                            containerColor = if (isGranted) MaterialTheme.colorScheme.primaryContainer
                            else MaterialTheme.colorScheme.surfaceVariant,
                        ),
                    ) {
                        Row(
                            modifier = Modifier.padding(16.dp).fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            category.icon()
                            Spacer(modifier = Modifier.width(16.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(category.name, style = MaterialTheme.typography.titleMedium)
                                Text(category.description, style = MaterialTheme.typography.bodySmall)
                            }
                            if (isGranted) {
                                Icon(Icons.Default.CheckCircle, "Granted", tint = MaterialTheme.colorScheme.primary)
                            }
                        }
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        Button(
            onClick = { permissionsLauncher.launch(viewModel.allPermissions) },
            modifier = Modifier.fillMaxWidth(),
            enabled = isAvailable,
        ) {
            Text("Grant Access")
        }

        Spacer(modifier = Modifier.height(8.dp))

        TextButton(
            onClick = onComplete,
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text("Skip for Now")
        }
    }
}
