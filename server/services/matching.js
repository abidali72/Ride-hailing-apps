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

    // Enrich with user info and calculate distance
    const nearbyDrivers = drivers
        .map(driver => {
            const user = db.findUser({ id: driver.user_id });
            const distance = calculateDistance(pickupLat, pickupLng, driver.location_lat || 0, driver.location_lng || 0);
            return {
                ...driver,
                name: user?.name,
                phone: user?.phone,
                user_rating: user?.rating || 5.0,
                user_id: driver.user_id,
                distance: Math.round(distance * 10) / 10
            };
        })
        .filter(driver => driver.distance <= radiusKm)
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
