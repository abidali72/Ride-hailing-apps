const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { initializeDatabase } = require('../db/schema');
const { findNearbyDrivers } = require('../services/matching');

const DB_PATH = path.join(__dirname, '..', 'zaara_data.json');

describe('InMemoryDB Index Maps', () => {
  beforeEach(() => {
    if (fs.existsSync(DB_PATH)) {
      try { fs.unlinkSync(DB_PATH); } catch (e) {}
    }
  });

  it('should create database and populate indexes', () => {
    const db = initializeDatabase();
    assert.ok(db.usersById.size > 0);
    assert.ok(db.driversById.size > 0);
    assert.ok(db.driversByUserId.size > 0);
    assert.ok(db.tripsById.size > 0);
  });

  it('should find user by id using index', () => {
    const db = initializeDatabase();
    const newUser = db.addUser({ name: 'Test User', phone: '+923000001111', role: 'rider' });

    const found = db.findUser({ id: newUser.id });
    assert.ok(found);
    assert.equal(found.id, newUser.id);
    assert.equal(found.name, 'Test User');
  });

  it('should find driver by id and user_id using indexes', () => {
    const db = initializeDatabase();
    const newUser = db.addUser({ name: 'Driver User', phone: '+923000002222', role: 'driver' });
    const newDriver = db.addDriver({ user_id: newUser.id, vehicle_type: 'car', vehicle_number: 'TEST-123' });

    const foundById = db.findDriver({ id: newDriver.id });
    assert.ok(foundById);
    assert.equal(foundById.id, newDriver.id);

    const foundByUserId = db.findDriver({ user_id: newUser.id });
    assert.ok(foundByUserId);
    assert.equal(foundByUserId.id, newDriver.id);
  });

  it('should find trip by id using index', () => {
    const db = initializeDatabase();
    const newTrip = db.addTrip({ rider_id: 'r1', fare: 100, vehicle_type: 'bike' });

    const found = db.findTrip({ id: newTrip.id });
    assert.ok(found);
    assert.equal(found.id, newTrip.id);
    assert.equal(found.fare, 100);
  });

  it('should maintain indexes on updateUser, updateDriver, and updateTrip', () => {
    const db = initializeDatabase();
    const user = db.addUser({ name: 'Original Name', phone: '+923000003333' });
    db.updateUser(user.id, { name: 'Updated Name' });

    const fetchedUser = db.findUser({ id: user.id });
    assert.equal(fetchedUser.name, 'Updated Name');

    const driver = db.addDriver({ user_id: user.id, status: 'offline' });
    db.updateDriver({ id: driver.id }, { status: 'online' });

    const fetchedDriver = db.findDriver({ id: driver.id });
    assert.equal(fetchedDriver.status, 'online');

    const trip = db.addTrip({ fare: 200, status: 'requested' });
    db.updateTrip(trip.id, { status: 'accepted' });

    const fetchedTrip = db.findTrip({ id: trip.id });
    assert.equal(fetchedTrip.status, 'accepted');
  });

  it('should fall back gracefully to scan for non-id queries', () => {
    const db = initializeDatabase();
    const user = db.addUser({ name: 'Filter Target', phone: '+923009998888', role: 'rider' });

    const foundByPhone = db.findUser({ phone: '+923009998888' });
    assert.ok(foundByPhone);
    assert.equal(foundByPhone.id, user.id);
  });

  it('should match nearby drivers efficiently', () => {
    const db = initializeDatabase();

    const nearby = findNearbyDrivers(db, 31.5204, 74.3587, 'car', 10);
    assert.ok(Array.isArray(nearby));
  });
});
