package com.zaara.app.ui.driver

import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.View
import android.widget.*
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.google.android.material.button.MaterialButton
import com.google.android.material.card.MaterialCardView
import com.google.android.material.switchmaterial.SwitchMaterial
import com.zaara.app.R
import com.zaara.app.api.RetrofitClient
import com.zaara.app.api.models.TripDetail
import com.zaara.app.ui.LoginActivity
import com.zaara.app.utils.PrefsManager
import kotlinx.coroutines.launch
import org.osmdroid.config.Configuration
import org.osmdroid.tileprovider.tilesource.TileSourceFactory
import org.osmdroid.util.GeoPoint
import org.osmdroid.views.MapView
import org.osmdroid.views.overlay.Marker

class DriverMainActivity : AppCompatActivity() {

    private lateinit var mapView: MapView
    private lateinit var statusSwitch: SwitchMaterial
    private lateinit var statusText: TextView
    private lateinit var driverNameText: TextView

    // Sections
    private lateinit var waitingSection: LinearLayout
    private lateinit var rideRequestSection: LinearLayout
    private lateinit var activeTripSection: LinearLayout
    private lateinit var earningsCard: MaterialCardView

    // Ride Request
    private lateinit var requestRiderName: TextView
    private lateinit var requestPickup: TextView
    private lateinit var requestDrop: TextView
    private lateinit var requestFare: TextView
    private lateinit var requestDistance: TextView
    private lateinit var acceptBtn: MaterialButton
    private lateinit var rejectBtn: MaterialButton

    // Active Trip
    private lateinit var tripStatusText: TextView
    private lateinit var tripRiderName: TextView
    private lateinit var tripFare: TextView
    private lateinit var arriveBtn: MaterialButton
    private lateinit var startRideBtn: MaterialButton
    private lateinit var completeRideBtn: MaterialButton

    // Earnings
    private lateinit var todayEarnings: TextView
    private lateinit var todayTrips: TextView
    private lateinit var weekEarnings: TextView
    private lateinit var totalEarnings: TextView

