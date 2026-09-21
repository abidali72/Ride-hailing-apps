const test = require('node:test');
const assert = require('node:assert/strict');
const { initializeDatabase } = require('../db/schema');
const { findNearbyDrivers } = require('../services/matching');

test('InMemoryDB - Map Indexing & Fast Lookups', (t) => {
    const db = initializeDatabase();

    // 1. Test user lookup by ID (indexed)
    const rider = db.addUser({ name: 'Test Rider', phone: '+923000000001', role: 'rider' });
    assert.ok(rider.id);
    const foundRider = db.findUser({ id: rider.id });
    assert.equal(foundRider?.name, 'Test Rider');

    // 2. Test driver lookup by ID and user_id (indexed)
    const driverUser = db.addUser({ name: 'Test Driver', phone: '+923000000002', role: 'driver' });
    const driver = db.addDriver({ user_id: driverUser.id, vehicle_type: 'car', status: 'online', location_lat: 31.52, location_lng: 74.35 });

    const foundDriverById = db.findDriver({ id: driver.id });
    assert.equal(foundDriverById?.user_id, driverUser.id);

    const foundDriverByUserId = db.findDriver({ user_id: driverUser.id });
    assert.equal(foundDriverByUserId?.id, driver.id);

    // 3. Test trip lookup by ID (indexed)
    const trip = db.addTrip({ rider_id: rider.id, driver_id: driver.id, fare: 100, vehicle_type: 'car' });
    const foundTrip = db.findTrip({ id: trip.id });
    assert.equal(foundTrip?.fare, 100);

    // 4. Test multi-key filter query (fallback loop)
    const riders = db.findUsers({ role: 'rider' });
    assert.ok(riders.length > 0);

    // 5. Test findNearbyDrivers with indexed DB
    const nearby = findNearbyDrivers(db, 31.52, 74.35, 'car', 5);
    assert.ok(nearby.length > 0);
    const matchedDriver = nearby.find(d => d.id === driver.id);
    assert.ok(matchedDriver);
    assert.equal(matchedDriver.name, 'Test Driver');

    // 6. Test updates
    db.updateUser(rider.id, { name: 'Updated Rider' });
    assert.equal(db.findUser({ id: rider.id })?.name, 'Updated Rider');

    db.updateDriver({ id: driver.id }, { status: 'busy' });
    assert.equal(db.findDriver({ id: driver.id })?.status, 'busy');
});
