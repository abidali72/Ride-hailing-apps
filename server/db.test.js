const test = require('node:test');
const assert = require('node:assert/strict');
const { initializeDatabase } = require('./db/schema');
const { findNearbyDrivers } = require('./services/matching');

test('InMemoryDB - Indexing and CRUD operations', async (t) => {
  await t.test('initializes and seeds database correctly', () => {
    const db = initializeDatabase();
    assert.ok(db.data.users.length > 0);
    assert.ok(db.data.drivers.length > 0);
    assert.ok(db.data.trips.length > 0);
    assert.equal(db.usersById.size, db.data.users.length);
    assert.equal(db.driversById.size, db.data.drivers.length);
    assert.equal(db.tripsById.size, db.data.trips.length);
  });

  await t.test('findUser by id uses Map index correctly', () => {
    const db = initializeDatabase();
    const firstUser = db.data.users[0];
    const found = db.findUser({ id: firstUser.id });
    assert.equal(found, firstUser);

    const nonExistent = db.findUser({ id: 'non-existent-id' });
    assert.equal(nonExistent, null);
  });

  await t.test('findDriver by id and user_id uses Map index correctly', () => {
    const db = initializeDatabase();
    const firstDriver = db.data.drivers[0];
    const foundById = db.findDriver({ id: firstDriver.id });
    assert.equal(foundById, firstDriver);

    const foundByUserId = db.findDriver({ user_id: firstDriver.user_id });
    assert.equal(foundByUserId, firstDriver);
  });

  await t.test('findTrip by id uses Map index correctly', () => {
    const db = initializeDatabase();
    const firstTrip = db.data.trips[0];
    const found = db.findTrip({ id: firstTrip.id });
    assert.equal(found, firstTrip);
  });

  await t.test('addUser, addDriver, addTrip update indexes', () => {
    const db = initializeDatabase();
    const newUser = db.addUser({ name: 'Test User', phone: '+923000001111', role: 'rider' });
    assert.equal(db.findUser({ id: newUser.id }), newUser);

    const newDriver = db.addDriver({ user_id: newUser.id, vehicle_type: 'car', status: 'online' });
    assert.equal(db.findDriver({ id: newDriver.id }), newDriver);
    assert.equal(db.findDriver({ user_id: newUser.id }), newDriver);

    const newTrip = db.addTrip({ rider_id: newUser.id, driver_id: newDriver.id, status: 'requested' });
    assert.equal(db.findTrip({ id: newTrip.id }), newTrip);
  });

  await t.test('updateUser and updateDriver update index references properly', () => {
    const db = initializeDatabase();
    const driver = db.data.drivers[0];
    db.updateDriver({ id: driver.id }, { status: 'busy' });
    assert.equal(db.findDriver({ id: driver.id }).status, 'busy');
    assert.equal(db.findDriver({ user_id: driver.user_id }).status, 'busy');
  });

  await t.test('findNearbyDrivers works correctly with indexed DB', () => {
    const db = initializeDatabase();
    const nearby = findNearbyDrivers(db, 31.5204, 74.3587, 'car', 5);
    assert.ok(Array.isArray(nearby));
  });
});
