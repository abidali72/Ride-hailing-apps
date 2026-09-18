const test = require('node:test');
const assert = require('node:assert/strict');
const { initializeDatabase } = require('../db/schema');
const { findNearbyDrivers } = require('../services/matching');

test('findNearbyDrivers - seeded data correctness', () => {
    const db = initializeDatabase();

    // Pickup at Liberty Market, Lahore (31.5204, 74.3587)
    const nearby = findNearbyDrivers(db, 31.5204, 74.3587, 'car', 5);

    assert.ok(Array.isArray(nearby));
    assert.ok(nearby.length > 0, 'Should find nearby car drivers');

    // Check that all returned drivers are within 5 km and have required fields
    for (const driver of nearby) {
        assert.ok(driver.distance <= 5, `Driver distance ${driver.distance} should be <= 5`);
        assert.equal(driver.vehicle_type, 'car');
        assert.ok(driver.name, 'Driver should have user name');
        assert.ok(driver.phone, 'Driver should have user phone');
    }

    // Verify ordering: sorted primarily by distance (or rating if distances within 0.5km)
    for (let i = 0; i < nearby.length - 1; i++) {
        const a = nearby[i];
        const b = nearby[i + 1];
        const distDiff = a.distance - b.distance;
        if (Math.abs(distDiff) >= 0.5) {
            assert.ok(distDiff <= 0, 'Should be sorted by distance');
        }
    }
});

test('findNearbyDrivers - large dataset performance & correctness', () => {
    const db = initializeDatabase();

    // Add 2000 mock drivers spread across a wide geographic area
    const centerLat = 31.5204;
    const centerLng = 74.3587;

    for (let i = 0; i < 2000; i++) {
        const userId = `mock-user-${i}`;
        const driverId = `mock-driver-${i}`;

        // Drivers spread from 0 to 200 km away
        const offsetLat = (Math.random() - 0.5) * 4.0; // +/- 2 degrees (~220km)
        const offsetLng = (Math.random() - 0.5) * 4.0;

        db.data.users.push({
            id: userId,
            name: `Driver ${i}`,
            phone: `+92300000${i.toString().padStart(4, '0')}`,
            rating: 4.0 + Math.random(),
            role: 'driver'
        });

        db.data.drivers.push({
            id: driverId,
            user_id: userId,
            vehicle_type: i % 2 === 0 ? 'car' : 'bike',
            status: 'online',
            location_lat: centerLat + offsetLat,
            location_lng: centerLng + offsetLng,
            vehicle_number: `MOCK-${i}`
        });
    }

    const start = process.hrtime.bigint();
    const iterations = 50;
    let resultsCount = 0;

    for (let k = 0; k < iterations; k++) {
        const nearby = findNearbyDrivers(db, centerLat, centerLng, 'car', 5);
        resultsCount += nearby.length;
    }

    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1e6;
    console.log(`⏱️ 50 iterations with 2000+ drivers took ${durationMs.toFixed(2)} ms (${(durationMs / iterations).toFixed(3)} ms/op)`);

    assert.ok(resultsCount > 0, 'Should find nearby drivers in large dataset');
});
