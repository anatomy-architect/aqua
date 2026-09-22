const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticate } = require('../middleware/auth');
const ledgerService = require('../services/ledgerService');

// Helper to determine fee rate based on user's active turbine plans
function getWithdrawalFeeRate(userId) {
  const activeInvestments = db.prepare(`
    SELECT withdrawalFeeSnapshot, planNameSnapshot 
    FROM investments 
    WHERE userId = ? AND status = 'active'
    ORDER BY withdrawalFeeSnapshot ASC
  `).all(userId);

  if (activeInvestments.length > 0) {
    // Return best (lowest) fee among active turbines
    return {
      rate: activeInvestments[0].withdrawalFeeSnapshot,
      planName: activeInvestments[0].planNameSnapshot
    };
  }

  // Default standard fee if no active turbine
  return {
    rate: 10.0,
    planName: 'Standard Account (No Active Turbine)'
  };
}

// GET /api/v1/withdrawals/preview
router.get('/preview', authenticate, (req, res) => {
  try {
    const amount = Number(req.query.amount) || 0;
    const feeInfo = getWithdrawalFeeRate(req.user.id);
    const feeRate = feeInfo.rate;
    const feeAmount = Math.round((amount * (feeRate / 100)) * 100) / 100;
    const netAmount = Math.max(0, Math.round((amount - feeAmount) * 100) / 100);

    return res.json({
      amount,
      feeRate,
      feeAmount,
      netAmount,
      appliedTurbine: feeInfo.planName,
      minWithdrawal: 20.0,
      processingWindow: '12–18 hours',
      network: 'BEP20 (Binance Smart Chain)'
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/withdrawals
router.get('/', authenticate, (req, res) => {
  try {
    const withdrawals = db.prepare(`
      SELECT * FROM withdrawals 
      WHERE userId = ? 
      ORDER BY id DESC
    `).all(req.user.id);

    return res.json({ withdrawals });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/withdrawals
router.post('/', authenticate, (req, res) => {
  try {
    const { amount, walletAddress } = req.body;
    const numAmount = Number(amount);

    if (isNaN(numAmount) || numAmount < 20) {
      return res.status(400).json({ error: 'Minimum withdrawal amount is $20.00 USDT.' });
    }

    const destinationAddress = walletAddress || req.user.bep20Address;
    if (!destinationAddress || !/^0x[a-fA-F0-9]{40}$/.test(destinationAddress.trim())) {
      return res.status(400).json({ error: 'Valid BEP20 destination address is required (0x... 40 hex chars).' });
    }

    // Constraint: 1 active pending withdrawal per user
    const pendingWithdrawal = db.prepare(`
      SELECT id FROM withdrawals 
      WHERE userId = ? AND status IN ('SUBMITTED', 'PENDING_REVIEW', 'PROCESSING', 'SENT')
    `).get(req.user.id);

    if (pendingWithdrawal) {
      return res.status(400).json({
        error: 'You already have an active withdrawal in processing. Please wait for it to complete.'
      });
    }

    const user = db.prepare('SELECT balance FROM users WHERE id = ?').get(req.user.id);
    if (user.balance < numAmount) {
      return res.status(400).json({
        error: `Insufficient available balance ($${user.balance.toFixed(2)}) for requested withdrawal of $${numAmount.toFixed(2)}.`
      });
    }

    const feeInfo = getWithdrawalFeeRate(req.user.id);
    const feeRate = feeInfo.rate;
    const feeAmount = Math.round((numAmount * (feeRate / 100)) * 100) / 100;
    const netAmount = Math.round((numAmount - feeAmount) * 100) / 100;

    // Database transaction for atomic hold & record
    const createTx = db.transaction(() => {
      // 1. Insert withdrawal record
      const insertRes = db.prepare(`
        INSERT INTO withdrawals (
          userId, amount, feeRate, feeAmount, netAmount, walletAddress, network, status
        ) VALUES (?, ?, ?, ?, ?, ?, 'BEP20', 'SUBMITTED')
      `).run(req.user.id, numAmount, feeRate, feeAmount, netAmount, destinationAddress.trim());

      const withdrawalId = insertRes.lastInsertRowid;

      // 2. Hold balance in ledger
      ledgerService.holdWithdrawalBalance(req.user.id, withdrawalId, numAmount);

      return withdrawalId;
    });

    const withdrawalId = createTx();
    const createdWithdrawal = db.prepare('SELECT * FROM withdrawals WHERE id = ?').get(withdrawalId);

    return res.status(201).json({
      message: 'Withdrawal request submitted successfully. Processing target: 12–18 hours.',
      withdrawal: createdWithdrawal
    });
  } catch (err) {
    console.error('Withdrawal error:', err);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
