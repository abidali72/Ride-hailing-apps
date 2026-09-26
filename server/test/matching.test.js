const test = require('node:test');
const assert = require('node:assert');
const { initializeDatabase } = require('../db/schema');
const { findNearbyDrivers } = require('../services/matching');

test('findNearbyDrivers - filters by radius and vehicle type correctly', (t) => {
  const db = initializeDatabase();

  // Test finding nearby drivers from Liberty Market (31.5204, 74.3587)
  const nearbyCarDrivers = findNearbyDrivers(db, 31.5204, 74.3587, 'car', 5);

  assert.ok(Array.isArray(nearbyCarDrivers));
  // All returned drivers must be within 5km radius
  for (const driver of nearbyCarDrivers) {
    assert.strictEqual(driver.vehicle_type, 'car');
    assert.ok(driver.distance <= 5);
    assert.ok(driver.name !== undefined);
  }

  // Ensure sorting by distance
  for (let i = 1; i < nearbyCarDrivers.length; i++) {
    assert.ok(nearbyCarDrivers[i].distance >= nearbyCarDrivers[i - 1].distance);
  }
});

test('findNearbyDrivers - benchmark performance with many drivers', (t) => {
  const db = initializeDatabase();

  // Add 500 online drivers spread across various locations
  for (let i = 0; i < 500; i++) {
    const userId = `user-bench-${i}`;
    db.data.users.push({
      id: userId,
      name: `Driver ${i}`,
      phone: `+9230000${i}`,
      rating: 4.0 + (i % 10) / 10
    });
    db.data.drivers.push({
      id: `driver-bench-${i}`,
      user_id: userId,
      vehicle_type: i % 2 === 0 ? 'car' : 'bike',
      status: 'online',
      location_lat: 31.5204 + (i * 0.01), // spreading drivers up to ~500km away
      location_lng: 74.3587 + (i * 0.01)
    });
  }

  const start = performance.now();
  const iterations = 100;
  for (let i = 0; i < iterations; i++) {
    findNearbyDrivers(db, 31.5204, 74.3587, 'car', 5);
  }
  const duration = performance.now() - start;
  console.log(`Execution time for ${iterations} iterations with 500+ drivers: ${duration.toFixed(2)} ms`);

  assert.ok(duration > 0);
});
