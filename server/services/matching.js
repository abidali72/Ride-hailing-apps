/**
 * Driver Matching Algorithm
 * Finds nearby available drivers and sorts by distance + rating
 */

const { calculateDistance } = require('./fare');

/**
 * Optimized findNearbyDrivers:
 * 1. Bounding-box pre-filtering: eliminates drivers outside lat/lng delta before expensive Haversine trig functions.
 * 2. Deferred user hydration: avoids calling db.findUser on distant drivers.
 */
function findNearbyDrivers(db, pickupLat, pickupLng, vehicleType, radiusKm = 5) {
    let drivers = db.findDrivers({ status: 'online' });

    if (vehicleType && vehicleType !== 'any') {
        drivers = drivers.filter(d => d.vehicle_type === vehicleType);
    }

    // Conservative bounding-box delta to eliminate distant drivers without expensive trigonometry
    const cosLat = Math.cos(pickupLat * (Math.PI / 180));
    const maxLatDiff = radiusKm / 110.0; // 1 deg lat ~ 111km (110.0 provides safety margin)
    const maxLngDiff = radiusKm / (110.0 * Math.max(0.1, Math.abs(cosLat)));

    // Step 1: Pre-filter by bounding box and exact distance
    const candidateDrivers = [];
    for (let i = 0; i < drivers.length; i++) {
        const driver = drivers[i];
        const lat = driver.location_lat || 0;
        const lng = driver.location_lng || 0;

        // Quick bounding box check
        if (Math.abs(lat - pickupLat) > maxLatDiff || Math.abs(lng - pickupLng) > maxLngDiff) {
            continue;
        }

        // Exact Haversine distance calculation
        const distance = calculateDistance(pickupLat, pickupLng, lat, lng);
        if (distance <= radiusKm) {
            candidateDrivers.push({
                driver,
                distance: Math.round(distance * 10) / 10
            });
        }
    }

    // Step 2: Hydrate user info ONLY for nearby drivers within radius
    const nearbyDrivers = candidateDrivers.map(({ driver, distance }) => {
        const user = db.findUser({ id: driver.user_id });
        return {
            ...driver,
            name: user?.name,
            phone: user?.phone,
            user_rating: user?.rating || 5.0,
            user_id: driver.user_id,
            distance
        };
    });

    // Step 3: Sort by distance + user rating
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
