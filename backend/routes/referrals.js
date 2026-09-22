const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticate } = require('../middleware/auth');

// GET /api/v1/referrals/stats
router.get('/stats', authenticate, (req, res) => {
  try {
    const user = db.prepare('SELECT id, referralCode, totalReferralEarned FROM users WHERE id = ?').get(req.user.id);

    // 1. Level 1: Direct Referrals
    const l1Users = db.prepare(`
      SELECT id, username, email, totalDeposited, createdAt 
      FROM users 
      WHERE referredBy = ?
    `).all(req.user.id);

    const l1Ids = l1Users.map(u => u.id);

    // 2. Level 2: Referrals of L1
    let l2Users = [];
    if (l1Ids.length > 0) {
      const placeholders = l1Ids.map(() => '?').join(',');
      l2Users = db.prepare(`
        SELECT id, username, email, totalDeposited, referredBy, createdAt 
        FROM users 
        WHERE referredBy IN (${placeholders})
      `).all(...l1Ids);
    }
    const l2Ids = l2Users.map(u => u.id);

    // 3. Level 3: Referrals of L2
    let l3Users = [];
    if (l2Ids.length > 0) {
      const placeholders = l2Ids.map(() => '?').join(',');
      l3Users = db.prepare(`
        SELECT id, username, email, totalDeposited, referredBy, createdAt 
        FROM users 
        WHERE referredBy IN (${placeholders})
      `).all(...l2Ids);
    }
    const l3Ids = l3Users.map(u => u.id);

    // Active investment volume per level
    const calculateLevelVolume = (ids) => {
      if (ids.length === 0) return 0;
      const placeholders = ids.map(() => '?').join(',');
      const res = db.prepare(`
        SELECT COALESCE(SUM(investedAmount), 0) as vol 
        FROM investments 
        WHERE userId IN (${placeholders}) AND status = 'active'
      `).get(...ids);
      return res.vol;
    };

    const l1Volume = calculateLevelVolume(l1Ids);
    const l2Volume = calculateLevelVolume(l2Ids);
    const l3Volume = calculateLevelVolume(l3Ids);

    // Total commissions earned per level
    const getLevelEarned = (lvl) => {
      const row = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total 
        FROM referral_commissions 
        WHERE referrerId = ? AND level = ?
      `).get(req.user.id, lvl);
      return row.total;
    };

    return res.json({
      referralCode: user.referralCode,
      totalReferralEarned: user.totalReferralEarned,
      totalTeamMembers: l1Users.length + l2Users.length + l3Users.length,
      levels: {
        l1: {
          level: 1,
          name: 'Direct Team',
          commissionRate: '3.0% daily for 3 days',
          count: l1Users.length,
          activeVolume: l1Volume,
          earned: getLevelEarned(1),
          members: l1Users
        },
        l2: {
          level: 2,
          name: 'Secondary Network',
          commissionRate: '2.0% daily for 3 days',
          count: l2Users.length,
          activeVolume: l2Volume,
          earned: getLevelEarned(2),
          members: l2Users
        },
        l3: {
          level: 3,
          name: 'Deep Oceanic Network',
          commissionRate: '0.8% daily for 5 days',
          count: l3Users.length,
          activeVolume: l3Volume,
          earned: getLevelEarned(3),
          members: l3Users
        }
      }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/referrals/commissions
router.get('/commissions', authenticate, (req, res) => {
  try {
    const commissions = db.prepare(`
      SELECT 
        rc.*, 
        u.username as referredUsername,
        i.planNameSnapshot
      FROM referral_commissions rc
      JOIN users u ON rc.referredUserId = u.id
      JOIN investments i ON rc.investmentId = i.id
      WHERE rc.referrerId = ?
      ORDER BY rc.id DESC
      LIMIT 100
    `).all(req.user.id);

    return res.json({ commissions });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
