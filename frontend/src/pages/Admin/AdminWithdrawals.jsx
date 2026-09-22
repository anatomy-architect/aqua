import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import Modal from '../../components/Modal';
import { 
  ArrowUpCircle, 
  CheckCircle2, 
  XCircle, 
  ExternalLink, 
  Clock, 
  AlertCircle, 
  ShieldCheck,
  Send,
  Copy,
  Check
} from 'lucide-react';

export default function AdminWithdrawals() {
  const [withdrawals, setWithdrawals] = useState([]);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);
  const [actionType, setActionType] = useState('process'); // 'process' | 'reject'
  
  // Payout Checklist State
  const [stepVerified, setStepVerified] = useState(false);
  const [stepSent, setStepSent] = useState(false);
  const [payoutTxHash, setPayoutTxHash] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [copied, setCopied] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadWithdrawals();
  }, [filterStatus]);

  const loadWithdrawals = async () => {
    try {
      const res = await api.getAdminWithdrawals(filterStatus);
      if (res?.withdrawals) setWithdrawals(res.withdrawals);
    } catch (e) {
      console.error(e);
    }
  };

  const openActionModal = (withdrawal, type) => {
    setSelectedWithdrawal(withdrawal);
    setActionType(type);
    setStepVerified(false);
    setStepSent(false);
    setPayoutTxHash('');
    setAdminNote(type === 'process' ? 'Payout sent via BEP20 ledger hot/cold wallet' : 'Destination wallet invalid or flagged');
    setError('');
    setSuccess('');
  };

  const copyAddress = (addr) => {
    navigator.clipboard.writeText(addr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExecuteAction = async () => {
    if (!selectedWithdrawal) return;
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (actionType === 'process') {
        if (!payoutTxHash || payoutTxHash.trim().length < 10) {
          setError('Valid on-chain payout transaction hash is required.');
          setLoading(false);
          return;
        }

        await api.processWithdrawal(selectedWithdrawal.id, {
          txHash: payoutTxHash.trim(),
          adminNote
        });
        setSuccess(`Withdrawal #${selectedWithdrawal.id} marked COMPLETED and ledger settled!`);
      } else {
        await api.rejectWithdrawal(selectedWithdrawal.id, {
          reason: adminNote
        });
        setSuccess(`Withdrawal #${selectedWithdrawal.id} rejected. Held funds have been released back to user.`);
      }

      await loadWithdrawals();
      setTimeout(() => setSelectedWithdrawal(null), 1400);
    } catch (err) {
      setError(err.message || 'Action failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan/15 text-cyan border border-cyan/30 text-xs font-mono mb-2">
            <ArrowUpCircle className="w-3.5 h-3.5 text-cyan" /> Operations Console
          </div>
          <h1 className="font-heading text-2xl font-bold text-primary">
            WITHDRAWAL <span className="text-cyan">PAYOUT QUEUE</span>
          </h1>
          <p className="text-xs text-muted">
            Manual BEP20 payout checklist: verify address → send external USDT → record TX hash → settle.
          </p>
        </div>

        {/* Filter Badges */}
        <div className="flex items-center gap-2">
          {['ALL', 'SUBMITTED', 'COMPLETED', 'REJECTED'].map(st => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all ${
                filterStatus === st
                  ? 'bg-cyan text-navy shadow-cyan-glow'
                  : 'bg-navy/80 border border-white/10 text-muted hover:border-cyan/30'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Withdrawals Table */}
      <div className="glass-card p-6">
        {withdrawals.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="vault-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>User</th>
                  <th>Gross Amount</th>
                  <th>Fee</th>
                  <th>Net Payout</th>
                  <th>Destination Address</th>
                  <th>TX Hash</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {withdrawals.map(w => (
                  <tr key={w.id}>
                    <td className="font-mono text-xs text-muted">#{w.id}</td>
                    <td>
                      <strong className="text-primary block">{w.username}</strong>
                      <span className="text-[11px] text-muted font-mono">{w.email}</span>
                    </td>
                    <td className="font-mono text-sm text-primary">
                      ${w.amount.toFixed(2)}
                    </td>
                    <td className="text-xs text-muted font-mono">
                      -${w.feeAmount.toFixed(2)} ({w.feeRate}%)
                    </td>
                    <td className="font-heading font-bold text-sm text-green-400">
                      ${w.netAmount.toFixed(2)} USDT
                    </td>
                    <td className="font-mono text-xs text-secondary truncate max-w-[140px]" title={w.walletAddress}>
                      {w.walletAddress.slice(0, 8)}...{w.walletAddress.slice(-6)}
                    </td>
                    <td className="font-mono text-xs">
                      {w.txHash ? (
                        <a
                          href={`https://bscscan.com/tx/${w.txHash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-cyan hover:underline"
                        >
                          {w.txHash.slice(0, 8)}... <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-muted text-[11px]">Unsent</span>
                      )}
                    </td>
                    <td>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold font-mono ${
                        w.status === 'COMPLETED' ? 'badge-success' :
                        w.status === 'REJECTED' ? 'badge-danger' : 'badge-warning'
                      }`}>
                        {w.status}
                      </span>
                    </td>
                    <td>
                      {w.status === 'SUBMITTED' ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openActionModal(w, 'process')}
                            className="p-1.5 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/40 text-xs font-semibold flex items-center gap-1"
                            title="Process Payout"
                          >
                            <Send className="w-3.5 h-3.5" /> Payout
                          </button>
                          <button
                            onClick={() => openActionModal(w, 'reject')}
                            className="p-1.5 rounded-lg bg-red-500/20 text-danger hover:bg-red-500/30 border border-red-500/40 text-xs font-semibold flex items-center gap-1"
                            title="Reject & Release Hold"
                          >
                            <XCircle className="w-3.5 h-3.5" /> Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-muted font-mono">Settled</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-xs text-muted">
            No withdrawal records found.
          </div>
        )}
      </div>

      {/* Manual-Send Checklist Modal (PRD Phase 6 & 7) */}
      <Modal
        isOpen={!!selectedWithdrawal}
        onClose={() => setSelectedWithdrawal(null)}
        title={actionType === 'process' ? `Manual Payout Checklist #${selectedWithdrawal?.id}` : `Reject Withdrawal #${selectedWithdrawal?.id}`}
      >
        {selectedWithdrawal && (
          <div className="space-y-4">
            
            {error && (
              <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-danger shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="p-3 rounded-xl bg-green-950/60 border border-green-500/40 text-green-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                <span>{success}</span>
              </div>
            )}

            {/* Payout Details Card */}
            <div className="p-4 rounded-xl bg-navy/80 border border-cyan/20 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted">User:</span>
                <span className="text-primary font-bold">{selectedWithdrawal.username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Gross Amount:</span>
                <span className="font-mono text-primary">${selectedWithdrawal.amount.toFixed(2)} USDT</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Fee ({selectedWithdrawal.feeRate}%):</span>
                <span className="font-mono text-danger">-${selectedWithdrawal.feeAmount.toFixed(2)} USDT</span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t border-white/10 font-bold">
                <span className="text-primary">Send Exact Amount:</span>
                <span className="font-heading text-green-400">${selectedWithdrawal.netAmount.toFixed(2)} USDT</span>
              </div>
            </div>

            {/* Destination Address Copy */}
            <div>
              <span className="text-[11px] font-mono text-muted uppercase block mb-1">
                Destination BEP20 Address
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={selectedWithdrawal.walletAddress}
                  className="input-glass font-mono text-xs text-cyan truncate select-all"
                />
                <button
                  type="button"
                  onClick={() => copyAddress(selectedWithdrawal.walletAddress)}
                  className="btn-cyan py-2.5 px-3 shrink-0"
                >
                  {copied ? <Check className="w-4 h-4 text-navy font-bold" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {actionType === 'process' ? (
              /* Manual Send Checklist per PRD */
              <div className="p-4 rounded-xl bg-navy/60 border border-white/10 space-y-3 text-xs">
                <span className="font-heading font-bold text-gold block flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" /> Operational Checklist (PRD Phase 7):
                </span>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={stepVerified}
                    onChange={(e) => setStepVerified(e.target.checked)}
                    className="rounded accent-cyan"
                  />
                  <span>1. Verified destination address is on BEP20 network</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={stepSent}
                    onChange={(e) => setStepSent(e.target.checked)}
                    className="rounded accent-cyan"
                  />
                  <span>2. Sent exact net amount (${selectedWithdrawal.netAmount.toFixed(2)} USDT) from admin wallet</span>
                </label>

                <div>
                  <label className="block text-[11px] font-mono text-muted uppercase mb-1">
                    3. Enter External Payout Transaction Hash (TX ID) *
                  </label>
                  <input
                    type="text"
                    required
                    value={payoutTxHash}
                    onChange={(e) => setPayoutTxHash(e.target.value)}
                    placeholder="0x... (from admin sending transaction)"
                    className="input-glass font-mono text-xs"
                  />
                </div>
              </div>
            ) : (
              /* Rejection Reason */
              <div>
                <label className="block text-xs font-mono text-muted uppercase mb-1.5">
                  Mandatory Rejection Reason (Funds will be refunded to user) *
                </label>
                <textarea
                  rows={3}
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Reason for rejection and balance restoration..."
                  className="input-glass text-xs"
                />
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedWithdrawal(null)}
                className="btn-ghost flex-1 text-xs py-2.5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteAction}
                disabled={loading || (actionType === 'process' && (!stepVerified || !stepSent || !payoutTxHash.trim()))}
                className={`flex-1 text-xs py-2.5 font-bold rounded-xl ${
                  actionType === 'process' ? 'btn-cyan' : 'bg-red-600 hover:bg-red-500 text-white'
                }`}
              >
                {loading ? 'Executing...' : actionType === 'process' ? 'Complete Payout Settlement' : 'Reject & Release Hold'}
              </button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
}
