/**
 * Driver Matching Algorithm
 * Finds nearby available drivers and sorts by distance + rating
 */

const { calculateDistance } = require('./fare');

function findNearbyDrivers(db, pickupLat, pickupLng, vehicleType, radiusKm = 5) {
    let drivers = db.findDrivers({ status: 'online' });

    if (vehicleType && vehicleType !== 'any') {
        drivers = drivers.filter(d => d.vehicle_type === vehicleType);
    }

    // Performance Optimization:
    // 1. Filter by radius distance FIRST to avoid unnecessary DB lookups for out-of-range drivers.
    const nearby = [];
    for (let i = 0; i < drivers.length; i++) {
        const driver = drivers[i];
        const distance = calculateDistance(pickupLat, pickupLng, driver.location_lat || 0, driver.location_lng || 0);
        const roundedDistance = Math.round(distance * 10) / 10;
        if (roundedDistance <= radiusKm) {
            nearby.push({ driver, distance: roundedDistance });
        }
    }

    if (nearby.length === 0) return [];

    // 2. Build a user lookup Map for O(1) efficiency instead of doing linear O(U) scans per driver.
    const userMap = new Map();
    if (db.data && Array.isArray(db.data.users)) {
        for (let i = 0; i < db.data.users.length; i++) {
            const u = db.data.users[i];
            if (u.id) userMap.set(u.id, u);
        }
    }

    // 3. Enrich with user info only for nearby drivers
    const nearbyDrivers = nearby
        .map(({ driver, distance }) => {
            const user = userMap.get(driver.user_id) || db.findUser({ id: driver.user_id });
            return {
                ...driver,
                name: user?.name,
                phone: user?.phone,
                user_rating: user?.rating || 5.0,
                user_id: driver.user_id,
                distance
            };
        })
        .sort((a, b) => {
            const distScore = a.distance - b.distance;
            if (Math.abs(distScore) < 0.5) {
                return (b.user_rating || 0) - (a.user_rating || 0);
            }
            return distScore;
        });

    return nearbyDrivers;
}

function assignDriver(db, tripId, driverId) {
    db.updateTrip(tripId, { driver_id: driverId, status: 'accepted' });
    db.updateDriver({ id: driverId }, { status: 'busy' });
    return db.findTrip({ id: tripId });
}

function releaseDriver(db, driverId) {
    db.updateDriver({ id: driverId }, { status: 'online' });
}

module.exports = { findNearbyDrivers, assignDriver, releaseDriver };
