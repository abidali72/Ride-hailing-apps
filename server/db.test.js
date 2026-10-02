const { test } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const { initializeDatabase } = require('./db/schema');

test('InMemoryDB CRUD operations', () => {
  const db = initializeDatabase();
  const testPhone = `+923${Date.now().toString().slice(-9)}`;

  const user = db.addUser({ name: 'Test Rider', phone: testPhone, role: 'rider' });
  assert.ok(user.id);
  assert.strictEqual(user.name, 'Test Rider');

  const foundUser = db.findUser({ phone: testPhone });
  assert.ok(foundUser);
  assert.strictEqual(foundUser.id, user.id);

  const updatedUser = db.updateUser(user.id, { name: 'Updated Rider' });
  assert.strictEqual(updatedUser.name, 'Updated Rider');
  assert.strictEqual(db.findUser({ id: user.id }).name, 'Updated Rider');
});

test('InMemoryDB save debouncing and immediate save', () => {
  const db = initializeDatabase();

  const start = Date.now();
  // Perform 100 updates in quick succession
  for (let i = 0; i < 100; i++) {
    db.updateUser(db.data.users[0].id, { rating: 4.5 + (i % 5) * 0.1 });
  }
  const duration = Date.now() - start;

  // 100 debounced updates should complete in under 50ms (instead of 500ms+ with sync fs)
  assert.ok(duration < 50, `100 updates took ${duration}ms, expected < 50ms`);

  // Verify save timer is active
  assert.ok(db._saveTimer !== null, 'Save timer should be active after debounced saves');

  // Verify immediate flush cancels timer and saves
  db.save(true);
  assert.strictEqual(db._saveTimer, null, 'Save timer should be cleared after immediate save');
});
