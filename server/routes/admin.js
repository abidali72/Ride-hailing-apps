const express = require('express');
const router = express.Router();

module.exports = function (db) {
    // Dashboard stats
    router.get('/dashboard', (req, res) => {
        const totalUsers = db.findUsers({ role: 'rider' }).length;
        const totalDrivers = db.findUsers({ role: 'driver' }).length;
        const onlineDrivers = db.findDrivers({ status: 'online' }).length;
        const totalTrips = db.data.trips.length;
        const completedTrips = db.data.trips.filter(t => t.status === 'completed').length;
        const activeTrips = db.data.trips.filter(t => ['requested', 'accepted', 'arriving', 'in_progress'].includes(t.status)).length;
        const totalRevenue = db.data.trips.filter(t => t.status === 'completed').reduce((s, t) => s + (t.fare || 0), 0);
        const commissionRate = parseFloat(db.getSetting('commission_rate') || '0.20');
        const totalCommission = Math.round(totalRevenue * commissionRate);

        res.json({
            totalUsers, totalDrivers, onlineDrivers, totalTrips,
            completedTrips, activeTrips, totalRevenue, totalCommission,
            commissionRate: commissionRate * 100, currency: 'PKR'
        });
    });

    // List users
    router.get('/users', (req, res) => {
        const users = db.findUsers({ role: 'rider' }).map(u => ({
            id: u.id, name: u.name, phone: u.phone, email: u.email, role: u.role,
            rating: u.rating, is_active: u.is_active, created_at: u.created_at
        }));
        res.json({ users });
    });

    // List drivers
    router.get('/drivers', (req, res) => {
        const drivers = db.findUsers({ role: 'driver' }).map(u => {
            const d = db.findDriver({ user_id: u.id });
            return {
                user_id: u.id, name: u.name, phone: u.phone, email: u.email, rating: u.rating, is_active: u.is_active,
                driver_id: d?.id, vehicle_type: d?.vehicle_type, vehicle_number: d?.vehicle_number, vehicle_model: d?.vehicle_model,
                status: d?.status, kyc_verified: d?.kyc_verified, total_rides: d?.total_rides, location_lat: d?.location_lat, location_lng: d?.location_lng
            };
        });
        res.json({ drivers });
    });

    // Update commission
    router.put('/commission', (req, res) => {
        const { rate } = req.body;
        if (!rate || rate < 0 || rate > 100) return res.status(400).json({ error: 'Rate must be 0-100' });
        db.setSetting('commission_rate', (rate / 100).toString());
        res.json({ success: true, rate });
    });

    // Analytics
    router.get('/analytics', (req, res) => {
        const completedTrips = db.data.trips.filter(t => t.status === 'completed');

        // Daily revenue
        const dailyMap = {};
        completedTrips.forEach(t => {
            const date = t.created_at?.slice(0, 10) || 'unknown';
            if (!dailyMap[date]) dailyMap[date] = { date, revenue: 0, trips: 0 };
            dailyMap[date].revenue += t.fare || 0;
            dailyMap[date].trips += 1;
        });
        const dailyRevenue = Object.values(dailyMap).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30);

        // Vehicle breakdown
        const vehicleMap = {};
        completedTrips.forEach(t => {
            const vt = t.vehicle_type || 'unknown';
            if (!vehicleMap[vt]) vehicleMap[vt] = { vehicle_type: vt, count: 0, revenue: 0 };
            vehicleMap[vt].count += 1;
            vehicleMap[vt].revenue += t.fare || 0;
        });
        const vehicleBreakdown = Object.values(vehicleMap);

        // Top drivers
        const topDrivers = db.findUsers({ role: 'driver' }).map(u => {
            const d = db.findDriver({ user_id: u.id });
            const earnings = d ? db.getEarnings(d.id) : [];
            const totalEarnings = earnings.reduce((s, e) => s + (e.net_amount || 0), 0);
            return { name: u.name, rating: u.rating, vehicle_type: d?.vehicle_type, total_rides: d?.total_rides || 0, total_earnings: totalEarnings };
        }).sort((a, b) => b.total_earnings - a.total_earnings).slice(0, 10);

        res.json({ dailyRevenue, vehicleBreakdown, topDrivers });
    });

    return router;
};
