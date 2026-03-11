const express = require('express');
const pool = require('../config/db');
const auth = require('../middleware/auth');
const haversine = require('../utils/haversine');

const router = express.Router();

router.use(auth);

const ALLOWED_TRANSITIONS = {
  pending: ['assigned', 'cancelled'],
  assigned: ['in_progress'],
  in_progress: ['resolved'],
  resolved: [],
  cancelled: [],
};

// POST /api/cases — Victim creates SOS
router.post('/', async (req, res) => {
  try {
    if (req.user.role !== 'victim') {
      return res.status(403).json({ error: 'Only victims can create SOS' });
    }

    const {
      emergency_type, description, latitude, longitude,
      locality, landmark, access_instructions, animal_condition,
      hazard_info, reporter_availability, gps_accuracy
    } = req.body;
    if (!emergency_type || latitude == null || longitude == null) {
      return res.status(400).json({ error: 'Emergency type and location are required' });
    }

    const activeCase = await pool.query(
      "SELECT id FROM cases WHERE victim_id = $1 AND status NOT IN ('resolved', 'cancelled')",
      [req.user.userId]
    );
    if (activeCase.rows.length > 0) {
      return res.status(409).json({ error: 'You already have an active case' });
    }

    const result = await pool.query(
      `INSERT INTO cases (
        victim_id, emergency_type, description, victim_lat, victim_lng,
        locality, landmark, access_instructions, animal_condition,
        hazard_info, reporter_availability, gps_accuracy
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        req.user.userId, emergency_type, description || '', latitude, longitude,
        locality || null, landmark || null, access_instructions || null,
        animal_condition || null, hazard_info || null,
        reporter_availability || 'on_site', gps_accuracy || null
      ]
    );

    // Create initial timeline event
    await pool.query(
      `INSERT INTO case_events (case_id, user_id, user_role, event_type, message)
       VALUES ($1, $2, 'victim', 'system', 'SOS created')`,
      [result.rows[0].id, req.user.userId]
    );

    const newCase = result.rows[0];

    // Find nearby online responders
    const responders = await pool.query(
      "SELECT id, latitude, longitude FROM users WHERE role = 'responder' AND is_online = true AND latitude IS NOT NULL"
    );

    const io = req.app.get('io');
    const nearbyResponders = [];

    for (const r of responders.rows) {
      const dist = haversine(latitude, longitude, r.latitude, r.longitude);
      if (dist <= 50) {
        nearbyResponders.push({ ...r, distance: dist });
      }
    }

    for (const r of nearbyResponders) {
      io.to(`user:${r.id}`).emit('new_sos', {
        caseId: newCase.id,
        emergency_type: newCase.emergency_type,
        description: newCase.description,
        victim_lat: newCase.victim_lat,
        victim_lng: newCase.victim_lng,
        distance: Math.round(r.distance * 100) / 100,
      });
    }

    res.status(201).json({ case: newCase, nearbyResponders: nearbyResponders.length });
  } catch (err) {
    console.error('Create case error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/cases/active — Admin gets all active cases
router.get('/active', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }

    const result = await pool.query(
      `SELECT c.*, 
              v.name as victim_name, v.email as victim_email,
              r.name as responder_name, r.email as responder_email
       FROM cases c
       JOIN users v ON c.victim_id = v.id
       LEFT JOIN users r ON c.responder_id = r.id
       WHERE c.status NOT IN ('resolved', 'cancelled')
       ORDER BY c.created_at DESC`
    );

    res.json({ cases: result.rows });
  } catch (err) {
    console.error('Get active cases error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/cases/my-active — Get current user's active case
router.get('/my-active', async (req, res) => {
  try {
    let result;
    if (req.user.role === 'victim') {
      result = await pool.query(
        `SELECT c.*, r.name as responder_name
         FROM cases c
         LEFT JOIN users r ON c.responder_id = r.id
         WHERE c.victim_id = $1 AND c.status NOT IN ('resolved', 'cancelled')
         ORDER BY c.created_at DESC LIMIT 1`,
        [req.user.userId]
      );
    } else if (req.user.role === 'responder') {
      result = await pool.query(
        `SELECT c.*, v.name as victim_name
         FROM cases c
         JOIN users v ON c.victim_id = v.id
         WHERE c.responder_id = $1 AND c.status NOT IN ('resolved', 'cancelled')
         ORDER BY c.created_at DESC LIMIT 1`,
        [req.user.userId]
      );
    } else {
      return res.status(403).json({ error: 'Not applicable for admin' });
    }

    res.json({ case: result.rows[0] || null });
  } catch (err) {
    console.error('Get my active case error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/cases/:id — with photos and recent events
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*, v.name as victim_name, r.name as responder_name
       FROM cases c
       JOIN users v ON c.victim_id = v.id
       LEFT JOIN users r ON c.responder_id = r.id
       WHERE c.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Case not found' });
    }

    const photos = await pool.query(
      'SELECT * FROM case_photos WHERE case_id = $1 ORDER BY created_at',
      [req.params.id]
    );

    const events = await pool.query(
      `SELECT ce.*, u.name as user_name
       FROM case_events ce
       JOIN users u ON ce.user_id = u.id
       WHERE ce.case_id = $1
       ORDER BY ce.created_at DESC LIMIT 20`,
      [req.params.id]
    );

    res.json({
      case: result.rows[0],
      photos: photos.rows,
      events: events.rows,
    });
  } catch (err) {
    console.error('Get case error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/cases/:id/accept — Responder accepts case
router.patch('/:id/accept', async (req, res) => {
  try {
    if (req.user.role !== 'responder') {
      return res.status(403).json({ error: 'Only responders can accept cases' });
    }

    const activeCase = await pool.query(
      "SELECT id FROM cases WHERE responder_id = $1 AND status NOT IN ('resolved', 'cancelled')",
      [req.user.userId]
    );
    if (activeCase.rows.length > 0) {
      return res.status(409).json({ error: 'You already have an active case' });
    }

    // Atomic update — race condition safe
    const result = await pool.query(
      `UPDATE cases
       SET responder_id = $1, status = 'assigned', updated_at = NOW()
       WHERE id = $2 AND status = 'pending'
       RETURNING *`,
      [req.user.userId, req.params.id]
    );

    if (result.rowCount === 0) {
      return res.status(409).json({ error: 'Case already taken or not pending' });
    }

    const updatedCase = result.rows[0];

    // Timeline event
    await pool.query(
      `INSERT INTO case_events (case_id, user_id, user_role, event_type, message)
       VALUES ($1, $2, 'responder', 'status_change', 'Responder assigned')`,
      [updatedCase.id, req.user.userId]
    );

    const io = req.app.get('io');
    io.to(`case:${updatedCase.id}`).emit('case:status_updated', {
      caseId: updatedCase.id,
      status: 'assigned',
      responder_id: req.user.userId,
    });

    const responder = await pool.query('SELECT name FROM users WHERE id = $1', [req.user.userId]);

    res.json({
      case: { ...updatedCase, responder_name: responder.rows[0]?.name },
    });
  } catch (err) {
    console.error('Accept case error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/cases/:id/status — Update case status
router.patch('/:id/status', async (req, res) => {
  try {
    if (req.user.role !== 'responder' && req.user.role !== 'victim') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const current = await pool.query('SELECT * FROM cases WHERE id = $1', [req.params.id]);
    if (current.rows.length === 0) {
      return res.status(404).json({ error: 'Case not found' });
    }

    const currentCase = current.rows[0];

    if (req.user.role === 'victim') {
      if (currentCase.victim_id !== req.user.userId) {
        return res.status(403).json({ error: 'Not your case' });
      }
      if (status !== 'cancelled') {
        return res.status(403).json({ error: 'Victims can only cancel cases' });
      }
    }

    if (req.user.role === 'responder') {
      if (currentCase.responder_id !== req.user.userId) {
        return res.status(403).json({ error: 'Not your case' });
      }
    }

    const allowed = ALLOWED_TRANSITIONS[currentCase.status];
    if (!allowed || !allowed.includes(status)) {
      return res.status(400).json({
        error: `Cannot transition from '${currentCase.status}' to '${status}'`,
      });
    }

    const result = await pool.query(
      'UPDATE cases SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, req.params.id]
    );

    const updatedCase = result.rows[0];

    // Timeline event
    const statusLabels = {
      in_progress: 'Responder has arrived',
      resolved: 'Case resolved',
      cancelled: 'Case cancelled',
    };
    await pool.query(
      `INSERT INTO case_events (case_id, user_id, user_role, event_type, message)
       VALUES ($1, $2, $3, 'status_change', $4)`,
      [updatedCase.id, req.user.userId, req.user.role, statusLabels[status] || `Status: ${status}`]
    );

    const io = req.app.get('io');
    io.to(`case:${updatedCase.id}`).emit('case:status_updated', {
      caseId: updatedCase.id,
      status: updatedCase.status,
    });

    res.json({ case: updatedCase });
  } catch (err) {
    console.error('Update status error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
