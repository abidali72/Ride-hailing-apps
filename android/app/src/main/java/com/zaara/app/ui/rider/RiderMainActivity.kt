package com.zaara.app.ui.rider

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.View
import android.view.animation.AnimationUtils
import android.widget.*
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.bottomsheet.BottomSheetBehavior
import com.google.android.material.button.MaterialButton
import com.google.android.material.card.MaterialCardView
import com.google.android.material.textfield.TextInputEditText
import com.zaara.app.R
import com.zaara.app.api.RetrofitClient
import com.zaara.app.api.models.*
import com.zaara.app.ui.LoginActivity
import com.zaara.app.utils.PrefsManager
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import org.osmdroid.config.Configuration
import org.osmdroid.tileprovider.tilesource.TileSourceFactory
import org.osmdroid.util.GeoPoint
import org.osmdroid.views.MapView
import org.osmdroid.views.overlay.Marker
import org.osmdroid.views.overlay.Polyline

class RiderMainActivity : AppCompatActivity() {

    private lateinit var mapView: MapView
    private lateinit var bottomSheet: LinearLayout
    private lateinit var bottomSheetBehavior: BottomSheetBehavior<LinearLayout>

    // Views for different states
    private lateinit var searchSection: LinearLayout
    private lateinit var rideOptionsSection: LinearLayout
    private lateinit var findingDriverSection: LinearLayout
    private lateinit var driverAssignedSection: LinearLayout
    private lateinit var rideProgressSection: LinearLayout
    private lateinit var ratingSection: LinearLayout

    // Search
    private lateinit var pickupInput: TextInputEditText
    private lateinit var dropInput: TextInputEditText
    private lateinit var searchRideBtn: MaterialButton

    // Ride Options
    private lateinit var rideOptionsContainer: LinearLayout
    private lateinit var confirmRideBtn: MaterialButton
    private lateinit var distanceText: TextView

    // Finding Driver
    private lateinit var findingText: TextView

    // Driver Assigned
    private lateinit var driverNameText: TextView
    private lateinit var driverRatingText: TextView
    private lateinit var vehicleInfoText: TextView
    private lateinit var cancelRideBtn: MaterialButton

    // Ride Progress
    private lateinit var rideStatusText: TextView
    private lateinit var rideFareText: TextView

    // Rating
    private lateinit var ratingBar: RatingBar
    private lateinit var feedbackInput: TextInputEditText
    private lateinit var submitRatingBtn: MaterialButton

    // Toolbar
    private lateinit var userNameText: TextView
    private lateinit var profileBtn: ImageView
    private lateinit var historyBtn: ImageView

