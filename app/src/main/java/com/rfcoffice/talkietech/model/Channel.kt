package com.rfcoffice.talkietech.model

import java.security.MessageDigest

data class Channel(
    val id: String,
    val name: String,
    val isPrivate: Boolean = false,
    val passwordHash: String? = null
) {
    companion object {
        fun hashPassword(password: String): String {
            if (password.isBlank()) return ""
            val digest = MessageDigest.getInstance("SHA-256")
            val bytes = digest.digest(password.toByteArray(Charsets.UTF_8))
            return bytes.joinToString("") { "%02x".format(it) }
        }

        val DEFAULT_PUBLIC_CHANNELS = listOf(
            Channel("TECH-01", "Canal 01 — Général"),
            Channel("TECH-02", "Canal 02 — Urgence / Sécurité"),
            Channel("TECH-03", "Canal 03 — Support Technique"),
            Channel("TECH-04", "Canal 04 — Logistique / Équipe")
        )
    }

    fun verifyPassword(inputPassword: String): Boolean {
        if (!isPrivate) return true
        if (passwordHash.isNullOrBlank()) return true
        return hashPassword(inputPassword) == passwordHash
    }
}
