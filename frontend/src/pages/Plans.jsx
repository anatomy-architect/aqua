import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import Modal from '../components/Modal';
import confetti from 'canvas-confetti';
import { 
  Check, 
  Sparkles, 
  TrendingUp, 
  Clock, 
  ShieldCheck, 
  Wallet, 
  ArrowRight,
  Calculator,
  Percent,
  AlertCircle
} from 'lucide-react';

export default function Plans({ onNavigate }) {
  const { user, refreshUser } = useAuth();
  const [plans, setPlans] = useState([]);
  const [selectedPlanIndex, setSelectedPlanIndex] = useState(2); // Ocean Pulse default
  const [calcAmount, setCalcAmount] = useState(500);
  const [activationModalOpen, setActivationModalOpen] = useState(false);
  const [modalPlan, setModalPlan] = useState(null);
  const [investAmount, setInvestAmount] = useState('500');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Authoritative default plans with Titan strictly 48 Days
  const defaultPlans = [
    {
      id: 1,
      name: 'Coral Stream',
      tier: 'Tier 1',
      dailyRoi: 0.85,
      durationDays: 27,
      minDeposit: 20,
      maxDeposit: 49,
      withdrawalFee: 10.0,
      badge: 'Starter'
    },
    {
      id: 2,
      name: 'Deep Current',
      tier: 'Tier 2',
      dailyRoi: 1.30,
      durationDays: 23,
      minDeposit: 50,
      maxDeposit: 99,
      withdrawalFee: 6.0,
      badge: 'Standard'
    },
    {
      id: 3,
      name: 'Ocean Pulse',
      tier: 'Tier 3',
      dailyRoi: 1.70,
      durationDays: 21,
      minDeposit: 100,
      maxDeposit: 299,
      withdrawalFee: 4.0,
      isPopular: true,
      badge: 'Most Popular'
    },
    {
      id: 4,
      name: 'Abyss Flow',
      tier: 'Tier 4',
      dailyRoi: 2.30,
      durationDays: 35,
      minDeposit: 300,
      maxDeposit: 499,
      withdrawalFee: 0.0,
      badge: 'High Yield'
    },
    {
      id: 5,
      name: 'Titan Current',
      tier: 'Tier 5',
      dailyRoi: 3.50,
      durationDays: 48, // STRICTLY 48 DAYS PER USER REQUIREMENT
      minDeposit: 500,
      maxDeposit: 1000000,
      withdrawalFee: 0.0,
      isVip: true,
      badge: 'VIP Elite'
    }
  ];

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const data = await api.getPlans();
      if (data?.plans && data.plans.length > 0) {
        const enriched = data.plans.map(p => {
          const fallback = defaultPlans.find(d => d.id === p.id || d.name.toLowerCase() === p.name.toLowerCase());
          return {
            ...p,
            // Ensure Titan is strictly 48 days
            durationDays: p.name.toLowerCase().includes('titan') ? 48 : (p.durationDays || fallback?.durationDays || 30),
            dailyRoi: p.dailyRoi || fallback?.dailyRoi || 1.5,
            minDeposit: p.minDeposit || fallback?.minDeposit || 50,
            maxDeposit: p.maxDeposit || fallback?.maxDeposit || 1000,
            withdrawalFee: p.withdrawalFee !== undefined ? p.withdrawalFee : (fallback?.withdrawalFee || 0),
            isPopular: fallback?.isPopular,
            isVip: fallback?.isVip,
            badge: fallback?.badge
          };
        });
        setPlans(enriched);
      } else {
        setPlans(defaultPlans);
      }
    } catch (e) {
      console.error('Error fetching plans:', e);
      setPlans(defaultPlans);
    }
  };

  const currentPlans = plans.length > 0 ? plans : defaultPlans;
  const activeCalcPlan = currentPlans[selectedPlanIndex] || currentPlans[2];

  // Calculations for calculator
  const calcDaily = (calcAmount * (activeCalcPlan.dailyRoi / 100));
  const calcTotalProfit = calcDaily * activeCalcPlan.durationDays;
  const calcGrossReturn = calcAmount + calcTotalProfit;
  const calcTotalRoiPercent = (activeCalcPlan.dailyRoi * activeCalcPlan.durationDays).toFixed(1);

  const openActivationModal = (plan) => {
    setModalPlan(plan);
    setInvestAmount(plan.minDeposit.toString());
    setError('');
    setSuccess('');
    setActivationModalOpen(true);
  };

  const handleActivateInvestment = async (e) => {
    e.preventDefault();
    if (!modalPlan) return;

    const amt = parseFloat(investAmount);
    if (isNaN(amt) || amt < modalPlan.minDeposit) {
      setError(`Minimum investment for this plan is $${modalPlan.minDeposit} USDT.`);
      return;
    }
    if (modalPlan.maxDeposit && amt > modalPlan.maxDeposit) {
      setError(`Maximum investment for this plan is $${modalPlan.maxDeposit} USDT.`);
      return;
    }
    if ((user?.balance || 0) < amt) {
      setError(`Insufficient balance. You have $${(user?.balance || 0).toFixed(2)} USDT available. Please deposit first.`);
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await api.createInvestment({
        planId: modalPlan.id,
        amount: amt
      });

      if (res?.investment || res?.success) {
        setSuccess(`Successfully activated ${modalPlan.name}!`);
        await refreshUser();
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
        setTimeout(() => {
          setActivationModalOpen(false);
          onNavigate('dashboard');
        }, 1500);
      } else {
        setError(res?.message || 'Failed to activate plan. Please try again.');
      }
    } catch (err) {
      setError(err.message || 'Error occurred while activating plan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
      
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
          Investment Plans
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">
          Select an automated contract tier to earn guaranteed daily returns, credited every 24 hours directly to your account.
        </p>
      </div>

      {/* 5 Clean Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {currentPlans.map((plan, idx) => {
          const isTitan = plan.name.toLowerCase().includes('titan') || plan.isVip;
          const isPopular = plan.isPopular;
          const totalProfitPct = (plan.dailyRoi * plan.durationDays).toFixed(1);

          return (
            <div
              key={plan.id || idx}
              className={`clean-card p-5 flex flex-col justify-between relative transition-all duration-200 ${
                isPopular 
                  ? 'border-cyan-500/60 bg-gradient-to-b from-[#132238] to-[#111726] shadow-lg shadow-cyan-500/10' 
                  : isTitan
                  ? 'border-amber-500/50 bg-gradient-to-b from-[#241c10] to-[#111726]'
                  : 'bg-[#111726] hover:border-white/20'
              }`}
            >
              {/* Badge */}
              {plan.badge && (
                <div className="mb-3">
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    isPopular 
                      ? 'bg-cyan-500 text-slate-950 font-extrabold' 
                      : isTitan
                      ? 'bg-amber-500 text-slate-950 font-extrabold'
                      : 'bg-white/10 text-slate-300'
                  }`}>
                    {plan.badge}
                  </span>
                </div>
              )}

              {/* Plan Title & ROI */}
              <div className="space-y-3">
                <div>
                  <h3 className="text-base font-bold text-white leading-tight">
                    {plan.name}
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    {plan.tier || `Tier ${idx + 1}`}
                  </span>
                </div>

                <div className="pt-2 border-t border-white/[0.06]">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-white font-mono">
                      {plan.dailyRoi}%
                    </span>
                    <span className="text-xs font-semibold text-emerald-400">/ Day</span>
                  </div>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    +{totalProfitPct}% Net Return
                  </span>
                </div>

                {/* Key specs list */}
                <div className="space-y-2 pt-3 text-xs border-t border-white/[0.06]">
                  <div className="flex justify-between items-center text-slate-300">
                    <span className="text-slate-400 text-[11px]">Duration:</span>
                    <span className="font-semibold text-white font-mono">{plan.durationDays} Days</span>
                  </div>

                  <div className="flex justify-between items-center text-slate-300">
                    <span className="text-slate-400 text-[11px]">Min Deposit:</span>
                    <span className="font-semibold text-white font-mono">${plan.minDeposit}</span>
                  </div>

                  <div className="flex justify-between items-center text-slate-300">
                    <span className="text-slate-400 text-[11px]">Exit Fee:</span>
                    <span className={`font-semibold ${plan.withdrawalFee === 0 ? 'text-emerald-400' : 'text-slate-300'}`}>
                      {plan.withdrawalFee === 0 ? '0% (VIP)' : `${plan.withdrawalFee}%`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-5 pt-3 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => openActivationModal(plan)}
                  className={`w-full py-2.5 px-3 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-1.5 ${
                    isPopular
                      ? 'btn-primary'
                      : isTitan
                      ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                      : 'btn-secondary text-white'
                  }`}
                >
                  Invest Now
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modern Profit Calculator */}
      <div className="clean-card p-6 sm:p-8 bg-[#111726]">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
            <Calculator className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Profit & Return Calculator</h2>
            <p className="text-xs text-slate-400">Estimate your exact payout before making an investment</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          
          {/* Controls (7 Cols) */}
          <div className="lg:col-span-7 space-y-5">
            {/* Plan Selector Buttons */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-2">
                1. Select Investment Tier
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {currentPlans.map((plan, idx) => (
                  <button
                    key={plan.id || idx}
                    type="button"
                    onClick={() => {
                      setSelectedPlanIndex(idx);
                      if (calcAmount < plan.minDeposit) setCalcAmount(plan.minDeposit);
                    }}
                    className={`p-2.5 rounded-xl text-left text-xs transition-all border ${
                      selectedPlanIndex === idx
                        ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-300 font-semibold'
                        : 'bg-white/[0.03] border-white/[0.08] text-slate-300 hover:bg-white/[0.06]'
                    }`}
                  >
                    <span className="block truncate font-bold">{plan.name}</span>
                    <span className="text-[10px] text-slate-400">{plan.dailyRoi}% / {plan.durationDays}d</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Amount Slider & Input */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-semibold text-slate-300">
                  2. Investment Amount (USDT)
                </label>
                <span className="text-xs text-slate-400 font-mono">
                  Min: ${activeCalcPlan.minDeposit} USDT
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-sm">$</span>
                  <input
                    type="number"
                    min={activeCalcPlan.minDeposit}
                    max={100000}
                    value={calcAmount}
                    onChange={(e) => setCalcAmount(Math.max(0, Number(e.target.value)))}
                    className="w-full pl-7 pr-16 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-white font-mono text-sm outline-none focus:border-cyan-500 transition-colors"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">USDT</span>
                </div>
              </div>

              {/* Quick Amount Pills */}
              <div className="flex items-center gap-2 mt-2.5">
                {[50, 100, 300, 500, 1000, 2500].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setCalcAmount(val)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors ${
                      calcAmount === val 
                        ? 'bg-cyan-500 text-slate-950 font-bold' 
                        : 'bg-white/[0.05] text-slate-300 hover:bg-white/[0.1]'
                    }`}
                  >
                    ${val}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Results Summary Box (5 Cols) */}
          <div className="lg:col-span-5 p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-4">
            <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider block">
              Projection for {activeCalcPlan.name}
            </span>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[11px] text-slate-400 block">Daily Payout</span>
                <span className="text-xl font-bold text-emerald-400 font-mono">
                  ${calcDaily.toFixed(2)}
                </span>
                <span className="text-[10px] text-slate-400 block">+{activeCalcPlan.dailyRoi}% every 24h</span>
              </div>

              <div>
                <span className="text-[11px] text-slate-400 block">Plan Duration</span>
                <span className="text-xl font-bold text-white font-mono">
                  {activeCalcPlan.durationDays} Days
                </span>
                <span className="text-[10px] text-slate-400 block">Maturity cycle</span>
              </div>
            </div>

            <div className="pt-3 border-t border-white/[0.06] flex justify-between items-center">
              <div>
                <span className="text-[11px] text-slate-400 block">Total Net Profit</span>
                <span className="text-2xl font-extrabold text-emerald-400 font-mono">
                  +${calcTotalProfit.toFixed(2)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-slate-400 block">Total Return</span>
                <span className="text-lg font-bold text-white font-mono">
                  ${calcGrossReturn.toFixed(2)}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setInvestAmount(calcAmount.toString());
                openActivationModal(activeCalcPlan);
              }}
              className="w-full btn-primary py-2.5 text-xs font-semibold rounded-xl mt-2"
            >
              Deploy ${calcAmount} in {activeCalcPlan.name}
            </button>
          </div>

        </div>
      </div>

      {/* Activation Modal */}
      <Modal
        isOpen={activationModalOpen}
        onClose={() => setActivationModalOpen(false)}
        title={modalPlan ? `Activate ${modalPlan.name}` : 'Activate Plan'}
      >
        {modalPlan && (
          <form onSubmit={handleActivateInvestment} className="space-y-4">
            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Daily ROI:</span>
                <span className="font-bold text-emerald-400 font-mono">+{modalPlan.dailyRoi}% / day</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Plan Duration:</span>
                <span className="font-bold text-white font-mono">{modalPlan.durationDays} Days</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Min Allocation:</span>
                <span className="font-bold text-white font-mono">${modalPlan.minDeposit} USDT</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Available Balance:</span>
                <span className="font-bold text-cyan-400 font-mono">${(user?.balance || 0).toFixed(2)} USDT</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Enter Investment Capital (USDT)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  value={investAmount}
                  onChange={(e) => setInvestAmount(e.target.value)}
                  placeholder={`Min ${modalPlan.minDeposit}`}
                  className="w-full px-3 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white font-mono text-sm outline-none focus:border-cyan-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setInvestAmount((user?.balance || 0).toString())}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30"
                >
                  MAX
                </button>
              </div>
            </div>

            {error && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>{success}</span>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setActivationModalOpen(false)}
                className="flex-1 btn-secondary text-xs !py-2.5 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 btn-primary text-xs !py-2.5 rounded-xl"
              >
                {loading ? 'Activating...' : 'Confirm & Invest'}
              </button>
            </div>
          </form>
        )}
      </Modal>

    </div>
  );
}
