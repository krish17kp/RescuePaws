require('dotenv').config();

const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const authRoutes = require('./routes/auth');
const caseRoutes = require('./routes/cases');
const userRoutes = require('./routes/users');
const eventRoutes = require('./routes/events');
const photoRoutes = require('./routes/photos');
const registerSocketHandlers = require('./socket/handlers');

const app = express();
const server = http.createServer(app);

// Middleware
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
app.use(cors({ origin: (origin, cb) => cb(null, true) }));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/cases', caseRoutes);
app.use('/api/users', userRoutes);
app.use('/api/cases', eventRoutes);
app.use('/api/cases', photoRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Socket.io
const io = new Server(server, {
  cors: {
    origin: (origin, cb) => cb(null, true),
    methods: ['GET', 'POST'],
  },
});

// Make io accessible to routes (for emitting events from REST endpoints)
app.set('io', io);

// Register socket handlers
registerSocketHandlers(io);

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Rescue-Uber backend running on port ${PORT}`);
});
