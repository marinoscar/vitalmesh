package com.vitalmesh.app.domain.model

data class User(
    val id: String,
    val email: String,
    val displayName: String?,
    val profileImageUrl: String?,
)
