const test = require('node:test');
const assert = require('node:assert');
const { initializeDatabase } = require('../db/schema');

test('InMemoryDB lookups and updates work correctly', () => {
    const db = initializeDatabase();

    // Verify findUser
    const admin = db.findUser({ email: 'admin@zaara.pk' });
    assert.strictEqual(admin?.name, 'Admin Zaara');
    assert.strictEqual(admin?.role, 'admin');

    // Verify findUsers
    const riders = db.findUsers({ role: 'rider' });
    assert.strictEqual(riders.length, 5);

    // Verify findDriver & findDrivers
    const onlineDrivers = db.findDrivers({ status: 'online' });
    assert.ok(onlineDrivers.length > 0);

    const firstDriver = db.findDriver({ id: onlineDrivers[0].id });
    assert.strictEqual(firstDriver?.id, onlineDrivers[0].id);

    // Verify findTrip & findTrips
    const completedTrips = db.findTrips({ status: 'completed' });
    assert.strictEqual(completedTrips.length, 4);

    const firstTrip = db.findTrip({ id: completedTrips[0].id });
    assert.strictEqual(firstTrip?.id, completedTrips[0].id);

    // Verify updateDriver
    db.updateDriver({ id: firstDriver.id }, { status: 'offline' });
    const updatedDriver = db.findDriver({ id: firstDriver.id });
    assert.strictEqual(updatedDriver?.status, 'offline');
});

test('InMemoryDB search performance is optimized', () => {
    const db = initializeDatabase();

    // Add 1000 test users
    for (let i = 0; i < 1000; i++) {
        db.data.users.push({ id: `user_${i}`, name: `User ${i}`, role: i % 2 === 0 ? 'rider' : 'driver' });
    }

    const start = process.hrtime.bigint();
    for (let i = 0; i < 10000; i++) {
        db.findUser({ id: 'user_999' });
    }
    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1e6;

    // 10,000 lookups on 1,000 items should take well under 500ms (previously > 2000ms)
    assert.ok(durationMs < 500, `Execution time ${durationMs}ms was expected to be under 500ms`);
});
