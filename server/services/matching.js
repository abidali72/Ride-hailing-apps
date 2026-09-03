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
    // 1. Spatial bounding box pre-filtering: Skip distant drivers using fast lat/lng difference
    //    checks (~110km per degree of latitude) before running expensive Haversine trigonometric calculations.
    // 2. Lazy user lookup: Defer db.findUser lookups until after distance filtering so lookups only run
    //    for nearby candidate drivers rather than all online drivers in the database.
    const maxLatDiff = radiusKm / 110.0;
    const cosLat = Math.cos(pickupLat * (Math.PI / 180));
    const maxLngDiff = cosLat > 0.01 ? radiusKm / (110.0 * cosLat) : 180;

    const nearbyDrivers = [];

    for (let i = 0; i < drivers.length; i++) {
        const driver = drivers[i];
        const dLat = Math.abs((driver.location_lat || 0) - pickupLat);
        if (dLat > maxLatDiff) continue;

        const dLng = Math.abs((driver.location_lng || 0) - pickupLng);
        if (dLng > maxLngDiff) continue;

        const distance = calculateDistance(pickupLat, pickupLng, driver.location_lat || 0, driver.location_lng || 0);
        const roundedDist = Math.round(distance * 10) / 10;

        if (roundedDist <= radiusKm) {
            const user = db.findUser({ id: driver.user_id });
            nearbyDrivers.push({
                ...driver,
                name: user?.name,
                phone: user?.phone,
                user_rating: user?.rating || 5.0,
                user_id: driver.user_id,
                distance: roundedDist
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
