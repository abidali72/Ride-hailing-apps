const { test, describe } = require('node:test');
const assert = require('node:assert');
const { initializeDatabase } = require('../db/schema');

describe('InMemoryDB Indexing & Query Tests', () => {
  const db = initializeDatabase();

  test('should find user by id using Map index', () => {
    const user = db.addUser({ name: 'Test User', email: 'test@example.com', role: 'rider' });
    const found = db.findUser({ id: user.id });
    assert.strictEqual(found, user);
    assert.strictEqual(found.name, 'Test User');
  });

  test('should find user by non-id filter', () => {
    const found = db.findUser({ email: 'test@example.com' });
    assert.notStrictEqual(found, null);
    assert.strictEqual(found.email, 'test@example.com');
  });

  test('should find driver by id and user_id using Map index', () => {
    const user = db.addUser({ name: 'Driver User', role: 'driver' });
    const driver = db.addDriver({ user_id: user.id, vehicle_type: 'car', vehicle_number: 'TEST-123' });

    const foundById = db.findDriver({ id: driver.id });
    assert.strictEqual(foundById, driver);

    const foundByUserId = db.findDriver({ user_id: user.id });
    assert.strictEqual(foundByUserId, driver);
  });

  test('should find trip by id using Map index', () => {
    const user = db.addUser({ name: 'Rider 1', role: 'rider' });
    const trip = db.addTrip({ rider_id: user.id, fare: 250, status: 'requested' });

    const found = db.findTrip({ id: trip.id });
    assert.strictEqual(found, trip);
    assert.strictEqual(found.fare, 250);
  });

  test('should correctly update user, driver, and trip', () => {
    const user = db.addUser({ name: 'Update User', rating: 4.0 });
    db.updateUser(user.id, { rating: 4.9 });
    assert.strictEqual(db.findUser({ id: user.id }).rating, 4.9);

    const driver = db.addDriver({ user_id: user.id, status: 'offline' });
    db.updateDriver({ id: driver.id }, { status: 'online' });
    assert.strictEqual(db.findDriver({ id: driver.id }).status, 'online');

    const trip = db.addTrip({ rider_id: user.id, status: 'requested' });
    db.updateTrip(trip.id, { status: 'completed' });
    assert.strictEqual(db.findTrip({ id: trip.id }).status, 'completed');
  });

  test('should handle large volume lookups efficiently', () => {
    const createdTrips = [];
    for (let i = 0; i < 500; i++) {
      const u = db.addUser({ name: `Bulk User ${i}` });
      const d = db.addDriver({ user_id: u.id, vehicle_type: 'car' });
      const t = db.addTrip({ rider_id: u.id, driver_id: d.id, fare: 100 });
      createdTrips.push(t);
    }

    const start = performance.now();
    for (let i = 0; i < createdTrips.length; i++) {
      const t = createdTrips[i];
      const rider = db.findUser({ id: t.rider_id });
      const driver = db.findDriver({ id: t.driver_id });
      const driverUser = db.findUser({ id: driver.user_id });
      assert.ok(rider);
      assert.ok(driver);
      assert.ok(driverUser);
    }
    const duration = performance.now() - start;

    // 500 triple lookups (1500 total lookups) should execute well under 10ms with O(1) Map lookups
    assert.ok(duration < 50, `Lookups took ${duration}ms, expected under 50ms`);
  });
});
