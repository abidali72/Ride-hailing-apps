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

    // Bounding box pre-filter to eliminate drivers far outside search radius
    // 1 deg latitude ≈ 111 km. Using 110 for safety margin.
    const latDelta = radiusKm / 110;
    const lngDelta = radiusKm / (110 * Math.cos(pickupLat * Math.PI / 180));

    const minLat = pickupLat - latDelta;
    const maxLat = pickupLat + latDelta;
    const minLng = pickupLng - lngDelta;
    const maxLng = pickupLng + lngDelta;

    // Index driver users into a Map for O(1) lookup instead of O(M) db.findUser linear scans per driver
    const userMap = new Map();
    const driverUsers = db.findUsers({ role: 'driver' });
    for (let i = 0; i < driverUsers.length; i++) {
        userMap.set(driverUsers[i].id, driverUsers[i]);
    }

    const nearbyDrivers = [];

    for (let i = 0; i < drivers.length; i++) {
        const driver = drivers[i];
        const dLat = driver.location_lat || 0;
        const dLng = driver.location_lng || 0;

        // Fast bounding box check before trigonometric Haversine distance calculation
        if (dLat < minLat || dLat > maxLat || dLng < minLng || dLng > maxLng) {
            continue;
        }

        const distance = calculateDistance(pickupLat, pickupLng, dLat, dLng);
        const roundedDistance = Math.round(distance * 10) / 10;
        if (roundedDistance > radiusKm) continue;

        const user = userMap.get(driver.user_id);

        nearbyDrivers.push({
            ...driver,
            name: user?.name,
            phone: user?.phone,
            user_rating: user?.rating || 5.0,
            user_id: driver.user_id,
            distance: roundedDistance
        });
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
