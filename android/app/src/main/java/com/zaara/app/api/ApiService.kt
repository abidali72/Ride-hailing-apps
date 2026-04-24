package com.zaara.app.api

import com.zaara.app.api.models.*
import retrofit2.Response
import retrofit2.http.*

interface ApiService {

    // ========== AUTH ==========
    @POST("api/auth/send-otp")
    suspend fun sendOtp(@Body body: Map<String, String>): Response<OtpResponse>

    @POST("api/auth/verify-otp")
    suspend fun verifyOtp(@Body body: Map<String, String>): Response<AuthResponse>

    @POST("api/auth/register")
    suspend fun register(@Body body: Map<String, String>): Response<AuthResponse>

    @POST("api/auth/login")
    suspend fun login(@Body body: Map<String, String>): Response<AuthResponse>

    @GET("api/auth/demo-users")
    suspend fun getDemoUsers(): Response<DemoUsersResponse>

    // ========== RIDER ==========
    @GET("api/rider/fare-estimate")
    suspend fun getFareEstimate(
        @Query("pickup_lat") pickupLat: Double,
        @Query("pickup_lng") pickupLng: Double,
        @Query("drop_lat") dropLat: Double,
        @Query("drop_lng") dropLng: Double
    ): Response<FareEstimateResponse>

    @POST("api/rider/request-ride")
    suspend fun requestRide(@Body body: RideRequest): Response<RideRequestResponse>

    @GET("api/rider/ride-status/{tripId}")
    suspend fun getRideStatus(@Path("tripId") tripId: String): Response<RideStatusResponse>

    @POST("api/rider/cancel-ride/{tripId}")
    suspend fun cancelRide(@Path("tripId") tripId: String): Response<BasicResponse>

    @POST("api/rider/rate-ride/{tripId}")
    suspend fun rateRide(@Path("tripId") tripId: String, @Body body: Map<String, Any>): Response<BasicResponse>

    @GET("api/rider/history")
    suspend fun getRideHistory(): Response<RideHistoryResponse>

    @GET("api/rider/profile")
    suspend fun getRiderProfile(): Response<ProfileResponse>

    // ========== DRIVER ==========
    @POST("api/driver/toggle-status")
    suspend fun toggleDriverStatus(): Response<DriverStatusResponse>

    @POST("api/driver/update-location")
    suspend fun updateDriverLocation(@Body body: Map<String, Double>): Response<BasicResponse>

    @POST("api/driver/accept-ride/{tripId}")
    suspend fun acceptRide(@Path("tripId") tripId: String): Response<AcceptRideResponse>

    @POST("api/driver/reject-ride/{tripId}")
    suspend fun rejectRide(@Path("tripId") tripId: String): Response<BasicResponse>

    @POST("api/driver/arrive/{tripId}")
    suspend fun arriveAtPickup(@Path("tripId") tripId: String): Response<BasicResponse>

    @POST("api/driver/start-ride/{tripId}")
    suspend fun startRide(@Path("tripId") tripId: String): Response<BasicResponse>

    @POST("api/driver/complete-ride/{tripId}")
    suspend fun completeRide(@Path("tripId") tripId: String): Response<CompleteRideResponse>

    @GET("api/driver/earnings")
    suspend fun getDriverEarnings(): Response<EarningsResponse>

    @GET("api/driver/profile")
    suspend fun getDriverProfile(): Response<DriverProfileResponse>

    @GET("api/driver/pending-rides")
    suspend fun getPendingRides(): Response<PendingRidesResponse>

    @GET("api/driver/active-trip")
    suspend fun getActiveTrip(): Response<ActiveTripResponse>

    // ========== HEALTH ==========
    @GET("api/health")
    suspend fun healthCheck(): Response<Map<String, Any>>
}
