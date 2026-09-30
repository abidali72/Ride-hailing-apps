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

    // Bolt Optimization: Bounding box pre-filtering (~110km/deg lat, ~85km/deg lng for Pakistan region)
    // Avoids expensive Haversine distance trig calls & DB user lookups for distant drivers.
    const latBound = radiusKm / 110;
    const lngBound = radiusKm / 85;

    const nearbyDrivers = [];
    for (let i = 0; i < drivers.length; i++) {
        const driver = drivers[i];
        const dLat = driver.location_lat || 0;
        const dLng = driver.location_lng || 0;

        // Bounding box pre-check
        if (Math.abs(dLat - pickupLat) > latBound || Math.abs(dLng - pickupLng) > lngBound) {
            continue;
        }

        const distance = calculateDistance(pickupLat, pickupLng, dLat, dLng);
        const roundedDistance = Math.round(distance * 10) / 10;

        if (roundedDistance <= radiusKm) {
            // Defer DB user lookup until driver is confirmed within radius
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
