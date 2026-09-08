const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { initializeDatabase } = require('./schema');

const DB_PATH = path.join(__dirname, '..', 'zaara_data.json');

describe('InMemoryDB Indexing & Query Unit Tests', () => {
    let db;

    beforeEach(() => {
        if (fs.existsSync(DB_PATH)) {
            fs.unlinkSync(DB_PATH);
        }
        db = initializeDatabase();
    });

    afterEach(() => {
        if (fs.existsSync(DB_PATH)) {
            fs.unlinkSync(DB_PATH);
        }
    });

    it('should seed database and correctly build initial indices', () => {
        assert.ok(db.data.users.length > 0);
        assert.ok(db.data.drivers.length > 0);
        assert.ok(db.data.trips.length > 0);
        assert.ok(db.data.earnings.length > 0);

        const firstUser = db.data.users[0];
        const foundById = db.findUser({ id: firstUser.id });
        assert.strictEqual(foundById.name, firstUser.name);

        const foundByPhone = db.findUser({ phone: firstUser.phone });
        assert.strictEqual(foundByPhone.id, firstUser.id);
    });

    it('should find user via indexed id and fallback for non-indexed queries', () => {
        const user = db.addUser({ name: 'Test User', phone: '+923999999999', role: 'rider' });

        // Indexed lookup by id
        const userById = db.findUser({ id: user.id });
        assert.strictEqual(userById.phone, '+923999999999');

        // Indexed lookup by phone
        const userByPhone = db.findUser({ phone: '+923999999999' });
        assert.strictEqual(userByPhone.id, user.id);

        // Fallback multi-key filter
        const userMulti = db.findUser({ name: 'Test User', role: 'rider' });
        assert.strictEqual(userMulti.id, user.id);
    });

    it('should return undefined when entity is not found (matching Array.prototype.find contract)', () => {
        const userNotFound = db.findUser({ id: 'non-existent-id' });
        assert.strictEqual(userNotFound, undefined);

        const driverNotFound = db.findDriver({ id: 'non-existent-driver' });
        assert.strictEqual(driverNotFound, undefined);

        const tripNotFound = db.findTrip({ id: 'non-existent-trip' });
        assert.strictEqual(tripNotFound, undefined);
    });

    it('should find driver via indexed id and user_id', () => {
        const user = db.addUser({ name: 'Driver User', phone: '+923888888888', role: 'driver' });
        const driver = db.addDriver({ user_id: user.id, vehicle_type: 'car', vehicle_number: 'TEST-123' });

        // Indexed lookup by id
        const driverById = db.findDriver({ id: driver.id });
        assert.strictEqual(driverById.vehicle_number, 'TEST-123');

        // Indexed lookup by user_id
        const driverByUserId = db.findDriver({ user_id: user.id });
        assert.strictEqual(driverByUserId.id, driver.id);
    });

    it('should find trips via indexed id, rider_id, and driver_id', () => {
        const rider = db.addUser({ name: 'Rider A', phone: '+923777777777', role: 'rider' });
        const driverUser = db.addUser({ name: 'Driver B', phone: '+923666666666', role: 'driver' });
        const driver = db.addDriver({ user_id: driverUser.id, vehicle_type: 'bike' });

        const trip = db.addTrip({ rider_id: rider.id, driver_id: driver.id, fare: 200, status: 'requested' });

        // Indexed lookup by id
        const tripById = db.findTrip({ id: trip.id });
        assert.strictEqual(tripById.fare, 200);

        // Indexed lookup by rider_id
        const riderTrips = db.findTrips({ rider_id: rider.id });
        assert.strictEqual(riderTrips.length, 1);
        assert.strictEqual(riderTrips[0].id, trip.id);

        // Indexed lookup by driver_id
        const driverTrips = db.findTrips({ driver_id: driver.id });
        assert.strictEqual(driverTrips.length, 1);
        assert.strictEqual(driverTrips[0].id, trip.id);
    });

    it('should maintain indices when updating entities incrementally', () => {
        const user = db.addUser({ name: 'Initial Name', phone: '+923555555555', role: 'rider' });
        db.updateUser(user.id, { name: 'Updated Name', phone: '+923444444444' });

        const updatedUser = db.findUser({ id: user.id });
        assert.strictEqual(updatedUser.name, 'Updated Name');

        const foundByNewPhone = db.findUser({ phone: '+923444444444' });
        assert.strictEqual(foundByNewPhone.id, user.id);
    });

    it('should query earnings fast via indexed driver_id', () => {
        const driverUser = db.addUser({ name: 'Earning Driver', phone: '+923333333333', role: 'driver' });
        const driver = db.addDriver({ user_id: driverUser.id, vehicle_type: 'car' });

        db.addEarning({ driver_id: driver.id, amount: 500, net_amount: 400 });
        db.addEarning({ driver_id: driver.id, amount: 300, net_amount: 240 });

        const earnings = db.getEarnings(driver.id);
        assert.strictEqual(earnings.length, 2);
        assert.strictEqual(earnings[0].net_amount + earnings[1].net_amount, 640);
    });
});
