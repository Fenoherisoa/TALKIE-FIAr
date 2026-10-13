package com.rfcoffice.talkietech.ui

import android.content.Context
import androidx.appcompat.app.AppCompatDelegate

object ThemeManager {
    private const val PREFS_NAME = "talkie_tech_prefs"
    private const val KEY_THEME = "app_theme_mode"

    const val THEME_SYSTEM = "SYSTEM"
    const val THEME_LIGHT = "LIGHT"
    const val THEME_DARK = "DARK"

    fun applyTheme(context: Context) {
        val theme = getSavedTheme(context)
        when (theme) {
            THEME_LIGHT -> AppCompatDelegate.setDefaultNightMode(AppCompatDelegate.MODE_NIGHT_NO)
            THEME_DARK -> AppCompatDelegate.setDefaultNightMode(AppCompatDelegate.MODE_NIGHT_YES)
            else -> AppCompatDelegate.setDefaultNightMode(AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM)
        }
    }

    fun setTheme(context: Context, themeMode: String) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit().putString(KEY_THEME, themeMode).apply()
        applyTheme(context)
    }

    fun getSavedTheme(context: Context): String {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        return prefs.getString(KEY_THEME, THEME_DARK) ?: THEME_DARK
    }
}
