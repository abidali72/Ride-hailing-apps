const test = require('node:test');
const assert = require('node:assert');
const { initializeDatabase } = require('../db/schema');
const { findNearbyDrivers, assignDriver, releaseDriver } = require('../services/matching');

test('findNearbyDrivers - finds online drivers within radius', () => {
    const db = initializeDatabase();

    // Add known driver and user
    const user = db.addUser({ name: 'Test Driver User', phone: '+923000001111', rating: 4.9 });
    const driver = db.addDriver({
        user_id: user.id,
        vehicle_type: 'car',
        status: 'online',
        location_lat: 31.5204,
        location_lng: 74.3587
    });

    const nearby = findNearbyDrivers(db, 31.5204, 74.3587, 'car', 5);
    const foundDriver = nearby.find(d => d.id === driver.id);
    assert.ok(foundDriver);
    assert.strictEqual(foundDriver.name, 'Test Driver User');
    assert.strictEqual(foundDriver.distance, 0);
});

test('findNearbyDrivers - filters out drivers outside radius', () => {
    const db = initializeDatabase();

    // Add far driver (e.g. Karachi coordinates ~1000km away from Lahore)
    const user = db.addUser({ name: 'Far Driver User', phone: '+923000002222', rating: 4.8 });
    const driver = db.addDriver({
        user_id: user.id,
        vehicle_type: 'car',
        status: 'online',
        location_lat: 24.8607,
        location_lng: 67.0011
    });

    const nearby = findNearbyDrivers(db, 31.5204, 74.3587, 'car', 5);
    const foundDriver = nearby.find(d => d.id === driver.id);
    assert.strictEqual(foundDriver, undefined);
});

test('findNearbyDrivers - filters by vehicle type', () => {
    const db = initializeDatabase();

    const user = db.addUser({ name: 'Bike Driver', phone: '+923000003333', rating: 5.0 });
    const driver = db.addDriver({
        user_id: user.id,
        vehicle_type: 'bike',
        status: 'online',
        location_lat: 31.5204,
        location_lng: 74.3587
    });

    const nearbyCar = findNearbyDrivers(db, 31.5204, 74.3587, 'car', 5);
    assert.strictEqual(nearbyCar.find(d => d.id === driver.id), undefined);

    const nearbyBike = findNearbyDrivers(db, 31.5204, 74.3587, 'bike', 5);
    assert.ok(nearbyBike.find(d => d.id === driver.id));
});

test('assignDriver and releaseDriver updates driver status correctly', () => {
    const db = initializeDatabase();
    const user = db.addUser({ name: 'Rider', phone: '+923000004444' });
    const trip = db.addTrip({ rider_id: user.id, status: 'requested' });

    const driverUser = db.addUser({ name: 'Assign Driver', phone: '+923000005555' });
    const driver = db.addDriver({ user_id: driverUser.id, status: 'online' });

    assignDriver(db, trip.id, driver.id);
    assert.strictEqual(db.findDriver({ id: driver.id }).status, 'busy');
    assert.strictEqual(db.findTrip({ id: trip.id }).status, 'accepted');

    releaseDriver(db, driver.id);
    assert.strictEqual(db.findDriver({ id: driver.id }).status, 'online');
});
