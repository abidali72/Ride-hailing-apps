const test = require('node:test');
const assert = require('node:assert/strict');
const { initializeDatabase } = require('../db/schema');
const { findNearbyDrivers, assignDriver, releaseDriver } = require('../services/matching');

test('findNearbyDrivers - finds nearby drivers matching vehicle type and sorts correctly', () => {
    const db = initializeDatabase();

    // Clear seed data for clean test state
    db.data.users = [];
    db.data.drivers = [];
    db.data.trips = [];

    // Add user and driver 1 (car, distance ~1.1km, rating 4.8)
    const user1 = db.addUser({ name: 'Driver One', phone: '+923001111111', role: 'driver', rating: 4.8 });
    const driver1 = db.addDriver({
        user_id: user1.id, vehicle_type: 'car', status: 'online',
        location_lat: 31.5300, location_lng: 74.3587
    });

    // Add user and driver 2 (car, distance ~0km, rating 4.2)
    const user2 = db.addUser({ name: 'Driver Two', phone: '+923002222222', role: 'driver', rating: 4.2 });
    const driver2 = db.addDriver({
        user_id: user2.id, vehicle_type: 'car', status: 'online',
        location_lat: 31.5204, location_lng: 74.3587
    });

    // Add user and driver 3 (bike, distance ~0km, rating 5.0)
    const user3 = db.addUser({ name: 'Driver Three', phone: '+923003333333', role: 'driver', rating: 5.0 });
    db.addDriver({
        user_id: user3.id, vehicle_type: 'bike', status: 'online',
        location_lat: 31.5204, location_lng: 74.3587
    });

    // Add user and driver 4 (car, far away ~50km)
    const user4 = db.addUser({ name: 'Driver Four', phone: '+923004444444', role: 'driver', rating: 5.0 });
    db.addDriver({
        user_id: user4.id, vehicle_type: 'car', status: 'online',
        location_lat: 32.0000, location_lng: 75.0000
    });

    const nearbyCars = findNearbyDrivers(db, 31.5204, 74.3587, 'car', 5);

    // Only driver 1 and driver 2 should be returned (driver 3 is bike, driver 4 is too far)
    assert.equal(nearbyCars.length, 2);
    // Driver 2 is closer (~0km vs ~1.1km, distScore diff > 0.5km)
    assert.equal(nearbyCars[0].user_id, user2.id);
    assert.equal(nearbyCars[0].name, 'Driver Two');
    assert.equal(nearbyCars[0].user_rating, 4.2);
    assert.equal(nearbyCars[1].user_id, user1.id);
});

test('findNearbyDrivers - rating tie-breaking when distance difference < 0.5km', () => {
    const db = initializeDatabase();
    db.data.users = [];
    db.data.drivers = [];

    // Driver A: distance ~0.1km, rating 4.2
    const userA = db.addUser({ name: 'Driver A', phone: '+923001', role: 'driver', rating: 4.2 });
    db.addDriver({ user_id: userA.id, vehicle_type: 'car', status: 'online', location_lat: 31.5205, location_lng: 74.3587 });

    // Driver B: distance ~0.2km (diff < 0.5km), higher rating 4.9
    const userB = db.addUser({ name: 'Driver B', phone: '+923002', role: 'driver', rating: 4.9 });
    db.addDriver({ user_id: userB.id, vehicle_type: 'car', status: 'online', location_lat: 31.5220, location_lng: 74.3587 });

    const nearby = findNearbyDrivers(db, 31.5204, 74.3587, 'car', 5);

    assert.equal(nearby.length, 2);
    // Driver B has higher rating and distance difference is within 0.5km, so Driver B comes first
    assert.equal(nearby[0].name, 'Driver B');
});

test('findNearbyDrivers - handles vehicleType="any" or missing vehicleType', () => {
    const db = initializeDatabase();
    db.data.users = [];
    db.data.drivers = [];

    const u1 = db.addUser({ name: 'Driver Bike', role: 'driver' });
    db.addDriver({ user_id: u1.id, vehicle_type: 'bike', status: 'online', location_lat: 31.5204, location_lng: 74.3587 });

    const u2 = db.addUser({ name: 'Driver Car', role: 'driver' });
    db.addDriver({ user_id: u2.id, vehicle_type: 'car', status: 'online', location_lat: 31.5204, location_lng: 74.3587 });

    const allNearby = findNearbyDrivers(db, 31.5204, 74.3587, 'any', 5);
    assert.equal(allNearby.length, 2);
});

test('assignDriver and releaseDriver status transitions', () => {
    const db = initializeDatabase();
    db.data.users = [];
    db.data.drivers = [];
    db.data.trips = [];

    const user = db.addUser({ name: 'Driver Test', role: 'driver' });
    const driver = db.addDriver({ user_id: user.id, vehicle_type: 'car', status: 'online' });
    const trip = db.addTrip({ rider_id: 'rider-1', status: 'requested' });

    const updatedTrip = assignDriver(db, trip.id, driver.id);
    assert.equal(updatedTrip.status, 'accepted');
    assert.equal(updatedTrip.driver_id, driver.id);

    const updatedDriver = db.findDriver({ id: driver.id });
    assert.equal(updatedDriver.status, 'busy');

    releaseDriver(db, driver.id);
    const releasedDriver = db.findDriver({ id: driver.id });
    assert.equal(releasedDriver.status, 'online');
});
