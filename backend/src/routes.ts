import express, { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { prisma } from './prisma';
import { config, isBep20Address } from './config';
import {
  AppError,
  authenticate,
  requireAdmin,
  hashPassword,
  verifyPassword,
  signToken,
  setSessionCookie,
  clearSessionCookie,
  normalizeEmail,
  generateReferralCode,
  publicUser,
  writeAudit,
  type AuthedRequest
} from './auth';
import {
  approveDeposit,
  dashboardStats,
  getPayoutFeeForUser,
  getReceivingAddress,
  previewPayoutAmounts,
  processDailyEarnings,
  rejectDeposit,
  requestPayout,
  submitDeposit,
  transitionPayout
} from './finance';
import { D, money, dailyEarnings, cycleProfit } from './money';
import { MIN_PAYOUT, NETWORK, PROCESSING_WINDOW, TOKEN } from './catalog';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please wait and try again.' }
});

function asyncHandler(fn: (req: express.Request, res: express.Response) => Promise<unknown>) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    fn(req, res).catch(next);
  };
}

function serialize(record: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(record)) {
    if (typeof v === 'bigint') out[k] = Number(v);
    else if (v instanceof Date) out[k] = v.toISOString();
    else out[k] = v;
  }
  return out;
}

export function buildRouter(): Router {
  const api = Router();

  api.get('/health', (_req, res) => {
    res.json({
      status: 'online',
      platform: 'AquaVault',
      version: '2.0.0',
      timestamp: new Date().toISOString()
    });
  });

  api.post(
    '/auth/register',
    authLimiter,
    asyncHandler(async (req, res) => {
      const { fullName, email, password, passwordConfirmation, referralCode, termsAccepted } = req.body || {};
      if (!fullName || String(fullName).trim().length < 2) throw new AppError(400, 'Full name is required.');
      if (!email) throw new AppError(400, 'Email is required.');
      if (!password || String(password).length < 8) throw new AppError(400, 'Password must be at least 8 characters.');
      if (password !== passwordConfirmation) throw new AppError(400, 'Password confirmation does not match.');
      if (!termsAccepted) throw new AppError(400, 'You must accept the terms to register.');
      const normalized = normalizeEmail(email);
      const exists = await prisma.user.findUnique({ where: { email: normalized } });
      if (exists) throw new AppError(400, 'An account with this email already exists.');
      let referredById: number | null = null;
      if (referralCode && String(referralCode).trim()) {
        const referrer = await prisma.user.findUnique({ where: { referralCode: String(referralCode).trim().toUpperCase() } });
        if (referrer) referredById = referrer.id;
      }
      const user = await prisma.user.create({
        data: {
          fullName: String(fullName).trim(),
          email: normalized,
          passwordHash: await hashPassword(password),
          referralCode: generateReferralCode(fullName),
          referredById,
          termsAcceptedAt: new Date()
        }
      });
      const token = signToken(user);
      setSessionCookie(res, token);
      res.status(201).json({ message: 'Account created.', token, user: publicUser(user) });
    })
  );

  api.post(
    '/auth/login',
    authLimiter,
    asyncHandler(async (req, res) => {
      const { identifier, email, password } = req.body || {};
      const id = normalizeEmail(String(identifier || email || ''));
      if (!id || !password) throw new AppError(400, 'Email and password are required.');
      const user = await prisma.user.findUnique({ where: { email: id } });
      if (!user || !(await verifyPassword(password, user.passwordHash))) {
        throw new AppError(401, 'Invalid email or password.');
      }
      if (user.status === 'suspended') throw new AppError(403, 'Your account is suspended.');
      const token = signToken(user);
      setSessionCookie(res, token);
      if (user.role === 'admin') {
        await writeAudit(user, 'ADMIN_LOGIN', 'USER', user.id, 'Admin signed in', req);
      }
      res.json({ message: 'Login successful.', token, user: publicUser(user) });
    })
  );

  api.post(
    '/auth/logout',
    authenticate,
    asyncHandler(async (req, res) => {
      const { user, tokenPayload } = req as AuthedRequest;
      await prisma.revokedToken.create({
        data: {
          jti: tokenPayload.jti,
          userId: user.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      });
      clearSessionCookie(res);
      res.json({ message: 'Signed out.' });
    })
  );

  api.get(
    '/auth/me',
    authenticate,
    asyncHandler(async (req, res) => {
      const { user } = req as AuthedRequest;
      const fresh = await prisma.user.findUnique({ where: { id: user.id } });
      const stats = await dashboardStats(user.id);
      const referrer = fresh?.referredById
        ? await prisma.user.findUnique({ where: { id: fresh.referredById }, select: { fullName: true } })
        : null;
      res.json({ user: { ...publicUser(fresh!), referrerName: referrer?.fullName || null, ...stats } });
    })
  );

  api.post(
    '/auth/update-wallet',
    authenticate,
    asyncHandler(async (req, res) => {
      const { user } = req as AuthedRequest;
      const address = String(req.body?.bep20Address || '').trim();
      if (!isBep20Address(address)) throw new AppError(400, 'Invalid BEP20 wallet address.');
      await prisma.user.update({ where: { id: user.id }, data: { bep20Address: address } });
      res.json({ message: 'Payout address updated.', bep20Address: address });
    })
  );

  api.patch(
    '/auth/profile',
    authenticate,
    asyncHandler(async (req, res) => {
      const { user } = req as AuthedRequest;
      const fullName = String(req.body?.fullName || '').trim();
      if (fullName.length < 2) throw new AppError(400, 'Full name is required.');
      const updated = await prisma.user.update({ where: { id: user.id }, data: { fullName } });
      res.json({ user: publicUser(updated) });
    })
  );

  api.get(
    '/plans',
    asyncHandler(async (_req, res) => {
      const plans = await prisma.plan.findMany({ where: { status: 'active' }, orderBy: { id: 'asc' } });
      res.json({
        plans: plans.map((p) => ({
          ...serialize(p as unknown as Record<string, unknown>),
          minDeposit: money(String(p.minDeposit)),
          maxDeposit: money(String(p.maxDeposit)),
          dailyRoi: Number(p.dailyRoi),
          payoutFee: Number(p.payoutFee),
          dailyEarningsAtMin: money(dailyEarnings(p.minDeposit, p.dailyRoi)),
          cycleProfitAtMin: money(cycleProfit(p.minDeposit, p.dailyRoi, p.durationDays)),
          grossAtMin: money(D(p.minDeposit).plus(cycleProfit(p.minDeposit, p.dailyRoi, p.durationDays)))
        }))
      });
    })
  );

  api.get(
    '/plans/:id',
    asyncHandler(async (req, res) => {
      const plan = await prisma.plan.findUnique({ where: { id: Number(req.params.id) } });
      if (!plan) throw new AppError(404, 'Turbine plan not found.');
      res.json({ plan });
    })
  );

  api.get(
    '/investments',
    authenticate,
    asyncHandler(async (req, res) => {
      const { user } = req as AuthedRequest;
      const investments = await prisma.investment.findMany({
        where: { userId: user.id },
        include: { plan: true },
        orderBy: { id: 'desc' }
      });
      res.json({
        investments: investments.map((i) => ({
          ...serialize(i as unknown as Record<string, unknown>),
          daysRemaining: Math.max(0, i.durationDaysSnapshot - i.daysPassed),
          expectedCycleProfit: money(
            dailyEarnings(i.investedAmount, i.dailyRateSnapshot).mul(i.durationDaysSnapshot)
          )
        }))
      });
    })
  );

  api.get(
    '/earnings',
    authenticate,
    asyncHandler(async (req, res) => {
      const { user } = req as AuthedRequest;
      const earnings = await prisma.earningRecord.findMany({
        where: { userId: user.id },
        include: { investment: true },
        orderBy: { id: 'desc' },
        take: 200
      });
      res.json({ earnings });
    })
  );

  api.get(
    '/deposits/system-address',
    asyncHandler(async (_req, res) => {
      res.json({
        network: 'BNB Smart Chain (BEP20)',
        token: TOKEN,
        depositAddress: await getReceivingAddress()
      });
    })
  );

  api.get(
    '/deposits',
    authenticate,
    asyncHandler(async (req, res) => {
      const { user } = req as AuthedRequest;
      const deposits = await prisma.deposit.findMany({
        where: { userId: user.id },
        include: { plan: true },
        orderBy: { id: 'desc' }
      });
      res.json({ deposits });
    })
  );

  api.get(
    '/deposits/:id',
    authenticate,
    asyncHandler(async (req, res) => {
      const { user } = req as AuthedRequest;
      const deposit = await prisma.deposit.findFirst({
        where: { id: Number(req.params.id), userId: user.id },
        include: { plan: true }
      });
      if (!deposit) throw new AppError(404, 'Deposit not found.');
      res.json({ deposit });
    })
  );

  api.post(
    '/deposits',
    authenticate,
    asyncHandler(async (req, res) => {
      const { user } = req as AuthedRequest;
      const deposit = await submitDeposit(user.id, req.body?.amount, req.body?.txHash, req.body?.planId);
      res.status(201).json({
        message: 'Deposit submitted. Status is pending admin review.',
        deposit
      });
    })
  );
  api.post('/deposits/submit', authenticate, asyncHandler(async (req, res) => {
    const { user } = req as AuthedRequest;
    const deposit = await submitDeposit(user.id, req.body?.amount, req.body?.txHash, req.body?.planId);
    res.status(201).json({ message: 'Deposit submitted. Status is pending admin review.', deposit });
  }));

  api.get(
    '/payouts/preview',
    authenticate,
    asyncHandler(async (req, res) => {
      const { user } = req as AuthedRequest;
      const amount = String(req.query.amount || '0');
      const feeInfo = await getPayoutFeeForUser(user.id);
      res.json({
        ...previewPayoutAmounts(amount, feeInfo.rate),
        appliedTurbine: feeInfo.planName,
        minPayout: MIN_PAYOUT,
        processingWindow: PROCESSING_WINDOW,
        network: `${NETWORK} (${TOKEN})`
      });
    })
  );

  api.get(
    '/payouts',
    authenticate,
    asyncHandler(async (req, res) => {
      const { user } = req as AuthedRequest;
      const payouts = await prisma.payout.findMany({ where: { userId: user.id }, orderBy: { id: 'desc' } });
      res.json({ payouts });
    })
  );

  api.get(
    '/payouts/:id',
    authenticate,
    asyncHandler(async (req, res) => {
      const { user } = req as AuthedRequest;
      const payout = await prisma.payout.findFirst({ where: { id: Number(req.params.id), userId: user.id } });
      if (!payout) throw new AppError(404, 'Payout not found.');
      res.json({ payout });
    })
  );

  api.post(
    '/payouts',
    authenticate,
    asyncHandler(async (req, res) => {
      const { user } = req as AuthedRequest;
      const payout = await requestPayout(user.id, req.body?.amount, req.body?.walletAddress);
      res.status(201).json({
        message: `Payout request submitted. Processing target: ${PROCESSING_WINDOW}.`,
        payout
      });
    })
  );

  // Legacy aliases — responses use payout terminology.
  api.get('/withdrawals/preview', authenticate, asyncHandler(async (req, res) => {
    const { user } = req as AuthedRequest;
    const feeInfo = await getPayoutFeeForUser(user.id);
    res.json({ ...previewPayoutAmounts(String(req.query.amount || '0'), feeInfo.rate), appliedTurbine: feeInfo.planName, minPayout: MIN_PAYOUT });
  }));
  api.get('/withdrawals', authenticate, asyncHandler(async (req, res) => {
    const { user } = req as AuthedRequest;
    const payouts = await prisma.payout.findMany({ where: { userId: user.id }, orderBy: { id: 'desc' } });
    res.json({ payouts, withdrawals: payouts });
  }));
  api.post('/withdrawals', authenticate, asyncHandler(async (req, res) => {
    const { user } = req as AuthedRequest;
    const payout = await requestPayout(user.id, req.body?.amount, req.body?.walletAddress);
    res.status(201).json({ message: 'Payout request submitted.', payout });
  }));

  api.get(
    '/referrals/stats',
    authenticate,
    asyncHandler(async (req, res) => {
      const { user } = req as AuthedRequest;
      const l1 = await prisma.user.findMany({
        where: { referredById: user.id },
        select: { id: true, fullName: true, email: true, totalDeposited: true, createdAt: true }
      });
      const l2 = l1.length
        ? await prisma.user.findMany({
            where: { referredById: { in: l1.map((u) => u.id) } },
            select: { id: true, fullName: true, email: true, totalDeposited: true, createdAt: true }
          })
        : [];
      const l3 = l2.length
        ? await prisma.user.findMany({
            where: { referredById: { in: l2.map((u) => u.id) } },
            select: { id: true, fullName: true, email: true, totalDeposited: true, createdAt: true }
          })
        : [];
      const levelEarned = async (level: number) => {
        const row = await prisma.referralCommission.aggregate({
          where: { referrerId: user.id, level },
          _count: true
        });
        const sum = await prisma.referralCommission.findMany({ where: { referrerId: user.id, level } });
        return sum.reduce((a, c) => a.plus(c.amount), D(0));
      };
      const me = await prisma.user.findUnique({ where: { id: user.id } });
      res.json({
        referralCode: me!.referralCode,
        totalReferralEarned: money(String(me!.totalReferralEarned)),
        totalTeamMembers: l1.length + l2.length + l3.length,
        levels: {
          l1: { level: 1, name: 'Direct team', commissionRate: '3% daily for 3 days', count: l1.length, earned: money(await levelEarned(1)), members: l1 },
          l2: { level: 2, name: 'Second level', commissionRate: '2% daily for 3 days', count: l2.length, earned: money(await levelEarned(2)), members: l2 },
          l3: { level: 3, name: 'Third level', commissionRate: '0.8% daily for 5 days', count: l3.length, earned: money(await levelEarned(3)), members: l3 }
        }
      });
    })
  );

  api.get(
    '/referrals/commissions',
    authenticate,
    asyncHandler(async (req, res) => {
      const { user } = req as AuthedRequest;
      const commissions = await prisma.referralCommission.findMany({
        where: { referrerId: user.id },
        include: { referredUser: { select: { fullName: true } }, investment: true },
        orderBy: { id: 'desc' },
        take: 100
      });
      res.json({ commissions });
    })
  );

  api.get(
    '/ledger',
    authenticate,
    asyncHandler(async (req, res) => {
      const { user } = req as AuthedRequest;
      const limit = Math.min(Number(req.query.limit) || 100, 500);
      const transactions = await prisma.ledgerEntry.findMany({
        where: { userId: user.id },
        orderBy: { id: 'desc' },
        take: limit
      });
      res.json({ transactions });
    })
  );

  api.get(
    '/notifications',
    authenticate,
    asyncHandler(async (req, res) => {
      const { user } = req as AuthedRequest;
      const notifications = await prisma.notification.findMany({
        where: { userId: user.id },
        orderBy: { id: 'desc' },
        take: 50
      });
      res.json({ notifications });
    })
  );

  api.post(
    '/notifications/:id/read',
    authenticate,
    asyncHandler(async (req, res) => {
      const { user } = req as AuthedRequest;
      await prisma.notification.updateMany({
        where: { id: Number(req.params.id), userId: user.id },
        data: { read: true }
      });
      res.json({ ok: true });
    })
  );

  const admin = Router();
  admin.use(authenticate, requireAdmin);

  admin.get(
    '/dashboard',
    asyncHandler(async (_req, res) => {
      const [totalUsers, pendingDeposits, pendingPayouts, activeInvestments, recentAudits] = await Promise.all([
        prisma.user.count({ where: { role: 'user' } }),
        prisma.deposit.findMany({ where: { status: 'PENDING' }, include: { user: true, plan: true } }),
        prisma.payout.findMany({
          where: { status: { in: ['SUBMITTED', 'PENDING_REVIEW', 'PROCESSING', 'SENT'] } },
          include: { user: true }
        }),
        prisma.investment.findMany({ where: { status: 'active' } }),
        prisma.auditLog.findMany({ orderBy: { id: 'desc' }, take: 10 })
      ]);
      res.json({
        metrics: {
          totalUsers,
          pendingDepositsCount: pendingDeposits.length,
          pendingPayoutsCount: pendingPayouts.length,
          activeInvestmentsCount: activeInvestments.length,
          activeInvestmentsAmount: money(activeInvestments.reduce((s, i) => s.plus(i.investedAmount), D(0))),
          pendingDepositsAmount: money(pendingDeposits.reduce((s, d) => s.plus(d.amount), D(0))),
          pendingPayoutsAmount: money(pendingPayouts.reduce((s, p) => s.plus(p.amount), D(0)))
        },
        recentAudits,
        recentDeposits: pendingDeposits.slice(0, 8),
        recentPayouts: pendingPayouts.slice(0, 8)
      });
    })
  );

  admin.get(
    '/deposits',
    asyncHandler(async (req, res) => {
      const status = String(req.query.status || 'ALL');
      const deposits = await prisma.deposit.findMany({
        where: status !== 'ALL' ? { status } : undefined,
        include: { user: { select: { fullName: true, email: true } }, plan: true },
        orderBy: { id: 'desc' }
      });
      res.json({ deposits });
    })
  );

  admin.post(
    '/deposits/:id/approve',
    asyncHandler(async (req, res) => {
      const { user } = req as AuthedRequest;
      const result = await approveDeposit(user, Number(req.params.id), req.body?.adminNote);
      await writeAudit(user, 'DEPOSIT_APPROVAL', 'DEPOSIT', req.params.id, 'Approved deposit', req);
      res.json({ message: 'Deposit approved and investment activated.', result });
    })
  );

  admin.post(
    '/deposits/:id/reject',
    asyncHandler(async (req, res) => {
      const { user } = req as AuthedRequest;
      const reason = String(req.body?.reason || 'Unverified transaction');
      await rejectDeposit(user, Number(req.params.id), reason);
      await writeAudit(user, 'DEPOSIT_REJECTION', 'DEPOSIT', req.params.id, reason, req);
      res.json({ message: 'Deposit rejected.' });
    })
  );

  admin.get(
    '/payouts',
    asyncHandler(async (req, res) => {
      const status = String(req.query.status || 'ALL');
      const payouts = await prisma.payout.findMany({
        where: status !== 'ALL' ? { status } : undefined,
        include: { user: { select: { fullName: true, email: true } } },
        orderBy: { id: 'desc' }
      });
      res.json({ payouts });
    })
  );
  admin.get('/withdrawals', asyncHandler(async (req, res) => {
    const status = String(req.query.status || 'ALL');
    const payouts = await prisma.payout.findMany({
      where: status !== 'ALL' ? { status } : undefined,
      include: { user: { select: { fullName: true, email: true } } },
      orderBy: { id: 'desc' }
    });
    res.json({ payouts, withdrawals: payouts });
  }));

  admin.post('/payouts/:id/process', asyncHandler(async (req, res) => {
    const { user } = req as AuthedRequest;
    const payout = await transitionPayout(user, Number(req.params.id), 'PROCESSING', { note: req.body?.adminNote });
    await writeAudit(user, 'PAYOUT_PROCESSING', 'PAYOUT', req.params.id, 'Moved to processing', req);
    res.json({ message: 'Payout is now processing.', payout });
  }));
  admin.post('/payouts/:id/sent', asyncHandler(async (req, res) => {
    const { user } = req as AuthedRequest;
    const payout = await transitionPayout(user, Number(req.params.id), 'SENT', { txHash: req.body?.txHash, note: req.body?.adminNote });
    await writeAudit(user, 'PAYOUT_SENT', 'PAYOUT', req.params.id, 'Marked sent', req);
    res.json({ message: 'Payout marked sent.', payout });
  }));
  admin.post('/payouts/:id/complete', asyncHandler(async (req, res) => {
    const { user } = req as AuthedRequest;
    const payout = await transitionPayout(user, Number(req.params.id), 'COMPLETED', { txHash: req.body?.txHash, note: req.body?.adminNote });
    await writeAudit(user, 'PAYOUT_COMPLETED', 'PAYOUT', req.params.id, `TX ${req.body?.txHash || ''}`, req);
    res.json({ message: 'Payout completed.', payout });
  }));
  admin.post('/payouts/:id/reject', asyncHandler(async (req, res) => {
    const { user } = req as AuthedRequest;
    const payout = await transitionPayout(user, Number(req.params.id), 'REJECTED', { note: req.body?.reason });
    await writeAudit(user, 'PAYOUT_REJECTED', 'PAYOUT', req.params.id, req.body?.reason || 'Rejected', req);
    res.json({ message: 'Payout rejected and held funds released.', payout });
  }));
  admin.post('/withdrawals/:id/process', asyncHandler(async (req, res) => {
    const { user } = req as AuthedRequest;
    const payout = await transitionPayout(user, Number(req.params.id), 'COMPLETED', { txHash: req.body?.txHash, note: req.body?.adminNote });
    await writeAudit(user, 'PAYOUT_COMPLETED', 'PAYOUT', req.params.id, 'Legacy process endpoint completed payout', req);
    res.json({ message: 'Payout completed.', payout });
  }));
  admin.post('/withdrawals/:id/reject', asyncHandler(async (req, res) => {
    const { user } = req as AuthedRequest;
    const payout = await transitionPayout(user, Number(req.params.id), 'REJECTED', { note: req.body?.reason });
    await writeAudit(user, 'PAYOUT_REJECTED', 'PAYOUT', req.params.id, req.body?.reason || 'Rejected', req);
    res.json({ message: 'Payout rejected.', payout });
  }));

  admin.get('/users', asyncHandler(async (req, res) => {
    const search = String(req.query.search || '').trim();
    const users = await prisma.user.findMany({
      where: search
        ? { OR: [{ fullName: { contains: search } }, { email: { contains: search } }, { referralCode: { contains: search } }] }
        : undefined,
      orderBy: { id: 'desc' }
    });
    res.json({ users: users.map(publicUser) });
  }));

  admin.get('/users/:id', asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const found = await prisma.user.findUnique({ where: { id } });
    if (!found) throw new AppError(404, 'User not found.');
    const [investments, deposits, payouts, ledger] = await Promise.all([
      prisma.investment.findMany({ where: { userId: id }, orderBy: { id: 'desc' } }),
      prisma.deposit.findMany({ where: { userId: id }, orderBy: { id: 'desc' } }),
      prisma.payout.findMany({ where: { userId: id }, orderBy: { id: 'desc' } }),
      prisma.ledgerEntry.findMany({ where: { userId: id }, orderBy: { id: 'desc' }, take: 50 })
    ]);
    res.json({ user: publicUser(found), investments, deposits, payouts, ledger });
  }));

  admin.post('/users/:id/adjust-balance', asyncHandler(async (req, res) => {
    const { user } = req as AuthedRequest;
    const { amount, direction, reason } = req.body || {};
    if (!reason || !String(reason).trim()) throw new AppError(400, 'A reason is required for manual adjustment.');
    if (!['credit', 'debit'].includes(direction)) throw new AppError(400, 'Direction must be credit or debit.');
    const { recordLedger } = await import('./finance');
    const result = await recordLedger(
      prisma,
      Number(req.params.id),
      'manual_adjustment',
      money(String(amount)),
      direction,
      'admin',
      user.id,
      `Manual adjustment: ${reason}`
    );
    await writeAudit(user, 'MANUAL_ADJUSTMENT', 'USER', req.params.id, `${direction} ${amount}: ${reason}`, req);
    res.json({ message: 'Balance adjusted.', result });
  }));

  admin.post('/users/:id/status', asyncHandler(async (req, res) => {
    const { user } = req as AuthedRequest;
    const status = req.body?.status;
    if (!['active', 'suspended'].includes(status)) throw new AppError(400, 'Status must be active or suspended.');
    await prisma.user.update({ where: { id: Number(req.params.id) }, data: { status } });
    await writeAudit(user, 'USER_SUSPENSION', 'USER', req.params.id, `Status ${status}: ${req.body?.reason || ''}`, req);
    res.json({ message: `User status updated to ${status}.` });
  }));

  admin.get('/plans', asyncHandler(async (_req, res) => {
    res.json({ plans: await prisma.plan.findMany({ orderBy: { id: 'asc' } }) });
  }));

  admin.patch('/plans/:id', asyncHandler(async (req, res) => {
    const { user } = req as AuthedRequest;
    const existing = await prisma.plan.findUnique({ where: { id: Number(req.params.id) } });
    if (!existing) throw new AppError(404, 'Plan not found.');
    const body = req.body || {};
    const plan = await prisma.plan.update({
      where: { id: existing.id },
      data: {
        name: body.name ?? existing.name,
        minDeposit: body.minDeposit !== undefined ? money(body.minDeposit) : existing.minDeposit,
        maxDeposit: body.maxDeposit !== undefined ? money(body.maxDeposit) : existing.maxDeposit,
        dailyRoi: body.dailyRoi !== undefined ? String(body.dailyRoi) : existing.dailyRoi,
        durationDays: body.durationDays !== undefined ? Number(body.durationDays) : existing.durationDays,
        payoutFee: body.payoutFee !== undefined ? money(body.payoutFee) : existing.payoutFee,
        description: body.description ?? existing.description,
        status: body.status ?? existing.status
      }
    });
    await writeAudit(user, 'PLAN_CHANGE', 'PLAN', plan.id, 'Updated plan parameters. Active snapshots remain immutable.', req);
    res.json({ message: 'Plan updated. Existing investments keep their snapshots.', plan });
  }));
  admin.put('/plans/:id', asyncHandler(async (req, res) => {
    const { user } = req as AuthedRequest;
    const existing = await prisma.plan.findUnique({ where: { id: Number(req.params.id) } });
    if (!existing) throw new AppError(404, 'Plan not found.');
    const body = req.body || {};
    const plan = await prisma.plan.update({
      where: { id: existing.id },
      data: {
        name: body.name ?? existing.name,
        minDeposit: body.minDeposit !== undefined ? money(body.minDeposit) : existing.minDeposit,
        dailyRoi: body.dailyRoi !== undefined ? String(body.dailyRoi) : existing.dailyRoi,
        durationDays: body.durationDays !== undefined ? Number(body.durationDays) : existing.durationDays,
        payoutFee: body.payoutFee !== undefined ? money(body.payoutFee) : body.withdrawalFee !== undefined ? money(body.withdrawalFee) : existing.payoutFee
      }
    });
    await writeAudit(user, 'PLAN_CHANGE', 'PLAN', plan.id, 'Updated plan parameters.', req);
    res.json({ message: 'Plan updated.', plan });
  }));

  admin.get('/investments', asyncHandler(async (_req, res) => {
    res.json({
      investments: await prisma.investment.findMany({ include: { user: { select: { fullName: true, email: true } } }, orderBy: { id: 'desc' }, take: 200 })
    });
  }));
  admin.get('/earnings', asyncHandler(async (_req, res) => {
    res.json({ earnings: await prisma.earningRecord.findMany({ orderBy: { id: 'desc' }, take: 200 }) });
  }));
  admin.get('/referrals', asyncHandler(async (_req, res) => {
    res.json({
      referrals: await prisma.referralCommission.findMany({
        include: { referredUser: { select: { fullName: true } }, referrer: { select: { fullName: true } }, investment: true },
        orderBy: { id: 'desc' },
        take: 200
      })
    });
  }));
  admin.get('/audit-logs', asyncHandler(async (_req, res) => {
    res.json({ logs: await prisma.auditLog.findMany({ orderBy: { id: 'desc' }, take: 200 }) });
  }));
  admin.post('/engine/run-daily', asyncHandler(async (req, res) => {
    const { user } = req as AuthedRequest;
    const result = await processDailyEarnings();
    await writeAudit(user, 'DAILY_ENGINE', 'SYSTEM', 'CRON', JSON.stringify(result), req);
    res.json({ message: 'Daily earnings engine executed.', result });
  }));
  admin.get('/wallet', asyncHandler(async (_req, res) => {
    res.json({ network: NETWORK, token: TOKEN, depositAddress: await getReceivingAddress() });
  }));
  admin.post('/wallet', asyncHandler(async (req, res) => {
    const { user } = req as AuthedRequest;
    const address = String(req.body?.depositAddress || '').trim();
    if (!isBep20Address(address)) throw new AppError(400, 'Invalid BEP20 receiving address.');
    await prisma.setting.upsert({
      where: { key: 'bep20_deposit_address' },
      update: { value: address },
      create: { key: 'bep20_deposit_address', value: address }
    });
    await writeAudit(user, 'CONFIG_CHANGE', 'SETTINGS', 'bep20_deposit_address', `Updated receiving address to ${address}`, req);
    res.json({ message: 'Public receiving address updated.', depositAddress: address });
  }));

  api.use('/admin', admin);
  return api;
}
