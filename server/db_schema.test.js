const assert = require('assert');
const test = require('node:test');
const { initializeDatabase } = require('./db/schema');
const { findNearbyDrivers } = require('./services/matching');

test('InMemoryDB indexing and lookup tests', (t) => {
  const db = initializeDatabase();

  // Test findUser by id
  const rider = db.findUser({ role: 'rider' });
  assert.ok(rider);
  const foundUser = db.findUser({ id: rider.id });
  assert.strictEqual(foundUser.id, rider.id);
  assert.strictEqual(foundUser.name, rider.name);

  // Test findDriver by id
  const driver = db.data.drivers[0];
  assert.ok(driver);
  const foundDriver = db.findDriver({ id: driver.id });
  assert.strictEqual(foundDriver.id, driver.id);

  // Test findTrip by id
  const trip = db.data.trips[0];
  assert.ok(trip);
  const foundTrip = db.findTrip({ id: trip.id });
  assert.strictEqual(foundTrip.id, trip.id);

  // Test findNearbyDrivers works with indexed findUser
  const nearby = findNearbyDrivers(db, 31.5204, 74.3587, 'car', 10);
  assert.ok(nearby.length > 0);
  assert.ok(nearby[0].name);

  // Test adding new user updates index
  const newUser = db.addUser({ name: 'Test Indexed User', phone: '+923000009999', role: 'rider' });
  const retrievedNewUser = db.findUser({ id: newUser.id });
  assert.strictEqual(retrievedNewUser.name, 'Test Indexed User');
});
