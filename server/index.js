const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const { initializeDatabase } = require('./db/schema');
const realtimeManager = require('./services/realtime');

// Initialize
const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// Initialize database
const db = initializeDatabase();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/auth', require('./routes/auth')(db));
app.use('/api/rider', require('./routes/rider')(db));
app.use('/api/driver', require('./routes/driver')(db));
app.use('/api/trips', require('./routes/trips')(db));
app.use('/api/admin', require('./routes/admin')(db));

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', name: 'Zaara API', version: '1.0.0', timestamp: new Date().toISOString() });
});

// Initialize WebSocket
realtimeManager.initialize(server);

// Start server
server.listen(PORT, '0.0.0.0', () => {
    console.log(`
  ╔══════════════════════════════════════════╗
  ║     🚗  ZAARA Ride-Hailing Server  🚗    ║
  ║                                          ║
  ║   API:   http://localhost:${PORT}/api      ║
  ║   WS:    ws://localhost:${PORT}/ws         ║
  ║                                          ║
  ║   Status: RUNNING ✅                      ║
  ╚══════════════════════════════════════════╝
  `);
});
