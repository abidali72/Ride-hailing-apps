const test = require('node:test');
const assert = require('node:assert');
const { initializeDatabase } = require('../db/schema');

test('InMemoryDB - findUser & findUsers', (t) => {
    const db = initializeDatabase();
    const uniquePhone = '+9239999' + Math.floor(Math.random() * 100000);

    const user = db.addUser({ name: 'Test Rider', phone: uniquePhone, role: 'rider' });
    assert.strictEqual(user.name, 'Test Rider');

    const found = db.findUser({ id: user.id });
    assert.ok(found);
    assert.strictEqual(found.phone, uniquePhone);

    const foundByPhone = db.findUser({ phone: uniquePhone });
    assert.ok(foundByPhone);
    assert.strictEqual(foundByPhone.id, user.id);

    const riders = db.findUsers({ role: 'rider' });
    assert.ok(riders.length > 0);
    assert.ok(riders.some(r => r.id === user.id));

    const multiMatch = db.findUsers({ role: 'rider', is_active: 1 });
    assert.ok(multiMatch.length > 0);
});

test('InMemoryDB - findDriver & findDrivers & updateDriver', (t) => {
    const db = initializeDatabase();
    const uniquePhone = '+9238888' + Math.floor(Math.random() * 100000);

    const user = db.addUser({ name: 'Test Driver User', phone: uniquePhone, role: 'driver' });
    const driver = db.addDriver({
        user_id: user.id,
        vehicle_type: 'car',
        vehicle_number: 'TEST-123',
        status: 'online'
    });

    const foundDriver = db.findDriver({ id: driver.id });
    assert.ok(foundDriver);
    assert.strictEqual(foundDriver.user_id, user.id);

    const foundByUser = db.findDriver({ user_id: user.id });
    assert.ok(foundByUser);
    assert.strictEqual(foundByUser.id, driver.id);

    const updated = db.updateDriver({ id: driver.id }, { status: 'busy' });
    assert.strictEqual(updated.status, 'busy');

    const verifyStatus = db.findDriver({ id: driver.id });
    assert.strictEqual(verifyStatus.status, 'busy');
});

test('InMemoryDB - findTrip & findTrips', (t) => {
    const db = initializeDatabase();
    const uniqueRiderId = 'rider-' + Date.now() + '-' + Math.random();

    const trip = db.addTrip({
        rider_id: uniqueRiderId,
        pickup_address: 'Pickup A',
        drop_address: 'Drop B',
        fare: 250,
        status: 'requested'
    });

    const foundTrip = db.findTrip({ id: trip.id });
    assert.ok(foundTrip);
    assert.strictEqual(foundTrip.fare, 250);

    const trips = db.findTrips({ rider_id: uniqueRiderId });
    assert.strictEqual(trips.length, 1);
    assert.strictEqual(trips[0].id, trip.id);
});
