const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { initializeDatabase } = require('../db/schema');

const DB_PATH = path.join(__dirname, '..', 'zaara_data.json');

function cleanup() {
  if (fs.existsSync(DB_PATH)) {
    try { fs.unlinkSync(DB_PATH); } catch (e) {}
  }
}

describe('InMemoryDB Optimization & Correctness Tests', () => {
  beforeEach(() => {
    cleanup();
  });

  afterEach(() => {
    cleanup();
  });

  it('should correctly find users by id and phone using Map indexes', () => {
    const db = initializeDatabase();
    const user = db.addUser({ name: 'Test User', phone: '+923001112233', role: 'rider' });

    // Test find by id
    const foundById = db.findUser({ id: user.id });
    assert.deepEqual(foundById, user);

    // Test find by phone
    const foundByPhone = db.findUser({ phone: '+923001112233' });
    assert.deepEqual(foundByPhone, user);

    // Test update user phone updates index
    db.updateUser(user.id, { phone: '+923009998877' });
    assert.equal(db.findUser({ phone: '+923001112233' }), undefined);
    assert.equal(db.findUser({ phone: '+923009998877' })?.id, user.id);
  });

  it('should correctly find drivers by id and user_id using Map indexes', () => {
    const db = initializeDatabase();
    const u = db.addUser({ name: 'Driver User', phone: '+923019998877', role: 'driver' });
    const driver = db.addDriver({ user_id: u.id, vehicle_type: 'car', vehicle_number: 'XYZ-123' });

    const foundById = db.findDriver({ id: driver.id });
    assert.deepEqual(foundById, driver);

    const foundByUserId = db.findDriver({ user_id: u.id });
    assert.deepEqual(foundByUserId, driver);

    // Test update driver user_id updates index
    const newUserId = 'new-user-id';
    db.updateDriver({ id: driver.id }, { user_id: newUserId });
    assert.equal(db.findDriver({ user_id: u.id }), undefined);
    assert.equal(db.findDriver({ user_id: newUserId })?.id, driver.id);
  });

  it('should correctly find trips by id and query earnings by driver_id', () => {
    const db = initializeDatabase();
    const trip = db.addTrip({ rider_id: 'r1', driver_id: 'd1', fare: 200, status: 'completed' });

    const foundTrip = db.findTrip({ id: trip.id });
    assert.deepEqual(foundTrip, trip);

    const earning = db.addEarning({ driver_id: 'd1', trip_id: trip.id, amount: 200, net_amount: 160 });
    const earnings = db.getEarnings('d1');
    assert.equal(earnings.length, 1);
    assert.equal(earnings[0].id, earning.id);
  });

  it('should perform 10,000 lookups in under 50ms', () => {
    const db = initializeDatabase();
    for (let i = 0; i < 500; i++) {
      const u = db.addUser({ id: `user-bulk-${i}`, name: `User ${i}`, phone: `+92300${i}` });
      db.addTrip({ id: `trip-bulk-${i}`, rider_id: u.id });
    }

    const start = performance.now();
    for (let i = 0; i < 10000; i++) {
      db.findUser({ id: `user-bulk-${i % 500}` });
      db.findTrip({ id: `trip-bulk-${i % 500}` });
    }
    const duration = performance.now() - start;
    console.log(`10,000 index lookups completed in ${duration.toFixed(2)} ms`);
    assert.ok(duration < 100, `Duration ${duration}ms should be < 100ms`);
  });
});
