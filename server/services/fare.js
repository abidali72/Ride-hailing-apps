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

function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in km
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function toRad(deg) {
    return deg * (Math.PI / 180);
}

function getAllFareEstimates(distanceKm, surgeMultiplier = 1.0) {
    return Object.keys(FARE_CONFIG).map(type => calculateFare(distanceKm, type, surgeMultiplier));
}

module.exports = { calculateFare, calculateDistance, getAllFareEstimates, FARE_CONFIG };
