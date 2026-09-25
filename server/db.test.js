const test = require('node:test');
const assert = require('node:assert');
const { InMemoryDB } = require('./db/schema');

test('findUser by id and phone', () => {
  const db = new InMemoryDB();
  const user = db.addUser({ name: 'Test User', phone: '+923000000001', role: 'rider' });

  // Fast O(1) single-key lookups
  const foundById = db.findUser({ id: user.id });
  assert.ok(foundById);
  assert.strictEqual(foundById.name, 'Test User');

  const foundByPhone = db.findUser({ phone: '+923000000001' });
  assert.ok(foundByPhone);
  assert.strictEqual(foundByPhone.id, user.id);

  // Multi-key filter fallback
  const foundByMulti = db.findUser({ id: user.id, role: 'rider' });
  assert.ok(foundByMulti);
  assert.strictEqual(foundByMulti.id, user.id);
});

test('findDriver by id and user_id', () => {
  const db = new InMemoryDB();
  const user = db.addUser({ name: 'Driver User', phone: '+923000000002', role: 'driver' });
  const driver = db.addDriver({ user_id: user.id, vehicle_type: 'car', vehicle_number: 'TEST-123' });

  const foundById = db.findDriver({ id: driver.id });
  assert.ok(foundById);
  assert.strictEqual(foundById.vehicle_number, 'TEST-123');

  const foundByUserId = db.findDriver({ user_id: user.id });
  assert.ok(foundByUserId);
  assert.strictEqual(foundByUserId.id, driver.id);
});

test('findTrip and getEarnings', () => {
  const db = new InMemoryDB();
  const trip = db.addTrip({ rider_id: 'r1', fare: 250, status: 'requested' });
  const foundTrip = db.findTrip({ id: trip.id });
  assert.ok(foundTrip);
  assert.strictEqual(foundTrip.fare, 250);

  db.addEarning({ driver_id: 'd1', trip_id: trip.id, amount: 250, net_amount: 200 });
  const earnings = db.getEarnings('d1');
  assert.strictEqual(earnings.length, 1);
  assert.strictEqual(earnings[0].net_amount, 200);
});

test('update operations keep indexes updated', () => {
  const db = new InMemoryDB();
  const user = db.addUser({ name: 'Update User', phone: '+923000000003', role: 'rider' });

  // Update phone
  db.updateUser(user.id, { phone: '+923000000099' });
  const foundNewPhone = db.findUser({ phone: '+923000000099' });
  assert.ok(foundNewPhone);
  assert.strictEqual(foundNewPhone.id, user.id);

  const oldPhoneSearch = db.findUser({ phone: '+923000000003' });
  assert.strictEqual(oldPhoneSearch, undefined);
});
