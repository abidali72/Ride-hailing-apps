const test = require('node:test');
const assert = require('node:assert');
const { findNearbyDrivers } = require('../services/matching');

test('findNearbyDrivers - filters and sorts drivers correctly', () => {
    // Mock DB
    const mockUsers = [
        { id: 'u1', name: 'Driver 1', phone: '111', rating: 4.9 },
        { id: 'u2', name: 'Driver 2', phone: '222', rating: 4.5 },
        { id: 'u3', name: 'Driver 3', phone: '333', rating: 4.8 },
        { id: 'u4', name: 'Driver Far', phone: '444', rating: 5.0 }
    ];

    const mockDrivers = [
        // ~1 km away
        { id: 'd1', user_id: 'u1', status: 'online', vehicle_type: 'car', location_lat: 31.5210, location_lng: 74.3590 },
        // ~3 km away
        { id: 'd2', user_id: 'u2', status: 'online', vehicle_type: 'car', location_lat: 31.5400, location_lng: 74.3590 },
        // ~2 km away but bike
        { id: 'd3', user_id: 'u3', status: 'online', vehicle_type: 'bike', location_lat: 31.5300, location_lng: 74.3590 },
        // ~20 km away (out of 5km radius)
        { id: 'd4', user_id: 'u4', status: 'online', vehicle_type: 'car', location_lat: 31.7000, location_lng: 74.3590 }
    ];

    const mockDb = {
        findDrivers: (filter) => mockDrivers.filter(d => d.status === filter.status),
        findUser: (filter) => mockUsers.find(u => u.id === filter.id)
    };

    const pickupLat = 31.5204;
    const pickupLng = 74.3587;

    // Test 1: find all drivers within default 5km radius
    const allNearby = findNearbyDrivers(mockDb, pickupLat, pickupLng, 'any');
    assert.strictEqual(allNearby.length, 3);
    assert.strictEqual(allNearby[0].id, 'd1'); // Closest
    assert.strictEqual(allNearby[0].name, 'Driver 1');

    // Test 2: filter by vehicle type
    const carNearby = findNearbyDrivers(mockDb, pickupLat, pickupLng, 'car');
    assert.strictEqual(carNearby.length, 2);
    assert.strictEqual(carNearby[0].id, 'd1');
    assert.strictEqual(carNearby[1].id, 'd2');

    // Test 3: driver far away is excluded
    const farDriver = carNearby.find(d => d.id === 'd4');
    assert.strictEqual(farDriver, undefined);
});

test('findNearbyDrivers - benchmark performance with 1,000 drivers', () => {
    const mockUsers = [];
    const mockDrivers = [];

    // Create 1,000 online drivers spread over a 100km x 100km grid around Lahore
    for (let i = 0; i < 1000; i++) {
        const userId = `u_${i}`;
        const driverId = `d_${i}`;
        mockUsers.push({ id: userId, name: `Driver ${i}`, phone: `0300${i}`, rating: 4.0 + (i % 10) / 10 });

        // Spread lat: 31.0 to 32.0 (~110km range), lng: 74.0 to 75.0
        const lat = 31.0 + (i % 100) * 0.01;
        const lng = 74.0 + Math.floor(i / 100) * 0.01;

        mockDrivers.push({
            id: driverId,
            user_id: userId,
            status: 'online',
            vehicle_type: i % 2 === 0 ? 'car' : 'bike',
            location_lat: lat,
            location_lng: lng
        });
    }

    const mockDb = {
        findDrivers: (filter) => mockDrivers.filter(d => d.status === filter.status),
        findUser: (filter) => mockUsers.find(u => u.id === filter.id)
    };

    const pickupLat = 31.5204;
    const pickupLng = 74.3587;

    const start = process.hrtime.bigint();
    const iterations = 100;
    for (let i = 0; i < iterations; i++) {
        findNearbyDrivers(mockDb, pickupLat, pickupLng, 'car', 5);
    }
    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1e6;

    console.log(`\n📊 Benchmark (100 iterations x 1000 drivers): ${durationMs.toFixed(2)} ms`);
});
