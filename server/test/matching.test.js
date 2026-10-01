const test = require('node:test');
const assert = require('node:assert');
const { initializeDatabase } = require('../db/schema');
const { findNearbyDrivers } = require('../services/matching');

test('findNearbyDrivers - filters drivers within radius and matches vehicle type', () => {
    const db = initializeDatabase();

    // Default seeded drivers:
    // Liberty Market: 31.5204, 74.3587
    const drivers = findNearbyDrivers(db, 31.5204, 74.3587, 'car', 5);

    assert(drivers.length > 0, 'Should find online car drivers near Liberty Market');
    drivers.forEach(d => {
        assert.strictEqual(d.vehicle_type, 'car');
        assert(d.distance <= 5, 'Driver distance should be within 5km radius');
        assert(d.name !== undefined, 'Driver should be enriched with user name');
    });
});

test('findNearbyDrivers - handles vehicleType = "any"', () => {
    const db = initializeDatabase();

    const driversAny = findNearbyDrivers(db, 31.5204, 74.3587, 'any', 5);
    const vehicleTypes = new Set(driversAny.map(d => d.vehicle_type));

    assert(driversAny.length > 0, 'Should return drivers of various vehicle types');
    assert(vehicleTypes.size > 1, 'Should contain multiple vehicle types when vehicleType is "any"');
});

test('findNearbyDrivers - filters out drivers beyond radiusKm', () => {
    const db = initializeDatabase();

    // Coordinates far away from Lahore (e.g. Karachi)
    const driversFar = findNearbyDrivers(db, 24.8607, 67.0011, 'any', 5);
    assert.strictEqual(driversFar.length, 0, 'Should find 0 drivers in Karachi when drivers are in Lahore');
});
