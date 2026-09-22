import React, { useState, useEffect } from 'react';
import OceanWaves from '../components/OceanWaves';
import TurbineCard from '../components/TurbineCard';
import { api } from '../api/client';
import { 
  Waves, 
  Zap, 
  ShieldCheck, 
  TrendingUp, 
  Users2, 
  ArrowRight, 
  CheckCircle2, 
  Coins, 
  Lock, 
  Activity,
  Layers,
  ChevronDown,
  ArrowUpRight,
  Sparkles,
  Cpu,
  Clock,
  Wallet
} from 'lucide-react';

export default function Landing({ onNavigate }) {
  const [plans, setPlans] = useState([]);
  const [calcAmount, setCalcAmount] = useState(500);
  const [selectedPlanIndex, setSelectedPlanIndex] = useState(4); // Default to Titan Current Turbine
  const [openFaq, setOpenFaq] = useState(null);

  useEffect(() => {
    api.getPlans().then(data => {
      if (data?.plans && data.plans.length === 5) {
        setPlans(data.plans);
      }
    }).catch(console.error);
  }, []);

  const fallbackPlans = [
    { id: 1, name: 'Coral Stream Turbine', tier: 'Tier 1', minDeposit: 20, maxDeposit: 49, dailyRoi: 0.85, durationDays: 27, withdrawalFee: 10.0, speedRpm: 90 },
    { id: 2, name: 'Deep Current Turbine', tier: 'Tier 2', minDeposit: 50, maxDeposit: 99, dailyRoi: 1.30, durationDays: 23, withdrawalFee: 6.0, speedRpm: 130 },
    { id: 3, name: 'Ocean Pulse Turbine', tier: 'Tier 3', minDeposit: 100, maxDeposit: 299, dailyRoi: 1.70, durationDays: 21, withdrawalFee: 4.0, speedRpm: 175 },
    { id: 4, name: 'Abyss Flow Turbine', tier: 'Tier 4', minDeposit: 300, maxDeposit: 499, dailyRoi: 2.30, durationDays: 35, withdrawalFee: 0.0, speedRpm: 220 },
    { id: 5, name: 'Titan Current Turbine', tier: 'Tier 5', minDeposit: 500, maxDeposit: 1000000, dailyRoi: 3.50, durationDays: 48, withdrawalFee: 0.0, speedRpm: 280 }
  ];

  const activePlans = plans.length === 5 ? plans : fallbackPlans;
  const activePlan = activePlans[selectedPlanIndex] || activePlans[4];

  // Dynamic Simple ROI Calculation
  const dailyReturn = Math.round((calcAmount * (activePlan.dailyRoi / 100)) * 100) / 100;
  const totalProfit = Math.round((dailyReturn * activePlan.durationDays) * 100) / 100;
  const totalReturn = Math.round((calcAmount + totalProfit) * 100) / 100;

  const faqs = [
    {
      q: 'How are daily earnings calculated and credited?',
      a: 'Earnings are calculated using Simple ROI (Investment × Daily ROI %) and credited server-side every 24 hours directly to your available balance until the completion of your turbine duration cycle.'
    },
    {
      q: 'Which deposit and withdrawal cryptocurrency networks are supported?',
      a: 'Aqua Vault exclusively supports USDT on the Binance Smart Chain (BEP20 network). All deposits and withdrawals settle quickly with minimal network gas fees.'
    },
    {
      q: 'What is the minimum withdrawal amount and processing window?',
      a: 'The minimum withdrawal is $20.00 USDT. Payout requests are verified from cold-storage treasury and processed within a targeted 12–18 hour window.'
    },
    {
      q: 'What is the Immutable Snapshot Guarantee?',
      a: 'When you activate a turbine plan, its daily ROI, duration, and withdrawal fee are permanently snapshotted into your investment record. Any future adjustments to platform plan matrices will never affect your active turbine.'
    },
    {
      q: 'How does the 3-level referral reward structure work?',
      a: 'You receive recurring daily commissions on active downline investments: Level 1 (Direct) pays 3% daily for 3 days, Level 2 pays 2% daily for 3 days, and Level 3 pays 0.8% daily for 5 days.'
    }
  ];

  return (
    <div className="relative min-h-screen bg-[#0A0F2C] overflow-hidden text-primary">
      
      {/* 1. HERO SECTION */}
      <section className="relative pt-12 pb-14 sm:pt-20 sm:pb-20">
        {/* Ambient background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] sm:w-[600px] h-[450px] sm:h-[600px] bg-cyan/10 rounded-full blur-[140px] pointer-events-none" />

        <div className="aqua-container relative z-10 text-center">
          
          {/* Eyebrow Tag */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-card border border-cyan/35 mb-4 sm:mb-6 shadow-sm">
            <Waves className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan" />
            <span className="text-[11px] sm:text-xs font-mono text-cyan tracking-wider font-semibold uppercase">
              Algorithmic Marine Kinetic Yield Protocol
            </span>
          </div>

          {/* Main Headline */}
          <h1 className="font-heading text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-primary max-w-3xl mx-auto leading-tight">
            HARNESS THE POWER OF <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan to-blue-400">OCEAN ENERGY</span>
          </h1>

          {/* Short Explanation */}
          <p className="mt-4 sm:mt-5 text-sm sm:text-base text-secondary max-w-2xl mx-auto font-normal leading-relaxed">
            Automated daily yields from algorithmic marine tidal turbines. 5 performance matrices, 3-level perpetual referral rewards, and instant BEP20 USDT settlements.
          </p>

          {/* CTAs */}
          <div className="mt-7 sm:mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 max-w-sm sm:max-w-md mx-auto">
            <button
              type="button"
              onClick={() => onNavigate('register')}
              className="btn-cyan w-full sm:w-auto text-xs sm:text-sm py-3 px-7 shadow-cyan-glow"
            >
              Start Generating Yield <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate('login')}
              className="btn-outline-cyan w-full sm:w-auto text-xs sm:text-sm py-3 px-7"
            >
              Access Vault Portal
            </button>
          </div>

          {/* 2. COMPACT HIGHLIGHT METRICS (4 CARDS) */}
          <div className="mt-12 sm:mt-14 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 max-w-4xl mx-auto text-left sm:text-center">
            <div className="glass-card p-3.5 sm:p-4">
              <span className="text-[10px] sm:text-[11px] text-muted block uppercase font-mono mb-0.5">Daily Yield Range</span>
              <span className="text-lg sm:text-2xl font-heading font-extrabold text-cyan">0.85% – 3.50%</span>
              <span className="text-[10px] text-secondary block mt-0.5">Perpetual Daily Credit</span>
            </div>

            <div className="glass-card p-3.5 sm:p-4">
              <span className="text-[10px] sm:text-[11px] text-muted block uppercase font-mono mb-0.5">Settlement Network</span>
              <span className="text-lg sm:text-2xl font-heading font-extrabold text-primary">BEP20 USDT</span>
              <span className="text-[10px] text-secondary block mt-0.5">Instant Blockchain Settlement</span>
            </div>

            <div className="glass-card p-3.5 sm:p-4">
              <span className="text-[10px] sm:text-[11px] text-muted block uppercase font-mono mb-0.5">3-Level Referral</span>
              <span className="text-lg sm:text-2xl font-heading font-extrabold text-gold">L1 3% • L2 2% • L3 0.8%</span>
              <span className="text-[10px] text-secondary block mt-0.5">Multi-Day Daily Rewards</span>
            </div>

            <div className="glass-card p-3.5 sm:p-4">
              <span className="text-[10px] sm:text-[11px] text-muted block uppercase font-mono mb-0.5">Turbine Matrices</span>
              <span className="text-lg sm:text-2xl font-heading font-extrabold text-cyan">5 Plans</span>
              <span className="text-[10px] text-secondary block mt-0.5">Immutable Snapshots</span>
            </div>
          </div>

        </div>

        {/* Ocean Wave Visual */}
        <div className="mt-8 sm:mt-10 overflow-hidden pointer-events-none">
          <OceanWaves height={70} opacity={0.6} />
        </div>
      </section>

      {/* 3. INTERACTIVE TURBINE CALCULATOR */}
      <section className="section-spacing bg-[#091133]/70 relative z-10 border-y border-cyan/15">
        <div className="aqua-container max-w-4xl">
          
          <div className="text-center mb-7 sm:mb-8">
            <h2 className="font-heading text-2xl sm:text-3xl font-bold text-primary">
              INTERACTIVE <span className="text-cyan">TURBINE CALCULATOR</span>
            </h2>
            <p className="text-secondary text-xs sm:text-sm mt-1.5 max-w-lg mx-auto">
              Estimate your projected daily earnings and cycle returns across our 5 marine generator matrices.
            </p>
          </div>

          <div className="glass-card p-5 sm:p-8">
            
            {/* Plan Selector Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-6">
              {activePlans.map((p, idx) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => {
                    setSelectedPlanIndex(idx);
                    if (calcAmount < p.minDeposit) setCalcAmount(p.minDeposit);
                  }}
                  className={`p-2.5 sm:p-3 rounded-xl text-center border transition-all ${
                    selectedPlanIndex === idx
                      ? 'bg-cyan/20 border-cyan text-cyan shadow-cyan-glow font-bold'
                      : 'bg-navy/60 border-white/10 text-muted hover:border-cyan/30'
                  }`}
                >
                  <p className="text-[11px] font-heading font-semibold truncate">{p.name.replace(' Turbine', '')}</p>
                  <p className="text-xs font-bold text-primary mt-0.5">+{p.dailyRoi}%/d</p>
                </button>
              ))}
            </div>

            {/* Simulated Amount Input */}
            <div className="mb-6 p-4 rounded-xl bg-navy/80 border border-white/5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <label className="text-xs font-mono text-muted uppercase font-medium">
                  Simulated Deposit Amount
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted font-mono">$</span>
                  <input
                    type="number"
                    min={activePlan.minDeposit}
                    max={50000}
                    step="10"
                    value={calcAmount}
                    onChange={(e) => setCalcAmount(Math.max(0, Number(e.target.value)))}
                    className="input-glass py-1 px-3 font-heading font-bold text-cyan text-base w-32 sm:w-36 text-right"
                  />
                  <span className="text-xs font-mono text-muted">USDT</span>
                </div>
              </div>

              <input
                type="range"
                min={activePlan.minDeposit}
                max={Math.max(activePlan.minDeposit * 10, 5000)}
                step={activePlan.minDeposit >= 100 ? 50 : 10}
                value={calcAmount}
                onChange={(e) => setCalcAmount(Number(e.target.value))}
                className="w-full h-2 bg-navy rounded-lg appearance-none cursor-pointer accent-cyan"
              />

              <div className="flex justify-between text-[10px] text-muted font-mono mt-2">
                <span>Min: ${activePlan.minDeposit} USDT</span>
                <span>Duration: {activePlan.durationDays} Days</span>
              </div>
            </div>

            {/* 3-Card Result Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="p-4 rounded-xl bg-navy/90 border border-cyan/20 text-center">
                <span className="text-[10px] sm:text-[11px] text-muted block font-mono uppercase">Daily Profit</span>
                <span className="text-xl sm:text-2xl font-heading font-extrabold text-cyan mt-1 block">
                  +${dailyReturn.toFixed(2)}
                </span>
                <span className="text-[10px] text-secondary block mt-0.5">{activePlan.dailyRoi}% per 24 hours</span>
              </div>

              <div className="p-4 rounded-xl bg-navy/90 border border-gold/20 text-center">
                <span className="text-[10px] sm:text-[11px] text-muted block font-mono uppercase">Cycle Profit</span>
                <span className="text-xl sm:text-2xl font-heading font-extrabold text-gold mt-1 block">
                  +${totalProfit.toFixed(2)}
                </span>
                <span className="text-[10px] text-secondary block mt-0.5">Over {activePlan.durationDays} days</span>
              </div>

              <div className="p-4 rounded-xl bg-navy/90 border border-green-500/20 text-center">
                <span className="text-[10px] sm:text-[11px] text-muted block font-mono uppercase">Total Gross Balance</span>
                <span className="text-xl sm:text-2xl font-heading font-extrabold text-green-400 mt-1 block">
                  ${totalReturn.toFixed(2)}
                </span>
                <span className="text-[10px] text-secondary block mt-0.5">Principal + Total Profit</span>
              </div>
            </div>

            {/* CTA */}
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => onNavigate('register')}
                className="btn-cyan w-full sm:w-auto py-3 px-8 text-xs sm:text-sm font-bold shadow-cyan-glow"
              >
                Start Investing in {activePlan.name} <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* 4. THE 5 HYDRO-TURBINE PLANS */}
      <section className="section-spacing relative z-10">
        <div className="aqua-container">
          
          <div className="text-center mb-10 sm:mb-12">
            <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-primary">
              THE 5 HYDRO-TURBINE <span className="text-cyan">PLANS</span>
            </h2>
            <p className="text-secondary text-xs sm:text-sm mt-1.5 max-w-xl mx-auto">
              Engineered to convert deep-water kinetic and tidal pressure into guaranteed daily cryptographic yields.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto">
            {activePlans.map(plan => (
              <TurbineCard
                key={plan.id || plan.name}
                plan={plan}
                onSelect={() => onNavigate('register')}
              />
            ))}
          </div>

        </div>
      </section>

      {/* 5. HOW AQUA VAULT WORKS (6 STEPS) */}
      <section className="section-spacing bg-[#091133]/80 relative z-10 border-t border-cyan/15">
        <div className="aqua-container max-w-5xl">
          
          <div className="text-center mb-10 sm:mb-12">
            <h2 className="font-heading text-2xl sm:text-3xl font-bold text-primary">
              HOW AQUA VAULT <span className="text-cyan">WORKS</span>
            </h2>
            <p className="text-secondary text-xs sm:text-sm mt-1.5 max-w-lg mx-auto">
              A transparent, 6-step workflow connecting decentralized capital to marine kinetic yield generation.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            
            <div className="glass-card p-5 space-y-2.5">
              <div className="w-8 h-8 rounded-lg bg-cyan/20 text-cyan flex items-center justify-center font-heading font-bold text-sm">
                01
              </div>
              <h3 className="font-heading text-sm font-bold text-primary">Choose Turbine Plan</h3>
              <p className="text-xs text-secondary leading-relaxed">
                Select from 5 performance tiers starting at $20 USDT, each with fixed daily ROI and duration cycles.
              </p>
            </div>

            <div className="glass-card p-5 space-y-2.5">
              <div className="w-8 h-8 rounded-lg bg-cyan/20 text-cyan flex items-center justify-center font-heading font-bold text-sm">
                02
              </div>
              <h3 className="font-heading text-sm font-bold text-primary">Deposit BEP20 USDT</h3>
              <p className="text-xs text-secondary leading-relaxed">
                Transfer USDT to the official system BEP20 wallet address and submit your transaction hash.
              </p>
            </div>

            <div className="glass-card p-5 space-y-2.5">
              <div className="w-8 h-8 rounded-lg bg-cyan/20 text-cyan flex items-center justify-center font-heading font-bold text-sm">
                03
              </div>
              <h3 className="font-heading text-sm font-bold text-primary">Admin Verification</h3>
              <p className="text-xs text-secondary leading-relaxed">
                Platform operations verify the blockchain transaction on BscScan to confirm credit settlement.
              </p>
            </div>

            <div className="glass-card p-5 space-y-2.5">
              <div className="w-8 h-8 rounded-lg bg-cyan/20 text-cyan flex items-center justify-center font-heading font-bold text-sm">
                04
              </div>
              <h3 className="font-heading text-sm font-bold text-primary">Matrix Activated</h3>
              <p className="text-xs text-secondary leading-relaxed">
                Your investment is locked with immutable rate and duration snapshots guaranteeing cycle yields.
              </p>
            </div>

            <div className="glass-card p-5 space-y-2.5">
              <div className="w-8 h-8 rounded-lg bg-cyan/20 text-cyan flex items-center justify-center font-heading font-bold text-sm">
                05
              </div>
              <h3 className="font-heading text-sm font-bold text-primary">Daily Yield Accrual</h3>
              <p className="text-xs text-secondary leading-relaxed">
                Every 24 hours, daily returns are automatically calculated and credited to your available balance.
              </p>
            </div>

            <div className="glass-card p-5 space-y-2.5">
              <div className="w-8 h-8 rounded-lg bg-cyan/20 text-cyan flex items-center justify-center font-heading font-bold text-sm">
                06
              </div>
              <h3 className="font-heading text-sm font-bold text-primary">Fast Withdrawal</h3>
              <p className="text-xs text-secondary leading-relaxed">
                Withdraw your available balance (min $20 USDT) directly to your BEP20 wallet within 12–18 hours.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* 6. 3-LEVEL REFERRAL PROGRAM */}
      <section className="section-spacing relative z-10 border-t border-cyan/15">
        <div className="aqua-container max-w-5xl">
          
          <div className="text-center mb-10 sm:mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/15 text-gold border border-gold/30 text-xs font-mono mb-2">
              <Users2 className="w-3.5 h-3.5" /> Affiliate Architecture
            </div>
            <h2 className="font-heading text-2xl sm:text-3xl font-bold text-primary">
              3-LEVEL <span className="text-gold">REFERRAL PROGRAM</span>
            </h2>
            <p className="text-secondary text-xs sm:text-sm mt-1.5 max-w-xl mx-auto">
              Earn continuous daily commissions across 3 network tiers when invited partners activate turbines.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            
            {/* Level 1 */}
            <div className="glass-card p-5 sm:p-6 border-cyan/30 text-center relative">
              <div className="w-10 h-10 rounded-xl bg-cyan/20 text-cyan flex items-center justify-center mx-auto mb-3 font-heading font-black text-base">
                L1
              </div>
              <h3 className="font-heading text-sm sm:text-base font-bold text-primary">Direct Referrals</h3>
              <p className="text-xl sm:text-2xl font-heading font-extrabold text-cyan my-2">3.0% / Day</p>
              <p className="text-xs text-muted">Paid for <strong className="text-primary">3 Consecutive Days</strong></p>
              <div className="mt-4 pt-3 border-t border-white/10 text-xs font-mono text-cyan">
                Total: 9.0% of investment
              </div>
            </div>

            {/* Level 2 */}
            <div className="glass-card p-5 sm:p-6 border-cyan/30 text-center relative">
              <div className="w-10 h-10 rounded-xl bg-cyan/20 text-cyan flex items-center justify-center mx-auto mb-3 font-heading font-black text-base">
                L2
              </div>
              <h3 className="font-heading text-sm sm:text-base font-bold text-primary">Secondary Downline</h3>
              <p className="text-xl sm:text-2xl font-heading font-extrabold text-cyan my-2">2.0% / Day</p>
              <p className="text-xs text-muted">Paid for <strong className="text-primary">3 Consecutive Days</strong></p>
              <div className="mt-4 pt-3 border-t border-white/10 text-xs font-mono text-cyan">
                Total: 6.0% of investment
              </div>
            </div>

            {/* Level 3 */}
            <div className="glass-card-gold p-5 sm:p-6 text-center relative">
              <div className="w-10 h-10 rounded-xl bg-gold/20 text-gold flex items-center justify-center mx-auto mb-3 font-heading font-black text-base">
                L3
              </div>
              <h3 className="font-heading text-sm sm:text-base font-bold text-primary">Deep Oceanic Network</h3>
              <p className="text-xl sm:text-2xl font-heading font-extrabold text-gold my-2">0.8% / Day</p>
              <p className="text-xs text-muted">Paid for <strong className="text-primary">5 Consecutive Days</strong></p>
              <div className="mt-4 pt-3 border-t border-white/10 text-xs font-mono text-gold">
                Total: 4.0% of investment
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 7. FAQ ACCORDION */}
      <section className="section-spacing bg-[#091133]/80 relative z-10 border-t border-cyan/15">
        <div className="aqua-container max-w-3xl">
          
          <div className="text-center mb-8 sm:mb-10">
            <h2 className="font-heading text-2xl sm:text-3xl font-bold text-primary">
              FREQUENTLY ASKED <span className="text-cyan">QUESTIONS</span>
            </h2>
            <p className="text-secondary text-xs sm:text-sm mt-1.5">
              Essential answers regarding protocol mechanics, settlements, and security.
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={idx} className="glass-card overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full p-4 sm:p-4.5 text-left flex items-center justify-between gap-3 text-xs sm:text-sm font-semibold text-primary hover:text-cyan transition-colors"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown className={`w-4 h-4 text-cyan shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="px-4 sm:px-4.5 pb-4 pt-1 text-xs text-secondary leading-relaxed border-t border-white/5">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* 8. FINAL CTA */}
      <section className="section-spacing relative z-10 text-center">
        <div className="aqua-container max-w-3xl">
          <div className="glass-card p-6 sm:p-10 border border-cyan/40">
            <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-primary">
              READY TO ACCELERATE YOUR <span className="text-cyan">YIELDS?</span>
            </h2>
            <p className="text-secondary text-xs sm:text-sm mt-2 max-w-md mx-auto">
              Join investors globally utilizing algorithmic ocean-energy hydrodynamic generators.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => onNavigate('register')}
                className="btn-cyan w-full sm:w-auto py-3 px-8 text-xs sm:text-sm font-bold shadow-cyan-glow"
              >
                Create Account <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate('login')}
                className="btn-outline-cyan w-full sm:w-auto py-3 px-8 text-xs sm:text-sm font-bold"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 9. PUBLIC FOOTER */}
      <footer className="py-8 sm:py-10 bg-navy border-t border-cyan/15 relative z-10 text-center text-xs text-muted">
        <div className="aqua-container">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Waves className="w-4 h-4 text-cyan" />
            <span className="font-heading font-bold text-sm text-primary tracking-wider">AQUA VAULT</span>
          </div>
          <p className="text-[11px] text-muted max-w-md mx-auto">
            High-yield marine hydrodynamic asset management protocol. Settle transactions on Binance Smart Chain (BEP20).
          </p>
          <p className="text-[10px] text-muted/60 mt-3 font-mono">
            © 2026 AQUA VAULT. All rights reserved.
          </p>
        </div>
      </footer>

    </div>
  );
}
