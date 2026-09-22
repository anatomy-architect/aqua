const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticate } = require('../middleware/auth');

// GET /api/v1/deposits/system-address
router.get('/system-address', (req, res) => {
  try {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('bep20_deposit_address');
    const address = row ? row.value : '0x71C28B78112dEFAc39b7F49F13B6AcbB67C92461';
    return res.json({
      network: 'BEP20 (Binance Smart Chain)',
      token: 'USDT (Tether)',
      depositAddress: address
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/deposits
router.get('/', authenticate, (req, res) => {
  try {
    const deposits = db.prepare(`
      SELECT d.*, p.name as planName 
      FROM deposits d
      LEFT JOIN plans p ON d.planId = p.id
      WHERE d.userId = ?
      ORDER BY d.id DESC
    `).all(req.user.id);

    return res.json({ deposits });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/deposits/submit
router.post('/submit', authenticate, (req, res) => {
  try {
    const { amount, txHash, planId } = req.body;
    const numAmount = Number(amount);

    if (isNaN(numAmount) || numAmount < 10) {
      return res.status(400).json({ error: 'Minimum deposit amount is $10.00 USDT.' });
    }

    if (!txHash || txHash.trim().length < 10) {
      return res.status(400).json({ error: 'Valid BEP20 Transaction Hash (TX ID) is required.' });
    }

    const cleanTxHash = txHash.trim();

    // Check duplicate TX Hash
    const existing = db.prepare('SELECT id, status FROM deposits WHERE txHash = ?').get(cleanTxHash);
    if (existing) {
      return res.status(400).json({ error: 'This Transaction Hash has already been submitted.' });
    }

    const sysAddrRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('bep20_deposit_address');
    const receivingAddress = sysAddrRow ? sysAddrRow.value : '0x71C28B78112dEFAc39b7F49F13B6AcbB67C92461';

    const insertRes = db.prepare(`
      INSERT INTO deposits (userId, planId, amount, network, receivingAddress, txHash, status)
      VALUES (?, ?, ?, 'BEP20', ?, ?, 'PENDING')
    `).run(req.user.id, planId || null, numAmount, receivingAddress, cleanTxHash);

    const createdDeposit = db.prepare('SELECT * FROM deposits WHERE id = ?').get(insertRes.lastInsertRowid);

    return res.status(201).json({
      message: 'Deposit submitted successfully. Awaiting blockchain confirmation & admin review.',
      deposit: createdDeposit
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
