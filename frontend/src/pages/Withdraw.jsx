import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { 
  ArrowUpRight, 
  Wallet, 
  ShieldCheck, 
  AlertCircle, 
  Check, 
  Clock, 
  Percent,
  Copy
} from 'lucide-react';

export default function Withdraw({ onNavigate }) {
  const { user, refreshUser } = useAuth();
  const [withdrawals, setWithdrawals] = useState([]);
  const [amount, setAmount] = useState('100');
  const [walletAddress, setWalletAddress] = useState('');
  const [selectedTier, setSelectedTier] = useState('abyss'); // default zero fee
  const [tierFeePercent, setTierFeePercent] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const tiers = [
    { id: 'coral', name: 'Coral Stream', fee: 10, label: '10% Fee' },
    { id: 'deep', name: 'Deep Current', fee: 6, label: '6% Fee' },
    { id: 'pulse', name: 'Ocean Pulse', fee: 4, label: '4% Fee' },
    { id: 'abyss', name: 'Abyss Flow', fee: 0, label: '0% VIP', isVip: true },
    { id: 'titan', name: 'Titan Current', fee: 0, label: '0% VIP', isVip: true },
  ];

  useEffect(() => {
    loadWithdrawalData();
    if (user?.bep20Address) {
      setWalletAddress(user.bep20Address);
    }
  }, [user?.bep20Address]);

  const loadWithdrawalData = async () => {
    try {
      await refreshUser();
      const data = await api.getWithdrawals();
      if (data?.withdrawals) setWithdrawals(data.withdrawals);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSelectTier = (tier) => {
    setSelectedTier(tier.id);
    setTierFeePercent(tier.fee);
  };

  const setMaxAmount = () => {
    if (user?.balance) {
      setAmount(user.balance.toString());
    }
  };

  const pasteAddress = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setWalletAddress(text.trim());
    } catch (e) {
      // Fallback
    }
  };

  // Fee and Net calculation
  const numericAmount = parseFloat(amount) || 0;
  const feeAmount = (numericAmount * tierFeePercent) / 100;
  const netAmount = Math.max(0, numericAmount - feeAmount);

  const handleWithdrawSubmit = async (e) => {
    e.preventDefault();
    if (numericAmount < 10) {
      setError('Minimum withdrawal amount is $10.00 USDT.');
      return;
    }
    if ((user?.balance || 0) < numericAmount) {
      setError(`Insufficient balance. You have $${(user?.balance || 0).toFixed(2)} USDT available.`);
      return;
    }
    if (!walletAddress.trim() || !walletAddress.startsWith('0x') || walletAddress.length < 30) {
      setError('Please provide a valid BEP-20 wallet address starting with 0x.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await api.requestWithdrawal({
        amount: numericAmount,
        walletAddress: walletAddress.trim(),
        tierFeePercent: tierFeePercent
      });

      if (res?.withdrawal || res?.success) {
        setSuccess(`Withdrawal request of $${numericAmount.toFixed(2)} USDT submitted successfully!`);
        await refreshUser();
        await loadWithdrawalData();
      } else {
        setError(res?.message || 'Withdrawal request failed.');
      }
    } catch (err) {
      setError(err.message || 'Error occurred while submitting withdrawal.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
      
      {/* Header */}
      <div className="text-center max-w-xl mx-auto space-y-1.5">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Withdraw Funds
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">
          Transfer your available balance to your personal external BEP-20 USDT wallet.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Withdrawal Form (7 Cols) */}
        <div className="lg:col-span-7 clean-card p-6 sm:p-7 bg-[#111726]">
          <h2 className="text-lg font-bold text-white mb-4">Request Withdrawal</h2>

          <form onSubmit={handleWithdrawSubmit} className="space-y-4">
            
            {/* Amount Input */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Withdrawal Amount (USDT)
                </label>
                <span className="text-xs text-slate-400">
                  Available: <span className="text-cyan-400 font-bold font-mono">${(user?.balance || 0).toFixed(2)}</span>
                </span>
              </div>

              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-sm">$</span>
                <input
                  type="number"
                  step="any"
                  min="10"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="10.00"
                  className="w-full pl-7 pr-16 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-white font-mono text-sm outline-none focus:border-cyan-500"
                  required
                />
                <button
                  type="button"
                  onClick={setMaxAmount}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30"
                >
                  MAX
                </button>
              </div>
            </div>

            {/* BEP20 Wallet Address */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Destination BEP-20 Wallet Address
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
                  placeholder="0x..."
                  className="w-full pl-3 pr-16 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-white font-mono text-xs outline-none focus:border-cyan-500"
                  required
                />
                <button
                  type="button"
                  onClick={pasteAddress}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded text-[10px] font-bold bg-white/[0.08] text-slate-300 hover:bg-white/[0.15]"
                >
                  PASTE
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Ensure this address is on Binance Smart Chain (BEP-20). Transfers to incorrect networks cannot be recovered.
              </p>
            </div>

            {/* Plan Tier Fee Selector */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Select Your Plan Tier (Exit Fee)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {tiers.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleSelectTier(t)}
                    className={`p-2 rounded-xl text-left text-xs transition-all border ${
                      selectedTier === t.id
                        ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-300 font-semibold'
                        : 'bg-white/[0.03] border-white/[0.08] text-slate-300 hover:bg-white/[0.06]'
                    }`}
                  >
                    <span className="block truncate font-bold text-[11px]">{t.name}</span>
                    <span className={`text-[10px] font-mono ${t.fee === 0 ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}>
                      {t.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>{success}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 text-xs font-semibold rounded-xl mt-2"
            >
              {loading ? 'Processing Withdrawal...' : 'Confirm & Withdraw'}
            </button>
          </form>
        </div>

        {/* Right: Summary & SLA Breakdown (5 Cols) */}
        <div className="lg:col-span-5 clean-card p-6 bg-[#111726] flex flex-col justify-between">
          <div className="space-y-4">
            <h2 className="text-base font-bold text-white">Summary Breakdown</h2>

            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2.5 text-xs">
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-slate-400">Withdrawal Amount:</span>
                <span className="font-mono font-semibold text-white">${numericAmount.toFixed(2)} USDT</span>
              </div>

              <div className="flex justify-between items-center text-slate-300">
                <span className="text-slate-400">Tier Fee ({tierFeePercent}%):</span>
                <span className={`font-mono font-semibold ${tierFeePercent === 0 ? 'text-emerald-400' : 'text-slate-300'}`}>
                  -${feeAmount.toFixed(2)} USDT
                </span>
              </div>

              <div className="pt-2.5 border-t border-white/[0.06] flex justify-between items-center">
                <span className="font-semibold text-white">Net to Receive:</span>
                <span className="text-xl font-extrabold text-emerald-400 font-mono">
                  ${netAmount.toFixed(2)} USDT
                </span>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white">Fast Settlement SLA</p>
                  <p className="text-[11px] text-slate-400">Withdrawals are processed automatically within 1 to 24 hours.</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white">Zero Hidden Charges</p>
                  <p className="text-[11px] text-slate-400">Abyss and Titan VIP tiers enjoy 0% withdrawal fees forever.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/[0.06] text-[11px] text-slate-400">
            Min Withdrawal: $10.00 USDT • Network: BEP-20
          </div>
        </div>

      </div>

      {/* Withdrawal History */}
      <div className="clean-card p-5 sm:p-6 bg-[#111726]">
        <h2 className="text-base font-bold text-white mb-4">Your Recent Withdrawals</h2>
        {withdrawals.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No withdrawal requests recorded yet.
          </div>
        ) : (
          <div className="divide-y divide-white/[0.05] overflow-x-auto">
            {withdrawals.map((w) => (
              <div key={w.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
                    <ArrowUpRight className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-white font-mono">
                      -${w.amount?.toFixed(2)} USDT
                    </p>
                    <p className="text-[11px] text-slate-400 font-mono">
                      To: {w.walletAddress ? `${w.walletAddress.slice(0, 8)}...${w.walletAddress.slice(-6)}` : 'Wallet'}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold capitalize ${
                    w.status === 'completed' || w.status === 'approved'
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : w.status === 'pending'
                      ? 'bg-amber-500/10 text-amber-400'
                      : 'bg-rose-500/10 text-rose-400'
                  }`}>
                    {w.status || 'pending'}
                  </span>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {new Date(w.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
