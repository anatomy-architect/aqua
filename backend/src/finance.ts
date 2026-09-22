import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from './prisma';
import { D, money, dailyEarnings, payoutFeeAmount, assertNonNegative } from './money';
import { ACTIVE_PAYOUT_STATUSES, MIN_PAYOUT, REFERRAL_TIERS } from './catalog';
import { AppError, notify } from './auth';
import { config, isBep20Address, isTxHash } from './config';

type Db = PrismaClient | Prisma.TransactionClient;

function asMoney(value: unknown): string {
  return money(String(value));
}

export async function getReceivingAddress(): Promise<string> {
  const row = await prisma.setting.findUnique({ where: { key: 'bep20_deposit_address' } });
  return row?.value || config.bep20ReceivingAddress;
}

export async function recordLedger(
  db: Db,
  userId: number,
  type: string,
  amount: string,
  direction: 'credit' | 'debit',
  referenceType: string | null,
  referenceId: number | null,
  note: string,
  earningDay: number | null = null
) {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(404, 'User not found.');

  const amt = D(amount);
  if (amt.lte(0)) throw new AppError(400, 'Invalid transaction amount.');

  let available = D(asMoney(user.availableBalance));
  if (direction === 'debit') {
    if (available.lt(amt)) {
      throw new AppError(400, `Insufficient available balance (${money(available)}) for ${money(amt)}.`);
    }
    available = available.minus(amt);
  } else {
    available = available.plus(amt);
  }
  assertNonNegative(available, 'available balance');

  await db.user.update({
    where: { id: userId },
    data: { availableBalance: money(available) }
  });

  return db.ledgerEntry.create({
    data: {
      userId,
      type,
      amount: money(amt),
      direction,
      referenceType,
      referenceId,
      balanceAfter: money(available),
      earningDay,
      note
    }
  });
}

export async function holdPayoutFunds(db: Db, userId: number, payoutId: number, amount: string) {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(404, 'User not found.');
  const amt = D(amount);
  const available = D(asMoney(user.availableBalance));
  if (available.lt(amt)) {
    throw new AppError(400, `Insufficient available balance (${money(available)}) for payout of ${money(amt)}.`);
  }
  const nextAvailable = available.minus(amt);
  const nextHeld = D(asMoney(user.heldBalance)).plus(amt);
  assertNonNegative(nextAvailable, 'available balance');
  await db.user.update({
    where: { id: userId },
    data: {
      availableBalance: money(nextAvailable),
      heldBalance: money(nextHeld)
    }
  });
  await db.ledgerEntry.create({
    data: {
      userId,
      type: 'payout_hold',
      amount: money(amt),
      direction: 'debit',
      referenceType: 'payout',
      referenceId: payoutId,
      balanceAfter: money(nextAvailable),
      note: 'Funds held pending payout review'
    }
  });
}

export async function releasePayoutHold(db: Db, userId: number, payoutId: number, amount: string, reason: string) {
  const payout = await db.payout.findUnique({ where: { id: payoutId } });
  if (!payout) throw new AppError(404, 'Payout not found.');
  if (payout.holdReleased) return;
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(404, 'User not found.');
  const amt = D(amount);
  const nextHeld = D(asMoney(user.heldBalance)).minus(amt);
  const nextAvailable = D(asMoney(user.availableBalance)).plus(amt);
  if (nextHeld.isNegative()) throw new AppError(400, 'Held amount cannot go negative.');
  await db.user.update({
    where: { id: userId },
    data: {
      availableBalance: money(nextAvailable),
      heldBalance: money(nextHeld)
    }
  });
  await db.payout.update({ where: { id: payoutId }, data: { holdReleased: true } });
  await db.ledgerEntry.create({
    data: {
      userId,
      type: 'payout_release',
      amount: money(amt),
      direction: 'credit',
      referenceType: 'payout',
      referenceId: payoutId,
      balanceAfter: money(nextAvailable),
      note: `Payout hold released: ${reason}`
    }
  });
}

