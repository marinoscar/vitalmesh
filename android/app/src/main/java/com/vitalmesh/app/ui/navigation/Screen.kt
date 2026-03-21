package com.vitalmesh.app.ui.navigation

sealed class Screen(val route: String) {
    data object Splash : Screen("splash")
    data object Onboarding : Screen("onboarding")
    data object SignIn : Screen("sign_in")
    data object Permissions : Screen("permissions")
    data object Dashboard : Screen("dashboard")
    data object DataDetail : Screen("data_detail/{metric}") {
        fun createRoute(metric: String) = "data_detail/$metric"
    }
    data object SyncStatus : Screen("sync_status")
    data object Settings : Screen("settings")
    data object Profile : Screen("profile")
}
