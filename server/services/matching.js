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

    // Performance Optimization (Bolt):
    // 1. Build an in-memory Map of user profiles indexed by ID for O(1) user lookups,
    //    replacing O(N) array scans (`db.findUser`) inside the driver loop.
    // 2. Apply a fast bounding-box filter on latitude and longitude before calculating
    //    expensive trigonometric distances (Haversine/spherical distance).
    //
    // Geometry notes:
    // 1 degree latitude ~= 111.195 km.
    // 1 degree longitude ~= 111.195 * cos(lat) km.
    // Account for rounding tolerances where `distance <= radiusKm` allows up to radiusKm + 0.05 km.
    const userMap = new Map();
    if (db.data && Array.isArray(db.data.users)) {
        for (let i = 0; i < db.data.users.length; i++) {
            const u = db.data.users[i];
            if (u && u.id) {
                userMap.set(u.id, u);
            }
        }
    }

    const effectiveRadius = radiusKm + 0.05;
    const maxLatRad = (Math.abs(pickupLat) + effectiveRadius / 111.195) * (Math.PI / 180);
    const minCos = Math.max(Math.cos(maxLatRad), 0.0001);
    const latDelta = effectiveRadius / 111.195;
    const lngDelta = effectiveRadius / (111.195 * minCos);

    const nearbyDrivers = [];

    for (let i = 0; i < drivers.length; i++) {
        const driver = drivers[i];
        const lat = driver.location_lat || 0;
        const lng = driver.location_lng || 0;

        // Fast bounding-box check to skip drivers far outside search radius
        if (Math.abs(lat - pickupLat) > latDelta || Math.abs(lng - pickupLng) > lngDelta) {
            continue;
        }

        const rawDistance = calculateDistance(pickupLat, pickupLng, lat, lng);
        const distance = Math.round(rawDistance * 10) / 10;

        if (distance <= radiusKm) {
            const user = userMap.get(driver.user_id) || db.findUser({ id: driver.user_id });
            nearbyDrivers.push({
                ...driver,
                name: user?.name,
                phone: user?.phone,
                user_rating: user?.rating || 5.0,
                user_id: driver.user_id,
                distance: distance
            });
        }
    }

    nearbyDrivers.sort((a, b) => {
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
