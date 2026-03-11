const jwt = require('jsonwebtoken');
const pool = require('../config/db');

function registerSocketHandlers(io) {
  // Authenticate socket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('No token'));
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      socket.userRole = decoded.role;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: user ${socket.userId} (${socket.userRole})`);

    // Every user joins their personal room for targeted notifications
    socket.join(`user:${socket.userId}`);

    // Join a case room
    socket.on('join_case', ({ caseId }) => {
      socket.join(`case:${caseId}`);
      console.log(`User ${socket.userId} joined case:${caseId}`);
    });

    // Leave a case room
    socket.on('leave_case', ({ caseId }) => {
      socket.leave(`case:${caseId}`);
      console.log(`User ${socket.userId} left case:${caseId}`);
    });

    // Responder sends location update
    socket.on('responder:location_update', async ({ caseId, lat, lng }) => {
      if (socket.userRole !== 'responder') return;

      try {
        // Update user's current location
        await pool.query(
          'UPDATE users SET latitude = $1, longitude = $2 WHERE id = $3',
          [lat, lng, socket.userId]
        );

        // Log to responder_locations
        await pool.query(
          'INSERT INTO responder_locations (responder_id, case_id, latitude, longitude) VALUES ($1, $2, $3, $4)',
          [socket.userId, caseId, lat, lng]
        );

        // Update case responder coords
        await pool.query(
          'UPDATE cases SET responder_lat = $1, responder_lng = $2, updated_at = NOW() WHERE id = $3',
          [lat, lng, caseId]
        );

        // Broadcast to case room
        io.to(`case:${caseId}`).emit('responder:location', {
          lat,
          lng,
          timestamp: Date.now(),
        });
      } catch (err) {
        console.error('Location update error:', err);
      }
    });

    // Generic case event sender (socket-based quick updates / movement)
    socket.on('case:send_event', async ({ case_id, event_type, message, metadata }) => {
      if (!case_id || !event_type || !message) return;

      try {
        const caseResult = await pool.query('SELECT * FROM cases WHERE id = $1', [case_id]);
        if (caseResult.rows.length === 0) return;

        const theCase = caseResult.rows[0];
        if (socket.userId !== theCase.victim_id && socket.userId !== theCase.responder_id) {
          return;
        }

        const result = await pool.query(
          `INSERT INTO case_events (case_id, user_id, user_role, event_type, message, metadata)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING *`,
          [
            case_id,
            socket.userId,
            socket.userRole,
            event_type,
            message,
            metadata ? JSON.stringify(metadata) : null,
          ]
        );

        const event = result.rows[0];

        // Attach user name
        const user = await pool.query('SELECT name FROM users WHERE id = $1', [socket.userId]);
        event.user_name = user.rows[0]?.name;

        // Broadcast to case room
        io.to(`case:${case_id}`).emit('case:event_created', event);

        // Keep core rescue context in sync for key event types
        if (event_type === 'movement' && metadata?.landmark) {
          await pool.query(
            'UPDATE cases SET landmark = $1, location_updated_at = NOW() WHERE id = $2',
            [metadata.landmark, case_id]
          );
        }

        if (event_type === 'quick_update' && metadata?.reporter_availability) {
          await pool.query(
            'UPDATE cases SET reporter_availability = $1 WHERE id = $2',
            [metadata.reporter_availability, case_id]
          );
        }
      } catch (err) {
        console.error('Socket event error:', err);
      }
    });

    // Set responder offline on disconnect
    socket.on('disconnect', async () => {
      console.log(`Socket disconnected: user ${socket.userId}`);
      if (socket.userRole === 'responder') {
        try {
          await pool.query(
            'UPDATE users SET is_online = false WHERE id = $1',
            [socket.userId]
          );
        } catch (err) {
          console.error('Disconnect cleanup error:', err);
        }
      }
    });
  });
}

module.exports = registerSocketHandlers;
