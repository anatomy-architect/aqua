const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const ledgerService = require('../services/ledgerService');

// GET /api/v1/ledger
router.get('/', authenticate, (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const transactions = ledgerService.getUserLedger(req.user.id, limit);
    return res.json({ transactions });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
