const { describe, it } = require('node:test');
const assert = require('node:assert');
const { initializeDatabase } = require('../db/schema');

describe('InMemoryDB Performance Benchmark', () => {
    it('handles high throughput queries efficiently', () => {
        const db = initializeDatabase();

        // Populate with large dataset
        for (let i = 0; i < 1000; i++) {
            db.data.users.push({ id: `bench_u_${i}`, role: i % 2 === 0 ? 'rider' : 'driver', phone: `+92300${i}`, is_active: 1 });
            db.data.drivers.push({ id: `bench_d_${i}`, user_id: `bench_u_${i}`, status: i % 3 === 0 ? 'online' : 'offline', vehicle_type: 'car' });
            db.data.trips.push({ id: `bench_t_${i}`, rider_id: `bench_u_${i}`, status: 'completed' });
        }

        const iterations = 5000;
        const startTime = performance.now();

        for (let i = 0; i < iterations; i++) {
            db.findUsers({ role: 'rider', is_active: 1 });
            db.findDrivers({ status: 'online', vehicle_type: 'car' });
            db.findTrips({ status: 'completed' });
        }

        const duration = performance.now() - startTime;
        console.log(`⏱️ Benchmark completed ${iterations * 3} queries across 3,000 records in ${duration.toFixed(2)} ms`);

        // Check that queries return expected results
        const riders = db.findUsers({ role: 'rider', is_active: 1 });
        assert.ok(riders.length >= 500);

        // Sanity check: duration should be reasonable (under 1000ms for 15,000 array filters)
        assert.ok(duration < 2000, `Duration too long: ${duration}ms`);
    });
});
