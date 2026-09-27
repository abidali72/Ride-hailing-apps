const assert = require('assert');
const { initializeDatabase } = require('../db/schema');
const { findNearbyDrivers } = require('../services/matching');

// Initialize fresh DB
const db = initializeDatabase();

// Test basic matching
const drivers = findNearbyDrivers(db, 31.5204, 74.3587, 'car', 5);
console.log(`Found ${drivers.length} drivers near test coordinates.`);
assert(Array.isArray(drivers), 'findNearbyDrivers should return an array');

console.log('All matching tests passed!');
