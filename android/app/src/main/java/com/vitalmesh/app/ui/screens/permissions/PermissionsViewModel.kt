package com.vitalmesh.app.ui.screens.permissions

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Bedtime
import androidx.compose.material.icons.filled.DirectionsRun
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.MonitorWeight
import androidx.compose.material.icons.filled.Restaurant
import androidx.compose.material3.Icon
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.*
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.vitalmesh.app.data.healthconnect.HealthConnectManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class PermissionsViewModel @Inject constructor(
    private val healthConnectManager: HealthConnectManager,
) : ViewModel() {

    private val _grantedPermissions = MutableStateFlow<Set<String>>(emptySet())
    val grantedPermissions: StateFlow<Set<String>> = _grantedPermissions

    private val _isAvailable = MutableStateFlow(false)
    val isAvailable: StateFlow<Boolean> = _isAvailable

    val allPermissions = HealthConnectManager.buildPermissions()

    val categories = listOf(
        PermissionCategory(
            name = "Activity",
            description = "Steps, distance, calories, exercise",
            permissions = setOf(
                HealthPermission.getReadPermission(StepsRecord::class),
                HealthPermission.getReadPermission(DistanceRecord::class),
                HealthPermission.getReadPermission(ActiveCaloriesBurnedRecord::class),
                HealthPermission.getReadPermission(TotalCaloriesBurnedRecord::class),
                HealthPermission.getReadPermission(ExerciseSessionRecord::class),
                HealthPermission.getReadPermission(FloorsClimbedRecord::class),
                HealthPermission.getReadPermission(ElevationGainedRecord::class),
            ),
            icon = { Icon(Icons.Default.DirectionsRun, "Activity") },
        ),
        PermissionCategory(
            name = "Body",
            description = "Weight, height, body fat, BMR",
            permissions = setOf(
                HealthPermission.getReadPermission(WeightRecord::class),
                HealthPermission.getReadPermission(HeightRecord::class),
                HealthPermission.getReadPermission(BodyFatRecord::class),
                HealthPermission.getReadPermission(BoneMassRecord::class),
                HealthPermission.getReadPermission(LeanBodyMassRecord::class),
                HealthPermission.getReadPermission(BasalMetabolicRateRecord::class),
            ),
            icon = { Icon(Icons.Default.MonitorWeight, "Body") },
        ),
        PermissionCategory(
            name = "Vitals",
            description = "Heart rate, blood pressure, SpO2, temperature",
            permissions = setOf(
                HealthPermission.getReadPermission(HeartRateRecord::class),
                HealthPermission.getReadPermission(RestingHeartRateRecord::class),
                HealthPermission.getReadPermission(HeartRateVariabilityRmssdRecord::class),
                HealthPermission.getReadPermission(BloodPressureRecord::class),
                HealthPermission.getReadPermission(BloodGlucoseRecord::class),
                HealthPermission.getReadPermission(OxygenSaturationRecord::class),
                HealthPermission.getReadPermission(RespiratoryRateRecord::class),
                HealthPermission.getReadPermission(BodyTemperatureRecord::class),
                HealthPermission.getReadPermission(Vo2MaxRecord::class),
            ),
            icon = { Icon(Icons.Default.FavoriteBorder, "Vitals") },
        ),
        PermissionCategory(
            name = "Sleep",
            description = "Sleep sessions and stages",
            permissions = setOf(
                HealthPermission.getReadPermission(SleepSessionRecord::class),
            ),
            icon = { Icon(Icons.Default.Bedtime, "Sleep") },
        ),
        PermissionCategory(
            name = "Nutrition",
            description = "Meals, hydration, nutrients",
            permissions = setOf(
                HealthPermission.getReadPermission(NutritionRecord::class),
                HealthPermission.getReadPermission(HydrationRecord::class),
            ),
            icon = { Icon(Icons.Default.Restaurant, "Nutrition") },
        ),
    )

    fun checkPermissions() {
        viewModelScope.launch {
            _isAvailable.value = healthConnectManager.isAvailable()
            if (_isAvailable.value) {
                _grantedPermissions.value = healthConnectManager.getGrantedPermissions()
            }
        }
    }

    fun onPermissionsResult(granted: Set<String>) {
        _grantedPermissions.value = granted
    }
}
