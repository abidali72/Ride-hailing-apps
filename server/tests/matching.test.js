const test = require('node:test');
const assert = require('node:assert/strict');
const { initializeDatabase } = require('../db/schema');
const { findNearbyDrivers } = require('../services/matching');

test('findNearbyDrivers - finds online drivers within radius and matches vehicle type', () => {
    const db = initializeDatabase();

    // Rider location: Liberty Market, Lahore (31.5204, 74.3587)
    const pickupLat = 31.5204;
    const pickupLng = 74.3587;

    const carDrivers = findNearbyDrivers(db, pickupLat, pickupLng, 'car', 5);
    assert.ok(carDrivers.length > 0, 'Should find nearby car drivers');

    for (const driver of carDrivers) {
        assert.equal(driver.vehicle_type, 'car');
        assert.equal(driver.status, 'online');
        assert.ok(driver.distance <= 5, `Driver distance ${driver.distance} exceeds radius 5`);
        assert.ok(driver.name, 'Driver user name should be populated');
    }
});

test('findNearbyDrivers - handles vehicleType "any"', () => {
    const db = initializeDatabase();
    const pickupLat = 31.5204;
    const pickupLng = 74.3587;

    const allDrivers = findNearbyDrivers(db, pickupLat, pickupLng, 'any', 10);
    assert.ok(allDrivers.length > 0, 'Should find nearby drivers of any vehicle type');
});

test('findNearbyDrivers - returns empty array when no drivers in radius', () => {
    const db = initializeDatabase();
    // Far location in North Pole (90, 0)
    const farDrivers = findNearbyDrivers(db, 90.0, 0.0, 'car', 5);
    assert.equal(farDrivers.length, 0);
});

test('findNearbyDrivers - sorts by distance and rating tie-breaker', () => {
    const db = initializeDatabase();
    const pickupLat = 31.5204;
    const pickupLng = 74.3587;

    const drivers = findNearbyDrivers(db, pickupLat, pickupLng, 'any', 10);
    for (let i = 0; i < drivers.length - 1; i++) {
        const d1 = drivers[i];
        const d2 = drivers[i + 1];
        const distDiff = d1.distance - d2.distance;
        if (Math.abs(distDiff) < 0.5) {
            assert.ok(
                (d1.user_rating || 0) >= (d2.user_rating || 0),
                `Higher rated driver should come first when distance diff < 0.5km (${d1.user_rating} vs ${d2.user_rating})`
            );
        } else {
            assert.ok(distDiff <= 0, 'Closer driver should come first');
        }
    }
});
