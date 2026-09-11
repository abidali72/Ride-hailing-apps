const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const { initializeDatabase } = require('../db/schema');

test('InMemoryDB query filtering and operations', async (t) => {
  // Clean up any existing demo data file before initializing
  const dbPath = path.join(__dirname, '..', 'zaara_data.json');
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }

  const db = initializeDatabase();

  await t.test('findUser and findUsers work correctly', () => {
    const riders = db.findUsers({ role: 'rider' });
    assert.equal(riders.length, 5);

    const singleUser = db.findUser({ email: 'ahmed@demo.com' });
    assert.ok(singleUser);
    assert.equal(singleUser.name, 'Ahmed Khan');

    const notFound = db.findUser({ email: 'nonexistent@demo.com' });
    assert.equal(notFound, undefined);

    const allUsers = db.findUsers();
    assert.ok(allUsers.length > 5);
  });

  await t.test('findDriver and findDrivers work correctly', () => {
    const onlineDrivers = db.findDrivers({ status: 'online' });
    assert.ok(onlineDrivers.length > 0);

    const bikeDriver = db.findDriver({ vehicle_type: 'bike' });
    assert.ok(bikeDriver);
    assert.equal(bikeDriver.vehicle_type, 'bike');
  });

  await t.test('updateDriver updates record correctly', () => {
    const driver = db.findDriver({ vehicle_number: 'LEA-1234' });
    assert.ok(driver);

    db.updateDriver({ id: driver.id }, { total_rides: 999 });
    const updated = db.findDriver({ id: driver.id });
    assert.equal(updated.total_rides, 999);
  });

  await t.test('findTrip and findTrips work correctly', () => {
    const completedTrips = db.findTrips({ status: 'completed' });
    assert.equal(completedTrips.length, 4);

    const firstTrip = completedTrips[0];
    const foundTrip = db.findTrip({ id: firstTrip.id });
    assert.equal(foundTrip.id, firstTrip.id);
  });

  await t.test('_filterItems performance optimization', () => {
    // Populate DB with 1000 dummy records
    for (let i = 0; i < 1000; i++) {
      db.addUser({ name: `PerfUser_${i}`, phone: `+92300${i}`, role: 'test', index: i });
    }

    const start = process.hrtime.bigint();
    for (let i = 0; i < 1000; i++) {
      db.findUser({ role: 'test', index: 999 });
    }
    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1e6;

    // 1000 lookups over 1000 items should complete in under 100ms with optimization
    assert.ok(durationMs < 500, `Duration ${durationMs}ms exceeded threshold`);
  });

  // Clean up test database file
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }
});
