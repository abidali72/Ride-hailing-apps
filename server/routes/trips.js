const express = require('express');
const router = express.Router();

module.exports = function (db) {
  router.get('/', (req, res) => {
    const trips = db.data.trips
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 100)
      .map(t => {
        const rider = db.findUser({ id: t.rider_id });
        let driverName = null, vehicleNumber = null;
        if (t.driver_id) {
          const driver = db.findDriver({ id: t.driver_id });
          if (driver) {
            const du = db.findUser({ id: driver.user_id });
            driverName = du?.name;
            vehicleNumber = driver.vehicle_number;
          }
        }
        return { ...t, rider_name: rider?.name, rider_phone: rider?.phone, driver_name: driverName, vehicle_number: vehicleNumber };
      });
    res.json({ trips });
  });

  router.get('/:id', (req, res) => {
    const trip = db.findTrip({ id: req.params.id });
    if (!trip) return res.status(404).json({ error: 'Trip not found' });

    const rider = db.findUser({ id: trip.rider_id });
    let driverName = null, vehicleNumber = null, vehicleModel = null;
    if (trip.driver_id) {
      const driver = db.findDriver({ id: trip.driver_id });
      if (driver) {
        const du = db.findUser({ id: driver.user_id });
        driverName = du?.name;
        vehicleNumber = driver.vehicle_number;
        vehicleModel = driver.vehicle_model;
      }
    }
    res.json({ trip: { ...trip, rider_name: rider?.name, rider_phone: rider?.phone, driver_name: driverName, vehicle_number: vehicleNumber, vehicle_model: vehicleModel } });
  });

  return router;
};
