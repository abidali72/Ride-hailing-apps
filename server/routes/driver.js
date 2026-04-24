const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { authMiddleware } = require('../middleware/auth');
const realtimeManager = require('../services/realtime');

module.exports = function (db) {
    // Toggle online/offline status
    router.post('/toggle-status', authMiddleware, (req, res) => {
        const driver = db.findDriver({ user_id: req.user.id });
        if (!driver) return res.status(404).json({ error: 'Driver not found' });

        const newStatus = driver.status === 'online' ? 'offline' : 'online';
        db.updateDriver({ user_id: req.user.id }, { status: newStatus });
        res.json({ success: true, status: newStatus });
    });

    // Update location
    router.post('/update-location', authMiddleware, (req, res) => {
        const { lat, lng } = req.body;
        if (!lat || !lng) return res.status(400).json({ error: 'Coordinates required' });

        db.updateDriver({ user_id: req.user.id }, { location_lat: lat, location_lng: lng });
        realtimeManager.updateDriverLocation(req.user.id, lat, lng);

        // If driver has active trip, broadcast location to rider
        const driver = db.findDriver({ user_id: req.user.id });
        if (driver) {
            const activeTrip = db.data.trips.find(t =>
                t.driver_id === driver.id && ['accepted', 'arriving', 'in_progress'].includes(t.status)
            );
            if (activeTrip) {
                realtimeManager.broadcastDriverLocation(activeTrip.rider_id, driver.id, lat, lng);
            }
        }

        res.json({ success: true });
    });

    // Accept ride
    router.post('/accept-ride/:tripId', authMiddleware, (req, res) => {
        const driver = db.findDriver({ user_id: req.user.id });
        if (!driver) return res.status(404).json({ error: 'Driver not found' });

        const trip = db.findTrip({ id: req.params.tripId });
        if (!trip || trip.status !== 'requested') return res.status(404).json({ error: 'Trip not found or already taken' });

        db.updateTrip(req.params.tripId, { driver_id: driver.id, status: 'accepted' });
        db.updateDriver({ id: driver.id }, { status: 'busy' });

        const driverUser = db.findUser({ id: req.user.id });

        // Notify rider
        realtimeManager.notifyRideUpdate(trip.rider_id, {
            status: 'accepted',
            tripId: trip.id,
            driver: {
                name: driverUser?.name || 'Driver',
                phone: driverUser?.phone,
                vehicleNumber: driver.vehicle_number,
                vehicleModel: driver.vehicle_model,
                vehicleType: driver.vehicle_type,
                rating: driverUser?.rating || 4.5,
                lat: driver.location_lat,
                lng: driver.location_lng
            }
        });

        const updatedTrip = db.findTrip({ id: req.params.tripId });
        res.json({ success: true, trip: updatedTrip });
    });

    // Reject ride
    router.post('/reject-ride/:tripId', authMiddleware, (req, res) => {
        res.json({ success: true, message: 'Ride rejected' });
    });

    // Arrive at pickup
    router.post('/arrive/:tripId', authMiddleware, (req, res) => {
        db.updateTrip(req.params.tripId, { status: 'arriving' });
        const trip = db.findTrip({ id: req.params.tripId });
        if (trip) {
            realtimeManager.notifyRideUpdate(trip.rider_id, { status: 'arriving', tripId: req.params.tripId });
        }
        res.json({ success: true, status: 'arriving' });
    });

    // Start ride
    router.post('/start-ride/:tripId', authMiddleware, (req, res) => {
        db.updateTrip(req.params.tripId, { status: 'in_progress' });
        const trip = db.findTrip({ id: req.params.tripId });
        if (trip) {
            realtimeManager.notifyRideUpdate(trip.rider_id, { status: 'in_progress', tripId: req.params.tripId });
        }
        res.json({ success: true, status: 'in_progress' });
    });

    // Complete ride
    router.post('/complete-ride/:tripId', authMiddleware, (req, res) => {
        const trip = db.findTrip({ id: req.params.tripId });
        if (!trip) return res.status(404).json({ error: 'Trip not found' });

        db.updateTrip(req.params.tripId, { status: 'completed', completed_at: new Date().toISOString() });
        db.updateDriver({ id: trip.driver_id }, { status: 'online' });

        // Update driver total rides
        const driver = db.findDriver({ id: trip.driver_id });
        if (driver) {
            db.updateDriver({ id: trip.driver_id }, { total_rides: (driver.total_rides || 0) + 1 });
        }

        // Create earnings record
        const commissionRate = parseFloat(db.getSetting('commission_rate') || '0.20');
        const commission = Math.round(trip.fare * commissionRate);
        const netAmount = trip.fare - commission;

        db.addEarning({ driver_id: trip.driver_id, trip_id: trip.id, amount: trip.fare, commission_rate: commissionRate, net_amount: netAmount });
        db.addPayment({ trip_id: trip.id, amount: trip.fare, method: 'cash', status: 'completed' });

        realtimeManager.notifyRideUpdate(trip.rider_id, { status: 'completed', tripId: req.params.tripId, fare: trip.fare });

        res.json({ success: true, status: 'completed', fare: trip.fare, netEarning: netAmount, commission });
    });

    // Get earnings
    router.get('/earnings', authMiddleware, (req, res) => {
        const driver = db.findDriver({ user_id: req.user.id });
        if (!driver) return res.status(404).json({ error: 'Driver not found' });

        const earnings = db.getEarnings(driver.id);
        const now = new Date();
        const todayStr = now.toISOString().slice(0, 10);

        const todayEarnings = earnings.filter(e => e.created_at?.startsWith(todayStr));
        const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
        const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();

        const weekEarnings = earnings.filter(e => e.created_at >= weekAgo);
        const monthEarnings = earnings.filter(e => e.created_at >= monthAgo);

        const sumEarnings = (arr) => ({ total: arr.reduce((s, e) => s + (e.net_amount || 0), 0), trips: arr.length });

        const recentTrips = earnings
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 20)
            .map(e => {
                const trip = db.findTrip({ id: e.trip_id });
                return { ...e, pickup_address: trip?.pickup_address, drop_address: trip?.drop_address, distance_km: trip?.distance_km, fare: trip?.fare, trip_date: trip?.created_at };
            });

        res.json({
            today: sumEarnings(todayEarnings),
            week: sumEarnings(weekEarnings),
            month: sumEarnings(monthEarnings),
            all: sumEarnings(earnings),
            recentTrips
        });
    });

    // Get driver profile
    router.get('/profile', authMiddleware, (req, res) => {
        const user = db.findUser({ id: req.user.id });
        const driver = db.findDriver({ user_id: req.user.id });
        res.json({ user: { ...user, password_hash: undefined }, driver });
    });

    // Get pending ride requests
    router.get('/pending-rides', authMiddleware, (req, res) => {
        const driver = db.findDriver({ user_id: req.user.id });
        if (!driver) return res.status(404).json({ error: 'Driver not found' });

        const rides = db.data.trips
            .filter(t => t.status === 'requested' && t.vehicle_type === driver.vehicle_type)
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 5)
            .map(t => {
                const rider = db.findUser({ id: t.rider_id });
                return { ...t, rider_name: rider?.name, rider_phone: rider?.phone, rider_rating: rider?.rating };
            });

        res.json({ rides });
    });

    // Get active trip
    router.get('/active-trip', authMiddleware, (req, res) => {
        const driver = db.findDriver({ user_id: req.user.id });
        if (!driver) return res.status(404).json({ error: 'Driver not found' });

        const trip = db.data.trips.find(t =>
            t.driver_id === driver.id && ['accepted', 'arriving', 'in_progress'].includes(t.status)
        );

        if (trip) {
            const rider = db.findUser({ id: trip.rider_id });
            res.json({ trip: { ...trip, rider_name: rider?.name, rider_phone: rider?.phone, rider_rating: rider?.rating } });
        } else {
            res.json({ trip: null });
        }
    });

    return router;
};