export async function completePayoutSettlement(db: Db, userId: number, payoutId: number, amount: string, feeAmount: string) {
  const payout = await db.payout.findUnique({ where: { id: payoutId } });
  if (!payout) throw new AppError(404, 'Payout not found.');
  if (payout.completed) return;
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(404, 'User not found.');
  const amt = D(amount);
  const nextHeld = D(asMoney(user.heldBalance)).minus(amt);
  if (nextHeld.isNegative()) throw new AppError(400, 'Held amount cannot go negative.');
  const nextPaid = D(asMoney(user.totalPaidOut)).plus(amt);
  await db.user.update({
    where: { id: userId },
    data: {
      heldBalance: money(nextHeld),
      totalPaidOut: money(nextPaid)
    }
  });
  const fee = D(feeAmount);
  if (fee.gt(0)) {
    await db.ledgerEntry.create({
      data: {
        userId,
        type: 'payout_fee',
        amount: money(fee),
        direction: 'debit',
        referenceType: 'payout',
        referenceId: payoutId,
        balanceAfter: asMoney(user.availableBalance),
        note: 'Payout fee (withheld from held funds)'
      }
    });
  }
  await db.payout.update({ where: { id: payoutId }, data: { completed: true } });
}

export async function resolveUplines(userId: number) {
  const out: { level: number; id: number }[] = [];
  let current = await prisma.user.findUnique({ where: { id: userId }, select: { referredById: true } });
  let level = 1;
  while (current?.referredById && level <= 3) {
    out.push({ level, id: current.referredById });
    current = await prisma.user.findUnique({ where: { id: current.referredById }, select: { referredById: true } });
    level += 1;
  }
  return out;
}

export async function activateInvestmentFromDeposit(
  db: Db,
  deposit: { id: number; userId: number; amount: unknown; planId: number | null }
) {
  if (!deposit.planId) {
    await recordLedger(
      db,
      deposit.userId,
      'deposit_credit',
      asMoney(deposit.amount),
      'credit',
      'deposit',
      deposit.id,
      `Approved BEP20 USDT deposit ${asMoney(deposit.amount)}`
    );
    const user = await db.user.findUnique({ where: { id: deposit.userId } });
    await db.user.update({
      where: { id: deposit.userId },
      data: { totalDeposited: money(D(asMoney(user!.totalDeposited)).plus(asMoney(deposit.amount))) }
    });
    return null;
  }

  const plan = await db.plan.findUnique({ where: { id: deposit.planId } });
  if (!plan) throw new AppError(400, 'Turbine plan not found.');
  const amount = D(asMoney(deposit.amount));
  if (amount.lt(asMoney(plan.minDeposit))) {
    throw new AppError(400, `Amount is below the ${plan.name} minimum of ${asMoney(plan.minDeposit)}.`);
  }
  const daily = dailyEarnings(amount, asMoney(plan.dailyRoi));
  const start = new Date();
  const end = new Date(start.getTime() + Number(plan.durationDays) * 24 * 60 * 60 * 1000);

  const investment = await db.investment.create({
    data: {
      userId: deposit.userId,
      planId: plan.id,
      depositId: deposit.id,
      planNameSnapshot: plan.name,
      investedAmount: money(amount),
      dailyRateSnapshot: asMoney(plan.dailyRoi),
      durationDaysSnapshot: plan.durationDays,
      payoutFeeSnapshot: asMoney(plan.payoutFee),
      dailyEarnings: money(daily),
      totalEarned: '0.00',
      daysPassed: 0,
      startDate: start,
      endDate: end,
      status: 'active'
    }
  });

  const user = await db.user.findUnique({ where: { id: deposit.userId } });
  await db.user.update({
    where: { id: deposit.userId },
    data: { totalDeposited: money(D(asMoney(user!.totalDeposited)).plus(amount)) }
  });

  await recordLedger(
    db,
    deposit.userId,
    'deposit_credit',
    money(amount),
    'credit',
    'deposit',
    deposit.id,
    `Approved BEP20 USDT deposit ${money(amount)}`
  );
  await recordLedger(
    db,
    deposit.userId,
    'investment_activation',
    money(amount),
    'debit',
    'investment',
    investment.id,
    `Activated ${plan.name} — principal locked in turbine`
  );

  return investment;
}

export async function returnPrincipalIfNeeded(db: Db, inv: { id: number; userId: number; investedAmount: unknown }) {
  const existing = await db.ledgerEntry.findFirst({
    where: { userId: inv.userId, type: 'investment_principal_return', referenceType: 'investment', referenceId: inv.id }
  });
  if (existing) return;
  await recordLedger(
    db,
    inv.userId,
    'investment_principal_return',
    asMoney(inv.investedAmount),
    'credit',
    'investment',
    inv.id,
    'Turbine cycle completed — principal returned to available balance'
  );
}

