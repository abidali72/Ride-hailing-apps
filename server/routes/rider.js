const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { authMiddleware } = require('../middleware/auth');
const { calculateFare, calculateDistance, getAllFareEstimates } = require('../services/fare');
const { findNearbyDrivers } = require('../services/matching');
const realtimeManager = require('../services/realtime');

module.exports = function (db) {
    // Get fare estimate
    router.get('/fare-estimate', (req, res) => {
        const { pickup_lat, pickup_lng, drop_lat, drop_lng } = req.query;
        if (!pickup_lat || !pickup_lng || !drop_lat || !drop_lng) {
            return res.status(400).json({ error: 'Pickup and drop coordinates required' });
        }

        const distance = calculateDistance(
            parseFloat(pickup_lat), parseFloat(pickup_lng),
            parseFloat(drop_lat), parseFloat(drop_lng)
        );

        const roadDistance = distance * 1.3;
        const surgeMultiplier = parseFloat(db.getSetting('surge_multiplier') || '1.0');
        const estimates = getAllFareEstimates(roadDistance, surgeMultiplier);

        res.json({ distance: Math.round(roadDistance * 10) / 10, estimates, surgeMultiplier });
    });

    // Request a ride
    router.post('/request-ride', authMiddleware, (req, res) => {
        const { pickup_lat, pickup_lng, pickup_address, drop_lat, drop_lng, drop_address, vehicle_type } = req.body;

        if (!pickup_lat || !pickup_lng || !drop_lat || !drop_lng || !vehicle_type) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const distance = calculateDistance(pickup_lat, pickup_lng, drop_lat, drop_lng) * 1.3;
        const surgeMultiplier = parseFloat(db.getSetting('surge_multiplier') || '1.0');
        const fareInfo = calculateFare(distance, vehicle_type, surgeMultiplier);

        const nearbyDrivers = findNearbyDrivers(db, pickup_lat, pickup_lng, vehicle_type);

        if (nearbyDrivers.length === 0) {
            return res.status(404).json({ error: 'No drivers available nearby. Please try again.' });
        }

        const trip = db.addTrip({
            rider_id: req.user.id,
            pickup_lat, pickup_lng, pickup_address: pickup_address || '',
            drop_lat, drop_lng, drop_address: drop_address || '',
            distance_km: Math.round(distance * 10) / 10,
            fare: fareInfo.fare,
            vehicle_type,
            status: 'requested'
        });

        // Notify nearest driver
        const closestDriver = nearbyDrivers[0];
        realtimeManager.notifyRideRequest(closestDriver.user_id, {
            tripId: trip.id,
            rider: { name: req.user.name, phone: req.user.phone },
            pickup: { lat: pickup_lat, lng: pickup_lng, address: pickup_address },
            drop: { lat: drop_lat, lng: drop_lng, address: drop_address },
            fare: fareInfo.fare,
            distance: Math.round(distance * 10) / 10,
            vehicleType: vehicle_type
        });

        res.json({
            success: true,
            trip: {
                id: trip.id,
                fare: fareInfo.fare,
                distance: Math.round(distance * 10) / 10,
                vehicle_type,
                status: 'requested',
                availableDrivers: nearbyDrivers.length
            }
        });
    });

    // Get ride status
    router.get('/ride-status/:tripId', authMiddleware, (req, res) => {
        const trip = db.findTrip({ id: req.params.tripId });
        if (!trip) return res.status(404).json({ error: 'Trip not found' });

        let driverName = null, driverPhone = null, driverRating = null, vehicleNumber = null, vehicleModel = null, driverLat = null, driverLng = null;
        if (trip.driver_id) {
            const driver = db.findDriver({ id: trip.driver_id });
            if (driver) {
                const driverUser = db.findUser({ id: driver.user_id });
                driverName = driverUser?.name;
                driverPhone = driverUser?.phone;
                driverRating = driverUser?.rating;
                vehicleNumber = driver.vehicle_number;
                vehicleModel = driver.vehicle_model;
                driverLat = driver.location_lat;
                driverLng = driver.location_lng;
            }
        }

        res.json({
            trip: {
                ...trip,
                driver_name: driverName,
                driver_phone: driverPhone,
                driver_rating: driverRating,
                vehicle_number: vehicleNumber,
                vehicle_model: vehicleModel,
                driver_lat: driverLat,
                driver_lng: driverLng
            }
        });
    });

    // Cancel ride
    router.post('/cancel-ride/:tripId', authMiddleware, (req, res) => {
        const trip = db.findTrip({ id: req.params.tripId });
        if (!trip) return res.status(404).json({ error: 'Trip not found' });
        if (trip.status === 'completed') return res.status(400).json({ error: 'Cannot cancel completed trip' });

        db.updateTrip(req.params.tripId, { status: 'cancelled' });
        if (trip.driver_id) {
            db.updateDriver({ id: trip.driver_id }, { status: 'online' });
        }

        res.json({ success: true, message: 'Ride cancelled' });
    });

    // Rate ride
    router.post('/rate-ride/:tripId', authMiddleware, (req, res) => {
        const { rating, feedback } = req.body;
        if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating must be 1-5' });

        db.updateTrip(req.params.tripId, { rating, feedback: feedback || '' });

        const trip = db.findTrip({ id: req.params.tripId });
        if (trip?.driver_id) {
            const driver = db.findDriver({ id: trip.driver_id });
            if (driver) {
                const driverTrips = db.findTrips({ driver_id: trip.driver_id }).filter(t => t.rating);
                if (driverTrips.length > 0) {
                    const avgRating = driverTrips.reduce((sum, t) => sum + t.rating, 0) / driverTrips.length;
                    db.updateUser(driver.user_id, { rating: Math.round(avgRating * 10) / 10 });
                }
            }
        }

        res.json({ success: true });
    });

    // Ride history
    router.get('/history', authMiddleware, (req, res) => {
        const trips = db.findTrips({ rider_id: req.user.id })
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 50)
            .map(trip => {
                let driverName = null, vehicleNumber = null, vehicleModel = null;
                if (trip.driver_id) {
                    const driver = db.findDriver({ id: trip.driver_id });
                    if (driver) {
                        const driverUser = db.findUser({ id: driver.user_id });
                        driverName = driverUser?.name;
                        vehicleNumber = driver.vehicle_number;
                        vehicleModel = driver.vehicle_model;
                    }
                }
                return { ...trip, driver_name: driverName, vehicle_number: vehicleNumber, vehicle_model: vehicleModel };
            });

        res.json({ trips });
    });

    // Get profile
    router.get('/profile', authMiddleware, (req, res) => {
        const user = db.findUser({ id: req.user.id });
        const totalTrips = db.findTrips({ rider_id: req.user.id }).length;
        const totalSpent = db.findTrips({ rider_id: req.user.id })
            .filter(t => t.status === 'completed')
            .reduce((sum, t) => sum + (t.fare || 0), 0);
        res.json({ user: { ...user, password_hash: undefined }, stats: { totalTrips, totalSpent } });
    });

    return router;
};
