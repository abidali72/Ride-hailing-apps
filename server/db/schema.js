/**
 * In-Memory Database (JSON-based) for MVP
 * No native dependencies needed - works everywhere
 * Mimics SQL-like API for easy migration to PostgreSQL later
 */

const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'zaara_data.json');

class InMemoryDB {
  constructor() {
    this.data = {
      users: [],
      drivers: [],
      trips: [],
      payments: [],
      earnings: [],
      settings: {}
    };
  }

  // Mimic db.prepare().get() and .all()
  prepare(query) {
    const self = this;
    return {
      get: (...params) => self._query(query, params, 'get'),
      all: (...params) => self._query(query, params, 'all'),
      run: (...params) => self._execute(query, params)
    };
  }

  _query(query, params, mode) {
    // This is a simplified query parser - routes handle most logic
    return mode === 'get' ? null : [];
  }

  _execute(query, params) {
    return { changes: 0 };
  }

  // Helper to match items against a filter without allocating Object.entries on every iteration
  _matchesFilter(item, keys, len, filter) {
    if (len === 1) {
      const k = keys[0];
      return item[k] === filter[k];
    }
    for (let i = 0; i < len; i++) {
      const k = keys[i];
      if (item[k] !== filter[k]) return false;
    }
    return true;
  }

  // Direct access methods (used by routes instead of SQL)
  findUser(filter) {
    const keys = Object.keys(filter);
    const len = keys.length;
    return this.data.users.find(u => this._matchesFilter(u, keys, len, filter));
  }

  findUsers(filter = {}) {
    const keys = Object.keys(filter);
    const len = keys.length;
    if (len === 0) return this.data.users.slice();
    return this.data.users.filter(u => this._matchesFilter(u, keys, len, filter));
  }

  findDriver(filter) {
    const keys = Object.keys(filter);
    const len = keys.length;
    return this.data.drivers.find(d => this._matchesFilter(d, keys, len, filter));
  }

  findDrivers(filter = {}) {
    const keys = Object.keys(filter);
    const len = keys.length;
    if (len === 0) return this.data.drivers.slice();
    return this.data.drivers.filter(d => this._matchesFilter(d, keys, len, filter));
  }

  findTrip(filter) {
    const keys = Object.keys(filter);
    const len = keys.length;
    return this.data.trips.find(t => this._matchesFilter(t, keys, len, filter));
  }

  findTrips(filter = {}) {
    const keys = Object.keys(filter);
    const len = keys.length;
    if (len === 0) return this.data.trips.slice();
    return this.data.trips.filter(t => this._matchesFilter(t, keys, len, filter));
  }

  addUser(user) {
    user.id = user.id || uuidv4();
    user.created_at = user.created_at || new Date().toISOString();
    user.rating = user.rating || 5.0;
    user.is_active = 1;
    this.data.users.push(user);
    this.save();
    return user;
  }

  addDriver(driver) {
    driver.id = driver.id || uuidv4();
    driver.created_at = driver.created_at || new Date().toISOString();
    driver.status = driver.status || 'offline';
    driver.total_rides = driver.total_rides || 0;
    driver.kyc_verified = driver.kyc_verified || 0;
    this.data.drivers.push(driver);
    this.save();
    return driver;
  }

  addTrip(trip) {
    trip.id = trip.id || uuidv4();
    trip.created_at = trip.created_at || new Date().toISOString();
    trip.status = trip.status || 'requested';
    this.data.trips.push(trip);
    this.save();
    return trip;
  }

  addPayment(payment) {
    payment.id = payment.id || uuidv4();
    payment.created_at = new Date().toISOString();
    this.data.payments.push(payment);
    this.save();
    return payment;
  }

  addEarning(earning) {
    earning.id = earning.id || uuidv4();
    earning.created_at = new Date().toISOString();
    this.data.earnings.push(earning);
    this.save();
    return earning;
  }

  updateUser(id, updates) {
    const user = this.data.users.find(u => u.id === id);
    if (user) Object.assign(user, updates);
    this.save();
    return user;
  }