export async function processDailyEarnings(forceDay?: number) {
  const now = new Date();
  const active = await prisma.investment.findMany({ where: { status: 'active' } });
  let totalInvestment = D(0);
  let totalReferral = D(0);
  const details: { investmentId: number; day: number; earned: string }[] = [];

  for (const inv of active) {
    await prisma.$transaction(async (tx) => {
      const fresh = await tx.investment.findUnique({ where: { id: inv.id } });
      if (!fresh || fresh.status !== 'active') return;
      if (fresh.endDate < now && fresh.daysPassed >= fresh.durationDaysSnapshot) {
        await tx.investment.update({ where: { id: fresh.id }, data: { status: 'completed' } });
        await returnPrincipalIfNeeded(tx, fresh);
        return;
      }

      if (forceDay === undefined && fresh.lastEarningDate) {
        const last = fresh.lastEarningDate.toISOString().slice(0, 10);
        const today = now.toISOString().slice(0, 10);
        if (last === today) return;
      }

      const nextDay = forceDay ?? fresh.daysPassed + 1;
      if (nextDay > fresh.durationDaysSnapshot) {
        await tx.investment.update({ where: { id: fresh.id }, data: { status: 'completed' } });
        await returnPrincipalIfNeeded(tx, fresh);
        return;
      }

      const existing = await tx.earningRecord.findUnique({
        where: { investmentId_earningDay: { investmentId: fresh.id, earningDay: nextDay } }
      });

      let earned = D(0);
      if (!existing) {
        earned = dailyEarnings(asMoney(fresh.investedAmount), asMoney(fresh.dailyRateSnapshot));
        await tx.earningRecord.create({
          data: {
            investmentId: fresh.id,
            userId: fresh.userId,
            earningDay: nextDay,
            amount: money(earned)
          }
        });
        await recordLedger(
          tx,
          fresh.userId,
          'investment_profit',
          money(earned),
          'credit',
          'investment',
          fresh.id,
          `Daily ROI day ${nextDay}/${fresh.durationDaysSnapshot} — ${fresh.planNameSnapshot}`,
          nextDay
        );
        const user = await tx.user.findUnique({ where: { id: fresh.userId } });
        await tx.user.update({
          where: { id: fresh.userId },
          data: { totalEarned: money(D(asMoney(user!.totalEarned)).plus(earned)) }
        });
        const completed = nextDay >= fresh.durationDaysSnapshot;
        await tx.investment.update({
          where: { id: fresh.id },
          data: {
            daysPassed: nextDay,
            totalEarned: money(D(asMoney(fresh.totalEarned)).plus(earned)),
            lastEarningDate: now,
            status: completed ? 'completed' : 'active'
          }
        });
        if (completed) {
          await returnPrincipalIfNeeded(tx, fresh);
        }
        totalInvestment = totalInvestment.plus(earned);
      }

      const uplines = await resolveUplines(fresh.userId);
      for (const tier of REFERRAL_TIERS) {
        if (nextDay > tier.maxDays) continue;
        const upline = uplines.find((u) => u.level === tier.level);
        if (!upline) continue;
        try {
          const commission = D(asMoney(fresh.investedAmount)).mul(D(tier.rate).div(100)).toDecimalPlaces(2);
          await tx.referralCommission.create({
            data: {
              investmentId: fresh.id,
              referredUserId: fresh.userId,
              referrerId: upline.id,
              level: tier.level,
              ratePercent: tier.rate,
              maxDays: tier.maxDays,
              earningDay: nextDay,
              amount: money(commission)
            }
          });
          await recordLedger(
            tx,
            upline.id,
            'referral_commission',
            money(commission),
            'credit',
            'referral',
            fresh.id,
            `L${tier.level} commission day ${nextDay}/${tier.maxDays}`,
            nextDay
          );
          const referrer = await tx.user.findUnique({ where: { id: upline.id } });
          await tx.user.update({
            where: { id: upline.id },
            data: { totalReferralEarned: money(D(asMoney(referrer!.totalReferralEarned)).plus(commission)) }
          });
          totalReferral = totalReferral.plus(commission);
        } catch (err: unknown) {
          const code = (err as { code?: string }).code;
          if (code !== 'P2002') throw err;
        }
      }

      details.push({ investmentId: fresh.id, day: nextDay, earned: money(earned) });
    });
  }

  return {
    success: true,
    investmentsCount: active.length,
    totalInvestmentEarnings: money(totalInvestment),
    totalReferralCommissions: money(totalReferral),
    details
  };
}

