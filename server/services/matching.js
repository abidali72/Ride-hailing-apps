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

    // Performance Optimization: Fast geometric bounding box pre-filter.
    // 1 degree latitude ~= 111 km. 1 degree longitude ~= 111 km * cos(lat).
    // Reduces O(N) expensive trigonometric Haversine calls and db.findUser O(M) scans
    // down to only candidate drivers within the geographic bounding box.
    const maxLatDiff = radiusKm / 110;
    const latRad = pickupLat * (Math.PI / 180);
    const cosLat = Math.cos(latRad);
    const maxLngDiff = radiusKm / (110 * (Math.abs(cosLat) < 0.01 ? 0.01 : Math.abs(cosLat)));

    const nearbyDrivers = [];

    for (let i = 0; i < drivers.length; i++) {
        const driver = drivers[i];
        const lat = driver.location_lat || 0;
        const lng = driver.location_lng || 0;

        // Fast bounding box elimination check
        if (Math.abs(lat - pickupLat) > maxLatDiff || Math.abs(lng - pickupLng) > maxLngDiff) {
            continue;
        }

        const distance = calculateDistance(pickupLat, pickupLng, lat, lng);
        const roundedDistance = Math.round(distance * 10) / 10;

        if (roundedDistance <= radiusKm) {
            // Defer DB user lookup and object allocation until driver is confirmed within radius
            const user = db.findUser({ id: driver.user_id });
            nearbyDrivers.push({
                ...driver,
                name: user?.name,
                phone: user?.phone,
                user_rating: user?.rating || 5.0,
                user_id: driver.user_id,
                distance: roundedDistance
            });
        }
    }

    // Sort by distance (and rating if distance difference < 0.5 km)
    return nearbyDrivers.sort((a, b) => {
        const distScore = a.distance - b.distance;
        if (Math.abs(distScore) < 0.5) {
            return (b.user_rating || 0) - (a.user_rating || 0);
        }
        return distScore;
    });
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
