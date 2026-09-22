import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import Modal from '../../components/Modal';
import { 
  ArrowDownCircle, 
  CheckCircle2, 
  XCircle, 
  ExternalLink, 
  Clock, 
  AlertCircle, 
  Search,
  Filter,
  Flame
} from 'lucide-react';

export default function AdminDeposits() {
  const [deposits, setDeposits] = useState([]);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [selectedDeposit, setSelectedDeposit] = useState(null);
  const [actionType, setActionType] = useState('approve'); // 'approve' | 'reject'
  const [adminNote, setAdminNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadDeposits();
  }, [filterStatus]);

  const loadDeposits = async () => {
    try {
      const res = await api.getAdminDeposits(filterStatus);
      if (res?.deposits) setDeposits(res.deposits);
    } catch (e) {
      console.error(e);
    }
  };

  const openActionModal = (deposit, type) => {
    setSelectedDeposit(deposit);
    setActionType(type);
    setAdminNote(type === 'approve' ? 'Verified on BscScan blockchain' : 'Transaction could not be verified on BSC network');
    setError('');
    setSuccess('');
  };

  const handleExecuteAction = async () => {
    if (!selectedDeposit) return;
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (actionType === 'approve') {
        await api.approveDeposit(selectedDeposit.id, { adminNote });
        setSuccess(`Deposit #${selectedDeposit.id} approved successfully!`);
      } else {
        await api.rejectDeposit(selectedDeposit.id, { reason: adminNote });
        setSuccess(`Deposit #${selectedDeposit.id} marked as rejected.`);
      }

      await loadDeposits();
      setTimeout(() => setSelectedDeposit(null), 1200);
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
            <ArrowDownCircle className="w-3.5 h-3.5 text-cyan" /> Operations Console
          </div>
          <h1 className="font-heading text-2xl font-bold text-primary">
            DEPOSIT <span className="text-cyan">MANAGEMENT</span>
          </h1>
          <p className="text-xs text-muted">
            Verify on-chain BEP20 USDT transaction hashes and approve/reject deposits.
          </p>
        </div>

        {/* Filter Badges */}
        <div className="flex items-center gap-2">
          {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map(st => (
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

      {/* Deposits Table */}
      <div className="glass-card p-6">
        {deposits.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="vault-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>User</th>
                  <th>Amount</th>
                  <th>Target Turbine</th>
                  <th>TX Hash</th>
                  <th>Submitted</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {deposits.map(d => (
                  <tr key={d.id}>
                    <td className="font-mono text-xs text-muted">#{d.id}</td>
                    <td>
                      <strong className="text-primary block">{d.username}</strong>
                      <span className="text-[11px] text-muted font-mono">{d.email}</span>
                    </td>
                    <td className="font-heading font-bold text-sm text-cyan">
                      ${d.amount.toFixed(2)} USDT
                    </td>
                    <td className="text-xs">
                      {d.planName ? (
                        <span className="text-gold font-semibold flex items-center gap-1">
                          <Flame className="w-3 h-3" /> {d.planName}
                        </span>
                      ) : (
                        <span className="text-muted font-mono">Wallet Balance</span>
                      )}
                    </td>
                    <td className="font-mono text-xs">
                      <a
                        href={`https://bscscan.com/tx/${d.txHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-cyan hover:underline"
                        title={d.txHash}
                      >
                        {d.txHash.slice(0, 8)}...{d.txHash.slice(-6)}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                    <td className="text-xs text-muted font-mono">
                      {new Date(d.submittedAt).toLocaleDateString()}
                    </td>
                    <td>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold font-mono ${
                        d.status === 'APPROVED' ? 'badge-success' :
                        d.status === 'PENDING' ? 'badge-warning' : 'badge-danger'
                      }`}>
                        {d.status}
                      </span>
                    </td>
                    <td>
                      {d.status === 'PENDING' ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openActionModal(d, 'approve')}
                            className="p-1.5 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/40 text-xs font-semibold flex items-center gap-1"
                            title="Approve Deposit"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                          </button>
                          <button
                            onClick={() => openActionModal(d, 'reject')}
                            className="p-1.5 rounded-lg bg-red-500/20 text-danger hover:bg-red-500/30 border border-red-500/40 text-xs font-semibold flex items-center gap-1"
                            title="Reject Deposit"
                          >
                            <XCircle className="w-3.5 h-3.5" /> Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-muted font-mono">Resolved</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-xs text-muted">
            No deposits found for this status.
          </div>
        )}
      </div>

      {/* Action Modal */}
      <Modal
        isOpen={!!selectedDeposit}
        onClose={() => setSelectedDeposit(null)}
        title={actionType === 'approve' ? `Approve Deposit #${selectedDeposit?.id}` : `Reject Deposit #${selectedDeposit?.id}`}
      >
        {selectedDeposit && (
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

            <div className="p-4 rounded-xl bg-navy/80 border border-cyan/20 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted">User:</span>
                <span className="text-primary font-bold">{selectedDeposit.username} ({selectedDeposit.email})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Deposit Amount:</span>
                <span className="font-heading font-bold text-cyan">${selectedDeposit.amount.toFixed(2)} USDT</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Target Turbine:</span>
                <span className="font-bold text-gold">{selectedDeposit.planName || 'Wallet Credit'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">TX Hash:</span>
                <a
                  href={`https://bscscan.com/tx/${selectedDeposit.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-cyan hover:underline flex items-center gap-1"
                >
                  {selectedDeposit.txHash.slice(0, 12)}... <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-muted uppercase mb-1.5">
                {actionType === 'approve' ? 'Admin Verification Note' : 'Mandatory Rejection Reason *'}
              </label>
              <textarea
                rows={3}
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="Reason or verification note..."
                className="input-glass text-xs"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedDeposit(null)}
                className="btn-ghost flex-1 text-xs py-2.5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteAction}
                disabled={loading || (actionType === 'reject' && !adminNote.trim())}
                className={`flex-1 text-xs py-2.5 font-bold rounded-xl ${
                  actionType === 'approve' ? 'btn-cyan' : 'bg-red-600 hover:bg-red-500 text-white'
                }`}
              >
                {loading ? 'Processing...' : actionType === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
}
