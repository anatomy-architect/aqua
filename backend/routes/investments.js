const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticate } = require('../middleware/auth');
const ledgerService = require('../services/ledgerService');

// GET /api/v1/investments
router.get('/', authenticate, (req, res) => {
  try {
    const investments = db.prepare(`
      SELECT 
        i.*,
        p.tier,
        p.speedRpm,
        (i.durationDaysSnapshot - i.daysPassed) as daysRemaining,
        (i.investedAmount * (i.dailyRateSnapshot / 100) * i.durationDaysSnapshot) as expectedTotalReturn
      FROM investments i
      LEFT JOIN plans p ON i.planId = p.id
      WHERE i.userId = ?
      ORDER BY i.status ASC, i.id DESC
    `).all(req.user.id);

    return res.json({ investments });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/investments/create
router.post('/create', authenticate, (req, res) => {
  try {
    const { planId, amount } = req.body;
    const numAmount = Number(amount);

    if (!planId || isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'Valid plan ID and investment amount are required.' });
    }

    const plan = db.prepare('SELECT * FROM plans WHERE id = ? AND status = "active"').get(planId);
    if (!plan) {
      return res.status(404).json({ error: 'Selected Turbine Plan is not found or inactive.' });
    }

    if (numAmount < plan.minDeposit || numAmount > plan.maxDeposit) {
      return res.status(400).json({
        error: `Investment amount ($${numAmount}) must be between $${plan.minDeposit} and $${plan.maxDeposit} for ${plan.name}.`
      });
    }

    const user = db.prepare('SELECT balance FROM users WHERE id = ?').get(req.user.id);
    if (user.balance < numAmount) {
      return res.status(400).json({
        error: `Insufficient balance. Available: $${user.balance.toFixed(2)}, Required: $${numAmount.toFixed(2)}.`
      });
    }

    const dailyEarnings = Math.round((numAmount * (plan.dailyRoi / 100)) * 100) / 100;

    // Transaction execution
    const createTx = db.transaction(() => {
      // 1. Debit user balance & record ledger entry
      ledgerService.recordTransaction(
        req.user.id,
        'investment_activation',
        numAmount,
        'debit',
        'plan',
        plan.id,
        `Turbine Activation: ${plan.name} ($${numAmount})`
      );

      // 2. Create investment with snapshot immutability
      const endDateSql = `datetime('now', '+${plan.durationDays} days')`;
      const invRes = db.prepare(`
        INSERT INTO investments (
          userId, planId, planNameSnapshot, investedAmount, dailyRateSnapshot,
          durationDaysSnapshot, withdrawalFeeSnapshot, dailyEarnings, totalEarned,
          daysPassed, startDate, endDate, status
        ) VALUES (
          ?, ?, ?, ?, ?,
          ?, ?, ?, 0.00,
          0, datetime('now'), ${endDateSql}, 'active'
        )
      `).run(
        req.user.id,
        plan.id,
        plan.name,
        numAmount,
        plan.dailyRoi,
        plan.durationDays,
        plan.withdrawalFee,
        dailyEarnings
      );

      return invRes.lastInsertRowid;
    });

    const newInvId = createTx();
    const createdInvestment = db.prepare('SELECT * FROM investments WHERE id = ?').get(newInvId);

    return res.status(201).json({
      message: `Successfully activated ${plan.name} Turbine!`,
      investment: createdInvestment
    });
  } catch (err) {
    console.error('Create investment error:', err);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
