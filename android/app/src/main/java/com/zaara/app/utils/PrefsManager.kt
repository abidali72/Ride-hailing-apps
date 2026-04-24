package com.zaara.app.utils

import android.content.Context
import android.content.SharedPreferences

object PrefsManager {
    private const val PREFS_NAME = "zaara_prefs"
    private const val KEY_TOKEN = "auth_token"
    private const val KEY_USER_ID = "user_id"
    private const val KEY_USER_NAME = "user_name"
    private const val KEY_USER_PHONE = "user_phone"
    private const val KEY_USER_ROLE = "user_role"
    private const val KEY_USER_RATING = "user_rating"
    private const val KEY_DRIVER_ID = "driver_id"
    private const val KEY_VEHICLE_TYPE = "vehicle_type"
    private const val KEY_VEHICLE_NUMBER = "vehicle_number"
    private const val KEY_IS_LOGGED_IN = "is_logged_in"

    private fun prefs(context: Context): SharedPreferences =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    fun saveAuth(context: Context, token: String, userId: String, name: String, phone: String, role: String, rating: Double) {
        prefs(context).edit().apply {
            putString(KEY_TOKEN, token)
            putString(KEY_USER_ID, userId)
            putString(KEY_USER_NAME, name)
            putString(KEY_USER_PHONE, phone)
            putString(KEY_USER_ROLE, role)
            putFloat(KEY_USER_RATING, rating.toFloat())
            putBoolean(KEY_IS_LOGGED_IN, true)
            apply()
        }
    }

    fun saveDriverInfo(context: Context, driverId: String, vehicleType: String, vehicleNumber: String) {
        prefs(context).edit().apply {
            putString(KEY_DRIVER_ID, driverId)
            putString(KEY_VEHICLE_TYPE, vehicleType)
            putString(KEY_VEHICLE_NUMBER, vehicleNumber)
            apply()
        }
    }

    fun getToken(context: Context): String? = prefs(context).getString(KEY_TOKEN, null)
    fun getUserId(context: Context): String? = prefs(context).getString(KEY_USER_ID, null)
    fun getUserName(context: Context): String? = prefs(context).getString(KEY_USER_NAME, null)
    fun getUserPhone(context: Context): String? = prefs(context).getString(KEY_USER_PHONE, null)
    fun getUserRole(context: Context): String? = prefs(context).getString(KEY_USER_ROLE, null)
    fun getUserRating(context: Context): Float = prefs(context).getFloat(KEY_USER_RATING, 5.0f)
    fun getDriverId(context: Context): String? = prefs(context).getString(KEY_DRIVER_ID, null)
    fun getVehicleType(context: Context): String? = prefs(context).getString(KEY_VEHICLE_TYPE, null)
    fun isLoggedIn(context: Context): Boolean = prefs(context).getBoolean(KEY_IS_LOGGED_IN, false)

    fun logout(context: Context) {
        prefs(context).edit().clear().apply()
    }
}
