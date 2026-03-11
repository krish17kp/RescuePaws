const express = require('express');
const pool = require('../config/db');
const auth = require('../middleware/auth');
const haversine = require('../utils/haversine');

const router = express.Router();

router.use(auth);

// GET /api/users/me
router.get('/me', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, role, is_online, latitude, longitude FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/users/me/toggle-online — Responder goes online/offline
router.patch('/me/toggle-online', async (req, res) => {
  try {
    if (req.user.role !== 'responder') {
      return res.status(403).json({ error: 'Responders only' });
    }

    const { latitude, longitude } = req.body;

    const current = await pool.query('SELECT is_online FROM users WHERE id = $1', [req.user.userId]);
    const newStatus = !current.rows[0].is_online;

    if (newStatus && (latitude == null || longitude == null)) {
      return res.status(400).json({ error: 'Location required to go online' });
    }

    const result = await pool.query(
      'UPDATE users SET is_online = $1, latitude = $2, longitude = $3 WHERE id = $4 RETURNING is_online, latitude, longitude',
      [newStatus, newStatus ? latitude : null, newStatus ? longitude : null, req.user.userId]
    );

    // When going ONLINE, check for nearby pending SOS cases and notify this responder
    if (newStatus && latitude != null && longitude != null) {
      const pendingCases = await pool.query(
        "SELECT * FROM cases WHERE status = 'pending'"
      );

      const io = req.app.get('io');

      for (const c of pendingCases.rows) {
        const dist = haversine(latitude, longitude, c.victim_lat, c.victim_lng);
        if (dist <= 50) {
          io.to(`user:${req.user.userId}`).emit('new_sos', {
            caseId: c.id,
            emergency_type: c.emergency_type,
            description: c.description,
            victim_lat: c.victim_lat,
            victim_lng: c.victim_lng,
            distance: Math.round(dist * 100) / 100,
          });
        }
      }
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Toggle online error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
