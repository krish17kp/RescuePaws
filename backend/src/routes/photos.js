const express = require('express');
const pool = require('../config/db');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(auth);

// POST /api/cases/:id/photos — Store photo URL (Cloudinary upload handled by frontend)
router.post('/:id/photos', async (req, res) => {
  try {
    const caseId = req.params.id;
    const { photo_type, file_url } = req.body;

    if (!photo_type || !file_url) {
      return res.status(400).json({ error: 'photo_type and file_url are required' });
    }

    if (!['animal', 'scene', 'landmark'].includes(photo_type)) {
      return res.status(400).json({ error: 'photo_type must be animal, scene, or landmark' });
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
      `INSERT INTO case_photos (case_id, photo_type, file_url)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [caseId, photo_type, file_url]
    );

    // Create timeline event for photo
    await pool.query(
      `INSERT INTO case_events (case_id, user_id, user_role, event_type, message, metadata)
       VALUES ($1, $2, $3, 'photo', $4, $5)`,
      [
        caseId, req.user.userId, req.user.role,
        `${photo_type} photo uploaded`,
        JSON.stringify({ photo_id: result.rows[0].id, photo_type, file_url })
      ]
    );

    // Broadcast to case room
    const io = req.app.get('io');
    io.to(`case:${caseId}`).emit('case:event_created', {
      case_id: parseInt(caseId),
      user_id: req.user.userId,
      user_role: req.user.role,
      event_type: 'photo',
      message: `${photo_type} photo uploaded`,
      created_at: new Date().toISOString(),
    });

    res.status(201).json({ photo: result.rows[0] });
  } catch (err) {
    console.error('Create photo error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/cases/:id/photos — List photos for a case
router.get('/:id/photos', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM case_photos WHERE case_id = $1 ORDER BY created_at',
      [req.params.id]
    );

    res.json({ photos: result.rows });
  } catch (err) {
    console.error('Get photos error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
