const test = require('node:test');
const assert = require('node:assert');
const { findNearbyDrivers, assignDriver, releaseDriver } = require('../services/matching');

test('findNearbyDrivers - filters drivers within radius and matches vehicle type', () => {
    const mockDb = {
        findDrivers: ({ status }) => [
            { id: 'd1', user_id: 'u1', status, vehicle_type: 'car', location_lat: 31.5204, location_lng: 74.3587 },
            { id: 'd2', user_id: 'u2', status, vehicle_type: 'bike', location_lat: 31.5204, location_lng: 74.3587 },
            { id: 'd3', user_id: 'u3', status, vehicle_type: 'car', location_lat: 32.5204, location_lng: 75.3587 }, // Far away
        ],
        findUser: ({ id }) => ({ id, name: `User ${id}`, phone: '123', rating: 4.8 })
    };

    const nearbyCars = findNearbyDrivers(mockDb, 31.5204, 74.3587, 'car', 5);
    assert.strictEqual(nearbyCars.length, 1);
    assert.strictEqual(nearbyCars[0].id, 'd1');
    assert.strictEqual(nearbyCars[0].name, 'User u1');
    assert.strictEqual(nearbyCars[0].distance, 0);

    const nearbyAny = findNearbyDrivers(mockDb, 31.5204, 74.3587, 'any', 5);
    assert.strictEqual(nearbyAny.length, 2);
});

test('findNearbyDrivers - sorts by rating when distances are within 0.5km', () => {
    const mockDb = {
        findDrivers: () => [
            { id: 'd1', user_id: 'u1', status: 'online', vehicle_type: 'car', location_lat: 31.5204, location_lng: 74.3587 },
            { id: 'd2', user_id: 'u2', status: 'online', vehicle_type: 'car', location_lat: 31.5205, location_lng: 74.3588 },
        ],
        findUser: ({ id }) => {
            if (id === 'u1') return { id, name: 'Low Rating', rating: 4.2 };
            if (id === 'u2') return { id, name: 'High Rating', rating: 4.9 };
            return null;
        }
    };

    const nearby = findNearbyDrivers(mockDb, 31.5204, 74.3587, 'car', 5);
    assert.strictEqual(nearby.length, 2);
    assert.strictEqual(nearby[0].id, 'd2'); // u2 higher rating prioritized
});

test('assignDriver & releaseDriver updates DB', () => {
    let tripUpdated = false;
    let driverUpdated = false;

    const mockDb = {
        updateTrip: (id, updates) => { tripUpdated = updates; },
        updateDriver: (filter, updates) => { driverUpdated = updates; },
        findTrip: ({ id }) => ({ id, status: 'accepted' })
    };

    const trip = assignDriver(mockDb, 't1', 'd1');
    assert.strictEqual(trip.status, 'accepted');
    assert.deepStrictEqual(tripUpdated, { driver_id: 'd1', status: 'accepted' });
    assert.deepStrictEqual(driverUpdated, { status: 'busy' });

    releaseDriver(mockDb, 'd1');
    assert.deepStrictEqual(driverUpdated, { status: 'online' });
});
