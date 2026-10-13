package com.rfcoffice.talkietech.model

data class Participant(
    val id: String,
    val name: String,
    val channelId: String,
    val lastSeen: Long = System.currentTimeMillis(),
    val isSpeaking: Boolean = false
)
