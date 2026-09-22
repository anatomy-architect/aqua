import React, { useState, useEffect } from 'react';
import { Zap, ArrowUpRight, Clock, ShieldCheck, TrendingUp, Check } from 'lucide-react';

export default function TurbineCard({ investment, plan, onSelect, showActions = true, isCompact = false }) {
  const isInvestment = !!investment;
  const data = investment || plan;

  const planName = isInvestment ? investment.planNameSnapshot : plan.name;
  const tier = isInvestment ? (investment.tier || 'Tier') : plan.tier;
  const dailyRoi = isInvestment ? investment.dailyRateSnapshot : plan.dailyRoi;
  const duration = (planName?.includes('Titan') && (!isInvestment || !investment.durationDaysSnapshot)) ? 48 : (isInvestment ? investment.durationDaysSnapshot : (plan.durationDays || 48));
  const withdrawalFee = isInvestment ? investment.withdrawalFeeSnapshot : plan.withdrawalFee;
  const investedAmount = isInvestment ? investment.investedAmount : plan.minDeposit;
  const dailyEarnings = isInvestment ? investment.dailyEarnings : (plan.minDeposit * (plan.dailyRoi / 100));
  const daysPassed = isInvestment ? (investment.daysPassed || 0) : 0;
  const totalEarned = isInvestment ? (investment.totalEarned || 0) : 0;
  const speedRpm = plan?.speedRpm || (tier.includes('5') ? 280 : tier.includes('4') ? 220 : tier.includes('3') ? 175 : tier.includes('2') ? 130 : 90);

  // Live visual interpolation for active investments
  const [interpolatedEarned, setInterpolatedEarned] = useState(totalEarned);

  useEffect(() => {
    if (!isInvestment || investment.status !== 'active') {
      setInterpolatedEarned(totalEarned);
      return;
    }

    const perSecondRate = dailyEarnings / 86400;
    const interval = setInterval(() => {
      setInterpolatedEarned(prev => Math.round((prev + (perSecondRate * 0.1)) * 1000) / 1000);
    }, 100);

    return () => clearInterval(interval);
  }, [isInvestment, investment?.status, dailyEarnings, totalEarned]);

  const progressPercent = Math.min(100, Math.round((daysPassed / duration) * 100));
  const isGoldTier = tier.includes('5') || tier.includes('4') || planName.includes('Titan') || planName.includes('Abyss');
  const spinSpeedClass = speedRpm >= 220 ? 'animate-spin-fast' : speedRpm >= 140 ? 'animate-spin-medium' : 'animate-spin-slow';

  return (
    <div className={`relative overflow-hidden flex flex-col justify-between h-full transition-all duration-300 ${
      isGoldTier ? 'glass-card-gold' : 'glass-card glass-card-hover'
    } ${isCompact ? 'p-4' : 'p-5 sm:p-6'}`}>
      
      <div>
        {/* Top Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            {/* Hydro Turbine Icon */}
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
              isGoldTier ? 'bg-amber-950/50 border border-gold/40' : 'bg-cyan-950/50 border border-cyan/40'
            }`}>
              <div className={`w-6 h-6 ${spinSpeedClass}`}>
                <svg viewBox="0 0 24 24" fill="none" className={isGoldTier ? 'text-gold' : 'text-cyan'} stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3" fill="currentColor" />
                  <path d="M12 2C6.5 2 2 6.5 2 12C2 17.5 6.5 22 12 22C17.5 22 22 17.5 22 12" strokeDasharray="3 3" />
                  <path d="M12 2C14 5 15 8 12 12C9 16 10 19 12 22" />
                  <path d="M2 12C5 10 8 9 12 12C16 15 19 14 22 12" />
                </svg>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-bold text-sm sm:text-base text-primary leading-snug">{planName}</h3>
              </div>
              <p className="text-[11px] text-secondary flex items-center gap-1 mt-0.5 font-mono">
                <Zap className="w-3 h-3 text-cyan shrink-0" /> {speedRpm} RPM Kinetic Drive
              </p>
            </div>
          </div>

          <span className={isGoldTier ? 'badge-gold shrink-0' : 'badge-tier shrink-0'}>
            {tier}
          </span>
        </div>

        {/* Primary ROI & Min Deposit Box */}
        <div className="grid grid-cols-2 gap-3 py-3 my-3 border-y border-white/5 bg-navy/40 rounded-xl px-3 text-center">
          <div>
            <span className="text-[10px] text-muted uppercase font-mono block">Daily Yield</span>
            <span className={`font-heading font-extrabold text-lg sm:text-xl ${isGoldTier ? 'text-gold' : 'text-cyan'}`}>
              +{dailyRoi}%
            </span>
            <span className="text-[10px] text-secondary block">per 24 hours</span>
          </div>

          <div>
            <span className="text-[10px] text-muted uppercase font-mono block">
              {isInvestment ? 'Daily Earnings' : 'Min Deposit'}
            </span>
            <span className="font-heading font-extrabold text-lg sm:text-xl text-primary">
              ${isInvestment ? dailyEarnings.toFixed(2) : plan.minDeposit.toLocaleString()}
            </span>
            <span className="text-[10px] text-secondary block font-mono">USDT</span>
          </div>
        </div>

        {/* Investment Real-time Tracking Box */}
        {isInvestment && (
          <div className="mb-3 p-3 rounded-xl bg-navy/70 border border-cyan/20">
            <div className="flex justify-between items-center text-[10px] text-muted mb-1">
              <span className="flex items-center gap-1 font-mono">
                <TrendingUp className="w-3 h-3 text-cyan animate-pulse" /> Live Accrual
              </span>
              <span className="text-cyan font-mono font-bold">ACTIVE</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-xl font-heading font-extrabold text-cyan">
                ${interpolatedEarned.toFixed(3)}
              </span>
              <span className="text-[10px] text-secondary font-mono">
                of ${(investedAmount * (dailyRoi / 100) * duration).toFixed(2)} target
              </span>
            </div>
          </div>
        )}

        {/* Parameters Spec List */}
        {isInvestment ? (
          <div className="my-2">
            <div className="flex justify-between text-[11px] text-muted font-mono mb-1">
              <span>Day {daysPassed} of {duration}</span>
              <span>{progressPercent}% Complete</span>
            </div>
            <div className="w-full h-1.5 bg-navy rounded-full overflow-hidden border border-white/10">
              <div
                className={`h-full rounded-full transition-all duration-500 ${isGoldTier ? 'bg-gradient-to-r from-amber-400 to-yellow-300' : 'bg-gradient-to-r from-cyan-400 to-blue-500'}`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-secondary mt-1">
              <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-cyan" /> {Math.max(0, duration - daysPassed)} days left</span>
              <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3 text-green-400" /> Snapshot Locked</span>
            </div>
          </div>
        ) : (
          <div className="space-y-1.5 text-xs text-secondary my-3 font-mono">
            <div className="flex justify-between">
              <span className="text-muted">Duration:</span>
              <span className="text-primary font-bold">{duration} Days</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Cycle Return:</span>
              <span className={`font-bold ${isGoldTier ? 'text-gold' : 'text-cyan'}`}>+{(dailyRoi * duration).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Withdrawal Fee:</span>
              <span className="text-primary font-bold">{withdrawalFee === 0 ? '0% Free' : `${withdrawalFee}%`}</span>
            </div>
          </div>
        )}
      </div>

      {/* CTA Action */}
      {showActions && !isInvestment && (
        <button
          type="button"
          onClick={() => onSelect && onSelect(plan)}
          className={`w-full mt-4 py-2.5 px-4 rounded-xl font-heading text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            isGoldTier ? 'btn-gold' : 'btn-cyan'
          }`}
        >
          Activate Turbine <ArrowUpRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
