const { describe, it } = require('node:test');
const assert = require('node:assert');
const { initializeDatabase } = require('../db/schema');

describe('InMemoryDB filtering and query operations', () => {
    it('findUser and findUsers work correctly', () => {
        const db = initializeDatabase();

        const singleRider = db.findUser({ role: 'rider' });
        assert.ok(singleRider);
        assert.strictEqual(singleRider.role, 'rider');

        const riders = db.findUsers({ role: 'rider' });
        assert.ok(riders.length > 0);
        riders.forEach(r => assert.strictEqual(r.role, 'rider'));

        const nonExistent = db.findUser({ phone: '+0000000000' });
        assert.strictEqual(nonExistent, undefined);
    });

    it('findDriver and findDrivers work correctly', () => {
        const db = initializeDatabase();

        const onlineDriver = db.findDriver({ status: 'online' });
        assert.ok(onlineDriver);
        assert.strictEqual(onlineDriver.status, 'online');

        const onlineDrivers = db.findDrivers({ status: 'online' });
        assert.ok(onlineDrivers.length > 0);
        onlineDrivers.forEach(d => assert.strictEqual(d.status, 'online'));

        const bikeDrivers = db.findDrivers({ vehicle_type: 'bike', status: 'online' });
        bikeDrivers.forEach(d => {
            assert.strictEqual(d.vehicle_type, 'bike');
            assert.strictEqual(d.status, 'online');
        });
    });

    it('findTrip and findTrips work correctly', () => {
        const db = initializeDatabase();

        const trip = db.findTrip({ status: 'completed' });
        assert.ok(trip);
        assert.strictEqual(trip.status, 'completed');

        const completedTrips = db.findTrips({ status: 'completed' });
        assert.ok(completedTrips.length > 0);
        completedTrips.forEach(t => assert.strictEqual(t.status, 'completed'));
    });

    it('updateDriver updates matching driver', () => {
        const db = initializeDatabase();
        const driver = db.findDriver({ status: 'online' });
        assert.ok(driver);

        const updated = db.updateDriver({ id: driver.id }, { status: 'busy' });
        assert.strictEqual(updated.status, 'busy');

        const reFetched = db.findDriver({ id: driver.id });
        assert.strictEqual(reFetched.status, 'busy');
    });
});
