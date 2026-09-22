import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { 
  ShieldAlert, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  Flame, 
  Users2, 
  Play, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink,
  Clock,
  TrendingUp,
  RefreshCw
} from 'lucide-react';

export default function AdminDashboard({ onNavigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [engineLoading, setEngineLoading] = useState(false);
  const [engineResult, setEngineResult] = useState(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const res = await api.getAdminDashboard();
      if (res) setData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleRunDailyEngine = async () => {
    setEngineLoading(true);
    setEngineResult(null);
    try {
      const res = await api.runDailyEngine();
      setEngineResult(res);
      loadDashboard();
    } catch (err) {
      setEngineResult({ error: err.message });
    } finally {
      setEngineLoading(false);
    }
  };

  const m = data?.metrics || {};

  return (
    <div className="space-y-8 pb-12">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-950/40 text-gold border border-gold/40 text-xs font-mono mb-2">
            <ShieldAlert className="w-3.5 h-3.5 text-gold animate-pulse" /> Protected Operations Console
          </div>
          <h1 className="font-heading text-3xl font-extrabold text-primary">
            ADMIN <span className="text-gold">CONTROL CENTER</span>
          </h1>
          <p className="text-xs sm:text-sm text-secondary mt-1">
            Real-time manual financial operations, transaction verification, and simulation engine controls.
          </p>
        </div>

        {/* 1-Click Simulation Runner Tool */}
        <div className="p-4 rounded-2xl glass-card-gold flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div>
            <span className="text-xs font-heading font-bold text-gold block">
              Daily Earnings & Referral Simulator
            </span>
            <span className="text-[10px] text-muted font-mono">
              Trigger 24h cycle calculations on demand
            </span>
          </div>
          <button
            onClick={handleRunDailyEngine}
            disabled={engineLoading}
            className="btn-gold py-2.5 px-4 text-xs font-bold shrink-0"
          >
            <Play className={`w-3.5 h-3.5 ${engineLoading ? 'animate-spin' : ''}`} />
            {engineLoading ? 'Running Engine...' : 'Trigger Daily Cycle'}
          </button>
        </div>
      </div>

      {/* Engine Result Notification */}
      {engineResult && (
        <div className={`p-4 rounded-xl text-xs flex items-start gap-3 ${
          engineResult.error 
            ? 'bg-red-950/80 border border-red-500/40 text-red-200' 
            : 'bg-green-950/80 border border-green-500/40 text-green-300'
        }`}>
          {engineResult.error ? (
            <AlertCircle className="w-5 h-5 text-danger shrink-0" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
          )}
          <div>
            <strong className="block font-heading text-sm">
              {engineResult.error ? 'Simulation Error' : 'Engine Execution Succeeded!'}
            </strong>
            <p className="mt-0.5">
              {engineResult.error || engineResult.message}
            </p>
            {engineResult.result && (
              <p className="text-[11px] font-mono mt-1 text-primary">
                Processed: ${engineResult.result.totalInvestmentEarnings} ROI + ${engineResult.result.totalReferralCommissions} referral rewards across {engineResult.result.investmentsCount} active turbines.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Primary KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Pending Deposits Queue */}
        <div 
          onClick={() => onNavigate('rashidadmin/deposits')}
          className="glass-card p-5 border-amber-500/30 hover:border-amber-400 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-muted mb-2">
            <span className="text-xs font-mono uppercase">Pending Deposits</span>
            <span className="badge-warning text-xs">{m.pendingDepositsCount || 0} Waiting</span>
          </div>
          <p className="font-heading text-2xl sm:text-3xl font-extrabold text-amber-300">
            ${(m.pendingDepositsAmount || 0).toLocaleString()}
          </p>
          <span className="text-[11px] text-cyan hover:underline mt-2 block font-mono">
            Review Deposit Queue →
          </span>
        </div>

        {/* Pending Withdrawals Queue */}
        <div 
          onClick={() => onNavigate('rashidadmin/withdrawals')}
          className="glass-card p-5 border-cyan/30 hover:border-cyan cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-muted mb-2">
            <span className="text-xs font-mono uppercase">Pending Withdrawals</span>
            <span className="badge-warning text-xs">{m.pendingWithdrawalsCount || 0} Waiting</span>
          </div>
          <p className="font-heading text-2xl sm:text-3xl font-extrabold text-cyan">
            ${(m.pendingWithdrawalsAmount || 0).toLocaleString()}
          </p>
          <span className="text-[11px] text-cyan hover:underline mt-2 block font-mono">
            Process Payout Checklist →
          </span>
        </div>

        {/* Total Active Turbine Investments */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between text-muted mb-2">
            <span className="text-xs font-mono uppercase">Active Turbine Volume</span>
            <Flame className="w-4 h-4 text-cyan" />
          </div>
          <p className="font-heading text-2xl sm:text-3xl font-extrabold text-primary">
            ${(m.activeInvestmentsAmount || 0).toLocaleString()}
          </p>
          <span className="text-[11px] text-muted block mt-2">
            Across {m.activeInvestmentsCount || 0} deployed turbines
          </span>
        </div>

        {/* Total Users */}
        <div 
          onClick={() => onNavigate('rashidadmin/users')}
          className="glass-card p-5 cursor-pointer hover:border-cyan/30 transition-all"
        >
          <div className="flex items-center justify-between text-muted mb-2">
            <span className="text-xs font-mono uppercase">Registered Investors</span>
            <Users2 className="w-4 h-4 text-gold" />
          </div>
          <p className="font-heading text-2xl sm:text-3xl font-extrabold text-gold">
            {m.totalUsers || 0} <span className="text-xs font-normal text-muted">Users</span>
          </p>
          <span className="text-[11px] text-gold hover:underline mt-2 block font-mono">
            Manage User Accounts →
          </span>
        </div>

      </div>

      {/* Secondary Financial Totals Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-navy/80 border border-white/10 text-center">
          <span className="text-[11px] text-muted uppercase font-mono block">Total Approved Deposits</span>
          <span className="text-xl font-heading font-bold text-green-400 mt-1 block">
            ${(m.totalDeposited || 0).toLocaleString()}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-navy/80 border border-white/10 text-center">
          <span className="text-[11px] text-muted uppercase font-mono block">Total Completed Payouts</span>
          <span className="text-xl font-heading font-bold text-primary mt-1 block">
            ${(m.totalWithdrawn || 0).toLocaleString()}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-navy/80 border border-white/10 text-center">
          <span className="text-[11px] text-muted uppercase font-mono block">Total Turbine Profit Paid</span>
          <span className="text-xl font-heading font-bold text-cyan mt-1 block">
            ${(m.totalEarningsPaid || 0).toLocaleString()}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-navy/80 border border-white/10 text-center">
          <span className="text-[11px] text-muted uppercase font-mono block">Total Referral Paid</span>
          <span className="text-xl font-heading font-bold text-gold mt-1 block">
            ${(m.totalReferralPaid || 0).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Fast Action Tables Grid: Recent Deposits & Recent Withdrawals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Pending / Recent Deposits */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading text-sm font-bold text-primary flex items-center gap-2">
              <ArrowDownCircle className="w-4 h-4 text-cyan" /> DEPOSIT ACTION QUEUE
            </h3>
            <button
              onClick={() => onNavigate('rashidadmin/deposits')}
              className="text-xs text-cyan hover:underline font-mono"
            >
              View All Deposits →
            </button>
          </div>

          {(data?.recentDeposits || []).length > 0 ? (
            <div className="space-y-3">
              {data.recentDeposits.map(d => (
                <div key={d.id} className="p-3 rounded-xl bg-navy/80 border border-white/5 flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-primary">{d.username}</strong>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                        d.status === 'APPROVED' ? 'badge-success' :
                        d.status === 'PENDING' ? 'badge-warning' : 'badge-danger'
                      }`}>{d.status}</span>
                    </div>
                    <p className="text-[11px] text-muted font-mono mt-0.5">
                      TX: {d.txHash.slice(0, 10)}... • {d.planName || 'Wallet Credit'}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-heading font-bold text-cyan text-sm block">
                      ${d.amount.toFixed(2)}
                    </span>
                    {d.status === 'PENDING' && (
                      <button
                        onClick={() => onNavigate('rashidadmin/deposits')}
                        className="text-[11px] text-gold hover:underline font-mono"
                      >
                        Action →
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted text-center py-6">No deposits recorded.</p>
          )}
        </div>

        {/* Pending / Recent Withdrawals */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading text-sm font-bold text-primary flex items-center gap-2">
              <ArrowUpCircle className="w-4 h-4 text-cyan" /> WITHDRAWAL PAYOUT QUEUE
            </h3>
            <button
              onClick={() => onNavigate('rashidadmin/withdrawals')}
              className="text-xs text-cyan hover:underline font-mono"
            >
              View All Withdrawals →
            </button>
          </div>

          {(data?.recentWithdrawals || []).length > 0 ? (
            <div className="space-y-3">
              {data.recentWithdrawals.map(w => (
                <div key={w.id} className="p-3 rounded-xl bg-navy/80 border border-white/5 flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-primary">{w.username}</strong>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                        w.status === 'COMPLETED' ? 'badge-success' :
                        w.status === 'REJECTED' ? 'badge-danger' : 'badge-warning'
                      }`}>{w.status}</span>
                    </div>
                    <p className="text-[11px] text-muted font-mono mt-0.5 truncate max-w-[180px]">
                      Dest: {w.walletAddress.slice(0, 8)}...{w.walletAddress.slice(-6)}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-heading font-bold text-green-400 text-sm block">
                      ${w.netAmount.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-muted font-mono">Gross: ${w.amount.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted text-center py-6">No withdrawals recorded.</p>
          )}
        </div>

      </div>

    </div>
  );
}
