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
    // 1. Bounding Box Pre-Filter: Perform fast flat-coordinate bounding-box filtering
    //    (~111km per degree latitude, adjusted for longitude by cos(latitude))
    //    to eliminate far-away drivers prior to running expensive Haversine trig calculations.
    // 2. Deferred DB Lookup: Delay db.findUser O(N) lookup until AFTER distance filtering
    //    so user details are only fetched for qualified nearby drivers.
    const latDelta = radiusKm / 111;
    const lngDelta = radiusKm / (111 * Math.cos(pickupLat * (Math.PI / 180)) || 1);

    const nearbyDrivers = drivers
        .filter(driver => {
            const dLat = driver.location_lat || 0;
            const dLng = driver.location_lng || 0;
            return Math.abs(dLat - pickupLat) <= latDelta && Math.abs(dLng - pickupLng) <= lngDelta;
        })
        .map(driver => {
            const distance = calculateDistance(pickupLat, pickupLng, driver.location_lat || 0, driver.location_lng || 0);
            return {
                driver,
                distance: Math.round(distance * 10) / 10
            };
        })
        .filter(item => item.distance <= radiusKm)
        .map(({ driver, distance }) => {
            const user = db.findUser({ id: driver.user_id });
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
