const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { generateToken } = require('../middleware/auth');

module.exports = function (db) {
    // Send OTP (simulated)
    router.post('/send-otp', (req, res) => {
        const { phone } = req.body;
        if (!phone) return res.status(400).json({ error: 'Phone number required' });

        console.log(`📱 OTP sent to ${phone}: 1234`);
        res.json({ success: true, message: 'OTP sent successfully', debug_otp: '1234' });
    });

    // Verify OTP
    router.post('/verify-otp', (req, res) => {
        const { phone, otp } = req.body;
        if (!phone || !otp) return res.status(400).json({ error: 'Phone and OTP required' });

        if (otp !== '1234') {
            return res.status(400).json({ error: 'Invalid OTP' });
        }

        const user = db.findUser({ phone });
        if (!user) {
            return res.status(404).json({ error: 'User not found. Please register first.', needsRegistration: true });
        }

        const token = generateToken(user);
        let driverInfo = null;
        if (user.role === 'driver') {
            driverInfo = db.findDriver({ user_id: user.id });
        }

        res.json({ success: true, token, user: { ...user, password_hash: undefined }, driver: driverInfo });
    });

    // Register
    router.post('/register', (req, res) => {
        const { name, phone, email, role } = req.body;
        if (!name || !phone || !role) {
            return res.status(400).json({ error: 'Name, phone, and role are required' });
        }

        const existing = db.findUser({ phone });
        if (existing) {
            return res.status(400).json({ error: 'Phone number already registered' });
        }

        const user = db.addUser({ name, phone, email: email || null, role });

        if (role === 'driver') {
            const { vehicle_type, vehicle_number, vehicle_model } = req.body;
            db.addDriver({
                user_id: user.id,
                vehicle_type: vehicle_type || 'car',
                vehicle_number: vehicle_number || 'NEW-0000',
                vehicle_model: vehicle_model || 'Unknown',
                location_lat: 31.5204,
                location_lng: 74.3587
            });
        }

        const token = generateToken(user);
        res.json({ success: true, token, user: { ...user, password_hash: undefined } });
    });

    // Quick login for demo
    router.post('/login', (req, res) => {
        const { phone } = req.body;
        if (!phone) return res.status(400).json({ error: 'Phone required' });

        const user = db.findUser({ phone });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const token = generateToken(user);
        let driverInfo = null;
        if (user.role === 'driver') {
            driverInfo = db.findDriver({ user_id: user.id });
        }

        res.json({ success: true, token, user: { ...user, password_hash: undefined }, driver: driverInfo });
    });

    // Get all demo users
    router.get('/demo-users', (req, res) => {
        const riders = db.findUsers({ role: 'rider' }).map(u => ({ id: u.id, name: u.name, phone: u.phone, role: u.role }));
        const driverUsersList = db.findUsers({ role: 'driver' });
        const drivers = driverUsersList.map(u => {
            const d = db.findDriver({ user_id: u.id });
            return { id: u.id, name: u.name, phone: u.phone, role: u.role, vehicle_type: d?.vehicle_type, vehicle_model: d?.vehicle_model, status: d?.status };
        });
        const admins = db.findUsers({ role: 'admin' }).map(u => ({ id: u.id, name: u.name, phone: u.phone, role: u.role }));
        res.json({ riders, drivers, admins });
    });

    return router;
};