  updateDriver(filter, updates) {
    const driver = this.findDriver(filter);
    if (driver) Object.assign(driver, updates);
    this.save();
    return driver;
  }

  updateTrip(id, updates) {
    const trip = this.data.trips.find(t => t.id === id);
    if (trip) Object.assign(trip, updates);
    this.save();
    return trip;
  }

  getSetting(key) {
    return this.data.settings[key];
  }

  setSetting(key, value) {
    this.data.settings[key] = value;
    this.save();
  }

  getEarnings(driverId) {
    return this.data.earnings.filter(e => e.driver_id === driverId);
  }

  save() {
    try {
      fs.writeFileSync(DB_PATH, JSON.stringify(this.data, null, 2));
    } catch (e) {
      // Silently fail on save errors
    }
  }

  load() {
    try {
      if (fs.existsSync(DB_PATH)) {
        const raw = fs.readFileSync(DB_PATH, 'utf8');
        this.data = JSON.parse(raw);
        console.log('📂 Loaded existing database');
        return true;
      }
    } catch (e) {
      console.log('⚠️ Could not load database, creating fresh one');
    }
    return false;
  }
}

function initializeDatabase() {
  const db = new InMemoryDB();

  if (db.load()) {
    return db;
  }

  console.log('🌱 Seeding database with demo data...');

  // Seed riders
  const riders = [
    { name: 'Ahmed Khan', phone: '+923001234567', email: 'ahmed@demo.com', role: 'rider', rating: 4.8 },
    { name: 'Fatima Ali', phone: '+923009876543', email: 'fatima@demo.com', role: 'rider', rating: 4.9 },
    { name: 'Usman Shah', phone: '+923005551234', email: 'usman@demo.com', role: 'rider', rating: 4.5 },
    { name: 'Ayesha Malik', phone: '+923007771234', email: 'ayesha@demo.com', role: 'rider', rating: 4.7 },
    { name: 'Hassan Raza', phone: '+923003331234', email: 'hassan@demo.com', role: 'rider', rating: 4.6 },
  ];

  const driverUsers = [
    { name: 'Bilal Ahmad', phone: '+923011112222', email: 'bilal@demo.com', role: 'driver', rating: 4.7 },
    { name: 'Kamran Younis', phone: '+923012223333', email: 'kamran@demo.com', role: 'driver', rating: 4.5 },
    { name: 'Tariq Mehmood', phone: '+923013334444', email: 'tariq@demo.com', role: 'driver', rating: 4.8 },
    { name: 'Waseem Akram', phone: '+923014445555', email: 'waseem@demo.com', role: 'driver', rating: 4.6 },
    { name: 'Naveed Iqbal', phone: '+923015556666', email: 'naveed@demo.com', role: 'driver', rating: 4.9 },
    { name: 'Sajid Hussain', phone: '+923016667777', email: 'sajid@demo.com', role: 'driver', rating: 4.4 },
    { name: 'Imran Farooq', phone: '+923017778888', email: 'imran@demo.com', role: 'driver', rating: 4.3 },
    { name: 'Adeel Rashid', phone: '+923018889999', email: 'adeel@demo.com', role: 'driver', rating: 4.8 },
  ];

  // Add riders
  const riderIds = riders.map(r => db.addUser(r).id);

  // Add driver users and driver info
  const driverDetails = [
    { vehicle_type: 'bike', vehicle_number: 'LEA-1234', vehicle_model: 'Honda CD 70', license_number: 'DL-001', status: 'online', location_lat: 31.5204, location_lng: 74.3587, kyc_verified: 1, total_rides: 156 },
    { vehicle_type: 'rickshaw', vehicle_number: 'LEB-5678', vehicle_model: 'Qingqi Rickshaw', license_number: 'DL-002', status: 'online', location_lat: 31.5150, location_lng: 74.3500, kyc_verified: 1, total_rides: 89 },
    { vehicle_type: 'car', vehicle_number: 'LEC-9012', vehicle_model: 'Toyota Corolla 2020', license_number: 'DL-003', status: 'online', location_lat: 31.5250, location_lng: 74.3650, kyc_verified: 1, total_rides: 234 },
    { vehicle_type: 'premium', vehicle_number: 'LED-3456', vehicle_model: 'Honda Civic 2023', license_number: 'DL-004', status: 'online', location_lat: 31.5180, location_lng: 74.3520, kyc_verified: 1, total_rides: 312 },
    { vehicle_type: 'car', vehicle_number: 'LEE-7890', vehicle_model: 'Suzuki Cultus 2021', license_number: 'DL-005', status: 'online', location_lat: 31.5300, location_lng: 74.3700, kyc_verified: 1, total_rides: 178 },
    { vehicle_type: 'bike', vehicle_number: 'LEF-2345', vehicle_model: 'Honda CG 125', license_number: 'DL-006', status: 'offline', location_lat: 31.5100, location_lng: 74.3400, kyc_verified: 1, total_rides: 45 },
    { vehicle_type: 'rickshaw', vehicle_number: 'LEG-6789', vehicle_model: 'Auto Rickshaw', license_number: 'DL-007', status: 'offline', location_lat: 31.5350, location_lng: 74.3800, kyc_verified: 0, total_rides: 12 },
    { vehicle_type: 'car', vehicle_number: 'LEH-0123', vehicle_model: 'KIA Sportage 2022', license_number: 'DL-008', status: 'online', location_lat: 31.5220, location_lng: 74.3600, kyc_verified: 1, total_rides: 267 },
  ];

  const driverUserIds = driverUsers.map(d => db.addUser(d).id);
  const driverIds = driverDetails.map((d, i) => {
    return db.addDriver({ ...d, user_id: driverUserIds[i] }).id;
  });

  // Add admin user
  db.addUser({ name: 'Admin Zaara', phone: '+923000000000', email: 'admin@zaara.pk', role: 'admin', rating: 5.0 });

  // Add sample completed trips
  const sampleTrips = [
    { rider_id: riderIds[0], driver_id: driverIds[2], pickup_lat: 31.5204, pickup_lng: 74.3587, pickup_address: 'Liberty Market, Lahore', drop_lat: 31.4697, drop_lng: 74.4100, drop_address: 'Allama Iqbal Airport', distance_km: 12.5, fare: 412, vehicle_type: 'car', status: 'completed', rating: 5 },
    { rider_id: riderIds[1], driver_id: driverIds[0], pickup_lat: 31.5500, pickup_lng: 74.3400, pickup_address: 'Model Town, Lahore', drop_lat: 31.5204, drop_lng: 74.3587, drop_address: 'Liberty Market', distance_km: 4.2, fare: 80, vehicle_type: 'bike', status: 'completed', rating: 4 },
    { rider_id: riderIds[2], driver_id: driverIds[3], pickup_lat: 31.5150, pickup_lng: 74.3500, pickup_address: 'Gulberg III, Lahore', drop_lat: 31.5600, drop_lng: 74.3200, drop_address: 'Johar Town', distance_km: 8.1, fare: 524, vehicle_type: 'premium', status: 'completed', rating: 5 },
    { rider_id: riderIds[3], driver_id: driverIds[1], pickup_lat: 31.5300, pickup_lng: 74.3700, pickup_address: 'DHA Phase 5', drop_lat: 31.5100, drop_lng: 74.3400, drop_address: 'Gulberg II', distance_km: 5.5, fare: 149, vehicle_type: 'rickshaw', status: 'completed', rating: 4 },
  ];

  sampleTrips.forEach(t => {
    const trip = db.addTrip(t);
    db.addPayment({ trip_id: trip.id, amount: t.fare, method: 'cash', status: 'completed' });
    db.addEarning({ driver_id: t.driver_id, trip_id: trip.id, amount: t.fare, commission_rate: 0.20, net_amount: Math.round(t.fare * 0.8) });
  });

  // Default settings
  db.setSetting('commission_rate', '0.20');
  db.setSetting('surge_multiplier', '1.0');
  db.setSetting('max_matching_radius_km', '5');
  db.setSetting('currency', 'PKR');

  db.save();
  console.log('✅ Database seeded successfully!');
  return db;
}

module.exports = { initializeDatabase };
