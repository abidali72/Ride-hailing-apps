/**
 * Fare Calculation Service for Pakistan (PKR)
 * Vehicle types: bike, rickshaw, car, premium
 */

const FARE_CONFIG = {
    bike: {
        baseFare: 30,
        perKm: 12,
        minFare: 50,
        label: 'Bike',
        icon: '🏍️',
        description: 'Fastest & cheapest'
    },
    rickshaw: {
        baseFare: 50,
        perKm: 18,
        minFare: 80,
        label: 'Rickshaw',
        icon: '🛺',
        description: 'Affordable & comfortable'
    },
    car: {
        baseFare: 100,
        perKm: 25,
        minFare: 150,
        label: 'Car',
        icon: '🚗',
        description: 'Standard AC ride'
    },
    premium: {
        baseFare: 200,
        perKm: 40,
        minFare: 300,
        label: 'Premium',
        icon: '⭐',
        description: 'Luxury experience'
    }
};

function calculateFare(distanceKm, vehicleType, surgeMultiplier = 1.0) {
    const config = FARE_CONFIG[vehicleType];
    if (!config) throw new Error(`Invalid vehicle type: ${vehicleType}`);

    let fare = config.baseFare + (config.perKm * distanceKm);
    fare = Math.max(fare, config.minFare);
    fare = Math.round(fare * surgeMultiplier);

    return {
        fare,
        currency: 'PKR',
        baseFare: config.baseFare,
        distanceCharge: Math.round(config.perKm * distanceKm),
        distanceKm: Math.round(distanceKm * 10) / 10,
        vehicleType,
        surgeMultiplier,
        label: config.label,
        icon: config.icon
    };
}

// Performance Optimization: Cache radian conversion factor at module level
const RAD = Math.PI / 180;

function calculateDistance(lat1, lng1, lat2, lng2) {
    const radLat1 = lat1 * RAD;
    const radLat2 = lat2 * RAD;
    const dLatHalf = (radLat2 - radLat1) / 2;
    const dLngHalf = ((lng2 - lng1) * RAD) / 2;
    const sinDLat = Math.sin(dLatHalf);
    const sinDLng = Math.sin(dLngHalf);

    const a = sinDLat * sinDLat +
        Math.cos(radLat1) * Math.cos(radLat2) *
        sinDLng * sinDLng;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return 6371 * c; // 6371 = Earth's radius in km
}

function toRad(deg) {
    return deg * RAD;
}

function getAllFareEstimates(distanceKm, surgeMultiplier = 1.0) {
    return Object.keys(FARE_CONFIG).map(type => calculateFare(distanceKm, type, surgeMultiplier));
}

module.exports = { calculateFare, calculateDistance, getAllFareEstimates, FARE_CONFIG };
