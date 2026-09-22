const db = require('../db/database');
const ledgerService = require('./ledgerService');

const earningsEngine = {
  /**
   * Resolve upline tree up to 3 levels: L1 (direct), L2, L3
   */
  resolveUplines: (userId) => {
    const uplines = { l1: null, l2: null, l3: null };

    const user = db.prepare('SELECT id, referredBy FROM users WHERE id = ?').get(userId);
    if (!user || !user.referredBy) return uplines;

    // L1
    const l1 = db.prepare('SELECT id, referredBy, username, email FROM users WHERE id = ?').get(user.referredBy);
    if (l1) {
      uplines.l1 = l1;
      // L2
      if (l1.referredBy) {
        const l2 = db.prepare('SELECT id, referredBy, username, email FROM users WHERE id = ?').get(l1.referredBy);
        if (l2) {
          uplines.l2 = l2;
          // L3
          if (l2.referredBy) {
            const l3 = db.prepare('SELECT id, referredBy, username, email FROM users WHERE id = ?').get(l2.referredBy);
            if (l3) {
              uplines.l3 = l3;
            }
          }
        }
      }
    }

    return uplines;
  },

  /**
   * Process daily earnings for all active investments and distribute 3-level referral commissions.
   * Enforces strict idempotency per calendar day / target day.
   */
  processDailyEarnings: (targetDay = null, forceAdvance = false) => {
    const activeInvestments = db.prepare(`
      SELECT 
        i.*,
        date(i.lastEarningDate) as lastEarningDayStr,
        date('now') as currentDayStr
      FROM investments i
      WHERE i.status = 'active'
    `).all();

    let totalInvestmentEarningsProcessed = 0;
    let totalReferralCommissionsProcessed = 0;
    const details = [];

    const referralTierRules = [
      { level: 1, rate: 3.0, maxDays: 3, key: 'l1' },
      { level: 2, rate: 2.0, maxDays: 3, key: 'l2' },
      { level: 3, rate: 0.8, maxDays: 5, key: 'l3' }
    ];

    for (const inv of activeInvestments) {
      // If already processed today and not forced, skip to maintain strict daily idempotency
      if (targetDay === null && !forceAdvance && inv.lastEarningDayStr && inv.lastEarningDayStr === inv.currentDayStr) {
        continue;
      }

      const nextDay = targetDay !== null ? targetDay : (inv.daysPassed + 1);

      // Check if investment has completed its duration
      if (nextDay > inv.durationDaysSnapshot) {
        db.prepare("UPDATE investments SET status = 'completed' WHERE id = ?").run(inv.id);
        continue;
      }

      // Check idempotency table for this specific investment and day
      const existingEarning = db.prepare(`
        SELECT id FROM earnings_records 
        WHERE investmentId = ? AND earningDay = ?
      `).get(inv.id, nextDay);

      let earningAmount = 0;
      if (!existingEarning) {
        earningAmount = Math.round((inv.investedAmount * (inv.dailyRateSnapshot / 100)) * 100) / 100;

        // Record earning in earnings_records
        db.prepare(`
          INSERT INTO earnings_records (investmentId, userId, earningDay, amount)
          VALUES (?, ?, ?, ?)
        `).run(inv.id, inv.userId, nextDay, earningAmount);

        // Credit user balance and record ledger transaction
        ledgerService.recordTransaction(
          inv.userId,
          'investment_profit',
          earningAmount,
          'credit',
          'investment',
          inv.id,
          `Daily ROI (Day ${nextDay}/${inv.durationDaysSnapshot}) - ${inv.planNameSnapshot}`,
          nextDay
        );

        // Update investment state
        const newTotalEarned = Math.round((inv.totalEarned + earningAmount) * 100) / 100;
        const newStatus = nextDay >= inv.durationDaysSnapshot ? 'completed' : 'active';

        db.prepare(`
          UPDATE investments 
          SET daysPassed = ?, totalEarned = ?, lastEarningDate = datetime('now'), status = ?
          WHERE id = ?
        `).run(nextDay, newTotalEarned, newStatus, inv.id);

        // Update user totalEarned
        const user = db.prepare('SELECT totalEarned FROM users WHERE id = ?').get(inv.userId);
        db.prepare('UPDATE users SET totalEarned = ? WHERE id = ?')
          .run(Math.round(((user.totalEarned || 0) + earningAmount) * 100) / 100, inv.userId);

        totalInvestmentEarningsProcessed += earningAmount;
      }

      // Process 3-Tier Referral Commissions for this day
      const uplines = earningsEngine.resolveUplines(inv.userId);

      for (const rule of referralTierRules) {
        const uplineUser = uplines[rule.key];
        if (!uplineUser) continue;

        // Rule: Only pays up to maxDays (L1: 3 days, L2: 3 days, L3: 5 days)
        if (nextDay > rule.maxDays) continue;

        // Check idempotency for this referrer + level + day
        const existingRefCommission = db.prepare(`
          SELECT id FROM referral_commissions 
          WHERE investmentId = ? AND referrerId = ? AND level = ? AND earningDay = ?
        `).get(inv.id, uplineUser.id, rule.level, nextDay);

        if (!existingRefCommission) {
          const commissionAmount = Math.round((inv.investedAmount * (rule.rate / 100)) * 100) / 100;

          // Record referral commission
          db.prepare(`
            INSERT INTO referral_commissions (investmentId, referredUserId, referrerId, level, ratePercent, maxDays, earningDay, amount)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).run(inv.id, inv.userId, uplineUser.id, rule.level, rule.rate, rule.maxDays, nextDay, commissionAmount);

          // Credit referrer balance and record in ledger
          ledgerService.recordTransaction(
            uplineUser.id,
            'referral_commission',
            commissionAmount,
            'credit',
            'referral',
            inv.id,
            `Level ${rule.level} Referral Commission (Day ${nextDay}/${rule.maxDays}) from user #${inv.userId} investment`,
            nextDay
          );

          // Update referrer totalReferralEarned
          const referrer = db.prepare('SELECT totalReferralEarned FROM users WHERE id = ?').get(uplineUser.id);
          db.prepare('UPDATE users SET totalReferralEarned = ? WHERE id = ?')
            .run(Math.round(((referrer.totalReferralEarned || 0) + commissionAmount) * 100) / 100, uplineUser.id);

          totalReferralCommissionsProcessed += commissionAmount;
        }
      }

      details.push({
        investmentId: inv.id,
        userId: inv.userId,
        plan: inv.planNameSnapshot,
        day: nextDay,
        earned: earningAmount
      });
    }

    return {
      success: true,
      investmentsCount: activeInvestments.length,
      totalInvestmentEarnings: Math.round(totalInvestmentEarningsProcessed * 100) / 100,
      totalReferralCommissions: Math.round(totalReferralCommissionsProcessed * 100) / 100,
      details
    };
  }
};

module.exports = earningsEngine;