    // State
    private var isOnline = false
    private var currentTripId: String? = null
    private var currentTripStatus: String? = null
    private val pollHandler = Handler(Looper.getMainLooper())
    private var driverLocation = GeoPoint(31.5204, 74.3587) // Lahore default

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_driver_main)

        Configuration.getInstance().userAgentValue = packageName
        initViews()
        setupMap()
        loadEarnings()

        driverNameText.text = PrefsManager.getUserName(this) ?: "Driver"
        showSection("waiting")
    }

    private fun initViews() {
        mapView = findViewById(R.id.mapView)
        statusSwitch = findViewById(R.id.statusSwitch)
        statusText = findViewById(R.id.statusText)
        driverNameText = findViewById(R.id.driverNameText)

        waitingSection = findViewById(R.id.waitingSection)
        rideRequestSection = findViewById(R.id.rideRequestSection)
        activeTripSection = findViewById(R.id.activeTripSection)
        earningsCard = findViewById(R.id.earningsCard)

        requestRiderName = findViewById(R.id.requestRiderName)
        requestPickup = findViewById(R.id.requestPickup)
        requestDrop = findViewById(R.id.requestDrop)
        requestFare = findViewById(R.id.requestFare)
        requestDistance = findViewById(R.id.requestDistance)
        acceptBtn = findViewById(R.id.acceptBtn)
        rejectBtn = findViewById(R.id.rejectBtn)

        tripStatusText = findViewById(R.id.tripStatusText)
        tripRiderName = findViewById(R.id.tripRiderName)
        tripFare = findViewById(R.id.tripFare)
        arriveBtn = findViewById(R.id.arriveBtn)
        startRideBtn = findViewById(R.id.startRideBtn)
        completeRideBtn = findViewById(R.id.completeRideBtn)

        todayEarnings = findViewById(R.id.todayEarnings)
        todayTrips = findViewById(R.id.todayTrips)
        weekEarnings = findViewById(R.id.weekEarnings)
        totalEarnings = findViewById(R.id.totalEarnings)

        statusSwitch.setOnCheckedChangeListener { _, isChecked -> toggleStatus() }
        acceptBtn.setOnClickListener { acceptRide() }
        rejectBtn.setOnClickListener { rejectRide() }
        arriveBtn.setOnClickListener { arriveAtPickup() }
        startRideBtn.setOnClickListener { startRide() }
        completeRideBtn.setOnClickListener { completeRide() }

        findViewById<ImageView>(R.id.profileBtn).setOnClickListener { showProfileDialog() }
        findViewById<ImageView>(R.id.earningsBtn).setOnClickListener { showEarningsDialog() }
    }

    private fun setupMap() {
        mapView.setTileSource(TileSourceFactory.MAPNIK)
        mapView.setMultiTouchControls(true)
        mapView.controller.setZoom(15.0)
        mapView.controller.setCenter(driverLocation)

        val marker = Marker(mapView).apply {
            position = driverLocation
            setAnchor(Marker.ANCHOR_CENTER, Marker.ANCHOR_CENTER)
            title = "You"
        }
        mapView.overlays.add(marker)
    }

    private fun showSection(section: String) {
        waitingSection.visibility = if (section == "waiting") View.VISIBLE else View.GONE
        rideRequestSection.visibility = if (section == "request") View.VISIBLE else View.GONE
        activeTripSection.visibility = if (section == "active") View.VISIBLE else View.GONE
    }

    private fun toggleStatus() {
        lifecycleScope.launch {
            try {
                val response = RetrofitClient.api.toggleDriverStatus()
                if (response.isSuccessful) {
                    isOnline = response.body()?.status == "online"
                    statusSwitch.isChecked = isOnline
                    statusText.text = if (isOnline) "🟢 ONLINE" else "🔴 OFFLINE"
                    statusText.setTextColor(getColor(if (isOnline) R.color.status_online else R.color.status_offline))

                    if (isOnline) {
                        startPollingForRides()
                        updateLocation()
                    } else {
                        pollHandler.removeCallbacksAndMessages(null)
                    }
                }
            } catch (e: Exception) {
                Toast.makeText(this@DriverMainActivity, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
                statusSwitch.isChecked = isOnline
            }
        }
    }

    private fun updateLocation() {
        // Simulate slight location movement
        driverLocation = GeoPoint(
            driverLocation.latitude + (Math.random() - 0.5) * 0.001,
            driverLocation.longitude + (Math.random() - 0.5) * 0.001
        )

        lifecycleScope.launch {
            try {
                RetrofitClient.api.updateDriverLocation(mapOf(
                    "lat" to driverLocation.latitude,
                    "lng" to driverLocation.longitude
                ))
            } catch (_: Exception) {}
        }
    }

    private fun startPollingForRides() {
        val pollRunnable = object : Runnable {
            override fun run() {
                if (!isOnline) return

                lifecycleScope.launch {
                    try {
                        // Check for active trip first
                        val activeResponse = RetrofitClient.api.getActiveTrip()
                        if (activeResponse.isSuccessful && activeResponse.body()?.trip != null) {
                            val trip = activeResponse.body()!!.trip!!
                            currentTripId = trip.id
                            currentTripStatus = trip.status
                            showActiveTrip(trip)
                            return@launch
                        }

                        // Check for pending rides
                        val response = RetrofitClient.api.getPendingRides()
                        if (response.isSuccessful) {
                            val rides = response.body()?.rides ?: emptyList()
                            if (rides.isNotEmpty()) {
                                showRideRequest(rides.first())
                            }
                        }
                    } catch (_: Exception) {}
                }

                updateLocation()
                pollHandler.postDelayed(this, 5000)
            }
        }
        pollHandler.postDelayed(pollRunnable, 2000)
    }

    private fun showRideRequest(trip: TripDetail) {
        currentTripId = trip.id
        requestRiderName.text = "👤 ${trip.riderName ?: "Rider"} (⭐ ${trip.riderRating ?: 5.0})"
        requestPickup.text = "📍 ${trip.pickupAddress ?: "Pickup Location"}"
        requestDrop.text = "📍 ${trip.dropAddress ?: "Drop Location"}"
        requestFare.text = "₨${trip.fare ?: 0}"
        requestDistance.text = "${trip.distanceKm ?: 0} km"
        showSection("request")

        // Add pickup marker on map
        val pickupMarker = Marker(mapView).apply {
            position = GeoPoint(trip.pickupLat, trip.pickupLng)
            setAnchor(Marker.ANCHOR_CENTER, Marker.ANCHOR_BOTTOM)
            title = "Pickup"
        }
        mapView.overlays.add(pickupMarker)
        mapView.controller.setCenter(GeoPoint(trip.pickupLat, trip.pickupLng))
        mapView.invalidate()
    }

    private fun showActiveTrip(trip: TripDetail) {
        tripRiderName.text = "👤 ${trip.riderName ?: "Rider"}"
        tripFare.text = "₨${trip.fare ?: 0}"

        when (trip.status) {
            "accepted" -> {
                tripStatusText.text = "🚗 Navigate to Pickup"
                arriveBtn.visibility = View.VISIBLE
                startRideBtn.visibility = View.GONE
                completeRideBtn.visibility = View.GONE
            }
            "arriving" -> {
                tripStatusText.text = "📍 At Pickup Location"
                arriveBtn.visibility = View.GONE
                startRideBtn.visibility = View.VISIBLE
                completeRideBtn.visibility = View.GONE
            }
            "in_progress" -> {
                tripStatusText.text = "🚗 Ride in Progress"
                arriveBtn.visibility = View.GONE
                startRideBtn.visibility = View.GONE
                completeRideBtn.visibility = View.VISIBLE
            }
        }
        showSection("active")
    }

    private fun acceptRide() {
        currentTripId?.let { tripId ->
            lifecycleScope.launch {
                try {
                    val response = RetrofitClient.api.acceptRide(tripId)
                    if (response.isSuccessful) {
                        Toast.makeText(this@DriverMainActivity, "Ride accepted! 🎉", Toast.LENGTH_SHORT).show()
                        currentTripStatus = "accepted"
                        val trip = response.body()?.trip
                        if (trip != null) showActiveTrip(trip)
                        else {
                            tripStatusText.text = "🚗 Navigate to Pickup"
                            arriveBtn.visibility = View.VISIBLE
                            startRideBtn.visibility = View.GONE
                            completeRideBtn.visibility = View.GONE
                            showSection("active")
                        }
                    }
                } catch (e: Exception) {
                    Toast.makeText(this@DriverMainActivity, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }

    private fun rejectRide() {
        currentTripId?.let { tripId ->
            lifecycleScope.launch {
                try {
                    RetrofitClient.api.rejectRide(tripId)
                    currentTripId = null
                    showSection("waiting")
                } catch (_: Exception) {}
            }
        }
    }

    private fun arriveAtPickup() {
        currentTripId?.let { tripId ->
            lifecycleScope.launch {
                try {
                    RetrofitClient.api.arriveAtPickup(tripId)
                    tripStatusText.text = "📍 At Pickup - Waiting for rider"
                    arriveBtn.visibility = View.GONE
                    startRideBtn.visibility = View.VISIBLE
                } catch (e: Exception) {
                    Toast.makeText(this@DriverMainActivity, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }

    private fun startRide() {
        currentTripId?.let { tripId ->
            lifecycleScope.launch {
                try {
                    RetrofitClient.api.startRide(tripId)
                    tripStatusText.text = "🚗 Ride in Progress"
                    startRideBtn.visibility = View.GONE
                    completeRideBtn.visibility = View.VISIBLE
                } catch (e: Exception) {
                    Toast.makeText(this@DriverMainActivity, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }

    private fun completeRide() {
        currentTripId?.let { tripId ->
            lifecycleScope.launch {
                try {
                    val response = RetrofitClient.api.completeRide(tripId)
                    if (response.isSuccessful) {
                        val body = response.body()
                        AlertDialog.Builder(this@DriverMainActivity, R.style.Theme_Zaara)
                            .setTitle("✅ Ride Completed!")
                            .setMessage("Fare: ₨${body?.fare ?: 0}\nYour Earning: ₨${body?.netEarning ?: 0}\nCommission: ₨${body?.commission ?: 0}")
                            .setPositiveButton("OK") { _, _ ->
                                currentTripId = null
                                showSection("waiting")
                                loadEarnings()
                            }
                            .setCancelable(false)
                            .show()
                    }
                } catch (e: Exception) {
                    Toast.makeText(this@DriverMainActivity, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }

    private fun loadEarnings() {
        lifecycleScope.launch {
            try {
                val response = RetrofitClient.api.getDriverEarnings()
                if (response.isSuccessful) {
                    val body = response.body()
                    todayEarnings.text = "₨${body?.today?.total?.toInt() ?: 0}"
                    todayTrips.text = "${body?.today?.trips ?: 0} rides"
                    weekEarnings.text = "₨${body?.week?.total?.toInt() ?: 0}"
                    totalEarnings.text = "₨${body?.all?.total?.toInt() ?: 0}"
                }
            } catch (_: Exception) {}
        }
    }

    private fun showProfileDialog() {
        val name = PrefsManager.getUserName(this) ?: "Driver"
        val phone = PrefsManager.getUserPhone(this) ?: ""
        val rating = PrefsManager.getUserRating(this)
        val vehicle = PrefsManager.getVehicleType(this) ?: "N/A"

        AlertDialog.Builder(this, R.style.Theme_Zaara)
            .setTitle("👤 $name")
            .setMessage("📱 $phone\n⭐ Rating: $rating\n🚗 Vehicle: $vehicle\n\n🚘 Role: Driver")
            .setPositiveButton("OK", null)
            .setNegativeButton("Logout") { _, _ ->
                PrefsManager.logout(this)
                RetrofitClient.setToken(null)
                startActivity(Intent(this, LoginActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                })
                finish()
            }
            .show()
    }

    private fun showEarningsDialog() {
        lifecycleScope.launch {
            try {
                val response = RetrofitClient.api.getDriverEarnings()
                if (response.isSuccessful) {
                    val body = response.body()
                    val msg = buildString {
                        append("📅 Today: ₨${body?.today?.total?.toInt() ?: 0} (${body?.today?.trips ?: 0} rides)\n")
                        append("📅 This Week: ₨${body?.week?.total?.toInt() ?: 0} (${body?.week?.trips ?: 0} rides)\n")
                        append("📅 This Month: ₨${body?.month?.total?.toInt() ?: 0} (${body?.month?.trips ?: 0} rides)\n")
                        append("📅 All Time: ₨${body?.all?.total?.toInt() ?: 0} (${body?.all?.trips ?: 0} rides)\n\n")

                        val recent = body?.recentTrips?.take(5) ?: emptyList()
                        if (recent.isNotEmpty()) {
                            append("--- Recent Trips ---\n")
                            recent.forEach {
                                append("${it.pickupAddress ?: "?"} → ${it.dropAddress ?: "?"}\n")
                                append("   ₨${it.fare?.toInt() ?: 0} → Net: ₨${it.netAmount.toInt()}\n\n")
                            }
                        }
                    }

                    AlertDialog.Builder(this@DriverMainActivity, R.style.Theme_Zaara)
                        .setTitle("💰 Earnings")
                        .setMessage(msg)
                        .setPositiveButton("OK", null)
                        .show()
                }
            } catch (e: Exception) {
                Toast.makeText(this@DriverMainActivity, "Error loading earnings", Toast.LENGTH_SHORT).show()
            }
        }
    }

    override fun onResume() {
        super.onResume()
        mapView.onResume()
    }

    override fun onPause() {
        super.onPause()
        mapView.onPause()
        pollHandler.removeCallbacksAndMessages(null)
    }

    override fun onDestroy() {
        super.onDestroy()
        pollHandler.removeCallbacksAndMessages(null)
    }
}
