const express = require('express');
const pool = require('../config/db');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(auth);

// POST /api/cases/:id/events — Create a timeline event / quick update
router.post('/:id/events', async (req, res) => {
  try {
    const caseId = req.params.id;
    const { event_type, message, metadata } = req.body;

    if (!event_type || !message) {
      return res.status(400).json({ error: 'event_type and message are required' });
    }

    // Verify user is part of this case
    const caseResult = await pool.query('SELECT * FROM cases WHERE id = $1', [caseId]);
    if (caseResult.rows.length === 0) {
      return res.status(404).json({ error: 'Case not found' });
    }

    const theCase = caseResult.rows[0];
    if (req.user.userId !== theCase.victim_id && req.user.userId !== theCase.responder_id) {
      return res.status(403).json({ error: 'Not your case' });
    }

    const result = await pool.query(
      `INSERT INTO case_events (case_id, user_id, user_role, event_type, message, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [caseId, req.user.userId, req.user.role, event_type, message, metadata ? JSON.stringify(metadata) : null]
    );

    const event = result.rows[0];

    // Get user name for broadcast
    const user = await pool.query('SELECT name FROM users WHERE id = $1', [req.user.userId]);
    event.user_name = user.rows[0]?.name;

    // Broadcast to case room
    const io = req.app.get('io');
    io.to(`case:${caseId}`).emit('case:event_created', event);

    // If movement update, also update case landmark
    if (event_type === 'movement' && metadata?.landmark) {
      await pool.query(
        "UPDATE cases SET landmark = $1, location_updated_at = NOW() WHERE id = $2",
        [metadata.landmark, caseId]
      );
    }

    // If reporter_availability update
    if (event_type === 'quick_update' && metadata?.reporter_availability) {
      await pool.query(
        "UPDATE cases SET reporter_availability = $1 WHERE id = $2",
        [metadata.reporter_availability, caseId]
      );
    }

    res.status(201).json({ event });
  } catch (err) {
    console.error('Create event error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/cases/:id/events — Get case timeline
router.get('/:id/events', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ce.*, u.name as user_name
       FROM case_events ce
       JOIN users u ON ce.user_id = u.id
       WHERE ce.case_id = $1
       ORDER BY ce.created_at ASC`,
      [req.params.id]
    );

    res.json({ events: result.rows });
  } catch (err) {
    console.error('Get events error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
