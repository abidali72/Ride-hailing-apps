/**
 * Real-time WebSocket Manager
 * Handles driver location updates and ride status notifications
 */

const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');

class RealtimeManager {
    constructor() {
        this.clients = new Map(); // userId -> ws
        this.driverLocations = new Map(); // driverId -> {lat, lng, timestamp}
    }

    initialize(server) {
        this.wss = new WebSocket.Server({ server, path: '/ws' });

        this.wss.on('connection', (ws, req) => {
            // Parse token from query string
            const url = new URL(req.url, 'http://localhost');
            const token = url.searchParams.get('token');

            if (!token) {
                ws.close(4001, 'No token');
                return;
            }

            try {
                const decoded = jwt.verify(token, JWT_SECRET);
                ws.userId = decoded.id;
                ws.userRole = decoded.role;
                this.clients.set(decoded.id, ws);

                console.log(`🔌 WebSocket connected: ${decoded.name} (${decoded.role})`);

                ws.on('message', (data) => {
                    try {
                        const msg = JSON.parse(data);
                        this.handleMessage(ws, msg);
                    } catch (e) {
                        console.error('Invalid WS message:', e.message);
                    }
                });

                ws.on('close', () => {
                    this.clients.delete(decoded.id);
                    console.log(`🔌 WebSocket disconnected: ${decoded.name}`);
                });

                ws.send(JSON.stringify({ type: 'connected', userId: decoded.id }));
            } catch (err) {
                ws.close(4002, 'Invalid token');
            }
        });

        console.log('🔌 WebSocket server initialized');
    }

    handleMessage(ws, msg) {
        switch (msg.type) {
            case 'driver_location':
                this.updateDriverLocation(ws.userId, msg.lat, msg.lng);
                break;
            case 'ping':
                ws.send(JSON.stringify({ type: 'pong' }));
                break;
        }
    }

    updateDriverLocation(userId, lat, lng) {
        this.driverLocations.set(userId, { lat, lng, timestamp: Date.now() });
    }

    getDriverLocation(userId) {
        return this.driverLocations.get(userId);
    }

    // Send to a specific user
    sendToUser(userId, data) {
        const ws = this.clients.get(userId);
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(data));
            return true;
        }
        return false;
    }

    // Notify rider about ride updates
    notifyRideUpdate(riderId, data) {
        this.sendToUser(riderId, { type: 'ride_update', ...data });
    }

    // Notify driver about new ride request
    notifyRideRequest(driverUserId, data) {
        this.sendToUser(driverUserId, { type: 'ride_request', ...data });
    }

    // Broadcast driver location to tracking rider
    broadcastDriverLocation(riderId, driverId, lat, lng) {
        this.sendToUser(riderId, {
            type: 'driver_location',
            driverId,
            lat,
            lng,
            timestamp: Date.now()
        });
    }
}

const realtimeManager = new RealtimeManager();
module.exports = realtimeManager;
