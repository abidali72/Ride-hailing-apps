const test = require('node:test');
const assert = require('node:assert/strict');
const { initializeDatabase } = require('../db/schema');
const { findNearbyDrivers } = require('../services/matching');

test('Driver Matching - findNearbyDrivers', async (t) => {
    await t.test('finds nearby online drivers within radius', () => {
        const db = initializeDatabase();
        // Pick Lahore coordinates near seed data (Liberty Market: 31.5204, 74.3587)
        const drivers = findNearbyDrivers(db, 31.5204, 74.3587, 'car', 10);
        assert.ok(drivers.length > 0, 'Should find online car drivers');
        drivers.forEach(driver => {
            assert.equal(driver.vehicle_type, 'car');
            assert.equal(driver.status, 'online');
            assert.ok(driver.distance <= 10, 'Driver distance within radius');
            assert.ok(driver.name, 'Driver user name should be populated');
        });
    });

    await t.test('filters by vehicle type correctly', () => {
        const db = initializeDatabase();
        const bikes = findNearbyDrivers(db, 31.5204, 74.3587, 'bike', 10);
        bikes.forEach(b => assert.equal(b.vehicle_type, 'bike'));

        const rickshaws = findNearbyDrivers(db, 31.5204, 74.3587, 'rickshaw', 10);
        rickshaws.forEach(r => assert.equal(r.vehicle_type, 'rickshaw'));
    });

    await t.test('excludes drivers outside bounding box/radius', () => {
        const db = initializeDatabase();
        // Coordinates far away (e.g., Karachi 24.8607, 67.0011)
        const drivers = findNearbyDrivers(db, 24.8607, 67.0011, 'any', 10);
        assert.equal(drivers.length, 0, 'No Lahore drivers should match Karachi coordinates');
    });

    await t.test('sorts drivers primarily by distance', () => {
        const db = initializeDatabase();
        const drivers = findNearbyDrivers(db, 31.5204, 74.3587, 'any', 15);
        for (let i = 0; i < drivers.length - 1; i++) {
            const current = drivers[i];
            const next = drivers[i + 1];
            if (Math.abs(current.distance - next.distance) >= 0.5) {
                assert.ok(current.distance <= next.distance, 'Drivers should be sorted by distance');
            }
        }
    });
});

test('DB Schema Helpers', async (t) => {
    await t.test('findUser and findDrivers filter properly', () => {
        const db = initializeDatabase();
        const rider = db.findUser({ role: 'rider' });
        assert.ok(rider, 'Should find a rider');
        assert.equal(rider.role, 'rider');

        const onlineDrivers = db.findDrivers({ status: 'online' });
        assert.ok(onlineDrivers.length > 0);
        onlineDrivers.forEach(d => assert.equal(d.status, 'online'));
    });
});
