import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { FileText, ArrowDownLeft, ArrowUpRight, RefreshCw, Filter } from 'lucide-react';

export default function Transactions({ onNavigate }) {
  const [transactions, setTransactions] = useState([]);
  const [filterType, setFilterType] = useState('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const data = await api.getLedger(200);
      if (data?.transactions) setTransactions(data.transactions);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = filterType === 'ALL' 
    ? transactions 
    : transactions.filter(t => t.type === filterType);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Transaction History
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Complete cryptographic audit log of all deposits, plan payouts, and withdrawals.
          </p>
        </div>

        <button
          type="button"
          onClick={loadTransactions}
          className="btn-secondary text-xs !py-2 !px-3 self-start sm:self-auto rounded-xl flex items-center gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 bg-white/[0.03] p-1.5 rounded-xl border border-white/[0.06]">
        {[
          { id: 'ALL', label: 'All' },
          { id: 'investment_profit', label: 'Plan Profits' },
          { id: 'referral_commission', label: 'Commissions' },
          { id: 'deposit_credit', label: 'Deposits' },
          { id: 'investment_activation', label: 'Activations' },
          { id: 'withdrawal_hold', label: 'Withdrawals' }
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilterType(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filterType === tab.id
                ? 'bg-cyan-500/20 text-cyan-300 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Ledger Table */}
      <div className="clean-card p-5 bg-[#111726]">
        {filtered.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/[0.08] text-slate-400 text-[11px] uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Amount</th>
                  <th className="py-3 px-3">Direction</th>
                  <th className="py-3 px-3">Balance After</th>
                  <th className="py-3 px-3">Details</th>
                  <th className="py-3 px-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {filtered.map(tx => (
                  <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                        tx.type === 'deposit_credit' ? 'bg-cyan-500/15 text-cyan-300' :
                        tx.type === 'investment_profit' ? 'bg-emerald-500/15 text-emerald-300' :
                        tx.type === 'referral_commission' ? 'bg-purple-500/15 text-purple-300' :
                        tx.type === 'withdrawal_hold' ? 'bg-amber-500/15 text-amber-300' :
                        'bg-white/10 text-slate-300'
                      }`}>
                        {tx.type.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-sm">
                      {tx.direction === 'credit' ? (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <ArrowDownLeft className="w-3.5 h-3.5" /> +${tx.amount.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-rose-400 flex items-center gap-1">
                          <ArrowUpRight className="w-3.5 h-3.5" /> -${tx.amount.toFixed(2)}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 uppercase font-mono text-[11px] text-slate-400">
                      {tx.direction}
                    </td>
                    <td className="py-3 px-3 font-mono font-semibold text-white">
                      ${tx.balanceAfter.toFixed(2)} USDT
                    </td>
                    <td className="py-3 px-3 text-slate-300 max-w-xs truncate">
                      {tx.note || (tx.referenceType ? `${tx.referenceType} #${tx.referenceId}` : '—')}
                    </td>
                    <td className="py-3 px-3 text-slate-400 font-mono whitespace-nowrap text-[11px]">
                      {new Date(tx.createdAt).toLocaleDateString()} {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-xs text-slate-400">
            No transactions found for the selected filter.
          </div>
        )}
      </div>

    </div>
  );
}
