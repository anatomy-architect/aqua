const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticate, requireAdmin, recordAudit } = require('../middleware/auth');
const ledgerService = require('../services/ledgerService');
const earningsEngine = require('../services/earningsEngine');

// Apply authentication and admin role check to all admin routes
router.use(authenticate);
router.use(requireAdmin);

// GET /api/v1/admin/dashboard
router.get('/dashboard', (req, res) => {
  try {
    const totalUsers = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'user'").get().count;
    const pendingDeposits = db.prepare("SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as amount FROM deposits WHERE status = 'PENDING'").get();
    const pendingWithdrawals = db.prepare("SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as amount FROM withdrawals WHERE status IN ('SUBMITTED', 'PENDING_REVIEW', 'PROCESSING')").get();
    const activeInvestments = db.prepare("SELECT COUNT(*) as count, COALESCE(SUM(investedAmount), 0) as amount FROM investments WHERE status = 'active'").get();
    
    const totalDeposited = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM deposits WHERE status = 'APPROVED'").get().total;
    const totalWithdrawn = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM withdrawals WHERE status = 'COMPLETED'").get().total;
    const totalEarningsPaid = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM earnings_records").get().total;
    const totalReferralPaid = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM referral_commissions").get().total;

    const recentAudits = db.prepare("SELECT * FROM audit_logs ORDER BY id DESC LIMIT 10").all();
    const recentDeposits = db.prepare(`
      SELECT d.*, u.username, u.email, p.name as planName 
      FROM deposits d
      JOIN users u ON d.userId = u.id
      LEFT JOIN plans p ON d.planId = p.id
      ORDER BY d.id DESC LIMIT 5
    `).all();

    const recentWithdrawals = db.prepare(`
      SELECT w.*, u.username, u.email 
      FROM withdrawals w
      JOIN users u ON w.userId = u.id
      ORDER BY w.id DESC LIMIT 5
    `).all();

    return res.json({
      metrics: {
        totalUsers,
        pendingDepositsCount: pendingDeposits.count,
        pendingDepositsAmount: pendingDeposits.amount,
        pendingWithdrawalsCount: pendingWithdrawals.count,
        pendingWithdrawalsAmount: pendingWithdrawals.amount,
        activeInvestmentsCount: activeInvestments.count,
        activeInvestmentsAmount: activeInvestments.amount,
        totalDeposited,
        totalWithdrawn,
        totalEarningsPaid: Math.round(totalEarningsPaid * 100) / 100,
        totalReferralPaid: Math.round(totalReferralPaid * 100) / 100
      },
      recentAudits,
      recentDeposits,
      recentWithdrawals
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/admin/deposits
router.get('/deposits', (req, res) => {
  try {
    const status = req.query.status;
    let query = `
      SELECT d.*, u.username, u.email, p.name as planName 
      FROM deposits d
      JOIN users u ON d.userId = u.id
      LEFT JOIN plans p ON d.planId = p.id
    `;
    const params = [];
    if (status && status !== 'ALL') {
      query += ` WHERE d.status = ?`;
      params.push(status);
    }
    query += ` ORDER BY d.id DESC`;

    const deposits = db.prepare(query).all(...params);
    return res.json({ deposits });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/admin/deposits/:id/approve
router.post('/deposits/:id/approve', (req, res) => {
  try {
    const depositId = req.params.id;
    const { adminNote } = req.body;

    const deposit = db.prepare('SELECT * FROM deposits WHERE id = ?').get(depositId);
    if (!deposit) return res.status(404).json({ error: 'Deposit record not found.' });

    if (deposit.status !== 'PENDING') {
      return res.status(400).json({ error: `Cannot approve deposit with status: ${deposit.status}` });
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(deposit.userId);
    if (!user) return res.status(404).json({ error: 'Deposit user not found.' });

    const approveTx = db.transaction(() => {
      // Mark deposit approved
      db.prepare(`
        UPDATE deposits 
        SET status = 'APPROVED', reviewedAt = CURRENT_TIMESTAMP, adminId = ?, adminNote = ?
        WHERE id = ?
      `).run(req.user.id, adminNote || 'Approved by Admin', depositId);

      // Update totalDeposited for user
      const newTotalDeposited = Math.round((user.totalDeposited + deposit.amount) * 100) / 100;
      db.prepare('UPDATE users SET totalDeposited = ? WHERE id = ?').run(newTotalDeposited, user.id);

      // If deposit was targeted for a specific plan, directly activate the investment snapshot
      if (deposit.planId) {
        const plan = db.prepare('SELECT * FROM plans WHERE id = ?').get(deposit.planId);
        if (plan) {
          const dailyEarnings = Math.round((deposit.amount * (plan.dailyRoi / 100)) * 100) / 100;
          const endDateSql = `datetime('now', '+${plan.durationDays} days')`;

          db.prepare(`
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
            user.id,
            plan.id,
            plan.name,
            deposit.amount,
            plan.dailyRoi,
            plan.durationDays,
            plan.withdrawalFee,
            dailyEarnings
          );

          ledgerService.recordTransaction(
            user.id,
            'deposit_credit',
            deposit.amount,
            'credit',
            'deposit',
            depositId,
            `Approved Deposit ($${deposit.amount}) & Activated ${plan.name}`
          );

          return;
        }
      }

      // Otherwise credit to available balance
      ledgerService.recordTransaction(
        user.id,
        'deposit_credit',
        deposit.amount,
        'credit',
        'deposit',
        depositId,
        `Approved BEP20 USDT Deposit ($${deposit.amount})`
      );
    });

    approveTx();

    recordAudit(req.user.id, req.user.email, 'DEPOSIT_APPROVAL', 'DEPOSIT', depositId, `Approved $${deposit.amount} USDT deposit for ${user.username}`, req);

    return res.json({ message: 'Deposit successfully approved and processed.' });
  } catch (err) {
    console.error('Approve deposit error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/admin/deposits/:id/reject
router.post('/deposits/:id/reject', (req, res) => {
  try {
    const depositId = req.params.id;
    const { reason } = req.body;

    const deposit = db.prepare('SELECT * FROM deposits WHERE id = ?').get(depositId);
    if (!deposit) return res.status(404).json({ error: 'Deposit record not found.' });

    if (deposit.status !== 'PENDING') {
      return res.status(400).json({ error: `Cannot reject deposit with status: ${deposit.status}` });
    }

    db.prepare(`
      UPDATE deposits 
      SET status = 'REJECTED', reviewedAt = CURRENT_TIMESTAMP, adminId = ?, adminNote = ?
      WHERE id = ?
    `).run(req.user.id, reason || 'Transaction could not be verified on blockchain', depositId);

    recordAudit(req.user.id, req.user.email, 'DEPOSIT_REJECTION', 'DEPOSIT', depositId, `Rejected deposit: ${reason || 'Unverified TX'}`, req);

    return res.json({ message: 'Deposit marked as rejected.' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/admin/withdrawals
router.get('/withdrawals', (req, res) => {
  try {
    const status = req.query.status;
    let query = `
      SELECT w.*, u.username, u.email 
      FROM withdrawals w
      JOIN users u ON w.userId = u.id
    `;
    const params = [];
    if (status && status !== 'ALL') {
      query += ` WHERE w.status = ?`;
      params.push(status);
    }
    query += ` ORDER BY w.id DESC`;

    const withdrawals = db.prepare(query).all(...params);
    return res.json({ withdrawals });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/admin/withdrawals/:id/process (Complete payout)
router.post('/withdrawals/:id/process', (req, res) => {
  try {
    const withdrawalId = req.params.id;
    const { txHash, adminNote } = req.body;

    if (!txHash || txHash.trim().length < 10) {
      return res.status(400).json({ error: 'Valid external BEP20 payout Transaction Hash is required.' });
    }

    const withdrawal = db.prepare('SELECT * FROM withdrawals WHERE id = ?').get(withdrawalId);
    if (!withdrawal) return res.status(404).json({ error: 'Withdrawal not found.' });

    if (withdrawal.status === 'COMPLETED' || withdrawal.status === 'REJECTED') {
      return res.status(400).json({ error: `Withdrawal already resolved with status: ${withdrawal.status}` });
    }

    const processTx = db.transaction(() => {
      // 1. Mark completed
      db.prepare(`
        UPDATE withdrawals 
        SET status = 'COMPLETED', processedAt = CURRENT_TIMESTAMP, txHash = ?, adminId = ?, adminNote = ?
        WHERE id = ?
      `).run(txHash.trim(), req.user.id, adminNote || 'Payout executed externally and verified on-chain', withdrawalId);

      // 2. Settle locked balance & record fee in ledger
      ledgerService.completeWithdrawal(withdrawal.userId, withdrawalId, withdrawal.amount, withdrawal.feeAmount);
    });

    processTx();

    recordAudit(req.user.id, req.user.email, 'WITHDRAWAL_COMPLETED', 'WITHDRAWAL', withdrawalId, `Processed payout of $${withdrawal.netAmount} (Gross: $${withdrawal.amount}) with TX: ${txHash.trim()}`, req);

    return res.json({ message: 'Withdrawal marked COMPLETED and funds ledger settled.' });
  } catch (err) {
    console.error('Process withdrawal error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/admin/withdrawals/:id/reject (Release hold)
router.post('/withdrawals/:id/reject', (req, res) => {
  try {
    const withdrawalId = req.params.id;
    const { reason } = req.body;

    const withdrawal = db.prepare('SELECT * FROM withdrawals WHERE id = ?').get(withdrawalId);
    if (!withdrawal) return res.status(404).json({ error: 'Withdrawal not found.' });

    if (withdrawal.status === 'COMPLETED' || withdrawal.status === 'REJECTED') {
      return res.status(400).json({ error: `Cannot reject withdrawal with status: ${withdrawal.status}` });
    }

    const rejectTx = db.transaction(() => {
      // 1. Release held balance back to user
      ledgerService.releaseWithdrawalHold(withdrawal.userId, withdrawalId, withdrawal.amount, reason || 'Withdrawal rejected by admin');

      // 2. Mark rejected
      db.prepare(`
        UPDATE withdrawals 
        SET status = 'REJECTED', processedAt = CURRENT_TIMESTAMP, adminId = ?, adminNote = ?
        WHERE id = ?
      `).run(req.user.id, reason || 'Withdrawal rejected', withdrawalId);
    });

    rejectTx();

    recordAudit(req.user.id, req.user.email, 'WITHDRAWAL_REJECTED', 'WITHDRAWAL', withdrawalId, `Rejected withdrawal of $${withdrawal.amount}. Held funds released back to user. Reason: ${reason || 'Admin reject'}`, req);

    return res.json({ message: 'Withdrawal rejected and held funds restored to user balance.' });
  } catch (err) {
    console.error('Reject withdrawal error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/admin/users
router.get('/users', (req, res) => {
  try {
    const search = req.query.search;
    let query = `
      SELECT id, username, email, role, referralCode, referredBy, balance, lockedBalance, totalDeposited, totalWithdrawn, totalEarned, totalReferralEarned, bep20Address, status, createdAt
      FROM users
    `;
    const params = [];
    if (search && search.trim() !== '') {
      query += ` WHERE username LIKE ? OR email LIKE ? OR referralCode LIKE ?`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }
    query += ` ORDER BY id DESC`;

    const users = db.prepare(query).all(...params);
    return res.json({ users });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/admin/users/:id
router.get('/users/:id', (req, res) => {
  try {
    const user = db.prepare(`
      SELECT id, username, email, role, referralCode, referredBy, balance, lockedBalance, totalDeposited, totalWithdrawn, totalEarned, totalReferralEarned, bep20Address, status, createdAt
      FROM users WHERE id = ?
    `).get(req.params.id);

    if (!user) return res.status(404).json({ error: 'User not found.' });

    const investments = db.prepare('SELECT * FROM investments WHERE userId = ? ORDER BY id DESC').all(user.id);
    const deposits = db.prepare('SELECT * FROM deposits WHERE userId = ? ORDER BY id DESC').all(user.id);
    const withdrawals = db.prepare('SELECT * FROM withdrawals WHERE userId = ? ORDER BY id DESC').all(user.id);
    const ledger = db.prepare('SELECT * FROM balance_transactions WHERE userId = ? ORDER BY id DESC LIMIT 50').all(user.id);

    return res.json({
      user,
      investments,
      deposits,
      withdrawals,
      ledger
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/admin/users/:id/adjust-balance
router.post('/users/:id/adjust-balance', (req, res) => {
  try {
    const userId = req.params.id;
    const { amount, direction, reason } = req.body;
    const numAmount = Number(amount);

    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'Valid adjustment amount is required.' });
    }

    if (!direction || !['credit', 'debit'].includes(direction)) {
      return res.status(400).json({ error: 'Direction must be "credit" or "debit".' });
    }

    if (!reason || reason.trim() === '') {
      return res.status(400).json({ error: 'Mandatory reason for manual adjustment is required for audit integrity.' });
    }

    const result = ledgerService.recordTransaction(
      userId,
      'manual_adjustment',
      numAmount,
      direction,
      'admin',
      req.user.id,
      `Manual Admin Adjustment (${direction}): ${reason.trim()}`
    );

    recordAudit(req.user.id, req.user.email, 'MANUAL_BALANCE_ADJUSTMENT', 'USER', userId, `Adjusted balance by ${direction} $${numAmount}. Reason: ${reason.trim()}`, req);

    return res.json({
      message: `Balance successfully adjusted (${direction} $${numAmount}).`,
      result
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/admin/users/:id/status
router.post('/users/:id/status', (req, res) => {
  try {
    const userId = req.params.id;
    const { status, reason } = req.body;

    if (!['active', 'suspended'].includes(status)) {
      return res.status(400).json({ error: 'Status must be "active" or "suspended".' });
    }

    db.prepare('UPDATE users SET status = ? WHERE id = ?').run(status, userId);

    recordAudit(req.user.id, req.user.email, 'USER_STATUS_CHANGE', 'USER', userId, `Changed status to ${status}. Reason: ${reason || 'Admin action'}`, req);

    return res.json({ message: `User status updated to ${status}.` });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/admin/plans
router.get('/plans', (req, res) => {
  try {
    const plans = db.prepare('SELECT * FROM plans ORDER BY minDeposit ASC').all();
    return res.json({ plans });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT /api/v1/admin/plans/:id (Preserves active investment snapshots per PRD Phase 7)
router.put('/plans/:id', (req, res) => {
  try {
    const planId = req.params.id;
    const { name, minDeposit, maxDeposit, dailyRoi, durationDays, withdrawalFee, speedRpm, description, status } = req.body;

    const existing = db.prepare('SELECT * FROM plans WHERE id = ?').get(planId);
    if (!existing) return res.status(404).json({ error: 'Plan not found.' });

    db.prepare(`
      UPDATE plans 
      SET name = ?, minDeposit = ?, maxDeposit = ?, dailyRoi = ?, durationDays = ?, withdrawalFee = ?, speedRpm = ?, description = ?, status = ?, updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      name || existing.name,
      minDeposit !== undefined ? Number(minDeposit) : existing.minDeposit,
      maxDeposit !== undefined ? Number(maxDeposit) : existing.maxDeposit,
      dailyRoi !== undefined ? Number(dailyRoi) : existing.dailyRoi,
      durationDays !== undefined ? Number(durationDays) : existing.durationDays,
      withdrawalFee !== undefined ? Number(withdrawalFee) : existing.withdrawalFee,
      speedRpm !== undefined ? Number(speedRpm) : existing.speedRpm,
      description !== undefined ? description : existing.description,
      status || existing.status,
      planId
    );

    recordAudit(req.user.id, req.user.email, 'PLAN_PARAMETER_UPDATE', 'PLAN', planId, `Updated plan ${existing.name} parameters. Active snapshots remain immutable.`, req);

    const updatedPlan = db.prepare('SELECT * FROM plans WHERE id = ?').get(planId);
    return res.json({ message: 'Plan parameters updated successfully.', plan: updatedPlan });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/admin/referrals
router.get('/referrals', (req, res) => {
  try {
    const referralList = db.prepare(`
      SELECT 
        rc.id,
        rc.investmentId,
        rc.level,
        rc.ratePercent,
        rc.earningDay,
        rc.maxDays,
        rc.amount,
        rc.creditedAt,
        u1.username as referredUser,
        u2.username as referrer,
        i.planNameSnapshot,
        i.investedAmount
      FROM referral_commissions rc
      JOIN users u1 ON rc.referredUserId = u1.id
      JOIN users u2 ON rc.referrerId = u2.id
      JOIN investments i ON rc.investmentId = i.id
      ORDER BY rc.id DESC
      LIMIT 100
    `).all();

    return res.json({ referrals: referralList });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/admin/audit-logs
router.get('/audit-logs', (req, res) => {
  try {
    const logs = db.prepare('SELECT * FROM audit_logs ORDER BY id DESC LIMIT 200').all();
    return res.json({ logs });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/admin/engine/run-daily (On-demand trigger for daily calculation simulation)
router.post('/engine/run-daily', (req, res) => {
  try {
    const result = earningsEngine.processDailyEarnings();
    recordAudit(req.user.id, req.user.email, 'DAILY_ENGINE_EXECUTION', 'SYSTEM', 'CRON', `Triggered daily earnings & referral engine. Processed $${result.totalInvestmentEarnings} ROI + $${result.totalReferralCommissions} referral commissions across ${result.investmentsCount} turbines.`, req);

    return res.json({
      message: 'Daily earnings and 3-level referral engine executed successfully.',
      result
    });
  } catch (err) {
    console.error('Engine trigger error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/admin/wallet
router.get('/wallet', (req, res) => {
  try {
    const row = db.prepare('SELECT value, updatedAt FROM settings WHERE key = ?').get('bep20_deposit_address');
    const address = row ? row.value : '0x71C28B78112dEFAc39b7F49F13B6AcbB67C92461';
    return res.json({
      network: 'BEP20',
      token: 'USDT',
      depositAddress: address,
      updatedAt: row ? row.updatedAt : null
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/admin/wallet
router.post('/wallet', (req, res) => {
  try {
    const { depositAddress, reason } = req.body;
    if (!depositAddress || !/^0x[a-fA-F0-9]{40}$/.test(depositAddress.trim())) {
      return res.status(400).json({ error: 'Invalid BEP20 wallet address. Must be a valid 42-character hex address starting with 0x.' });
    }

    const cleanAddress = depositAddress.trim();
    const oldRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('bep20_deposit_address');
    const oldAddress = oldRow ? oldRow.value : '0x71C28B78112dEFAc39b7F49F13B6AcbB67C92461';

    db.prepare(`
      INSERT INTO settings (key, value, updatedAt) VALUES ('bep20_deposit_address', ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = CURRENT_TIMESTAMP
    `).run(cleanAddress);

    recordAudit(
      req.user.id,
      req.user.email,
      'WALLET_CONFIG_UPDATE',
      'SETTINGS',
      'bep20_deposit_address',
      `Updated BEP20 USDT deposit receiving address from ${oldAddress} to ${cleanAddress}. Reason: ${reason || 'Admin wallet update'}`,
      req
    );

    return res.json({
      message: 'System BEP20 receiving deposit wallet address updated successfully.',
      depositAddress: cleanAddress,
      network: 'BEP20',
      token: 'USDT'
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
