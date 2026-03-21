package com.vitalmesh.app.ui.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.vitalmesh.app.ui.screens.splash.SplashScreen
import com.vitalmesh.app.ui.screens.onboarding.OnboardingScreen
import com.vitalmesh.app.ui.screens.auth.SignInScreen
import com.vitalmesh.app.ui.screens.permissions.PermissionsScreen
import com.vitalmesh.app.ui.screens.dashboard.DashboardScreen
import com.vitalmesh.app.ui.screens.detail.DataDetailScreen
import com.vitalmesh.app.ui.screens.sync.SyncStatusScreen
import com.vitalmesh.app.ui.screens.settings.SettingsScreen
import com.vitalmesh.app.ui.screens.profile.ProfileScreen

@Composable
fun VitalMeshNavHost() {
    val navController = rememberNavController()

    NavHost(
        navController = navController,
        startDestination = Screen.Splash.route
    ) {
        composable(Screen.Splash.route) {
            SplashScreen(
                onAuthenticated = {
                    navController.navigate(Screen.Dashboard.route) {
                        popUpTo(Screen.Splash.route) { inclusive = true }
                    }
                },
                onUnauthenticated = {
                    navController.navigate(Screen.Onboarding.route) {
                        popUpTo(Screen.Splash.route) { inclusive = true }
                    }
                }
            )
        }
        composable(Screen.Onboarding.route) {
            OnboardingScreen(
                onGetStarted = { navController.navigate(Screen.SignIn.route) }
            )
        }
        composable(Screen.SignIn.route) {
            SignInScreen(
                onSignInComplete = { navController.navigate(Screen.Permissions.route) {
                    popUpTo(Screen.Onboarding.route) { inclusive = true }
                }}
            )
        }
        composable(Screen.Permissions.route) {
            PermissionsScreen(
                onComplete = { navController.navigate(Screen.Dashboard.route) {
                    popUpTo(Screen.Permissions.route) { inclusive = true }
                }}
            )
        }
        composable(Screen.Dashboard.route) {
            DashboardScreen(
                onMetricClick = { metric ->
                    navController.navigate(Screen.DataDetail.createRoute(metric))
                },
                onNavigateToSync = { navController.navigate(Screen.SyncStatus.route) },
                onNavigateToSettings = { navController.navigate(Screen.Settings.route) },
                onNavigateToProfile = { navController.navigate(Screen.Profile.route) }
            )
        }
        composable(Screen.DataDetail.route) { backStackEntry ->
            DataDetailScreen(
                metric = backStackEntry.arguments?.getString("metric") ?: "",
                onBack = { navController.popBackStack() }
            )
        }
        composable(Screen.SyncStatus.route) {
            SyncStatusScreen(onBack = { navController.popBackStack() })
        }
        composable(Screen.Settings.route) {
            SettingsScreen(onBack = { navController.popBackStack() })
        }
        composable(Screen.Profile.route) {
            ProfileScreen(onBack = { navController.popBackStack() })
        }
    }
}
