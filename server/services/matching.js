/**
 * Driver Matching Algorithm
 * Finds nearby available drivers and sorts by distance + rating
 */

const { calculateDistance } = require('./fare');

/**
 * ⚡ Performance Optimization:
 * 1. Bounding-box pre-filtering: 1 degree latitude is approx 110km. Longitude delta accounts for latitude cos.
 *    Checking coordinate deltas using basic arithmetic avoids trigonometric calculations (Haversine formula)
 *    for drivers outside the bounding box (~90%+ reduction in trig calls).
 * 2. Lazy User DB lookups: `db.findUser` scans the users array. By deferring this until AFTER filtering out
 *    drivers outside radiusKm, array scanning overhead is dramatically reduced.
 */
function findNearbyDrivers(db, pickupLat, pickupLng, vehicleType, radiusKm = 5) {
    let drivers = db.findDrivers({ status: 'online' });

    if (vehicleType && vehicleType !== 'any') {
        drivers = drivers.filter(d => d.vehicle_type === vehicleType);
    }

    // Fast bounding-box approximations
    // Approx 110 km per degree of latitude
    const latDelta = radiusKm / 110;
    const cosLat = Math.cos(pickupLat * (Math.PI / 180));
    // Avoid division by zero near poles
    const lngDelta = radiusKm / (110 * Math.max(Math.abs(cosLat), 0.01));

    const nearbyDrivers = [];

    for (let i = 0; i < drivers.length; i++) {
        const driver = drivers[i];
        const lat = driver.location_lat || 0;
        const lng = driver.location_lng || 0;

        // Bounding-box fast path: skip exact Haversine calculation if outside simple square bound
        if (Math.abs(lat - pickupLat) > latDelta || Math.abs(lng - pickupLng) > lngDelta) {
            continue;
        }

        const distance = calculateDistance(pickupLat, pickupLng, lat, lng);
        const roundedDistance = Math.round(distance * 10) / 10;

        if (roundedDistance <= radiusKm) {
            // Lazy user lookup: only query DB for drivers within radius
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
