const test = require('node:test');
const assert = require('assert');
const { initializeDatabase } = require('../db/schema');
const fs = require('fs');
const path = require('path');

// Remove existing zaara_data.json before test if present to ensure clean state
const dbFile = path.join(__dirname, '..', 'zaara_data.json');
if (fs.existsSync(dbFile)) {
  try { fs.unlinkSync(dbFile); } catch (e) {}
}

test('InMemoryDB - seed and query users', (t) => {
  const db = initializeDatabase();

  const user = db.findUser({ phone: '+923001234567' });
  assert.ok(user, 'User should be found by phone');
  assert.strictEqual(user.name, 'Ahmed Khan');

  const riders = db.findUsers({ role: 'rider' });
  assert.strictEqual(riders.length, 5, 'Should find 5 seeded riders');

  const allUsers = db.findUsers({});
  assert.strictEqual(allUsers.length, 14, 'Should return all users when filter is empty');

  const nonExistent = db.findUser({ phone: '+920000000000' });
  assert.strictEqual(nonExistent, undefined);
});

test('InMemoryDB - drivers and updates', (t) => {
  const db = initializeDatabase();

  const onlineDrivers = db.findDrivers({ status: 'online' });
  assert.ok(onlineDrivers.length > 0, 'Should find online drivers');

  const bikeDriver = db.findDriver({ vehicle_type: 'bike', status: 'online' });
  assert.ok(bikeDriver, 'Should find online bike driver');
  assert.strictEqual(bikeDriver.vehicle_type, 'bike');

  const updated = db.updateDriver({ id: bikeDriver.id }, { status: 'busy' });
  assert.strictEqual(updated.status, 'busy');

  const reFetched = db.findDriver({ id: bikeDriver.id });
  assert.strictEqual(reFetched.status, 'busy');
});

test('InMemoryDB - trips queries', (t) => {
  const db = initializeDatabase();

  const completedTrips = db.findTrips({ status: 'completed' });
  assert.strictEqual(completedTrips.length, 4, 'Should find 4 seeded completed trips');

  const singleTrip = db.findTrip({ id: completedTrips[0].id });
  assert.ok(singleTrip, 'Should find trip by id');
  assert.strictEqual(singleTrip.id, completedTrips[0].id);
});
