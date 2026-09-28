const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { initializeDatabase } = require('../db/schema');

const DB_FILE = path.join(__dirname, '..', 'zaara_data.json');

test('InMemoryDB - Indexing and Query Performance Correctness', (t) => {
    // Clean up existing DB file if needed for fresh seed test
    if (fs.existsSync(DB_FILE)) {
        fs.unlinkSync(DB_FILE);
    }

    const db = initializeDatabase();

    // 1. Test Seed Data Lookups
    const riders = db.findUsers({ role: 'rider' });
    assert.ok(riders.length >= 5, 'Should have seeded riders');

    const rider1 = riders[0];
    const foundUserById = db.findUser({ id: rider1.id });
    assert.deepEqual(foundUserById, rider1, 'findUser by ID should return exact user via index');

    const foundUserByPhone = db.findUser({ phone: rider1.phone });
    assert.deepEqual(foundUserByPhone, rider1, 'findUser by phone should return exact user via scan');

    // 2. Test Driver Indexing
    const drivers = db.findDrivers();
    assert.ok(drivers.length >= 8, 'Should have seeded drivers');

    const driver1 = drivers[0];
    const foundDriverById = db.findDriver({ id: driver1.id });
    assert.deepEqual(foundDriverById, driver1, 'findDriver by ID should return exact driver via index');

    const foundDriverByUserId = db.findDriver({ user_id: driver1.user_id });
    assert.deepEqual(foundDriverByUserId, driver1, 'findDriver by user_id should return exact driver via index');

    // 3. Test Trip Indexing
    const trips = db.findTrips();
    assert.ok(trips.length >= 4, 'Should have seeded trips');

    const trip1 = trips[0];
    const foundTripById = db.findTrip({ id: trip1.id });
    assert.deepEqual(foundTripById, trip1, 'findTrip by ID should return exact trip via index');

    // 4. Test Insert & Index Syncing
    const newUser = db.addUser({ name: 'Test User', phone: '+923999999999', role: 'rider' });
    assert.ok(newUser.id, 'User should have ID generated');
    assert.strictEqual(db.findUser({ id: newUser.id }), newUser, 'New user should be indexed');

    const newDriver = db.addDriver({ user_id: newUser.id, vehicle_type: 'bike' });
    assert.ok(newDriver.id, 'Driver should have ID generated');
    assert.strictEqual(db.findDriver({ id: newDriver.id }), newDriver, 'New driver should be indexed by ID');
    assert.strictEqual(db.findDriver({ user_id: newUser.id }), newDriver, 'New driver should be indexed by user_id');

    const newTrip = db.addTrip({ rider_id: newUser.id, driver_id: newDriver.id, fare: 200, status: 'requested' });
    assert.ok(newTrip.id, 'Trip should have ID generated');
    assert.strictEqual(db.findTrip({ id: newTrip.id }), newTrip, 'New trip should be indexed by ID');

    // 5. Test Updates
    db.updateUser(newUser.id, { name: 'Updated Test User' });
    assert.strictEqual(db.findUser({ id: newUser.id }).name, 'Updated Test User');

    db.updateDriver({ id: newDriver.id }, { status: 'busy' });
    assert.strictEqual(db.findDriver({ id: newDriver.id }).status, 'busy');
    assert.strictEqual(db.findDriver({ user_id: newUser.id }).status, 'busy');

    db.updateTrip(newTrip.id, { status: 'completed' });
    assert.strictEqual(db.findTrip({ id: newTrip.id }).status, 'completed');
});