export async function submitDeposit(userId: number, amountRaw: unknown, txHashRaw: unknown, planIdRaw: unknown) {
  const amount = D(String(amountRaw || ''));
  if (!amount.isFinite() || amount.lte(0)) throw new AppError(400, 'Enter a valid deposit amount.');
  const planId = planIdRaw ? Number(planIdRaw) : null;
  if (!planId) throw new AppError(400, 'Select a turbine plan.');
  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan || plan.status !== 'active') throw new AppError(404, 'Turbine plan not found.');
  if (amount.lt(asMoney(plan.minDeposit))) {
    throw new AppError(400, `Minimum for ${plan.name} is ${asMoney(plan.minDeposit)} USDT.`);
  }
  const txHash = String(txHashRaw || '').trim();
  if (!isTxHash(txHash)) throw new AppError(400, 'A valid BEP20 transaction hash is required.');
  const receivingAddress = await getReceivingAddress();
  try {
    return await prisma.deposit.create({
      data: {
        userId,
        planId: plan.id,
        amount: money(amount),
        network: 'BEP20',
        receivingAddress,
        txHash,
        status: 'PENDING'
      }
    });
  } catch (err: unknown) {
    if ((err as { code?: string }).code === 'P2002') {
      throw new AppError(400, 'This transaction hash has already been submitted.');
    }
    throw err;
  }
}

export async function approveDeposit(admin: { id: number; email: string }, depositId: number, adminNote?: string) {
  return prisma.$transaction(async (tx) => {
    const deposit = await tx.deposit.findUnique({ where: { id: depositId } });
    if (!deposit) throw new AppError(404, 'Deposit not found.');
    if (deposit.status !== 'PENDING') throw new AppError(400, `Cannot approve deposit with status ${deposit.status}.`);
    await tx.deposit.update({
      where: { id: depositId },
      data: {
        status: 'APPROVED',
        reviewedAt: new Date(),
        adminId: admin.id,
        adminNote: adminNote || 'Approved by admin'
      }
    });
    const investment = await activateInvestmentFromDeposit(tx, deposit);
    await notify(
      deposit.userId,
      'Deposit approved',
      `Your ${asMoney(deposit.amount)} USDT deposit was approved and ${investment ? investment.planNameSnapshot + ' is now active' : 'credited'}.`
    );
    return { depositId, investmentId: investment?.id || null };
  });
}

export async function rejectDeposit(admin: { id: number }, depositId: number, reason: string) {
  const deposit = await prisma.deposit.findUnique({ where: { id: depositId } });
  if (!deposit) throw new AppError(404, 'Deposit not found.');
  if (deposit.status !== 'PENDING') throw new AppError(400, `Cannot reject deposit with status ${deposit.status}.`);
  await prisma.deposit.update({
    where: { id: depositId },
    data: {
      status: 'REJECTED',
      reviewedAt: new Date(),
      adminId: admin.id,
      adminNote: reason || 'Transaction could not be verified'
    }
  });
  await notify(deposit.userId, 'Deposit rejected', reason || 'Your deposit could not be verified.');
}

export async function getPayoutFeeForUser(userId: number) {
  const active = await prisma.investment.findMany({
    where: { userId, status: 'active' },
    orderBy: { payoutFeeSnapshot: 'asc' }
  });
  if (active.length > 0) {
    return { rate: asMoney(active[0].payoutFeeSnapshot), planName: active[0].planNameSnapshot };
  }
  return { rate: '10.00', planName: 'Standard account (no active turbine)' };
}

export function previewPayoutAmounts(amount: string, feeRate: string) {
  const amt = D(amount);
  const fee = payoutFeeAmount(amt, feeRate);
  const net = amt.minus(fee);
  return { amount: money(amt), feeRate: money(feeRate), feeAmount: money(fee), netAmount: money(net) };
}

export async function requestPayout(userId: number, amountRaw: unknown, walletRaw: unknown) {
  const amount = D(String(amountRaw || ''));
  if (!amount.isFinite() || amount.lt(MIN_PAYOUT)) {
    throw new AppError(400, `Minimum payout amount is $${MIN_PAYOUT} USDT.`);
  }
  const wallet = String(walletRaw || '').trim();
  if (!isBep20Address(wallet)) {
    throw new AppError(400, 'Valid BEP20 destination address is required.');
  }

  return prisma.$transaction(async (tx) => {
    const pending = await tx.payout.findFirst({
      where: { userId, status: { in: [...ACTIVE_PAYOUT_STATUSES] } }
    });
    if (pending) {
      throw new AppError(400, 'You already have an active payout in progress.');
    }
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError(404, 'User not found.');
    if (D(asMoney(user.availableBalance)).lt(amount)) {
      throw new AppError(400, `Insufficient available balance (${asMoney(user.availableBalance)}).`);
    }
    const feeInfo = await getPayoutFeeForUser(userId);
    const preview = previewPayoutAmounts(money(amount), feeInfo.rate);
    const created = await tx.payout.create({
      data: {
        userId,
        amount: preview.amount,
        feeRate: preview.feeRate,
        feeAmount: preview.feeAmount,
        netAmount: preview.netAmount,
        walletAddress: wallet,
        network: 'BEP20',
        status: 'PENDING_REVIEW'
      }
    });
    await holdPayoutFunds(tx, userId, created.id, preview.amount);
    await notify(userId, 'Payout requested', `Your payout of ${preview.amount} USDT is pending review. Processing target: 12–18 hours.`);
    return created;
  });
}

