# Moshi
-keep class com.vitalmesh.app.data.remote.api.** { *; }
-keep class com.vitalmesh.app.domain.model.** { *; }

# Retrofit
-keepattributes Signature
-keepattributes *Annotation*

# Room
-keep class * extends androidx.room.RoomDatabase
