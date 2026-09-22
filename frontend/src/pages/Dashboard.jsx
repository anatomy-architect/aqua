import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  TrendingUp, 
  Wallet, 
  Coins, 
  Users, 
  Clock, 
  ChevronRight, 
  Copy, 
  Check, 
  Sparkles,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

export default function Dashboard({ onNavigate }) {
  const { user, refreshUser } = useAuth();
  const [investments, setInvestments] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      await refreshUser();
      const [invData, txData] = await Promise.all([
        api.getInvestments(),
        api.getLedger(10)
      ]);
      if (invData?.investments) setInvestments(invData.investments);
      if (txData?.transactions) setTransactions(txData.transactions);
    } catch (e) {
      console.error('Failed to load dashboard data:', e);
    } finally {
      setLoading(false);
    }
  };

  const activeInvestments = investments.filter(i => i.status === 'active');
  const totalInvested = activeInvestments.reduce((sum, i) => sum + (i.investedAmount || 0), 0);
  const totalEarned = investments.reduce((sum, i) => sum + (i.totalEarned || 0), 0);
  const referralEarnings = user?.totalReferralEarned || 0;

  const referralLink = `${window.location.origin}/register?ref=${user?.referralCode || ''}`;

  const copyReferral = () => {
    navigator.clipboard.writeText(referralLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const filteredTransactions = transactions.filter(t => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'deposits') return t.type === 'deposit';
    if (activeFilter === 'withdrawals') return t.type === 'withdrawal';
    if (activeFilter === 'profits') return t.type === 'profit' || t.type === 'commission';
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
      
      {/* 1. Welcome & Main Portfolio Balance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Balance Card (Spans 2 cols on desktop) */}
        <div className="lg:col-span-2 clean-card p-6 sm:p-8 bg-gradient-to-br from-[#131B2E] via-[#0E1524] to-[#0A0E1A] relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Total Available Balance
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                BEP-20 Network
              </span>
            </div>

            <div className="flex items-baseline gap-2 mt-1">
              <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight font-mono">
                ${(user?.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h1>
              <span className="text-base sm:text-lg font-semibold text-cyan-400">USDT</span>
            </div>

            <p className="text-xs sm:text-sm text-slate-400 mt-2">
              Welcome back, <span className="text-slate-200 font-semibold">{user?.username}</span>. Your daily rewards are calculated automatically.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-3 mt-6 sm:mt-8 pt-4 border-t border-white/[0.06]">
            <button
              type="button"
              onClick={() => onNavigate('deposit')}
              className="flex-1 btn-primary py-3 text-sm font-semibold rounded-xl shadow-lg shadow-cyan-500/20"
            >
              <ArrowDownLeft className="w-4 h-4" />
              Deposit Funds
            </button>
            <button
              type="button"
              onClick={() => onNavigate('withdraw')}
              className="flex-1 btn-secondary py-3 text-sm font-semibold rounded-xl"
            >
              <ArrowUpRight className="w-4 h-4 text-emerald-400" />
              Withdraw
            </button>
          </div>
        </div>

        {/* Quick Plan CTA Banner */}
        <div className="clean-card p-6 sm:p-7 bg-[#101625] flex flex-col justify-between border-cyan-500/20">
          <div>
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-4">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white">Investment Plans</h3>
            <p className="text-xs sm:text-sm text-slate-400 mt-1.5 leading-relaxed">
              Earn from <span className="text-cyan-400 font-semibold">0.85%</span> up to <span className="text-cyan-400 font-semibold">3.50% daily</span> with our automated yield contracts.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-white/[0.06]">
            <button
              type="button"
              onClick={() => onNavigate('plans')}
              className="w-full py-2.5 px-4 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              Explore Plans
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Key Metrics Trio */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        
        <div className="clean-card p-5 bg-[#111726]">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Active Investments</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white font-mono">
              ${totalInvested.toFixed(2)}
            </span>
            <span className="text-xs text-slate-400">USDT</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {activeInvestments.length} active plan{activeInvestments.length !== 1 ? 's' : ''} running
          </p>
        </div>

        <div className="clean-card p-5 bg-[#111726]">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Total Profits Accrued</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-400 font-mono">
              +${totalEarned.toFixed(2)}
            </span>
            <span className="text-xs text-slate-400">USDT</span>
          </div>
          <p className="text-[11px] text-emerald-400/80 mt-1">
            Paid automatically to balance
          </p>
        </div>

        <div className="clean-card p-5 bg-[#111726]">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Affiliate Commissions</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-purple-300 font-mono">
              ${referralEarnings.toFixed(2)}
            </span>
            <span className="text-xs text-slate-400">USDT</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            3-level referral network
          </p>
        </div>
      </div>

      {/* 3. Active Investments Section */}
      <div className="clean-card p-5 sm:p-6 bg-[#111726]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white">Active Plans</h2>
            <p className="text-xs text-slate-400">Your currently running automated contracts</p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('plans')}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1"
          >
            New Plan <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {activeInvestments.length === 0 ? (
          <div className="py-10 text-center flex flex-col items-center justify-center bg-white/[0.02] rounded-xl border border-white/[0.04]">
            <div className="w-12 h-12 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-3">
              <Sparkles className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-white">No active investment plans</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              Activate your first plan to start earning daily returns credited straight to your balance.
            </p>
            <button
              type="button"
              onClick={() => onNavigate('plans')}
              className="mt-4 btn-primary text-xs !py-2 !px-4"
            >
              View Investment Plans
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeInvestments.map((inv) => {
              const daysRemaining = Math.max(0, inv.durationDays - (inv.daysElapsed || 0));
              const progressPercent = Math.min(100, Math.round(((inv.daysElapsed || 0) / inv.durationDays) * 100));

              return (
                <div 
                  key={inv.id} 
                  className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.07] hover:border-cyan-500/30 transition-all flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider">
                        {inv.planName || 'Hydro Tier'}
                      </span>
                      <p className="text-xl font-bold text-white font-mono mt-0.5">
                        ${inv.investedAmount?.toFixed(2)} USDT
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Active
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-white/[0.05]">
                    <div>
                      <span className="text-slate-400 text-[11px]">Daily Return</span>
                      <p className="font-semibold text-emerald-400">
                        +${inv.dailyEarnings?.toFixed(2)} ({inv.dailyRoi}%)
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px]">Total Accrued</span>
                      <p className="font-semibold text-white font-mono">
                        ${inv.totalEarned?.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                      <span>Progress ({inv.daysElapsed || 0}/{inv.durationDays}d)</span>
                      <span>{daysRemaining} days left</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Recent Transactions & Referral Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recent Activity Table (2 Cols) */}
        <div className="lg:col-span-2 clean-card p-5 sm:p-6 bg-[#111726]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">Recent Transactions</h2>
              <p className="text-xs text-slate-400">Real-time ledger of your deposits and withdrawals</p>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1 bg-white/[0.04] p-1 rounded-xl text-xs">
              {['all', 'deposits', 'withdrawals', 'profits'].map(tab => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveFilter(tab)}
                  className={`px-2.5 py-1 rounded-lg capitalize transition-colors ${
                    activeFilter === tab 
                      ? 'bg-cyan-500/20 text-cyan-300 font-semibold' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {filteredTransactions.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No transactions recorded yet.
            </div>
          ) : (
            <div className="divide-y divide-white/[0.05] overflow-x-auto">
              {filteredTransactions.map((tx) => {
                const isDeposit = tx.type === 'deposit';
                const isWithdraw = tx.type === 'withdrawal';
                const isProfit = tx.type === 'profit' || tx.type === 'commission';

                return (
                  <div key={tx.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isDeposit 
                          ? 'bg-cyan-500/10 text-cyan-400' 
                          : isWithdraw 
                          ? 'bg-amber-500/10 text-amber-400' 
                          : 'bg-emerald-500/10 text-emerald-400'
                      }`}>
                        {isDeposit && <ArrowDownLeft className="w-4 h-4" />}
                        {isWithdraw && <ArrowUpRight className="w-4 h-4" />}
                        {isProfit && <Coins className="w-4 h-4" />}
                      </div>

                      <div className="min-w-0">
                        <p className="font-semibold text-white capitalize truncate">
                          {tx.type} {tx.note ? `• ${tx.note}` : ''}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {new Date(tx.createdAt).toLocaleDateString()} at {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className={`font-mono font-bold ${
                        isDeposit || isProfit ? 'text-emerald-400' : 'text-slate-200'
                      }`}>
                        {isDeposit || isProfit ? '+' : '-'}${Math.abs(tx.amount || 0).toFixed(2)} USDT
                      </p>
                      <span className={`inline-block text-[10px] font-medium capitalize ${
                        tx.status === 'approved' || tx.status === 'completed' 
                          ? 'text-emerald-400' 
                          : tx.status === 'pending' 
                          ? 'text-amber-400' 
                          : 'text-slate-400'
                      }`}>
                        {tx.status || 'completed'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Affiliate Quick Card */}
        <div className="clean-card p-5 sm:p-6 bg-[#111726] flex flex-col justify-between">
          <div>
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-3">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Invite & Earn</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Earn commissions across 3 levels on all referee deposits:
            </p>
            <div className="grid grid-cols-3 gap-2 text-center mt-3 py-2 bg-white/[0.03] rounded-xl border border-white/[0.05]">
              <div>
                <span className="text-[10px] text-slate-400 block">Level 1</span>
                <span className="text-xs font-bold text-purple-400 font-mono">8.0%</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Level 2</span>
                <span className="text-xs font-bold text-purple-400 font-mono">4.0%</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Level 3</span>
                <span className="text-xs font-bold text-purple-400 font-mono">2.0%</span>
              </div>
            </div>

            {/* Link Box */}
            <div className="mt-4">
              <span className="text-[11px] text-slate-400 block mb-1">Your Referral Link</span>
              <div className="flex items-center gap-2 p-2 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                <input 
                  type="text" 
                  readOnly 
                  value={referralLink} 
                  className="bg-transparent text-xs text-slate-300 w-full outline-none font-mono truncate"
                />
                <button
                  type="button"
                  onClick={copyReferral}
                  className="p-1.5 rounded-lg bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 transition-colors shrink-0"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('team')}
            className="mt-4 w-full py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-semibold text-slate-200 transition-colors"
          >
            View Full Team Stats
          </button>
        </div>
      </div>

    </div>
  );
}
