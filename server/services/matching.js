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

    // Performance Optimization (⚡ Bolt):
    // 1. Fast bounding box pre-filter using lat/lng bounding box:
    //    1 degree latitude ~ 110 km; 1 degree longitude ~ 110 * cos(lat) km.
    //    Effective radius includes 0.05 km margin to account for 1-decimal rounding.
    // 2. Deferred DB lookup: Defer expensive `db.findUser()` call until AFTER
    //    confirming the driver falls within the search radius.
    const effectiveRadius = radiusKm + 0.05;
    const latDeg = effectiveRadius / 110.0;
    const lngDeg = effectiveRadius / (110.0 * Math.cos(pickupLat * Math.PI / 180));

    const minLat = pickupLat - latDeg;
    const maxLat = pickupLat + latDeg;
    const minLng = pickupLng - lngDeg;
    const maxLng = pickupLng + lngDeg;

    const nearbyDrivers = [];

    for (let i = 0; i < drivers.length; i++) {
        const driver = drivers[i];
        const lat = driver.location_lat || 0;
        const lng = driver.location_lng || 0;

        // Bounding box filter - avoids heavy trigonometric Haversine math for distant drivers
        if (lat < minLat || lat > maxLat || lng < minLng || lng > maxLng) {
            continue;
        }

        const rawDistance = calculateDistance(pickupLat, pickupLng, lat, lng);
        const distance = Math.round(rawDistance * 10) / 10;

        if (distance <= radiusKm) {
            // Only lookup user details if driver is within radius
            const user = db.findUser({ id: driver.user_id });
            nearbyDrivers.push({
                ...driver,
                name: user?.name,
                phone: user?.phone,
                user_rating: user?.rating || 5.0,
                user_id: driver.user_id,
                distance
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
