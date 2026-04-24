package com.zaara.app.api.models

import com.google.gson.annotations.SerializedName

// ========== AUTH MODELS ==========
data class OtpResponse(
    val success: Boolean,
    val message: String?,
    @SerializedName("debug_otp") val debugOtp: String?
)

data class AuthResponse(
    val success: Boolean,
    val token: String?,
    val user: User?,
    val driver: DriverInfo?,
    val error: String?,
    val needsRegistration: Boolean?
)

data class DemoUsersResponse(
    val riders: List<DemoUser>,
    val drivers: List<DemoDriver>,
    val admins: List<DemoUser>
)

data class DemoUser(val id: String, val name: String, val phone: String, val role: String)
data class DemoDriver(
    val id: String, val name: String, val phone: String, val role: String,
    @SerializedName("vehicle_type") val vehicleType: String?,
    @SerializedName("vehicle_model") val vehicleModel: String?,
    val status: String?
)

// ========== USER MODELS ==========
data class User(
    val id: String,
    val name: String,
    val phone: String,
    val email: String?,
    val role: String,
    val rating: Double?,
    @SerializedName("avatar_url") val avatarUrl: String?,
    @SerializedName("is_active") val isActive: Int?,
    @SerializedName("created_at") val createdAt: String?
)

data class DriverInfo(
    val id: String,
    @SerializedName("user_id") val userId: String,
    @SerializedName("vehicle_type") val vehicleType: String,
    @SerializedName("vehicle_number") val vehicleNumber: String,
    @SerializedName("vehicle_model") val vehicleModel: String?,
    @SerializedName("license_number") val licenseNumber: String?,
    val status: String,
    @SerializedName("location_lat") val locationLat: Double?,
    @SerializedName("location_lng") val locationLng: Double?,
    @SerializedName("kyc_verified") val kycVerified: Int?,
    @SerializedName("total_rides") val totalRides: Int?
)

// ========== FARE MODELS ==========
data class FareEstimateResponse(
    val distance: Double,
    val estimates: List<FareEstimate>,
    val surgeMultiplier: Double
)

data class FareEstimate(
    val fare: Int,
    val currency: String,
    val baseFare: Int,
    val distanceCharge: Int,
    val distanceKm: Double,
    val vehicleType: String,
    val surgeMultiplier: Double,
    val label: String,
    val icon: String
)

// ========== RIDE MODELS ==========
data class RideRequest(
    @SerializedName("pickup_lat") val pickupLat: Double,
    @SerializedName("pickup_lng") val pickupLng: Double,
    @SerializedName("pickup_address") val pickupAddress: String,
    @SerializedName("drop_lat") val dropLat: Double,
    @SerializedName("drop_lng") val dropLng: Double,
    @SerializedName("drop_address") val dropAddress: String,
    @SerializedName("vehicle_type") val vehicleType: String
)

data class RideRequestResponse(
    val success: Boolean,
    val trip: TripSummary?,
    val error: String?
)

data class TripSummary(
    val id: String,
    val fare: Int,
    val distance: Double,
    @SerializedName("vehicle_type") val vehicleType: String,
    val status: String,
    val availableDrivers: Int?
)

data class RideStatusResponse(val trip: TripDetail?)

data class TripDetail(
    val id: String,
    @SerializedName("rider_id") val riderId: String,
    @SerializedName("driver_id") val driverId: String?,
    @SerializedName("pickup_lat") val pickupLat: Double,
    @SerializedName("pickup_lng") val pickupLng: Double,
    @SerializedName("pickup_address") val pickupAddress: String?,
    @SerializedName("drop_lat") val dropLat: Double,
    @SerializedName("drop_lng") val dropLng: Double,
    @SerializedName("drop_address") val dropAddress: String?,
    @SerializedName("distance_km") val distanceKm: Double?,
    val fare: Int?,
    @SerializedName("vehicle_type") val vehicleType: String?,
    val status: String,
    val rating: Int?,
    val feedback: String?,
    @SerializedName("created_at") val createdAt: String?,
    @SerializedName("completed_at") val completedAt: String?,
    @SerializedName("driver_name") val driverName: String?,
    @SerializedName("driver_phone") val driverPhone: String?,
    @SerializedName("driver_rating") val driverRating: Double?,
    @SerializedName("vehicle_number") val vehicleNumber: String?,
    @SerializedName("vehicle_model") val vehicleModel: String?,
    @SerializedName("driver_lat") val driverLat: Double?,
    @SerializedName("driver_lng") val driverLng: Double?,
    @SerializedName("rider_name") val riderName: String?,
    @SerializedName("rider_phone") val riderPhone: String?,
    @SerializedName("rider_rating") val riderRating: Double?
)

// ========== HISTORY ==========
data class RideHistoryResponse(val trips: List<TripDetail>)

// ========== PROFILE ==========
data class ProfileResponse(
    val user: User?,
    val stats: ProfileStats?
)

data class ProfileStats(val totalTrips: Int, val totalSpent: Int)

// ========== DRIVER MODELS ==========
data class DriverStatusResponse(val success: Boolean, val status: String)

data class AcceptRideResponse(val success: Boolean, val trip: TripDetail?)

data class CompleteRideResponse(
    val success: Boolean,
    val status: String?,
    val fare: Int?,
    val netEarning: Int?,
    val commission: Int?
)

data class EarningsResponse(
    val today: EarningsPeriod,
    val week: EarningsPeriod,
    val month: EarningsPeriod,
    val all: EarningsPeriod,
    val recentTrips: List<EarningsTrip>
)

data class EarningsPeriod(val total: Double, val trips: Int)

data class EarningsTrip(
    val id: String,
    @SerializedName("driver_id") val driverId: String,
    @SerializedName("trip_id") val tripId: String,
    val amount: Double,
    @SerializedName("commission_rate") val commissionRate: Double,
    @SerializedName("net_amount") val netAmount: Double,
    @SerializedName("pickup_address") val pickupAddress: String?,
    @SerializedName("drop_address") val dropAddress: String?,
    @SerializedName("distance_km") val distanceKm: Double?,
    val fare: Double?,
    @SerializedName("trip_date") val tripDate: String?
)

data class DriverProfileResponse(val user: User?, val driver: DriverInfo?)

data class PendingRidesResponse(val rides: List<TripDetail>)
data class ActiveTripResponse(val trip: TripDetail?)

// ========== COMMON ==========
data class BasicResponse(val success: Boolean, val message: String?, val error: String?)
