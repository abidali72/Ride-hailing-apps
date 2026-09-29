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

    // Fast bounding box pre-filter (~111km per degree of latitude) to avoid expensive
    // trigonometric calculations and DB user lookups for drivers far outside the search radius
    const latMargin = (radiusKm * 1.1) / 111.0;
    const cosLat = Math.cos(pickupLat * (Math.PI / 180));
    const lngMargin = Math.abs(cosLat) > 0.01 ? (radiusKm * 1.1) / (111.0 * Math.abs(cosLat)) : 180;

    const nearbyDrivers = [];

    for (let i = 0; i < drivers.length; i++) {
        const driver = drivers[i];
        const driverLat = driver.location_lat || 0;
        const driverLng = driver.location_lng || 0;

        // Bounding box checks
        if (Math.abs(driverLat - pickupLat) > latMargin) continue;
        if (Math.abs(driverLng - pickupLng) > lngMargin) continue;

        // Precise distance calculation only for candidates within the bounding box
        const distance = calculateDistance(pickupLat, pickupLng, driverLat, driverLng);
        if (distance > radiusKm) continue;

        const user = db.findUser({ id: driver.user_id });
        nearbyDrivers.push({
            ...driver,
            name: user?.name,
            phone: user?.phone,
            user_rating: user?.rating || 5.0,
            user_id: driver.user_id,
            distance: Math.round(distance * 10) / 10
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
