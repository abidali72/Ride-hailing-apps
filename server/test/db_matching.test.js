const test = require('node:test');
const assert = require('node:assert/strict');
const { initializeDatabase } = require('../db/schema');
const { findNearbyDrivers, assignDriver, releaseDriver } = require('../services/matching');

test('InMemoryDB query methods work correctly', () => {
    const db = initializeDatabase();

    // findUser
    const user = db.findUser({ email: 'ahmed@demo.com' });
    assert.ok(user);
    assert.equal(user.name, 'Ahmed Khan');

    // findUsers
    const riders = db.findUsers({ role: 'rider' });
    assert.equal(riders.length, 5);

    // findDriver
    const driver = db.findDriver({ vehicle_number: 'LEA-1234' });
    assert.ok(driver);
    assert.equal(driver.vehicle_type, 'bike');

    // findDrivers
    const onlineDrivers = db.findDrivers({ status: 'online' });
    assert.ok(onlineDrivers.length > 0);

    // updateDriver
    const updated = db.updateDriver({ vehicle_number: 'LEA-1234' }, { status: 'offline' });
    assert.equal(updated.status, 'offline');
    db.updateDriver({ vehicle_number: 'LEA-1234' }, { status: 'online' }); // restore
});

test('findNearbyDrivers filters correctly and ranks drivers', () => {
    const db = initializeDatabase();

    // Pickup location in Gulberg, Lahore
    const pickupLat = 31.5204;
    const pickupLng = 74.3587;

    const nearbyCars = findNearbyDrivers(db, pickupLat, pickupLng, 'car', 5);
    assert.ok(nearbyCars.length > 0);
    assert.ok(nearbyCars[0].distance <= 5);
    assert.ok(nearbyCars[0].name);

    // Test with driver out of range (e.g. Karachi coordinates: ~24.8607, 67.0011)
    db.addDriver({
        user_id: 'karachi-driver-user-id',
        vehicle_type: 'car',
        vehicle_number: 'KHI-9999',
        status: 'online',
        location_lat: 24.8607,
        location_lng: 67.0011
    });

    const nearbyCarsAfterFarDriver = findNearbyDrivers(db, pickupLat, pickupLng, 'car', 5);
    const foundFarDriver = nearbyCarsAfterFarDriver.find(d => d.vehicle_number === 'KHI-9999');
    assert.equal(foundFarDriver, undefined);
});

test('Performance benchmark of db query & matching functions', () => {
    const db = initializeDatabase();

    const startDb = performance.now();
    for (let i = 0; i < 10000; i++) {
        db.findUser({ email: 'ahmed@demo.com' });
        db.findDriver({ status: 'online' });
    }
    const durationDb = performance.now() - startDb;
    assert.ok(durationDb < 1000, `DB query test took too long: ${durationDb}ms`);

    const startMatch = performance.now();
    for (let i = 0; i < 1000; i++) {
        findNearbyDrivers(db, 31.5204, 74.3587, 'car', 5);
    }
    const durationMatch = performance.now() - startMatch;
    assert.ok(durationMatch < 1000, `Matching test took too long: ${durationMatch}ms`);
});
