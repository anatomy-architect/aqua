const express = require('express');
const router = express.Router();
const db = require('../db/database');

// GET /api/v1/plans
router.get('/', (req, res) => {
  try {
    const plans = db.prepare('SELECT * FROM plans WHERE status = "active" ORDER BY minDeposit ASC').all();
    return res.json({ plans });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/plans/:id
router.get('/:id', (req, res) => {
  try {
    const plan = db.prepare('SELECT * FROM plans WHERE id = ?').get(req.params.id);
    if (!plan) return res.status(404).json({ error: 'Turbine plan not found.' });
    return res.json({ plan });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
