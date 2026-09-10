const test = require('node:test');
const assert = require('node:assert/strict');
const { initializeDatabase, InMemoryDB } = require('../db/schema');
const { findNearbyDrivers } = require('../services/matching');

test('InMemoryDB operations and lookups', async (t) => {
  await t.test('addUser and findUser by id & phone', () => {
    const db = new InMemoryDB();
    const user1 = db.addUser({ name: 'Alice', phone: '+923000000001', role: 'rider' });

    assert.ok(user1.id);
    assert.deepEqual(db.findUser({ id: user1.id }), user1);
    assert.deepEqual(db.findUser({ phone: '+923000000001' }), user1);

    // Multi-field lookup or unindexed lookup fallback
    assert.equal(db.findUser({ role: 'rider', name: 'Alice' })?.id, user1.id);

    // Non-existent lookups
    assert.equal(db.findUser({ id: 'non-existent-id' }), undefined);
    assert.equal(db.findUser({ phone: '+920000000000' }), undefined);
  });

  await t.test('addDriver, findDriver, updateDriver', () => {
    const db = new InMemoryDB();
    const user = db.addUser({ name: 'Bob Driver', phone: '+923000000002', role: 'driver' });
    const driver = db.addDriver({ user_id: user.id, vehicle_type: 'car', vehicle_number: 'XYZ-123', status: 'online' });

    assert.ok(driver.id);
    assert.deepEqual(db.findDriver({ id: driver.id }), driver);
    assert.deepEqual(db.findDriver({ user_id: user.id }), driver);

    // Update driver status & fields
    db.updateDriver({ id: driver.id }, { status: 'busy' });
    assert.equal(db.findDriver({ id: driver.id }).status, 'busy');
    assert.equal(db.findDriver({ user_id: user.id }).status, 'busy');
  });

  await t.test('addTrip, findTrip, findTrips, and updateTrip', () => {
    const db = new InMemoryDB();
    const rider = db.addUser({ name: 'Charlie', phone: '+923000000003', role: 'rider' });
    const driverUser = db.addUser({ name: 'David Driver', phone: '+923000000004', role: 'driver' });
    const driver = db.addDriver({ user_id: driverUser.id, vehicle_type: 'bike', status: 'online' });

    const trip = db.addTrip({
      rider_id: rider.id,
      pickup_lat: 31.52,
      pickup_lng: 74.35,
      fare: 200,
      status: 'requested'
    });

    assert.ok(trip.id);
    assert.deepEqual(db.findTrip({ id: trip.id }), trip);
    assert.equal(db.findTrips({ rider_id: rider.id }).length, 1);
    assert.equal(db.findTrips({ rider_id: rider.id })[0].id, trip.id);

    // Assign driver to trip and update
    db.updateTrip(trip.id, { driver_id: driver.id, status: 'accepted' });
    assert.equal(db.findTrip({ id: trip.id }).status, 'accepted');
    assert.equal(db.findTrips({ driver_id: driver.id }).length, 1);
    assert.equal(db.findTrips({ driver_id: driver.id })[0].id, trip.id);
  });

  await t.test('addEarning and getEarnings', () => {
    const db = new InMemoryDB();
    const earning = db.addEarning({ driver_id: 'drv-1', trip_id: 'trip-1', amount: 500, net_amount: 400 });

    const earnings = db.getEarnings('drv-1');
    assert.equal(earnings.length, 1);
    assert.equal(earnings[0].id, earning.id);
    assert.equal(db.getEarnings('non-existent').length, 0);
  });

  await t.test('findNearbyDrivers algorithm correctness', () => {
    const db = new InMemoryDB();
    const dUser = db.addUser({ name: 'Nearby Driver', phone: '+923009999999', role: 'driver', rating: 4.9 });
    db.addDriver({ user_id: dUser.id, vehicle_type: 'rickshaw', status: 'online', location_lat: 31.5204, location_lng: 74.3587 });

    const nearby = findNearbyDrivers(db, 31.5200, 74.3580, 'rickshaw', 5);
    assert.equal(nearby.length, 1);
    assert.equal(nearby[0].name, 'Nearby Driver');
  });
});
