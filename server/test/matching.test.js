const test = require('node:test');
const assert = require('node:assert/strict');
const { findNearbyDrivers } = require('../services/matching');

test('findNearbyDrivers - returns nearby online drivers matching vehicle type and radius', () => {
    const mockDb = {
        drivers: [
            { id: 'd1', user_id: 'u1', vehicle_type: 'car', status: 'online', location_lat: 31.5204, location_lng: 74.3587 }, // ~0 km from pickup
            { id: 'd2', user_id: 'u2', vehicle_type: 'car', status: 'online', location_lat: 31.5300, location_lng: 74.3700 }, // ~1.5 km
            { id: 'd3', user_id: 'u3', vehicle_type: 'car', status: 'online', location_lat: 31.7000, location_lng: 74.5000 }, // ~24 km away
            { id: 'd4', user_id: 'u4', vehicle_type: 'bike', status: 'online', location_lat: 31.5210, location_lng: 74.3590 }, // ~0.1 km, but bike
        ],
        users: {
            u1: { id: 'u1', name: 'Driver One', phone: '111', rating: 4.8 },
            u2: { id: 'u2', name: 'Driver Two', phone: '222', rating: 4.9 },
            u3: { id: 'u3', name: 'Driver Three', phone: '333', rating: 4.5 },
            u4: { id: 'u4', name: 'Driver Four', phone: '444', rating: 4.7 }
        },
        findDrivers(filter) {
            return this.drivers.filter(d => {
                for (const [k, v] of Object.entries(filter)) {
                    if (d[k] !== v) return false;
                }
                return true;
            });
        },
        findUser(filter) {
            return this.users[filter.id] || null;
        }
    };

    const pickupLat = 31.5204;
    const pickupLng = 74.3587;

    // Test car vehicle filter
    const carsNearby = findNearbyDrivers(mockDb, pickupLat, pickupLng, 'car', 5);
    assert.equal(carsNearby.length, 2);
    assert.equal(carsNearby[0].id, 'd1');
    assert.equal(carsNearby[0].name, 'Driver One');
    assert.equal(carsNearby[1].id, 'd2');

    // Test 'any' vehicle type filter
    const anyNearby = findNearbyDrivers(mockDb, pickupLat, pickupLng, 'any', 5);
    assert.equal(anyNearby.length, 3); // d1, d4, d2 sorted by distance
});

test('findNearbyDrivers - handles missing driver coordinates and edge cases', () => {
    const mockDb = {
        drivers: [
            { id: 'd1', user_id: 'u1', vehicle_type: 'car', status: 'online', location_lat: null, location_lng: null },
            { id: 'd2', user_id: 'u2', vehicle_type: 'car', status: 'online' }
        ],
        users: {
            u1: { name: 'Driver One', rating: 5.0 },
            u2: { name: 'Driver Two', rating: 5.0 }
        },
        findDrivers() { return this.drivers; },
        findUser(filter) { return this.users[filter.id]; }
    };

    const nearby = findNearbyDrivers(mockDb, 31.5204, 74.3587, 'car', 5);
    assert.equal(nearby.length, 0);
});

test('findNearbyDrivers - benchmark performance with 1,000 drivers', () => {
    const drivers = [];
    const users = {};

    for (let i = 0; i < 1000; i++) {
        const userId = `user_${i}`;
        drivers.push({
            id: `driver_${i}`,
            user_id: userId,
            vehicle_type: i % 2 === 0 ? 'car' : 'bike',
            status: 'online',
            location_lat: 31.0 + (Math.random() * 2), // Spread over ~220km
            location_lng: 74.0 + (Math.random() * 2)
        });
        users[userId] = { id: userId, name: `Driver ${i}`, rating: 4.5 + (i % 5) * 0.1 };
    }

    const mockDb = {
        drivers,
        users,
        findDrivers(filter) {
            return this.drivers.filter(d => {
                for (const [k, v] of Object.entries(filter)) {
                    if (d[k] !== v) return false;
                }
                return true;
            });
        },
        findUser(filter) {
            return this.users[filter.id] || null;
        }
    };

    const start = process.hrtime.bigint();
    const iterations = 500;
    for (let i = 0; i < iterations; i++) {
        findNearbyDrivers(mockDb, 31.5204, 74.3587, 'car', 5);
    }
    const durationNs = process.hrtime.bigint() - start;
    const avgMs = Number(durationNs) / (iterations * 1e6);

    console.log(`⏱️ Benchmark: 500 queries over 1,000 drivers took ${Number(durationNs) / 1e6}ms (avg ${avgMs.toFixed(3)}ms / query)`);
    assert.ok(avgMs < 2.0, `Query time average (${avgMs}ms) should be under 2ms`);
});
