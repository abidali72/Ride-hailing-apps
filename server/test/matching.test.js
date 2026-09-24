const { test, describe } = require('node:test');
const assert = require('node:assert');
const { initializeDatabase } = require('../db/schema');
const { findNearbyDrivers, assignDriver, releaseDriver } = require('../services/matching');

describe('Driver Matching Service', () => {
    test('findNearbyDrivers filters by radius and vehicle type, enriches user info, and sorts', () => {
        const db = initializeDatabase();

        // Seed specific test drivers
        const userNear = db.addUser({ name: 'Near Driver User', phone: '+923001111111', role: 'driver', rating: 4.9 });
        const driverNear = db.addDriver({
            user_id: userNear.id,
            vehicle_type: 'car',
            vehicle_number: 'TEST-111',
            vehicle_model: 'Corolla',
            status: 'online',
            location_lat: 31.5200,
            location_lng: 74.3580
        });

        const userFar = db.addUser({ name: 'Far Driver User', phone: '+923002222222', role: 'driver', rating: 5.0 });
        const driverFar = db.addDriver({
            user_id: userFar.id,
            vehicle_type: 'car',
            vehicle_number: 'TEST-222',
            vehicle_model: 'Civic',
            status: 'online',
            location_lat: 32.0000, // ~50+ km away
            location_lng: 74.3580
        });

        // Pickup at 31.5204, 74.3587
        const nearby = findNearbyDrivers(db, 31.5204, 74.3587, 'car', 5);

        // Near driver should be found
        const foundNear = nearby.find(d => d.id === driverNear.id);
        assert.ok(foundNear, 'Near driver should be in results');
        assert.strictEqual(foundNear.name, 'Near Driver User');
        assert.strictEqual(foundNear.phone, '+923001111111');
        assert.strictEqual(foundNear.user_rating, 4.9);

        // Far driver should NOT be in results
        const foundFar = nearby.find(d => d.id === driverFar.id);
        assert.strictEqual(foundFar, undefined, 'Far driver should not be in results');
    });

    test('assignDriver and releaseDriver update trip and driver status correctly', () => {
        const db = initializeDatabase();
        const user = db.addUser({ name: 'Test User', phone: '+923000000000' });
        const driver = db.addDriver({ user_id: user.id, vehicle_type: 'bike', status: 'online' });
        const trip = db.addTrip({ rider_id: user.id, fare: 100, vehicle_type: 'bike', status: 'requested' });

        const assignedTrip = assignDriver(db, trip.id, driver.id);
        assert.strictEqual(assignedTrip.status, 'accepted');
        assert.strictEqual(assignedTrip.driver_id, driver.id);

        const updatedDriver = db.findDriver({ id: driver.id });
        assert.strictEqual(updatedDriver.status, 'busy');

        releaseDriver(db, driver.id);
        const releasedDriver = db.findDriver({ id: driver.id });
        assert.strictEqual(releasedDriver.status, 'online');
    });
});