    // State
    private var currentTripId: String? = null
    private var selectedVehicleType: String = "car"
    private var pickupPoint: GeoPoint = GeoPoint(31.5204, 74.3587) // Lahore default
    private var dropPoint: GeoPoint? = null
    private var fareEstimates: List<FareEstimate> = emptyList()
    private var pickupMarker: Marker? = null
    private var dropMarker: Marker? = null
    private var routeLine: Polyline? = null
    private val pollHandler = Handler(Looper.getMainLooper())

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_rider_main)

        Configuration.getInstance().userAgentValue = packageName
        initViews()
        setupMap()
        setupBottomSheet()
        showSection("search")

        userNameText.text = "Hi, ${PrefsManager.getUserName(this) ?: "Rider"} 👋"
    }

    private fun initViews() {
        mapView = findViewById(R.id.mapView)
        bottomSheet = findViewById(R.id.bottomSheet)

        searchSection = findViewById(R.id.searchSection)
        rideOptionsSection = findViewById(R.id.rideOptionsSection)
        findingDriverSection = findViewById(R.id.findingDriverSection)
        driverAssignedSection = findViewById(R.id.driverAssignedSection)
        rideProgressSection = findViewById(R.id.rideProgressSection)
        ratingSection = findViewById(R.id.ratingSection)

        pickupInput = findViewById(R.id.pickupInput)
        dropInput = findViewById(R.id.dropInput)
        searchRideBtn = findViewById(R.id.searchRideBtn)

        rideOptionsContainer = findViewById(R.id.rideOptionsContainer)
        confirmRideBtn = findViewById(R.id.confirmRideBtn)
        distanceText = findViewById(R.id.distanceText)

        findingText = findViewById(R.id.findingText)

        driverNameText = findViewById(R.id.driverNameText)
        driverRatingText = findViewById(R.id.driverRatingText)
        vehicleInfoText = findViewById(R.id.vehicleInfoText)
        cancelRideBtn = findViewById(R.id.cancelRideBtn)

        rideStatusText = findViewById(R.id.rideStatusText)
        rideFareText = findViewById(R.id.rideFareText)

        ratingBar = findViewById(R.id.ratingBar)
        feedbackInput = findViewById(R.id.feedbackInput)
        submitRatingBtn = findViewById(R.id.submitRatingBtn)

        userNameText = findViewById(R.id.userNameText)
        profileBtn = findViewById(R.id.profileBtn)
        historyBtn = findViewById(R.id.historyBtn)

        searchRideBtn.setOnClickListener { searchForRide() }
        confirmRideBtn.setOnClickListener { confirmRide() }
        cancelRideBtn.setOnClickListener { cancelRide() }
        submitRatingBtn.setOnClickListener { submitRating() }

        profileBtn.setOnClickListener { showProfileDialog() }
        historyBtn.setOnClickListener { showHistoryDialog() }
    }

    private fun setupMap() {
        mapView.setTileSource(TileSourceFactory.MAPNIK)
        mapView.setMultiTouchControls(true)
        mapView.controller.setZoom(15.0)
        mapView.controller.setCenter(pickupPoint)

        // Add pickup marker
        pickupMarker = Marker(mapView).apply {
            position = pickupPoint
            setAnchor(Marker.ANCHOR_CENTER, Marker.ANCHOR_BOTTOM)
            title = "Your Location"
            snippet = "Lahore"
        }
        mapView.overlays.add(pickupMarker)

        // Set pickup address
        pickupInput.setText("Current Location - Lahore")

        // Long press to set drop location
        mapView.setOnTouchListener { _, _ -> false }
    }

    private fun setupBottomSheet() {
        bottomSheetBehavior = BottomSheetBehavior.from(bottomSheet)
        bottomSheetBehavior.peekHeight = 300
        bottomSheetBehavior.state = BottomSheetBehavior.STATE_COLLAPSED
    }

    private fun showSection(section: String) {
        searchSection.visibility = if (section == "search") View.VISIBLE else View.GONE
        rideOptionsSection.visibility = if (section == "options") View.VISIBLE else View.GONE
        findingDriverSection.visibility = if (section == "finding") View.VISIBLE else View.GONE
        driverAssignedSection.visibility = if (section == "assigned") View.VISIBLE else View.GONE
        rideProgressSection.visibility = if (section == "progress") View.VISIBLE else View.GONE
        ratingSection.visibility = if (section == "rating") View.VISIBLE else View.GONE

        when (section) {
            "search" -> bottomSheetBehavior.peekHeight = 320
            "options" -> bottomSheetBehavior.peekHeight = 450
            "finding" -> bottomSheetBehavior.peekHeight = 200
            "assigned", "progress" -> bottomSheetBehavior.peekHeight = 300
            "rating" -> bottomSheetBehavior.peekHeight = 400
        }
        bottomSheetBehavior.state = BottomSheetBehavior.STATE_COLLAPSED
    }

    private fun searchForRide() {
        val dropAddress = dropInput.text.toString().trim()
        if (dropAddress.isEmpty()) {
            dropInput.error = "Enter destination"
            return
        }

        // Simulate drop location (offset from pickup)
        dropPoint = GeoPoint(
            pickupPoint.latitude + (Math.random() - 0.5) * 0.08,
            pickupPoint.longitude + (Math.random() - 0.5) * 0.08
        )

        // Add drop marker
        dropMarker?.let { mapView.overlays.remove(it) }
        dropMarker = Marker(mapView).apply {
            position = dropPoint
            setAnchor(Marker.ANCHOR_CENTER, Marker.ANCHOR_BOTTOM)
            title = "Destination"
            snippet = dropAddress
        }
        mapView.overlays.add(dropMarker)

        // Draw route line
        routeLine?.let { mapView.overlays.remove(it) }
        routeLine = Polyline().apply {
            addPoint(pickupPoint)
            addPoint(dropPoint)
            outlinePaint.color = getColor(R.color.green_primary)
            outlinePaint.strokeWidth = 8f
        }
        mapView.overlays.add(routeLine)
        mapView.invalidate()

        // Zoom to fit both points
        mapView.controller.setZoom(13.0)
        val midLat = (pickupPoint.latitude + dropPoint!!.latitude) / 2
        val midLng = (pickupPoint.longitude + dropPoint!!.longitude) / 2
        mapView.controller.setCenter(GeoPoint(midLat, midLng))

        // Fetch fare estimates
        getFareEstimates()
    }

    private fun getFareEstimates() {
        lifecycleScope.launch {
            try {
                val response = RetrofitClient.api.getFareEstimate(
                    pickupPoint.latitude, pickupPoint.longitude,
                    dropPoint!!.latitude, dropPoint!!.longitude
                )
                if (response.isSuccessful) {
                    val body = response.body()
                    if (body != null) {
                        fareEstimates = body.estimates
                        distanceText.text = "📍 ${body.distance} km"
                        showRideOptions()
                    }
                }
            } catch (e: Exception) {
                Toast.makeText(this@RiderMainActivity, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun showRideOptions() {
        rideOptionsContainer.removeAllViews()

        val vehicleIcons = mapOf("bike" to "🏍️", "rickshaw" to "🛺", "car" to "🚗", "premium" to "⭐")
        val vehicleColors = mapOf(
            "bike" to R.color.bike_color, "rickshaw" to R.color.rickshaw_color,
            "car" to R.color.car_color, "premium" to R.color.premium_color
        )

        fareEstimates.forEach { estimate ->
            val card = layoutInflater.inflate(R.layout.item_ride_option, rideOptionsContainer, false)

            card.findViewById<TextView>(R.id.vehicleIcon).text = vehicleIcons[estimate.vehicleType] ?: "🚗"
            card.findViewById<TextView>(R.id.vehicleName).text = estimate.label
            card.findViewById<TextView>(R.id.vehicleDesc).text = "${estimate.distanceKm} km • ${estimate.baseFare} base"
            card.findViewById<TextView>(R.id.vehicleFare).text = "₨${estimate.fare}"

            val cardView = card.findViewById<MaterialCardView>(R.id.rideOptionCard)
            if (estimate.vehicleType == selectedVehicleType) {
                cardView.strokeColor = getColor(R.color.green_primary)
                cardView.strokeWidth = 3
            }

            card.setOnClickListener {
                selectedVehicleType = estimate.vehicleType
                confirmRideBtn.text = "Confirm ${estimate.label} • ₨${estimate.fare}"
                showRideOptions() // Refresh selection
            }

            rideOptionsContainer.addView(card)
        }

        // Set default selection
        val defaultEstimate = fareEstimates.find { it.vehicleType == selectedVehicleType }
        confirmRideBtn.text = "Confirm ${defaultEstimate?.label ?: "Ride"} • ₨${defaultEstimate?.fare ?: 0}"

        showSection("options")
    }

    private fun confirmRide() {
        showSection("finding")

        lifecycleScope.launch {
            try {
                val request = RideRequest(
                    pickupLat = pickupPoint.latitude,
                    pickupLng = pickupPoint.longitude,
                    pickupAddress = pickupInput.text.toString(),
                    dropLat = dropPoint!!.latitude,
                    dropLng = dropPoint!!.longitude,
                    dropAddress = dropInput.text.toString(),
                    vehicleType = selectedVehicleType
                )
                val response = RetrofitClient.api.requestRide(request)
                if (response.isSuccessful && response.body()?.success == true) {
                    currentTripId = response.body()!!.trip?.id
                    findingText.text = "🔍 Finding your driver...\n${response.body()!!.trip?.availableDrivers ?: 0} drivers nearby"
                    // Start polling for driver assignment
                    startPollingRideStatus()
                } else {
                    Toast.makeText(this@RiderMainActivity, response.body()?.error ?: "No drivers available", Toast.LENGTH_LONG).show()
                    showSection("options")
                }
            } catch (e: Exception) {
                Toast.makeText(this@RiderMainActivity, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
                showSection("options")
            }
        }
    }

    private fun startPollingRideStatus() {
        val pollRunnable = object : Runnable {
            override fun run() {
                currentTripId?.let { tripId ->
                    lifecycleScope.launch {
                        try {
                            val response = RetrofitClient.api.getRideStatus(tripId)
                            if (response.isSuccessful) {
                                val trip = response.body()?.trip
                                when (trip?.status) {
                                    "accepted", "arriving" -> showDriverAssigned(trip)
                                    "in_progress" -> showRideInProgress(trip)
                                    "completed" -> showRatingScreen(trip)
                                    "cancelled" -> {
                                        showSection("search")
                                        Toast.makeText(this@RiderMainActivity, "Ride cancelled", Toast.LENGTH_SHORT).show()
                                        return@launch
                                    }
                                    else -> {} // Still searching
                                }
                            }
                        } catch (_: Exception) {}
                    }
                    pollHandler.postDelayed(this, 3000)
                }
            }
        }
        pollHandler.postDelayed(pollRunnable, 2000)
    }

    private fun showDriverAssigned(trip: TripDetail) {
        driverNameText.text = trip.driverName ?: "Driver"
        driverRatingText.text = "⭐ ${trip.driverRating ?: 4.5}"
        vehicleInfoText.text = "${trip.vehicleModel ?: ""} • ${trip.vehicleNumber ?: ""}"
        showSection("assigned")

        // Show driver marker on map
        trip.driverLat?.let { lat ->
            trip.driverLng?.let { lng ->
                val driverMarker = Marker(mapView).apply {
                    position = GeoPoint(lat, lng)
                    setAnchor(Marker.ANCHOR_CENTER, Marker.ANCHOR_CENTER)
                    title = trip.driverName
                }
                mapView.overlays.add(driverMarker)
                mapView.invalidate()
            }
        }
    }

    private fun showRideInProgress(trip: TripDetail) {
        rideStatusText.text = "🚗 Ride in Progress"
        rideFareText.text = "₨${trip.fare ?: 0}"
        showSection("progress")
    }

    private fun showRatingScreen(trip: TripDetail) {
        pollHandler.removeCallbacksAndMessages(null)
        rideFareText.text = "₨${trip.fare ?: 0}"
        showSection("rating")
    }

    private fun cancelRide() {
        currentTripId?.let { tripId ->
            lifecycleScope.launch {
                try {
                    RetrofitClient.api.cancelRide(tripId)
                    pollHandler.removeCallbacksAndMessages(null)
                    currentTripId = null
                    showSection("search")
                    Toast.makeText(this@RiderMainActivity, "Ride cancelled", Toast.LENGTH_SHORT).show()
                } catch (e: Exception) {
                    Toast.makeText(this@RiderMainActivity, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }

    private fun submitRating() {
        currentTripId?.let { tripId ->
            lifecycleScope.launch {
                try {
                    val body = mapOf<String, Any>(
                        "rating" to ratingBar.rating.toInt(),
                        "feedback" to (feedbackInput.text?.toString() ?: "")
                    )
                    RetrofitClient.api.rateRide(tripId, body)
                    currentTripId = null
                    Toast.makeText(this@RiderMainActivity, "Thanks for rating! ⭐", Toast.LENGTH_SHORT).show()

                    // Reset
                    clearMapOverlays()
                    showSection("search")
                    dropInput.setText("")
                } catch (e: Exception) {
                    Toast.makeText(this@RiderMainActivity, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }

    private fun clearMapOverlays() {
        dropMarker?.let { mapView.overlays.remove(it) }
        routeLine?.let { mapView.overlays.remove(it) }
        mapView.invalidate()
    }

    private fun showProfileDialog() {
        val name = PrefsManager.getUserName(this) ?: "User"
        val phone = PrefsManager.getUserPhone(this) ?: ""
        val rating = PrefsManager.getUserRating(this)

        AlertDialog.Builder(this, R.style.Theme_Zaara)
            .setTitle("👤 $name")
            .setMessage("📱 $phone\n⭐ Rating: $rating\n\n🚶 Role: Rider")
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

    private fun showHistoryDialog() {
        lifecycleScope.launch {
            try {
                val response = RetrofitClient.api.getRideHistory()
                if (response.isSuccessful) {
                    val trips = response.body()?.trips ?: emptyList()
                    val msg = if (trips.isEmpty()) "No rides yet"
                    else trips.take(5).joinToString("\n\n") { trip ->
                        "📍 ${trip.pickupAddress ?: "Pickup"} → ${trip.dropAddress ?: "Drop"}\n" +
                        "💰 ₨${trip.fare ?: 0} • ${trip.vehicleType ?: ""} • ${trip.status}\n" +
                        "⭐ ${trip.rating ?: "-"}"
                    }

                    AlertDialog.Builder(this@RiderMainActivity, R.style.Theme_Zaara)
                        .setTitle("📜 Ride History")
                        .setMessage(msg)
                        .setPositiveButton("OK", null)
                        .show()
                }
            } catch (e: Exception) {
                Toast.makeText(this@RiderMainActivity, "Error loading history", Toast.LENGTH_SHORT).show()
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