const PAYOUT_TRANSITIONS: Record<string, string[]> = {
  PENDING_REVIEW: ['PROCESSING', 'REJECTED'],
  PROCESSING: ['SENT', 'REJECTED'],
  SENT: ['COMPLETED', 'REJECTED'],
  SUBMITTED: ['PENDING_REVIEW', 'PROCESSING', 'REJECTED']
};

export async function transitionPayout(
  admin: { id: number },
  payoutId: number,
  next: 'PROCESSING' | 'SENT' | 'COMPLETED' | 'REJECTED',
  opts: { txHash?: string; note?: string } = {}
) {
  return prisma.$transaction(async (tx) => {
    const payout = await tx.payout.findUnique({ where: { id: payoutId } });
    if (!payout) throw new AppError(404, 'Payout not found.');
    if (payout.status === 'COMPLETED' || payout.status === 'REJECTED') {
      throw new AppError(400, `Payout already resolved (${payout.status}).`);
    }
    if (next === 'COMPLETED' && payout.completed) return payout;
    const allowed = PAYOUT_TRANSITIONS[payout.status] || [];
    if (!allowed.includes(next)) {
      throw new AppError(400, `Cannot move payout from ${payout.status} to ${next}.`);
    }
    if (next === 'COMPLETED') {
      const hash = String(opts.txHash || payout.txHash || '').trim();
      if (!isTxHash(hash)) throw new AppError(400, 'Payout transaction hash is required to complete.');
      await completePayoutSettlement(tx, payout.userId, payout.id, asMoney(payout.amount), asMoney(payout.feeAmount));
      const updated = await tx.payout.update({
        where: { id: payout.id },
        data: {
          status: 'COMPLETED',
          processedAt: new Date(),
          txHash: hash,
          adminId: admin.id,
          adminNote: opts.note || 'Payout completed on-chain'
        }
      });
      await notify(payout.userId, 'Payout completed', `Net ${asMoney(payout.netAmount)} USDT sent. TX: ${hash}`);
      return updated;
    }
    if (next === 'REJECTED') {
      await releasePayoutHold(tx, payout.userId, payout.id, asMoney(payout.amount), opts.note || 'Rejected by admin');
      const updated = await tx.payout.update({
        where: { id: payout.id },
        data: {
          status: 'REJECTED',
          processedAt: new Date(),
          adminId: admin.id,
          adminNote: opts.note || 'Payout rejected'
        }
      });
      await notify(payout.userId, 'Payout rejected', opts.note || 'Your payout request was rejected and held funds were released.');
      return updated;
    }
    return tx.payout.update({
      where: { id: payout.id },
      data: {
        status: next,
        adminId: admin.id,
        adminNote: opts.note || `Status set to ${next}`,
        txHash: opts.txHash ? String(opts.txHash).trim() : payout.txHash
      }
    });
  });
}

export async function dashboardStats(userId: number) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(404, 'User not found.');
  const investments = await prisma.investment.findMany({ where: { userId } });
  const active = investments.filter((i) => i.status === 'active');
  const completed = investments.filter((i) => i.status === 'completed');
  const pendingPayout = await prisma.payout.aggregate({
    where: { userId, status: { in: [...ACTIVE_PAYOUT_STATUSES] } },
    _count: true
  });
  const activeInvested = active.reduce((sum, i) => sum.plus(asMoney(i.investedAmount)), D(0));
  const totalBalance = D(asMoney(user.availableBalance)).plus(asMoney(user.heldBalance)).plus(activeInvested);
  return {
    totalBalance: money(totalBalance),
    availableBalance: asMoney(user.availableBalance),
    heldAmount: asMoney(user.heldBalance),
    totalEarnings: asMoney(user.totalEarned),
    referralEarnings: asMoney(user.totalReferralEarned),
    activeInvestments: active.length,
    completedInvestments: completed.length,
    pendingPayout: pendingPayout._count,
    activeInvested: money(activeInvested)
  };
}
