import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import Modal from '../../components/Modal';
import { 
  Users2, 
  Search, 
  UserCheck, 
  UserX, 
  Edit3, 
  Wallet, 
  ShieldAlert, 
  Eye, 
  AlertCircle, 
  CheckCircle2, 
  Clock,
  Layers
} from 'lucide-react';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedUserDetail, setSelectedUserDetail] = useState(null);
  
  // Adjustment Modal State
  const [adjustTargetUser, setAdjustTargetUser] = useState(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustDirection, setAdjustDirection] = useState('credit'); // 'credit' | 'debit'
  const [adjustReason, setAdjustReason] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadUsers();
  }, [search]);

  const loadUsers = async () => {
    try {
      const res = await api.getAdminUsers(search);
      if (res?.users) setUsers(res.users);
    } catch (e) {
      console.error(e);
    }
  };

  const inspectUser = async (user) => {
    try {
      const detail = await api.getAdminUserDetail(user.id);
      setSelectedUserDetail(detail);
    } catch (e) {
      console.error(e);
    }
  };

  const handleStatusToggle = async (user) => {
    const newStatus = user.status === 'active' ? 'suspended' : 'active';
    const reason = prompt(`Reason for changing status to ${newStatus}:`, 'Administrative review');
    if (reason === null) return;

    try {
      await api.updateUserStatus(user.id, { status: newStatus, reason });
      await loadUsers();
      if (selectedUserDetail?.user?.id === user.id) {
        inspectUser(user);
      }
    } catch (e) {
      alert(e.message);
    }
  };

  const handleAdjustBalance = async (e) => {
    e.preventDefault();
    if (!adjustTargetUser) return;
    const num = Number(adjustAmount);
    if (isNaN(num) || num <= 0) {
      setError('Valid positive adjustment amount is required.');
      return;
    }
    if (!adjustReason.trim()) {
      setError('Mandatory audit reason is required for manual balance adjustments.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await api.adjustUserBalance(adjustTargetUser.id, {
        amount: num,
        direction: adjustDirection,
        reason: adjustReason.trim()
      });

      setSuccess(`Balance adjusted successfully (${adjustDirection} $${num}).`);
      setAdjustAmount('');
      setAdjustReason('');
      await loadUsers();
      if (selectedUserDetail?.user?.id === adjustTargetUser.id) {
        inspectUser(adjustTargetUser);
      }
      setTimeout(() => setAdjustTargetUser(null), 1200);
    } catch (err) {
      setError(err.message || 'Balance adjustment failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/15 text-gold border border-gold/30 text-xs font-mono mb-2">
            <Users2 className="w-3.5 h-3.5 text-gold" /> User Portfolio Manager
          </div>
          <h1 className="font-heading text-2xl font-bold text-primary">
            USER <span className="text-gold">ACCOUNTS & BALANCES</span>
          </h1>
          <p className="text-xs text-muted">
            Search, inspect user portfolios, suspend/restore, and execute audited manual balance adjustments.
          </p>
        </div>

        {/* Search Box */}
        <div className="relative w-full md:w-72">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search username, email, ref code..."
            className="input-glass pl-9 text-xs"
          />
          <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      {/* Users Table */}
      <div className="glass-card p-6">
        {users.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="vault-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Username / Email</th>
                  <th>Role</th>
                  <th>Ref Code</th>
                  <th>Available Balance</th>
                  <th>Deposited</th>
                  <th>Total Earned</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td className="font-mono text-xs text-muted">#{u.id}</td>
                    <td>
                      <strong className="text-primary block">{u.username}</strong>
                      <span className="text-[11px] text-muted font-mono">{u.email}</span>
                    </td>
                    <td>
                      <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full font-bold ${
                        u.role === 'admin' ? 'bg-gold/20 text-gold border border-gold/40' : 'bg-navy text-muted'
                      }`}>
                        {u.role.toUpperCase()}
                      </span>
                    </td>
                    <td className="font-mono text-xs text-cyan font-bold">
                      {u.referralCode}
                    </td>
                    <td className="font-heading font-bold text-sm text-cyan">
                      ${u.balance.toFixed(2)}
                    </td>
                    <td className="text-xs font-mono text-primary">
                      ${u.totalDeposited.toFixed(2)}
                    </td>
                    <td className="text-xs font-mono text-green-400 font-bold">
                      +${(u.totalEarned + u.totalReferralEarned).toFixed(2)}
                    </td>
                    <td>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold font-mono ${
                        u.status === 'active' ? 'badge-success' : 'badge-danger'
                      }`}>
                        {u.status}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => inspectUser(u)}
                          className="p-1.5 rounded-lg bg-cyan/15 text-cyan hover:bg-cyan/25 border border-cyan/30 text-xs flex items-center gap-1"
                          title="Inspect User Details"
                        >
                          <Eye className="w-3.5 h-3.5" /> Inspect
                        </button>
                        <button
                          onClick={() => { setAdjustTargetUser(u); setError(''); setSuccess(''); }}
                          className="p-1.5 rounded-lg bg-gold/15 text-gold hover:bg-gold/25 border border-gold/30 text-xs flex items-center gap-1"
                          title="Adjust Balance"
                        >
                          <Edit3 className="w-3.5 h-3.5" /> Adjust
                        </button>
                        <button
                          onClick={() => handleStatusToggle(u)}
                          className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 ${
                            u.status === 'active' 
                              ? 'bg-red-500/15 text-danger border-red-500/30 hover:bg-red-500/25' 
                              : 'bg-green-500/15 text-green-400 border-green-500/30 hover:bg-green-500/25'
                          }`}
                          title={u.status === 'active' ? 'Suspend User' : 'Restore User'}
                        >
                          {u.status === 'active' ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-xs text-muted">
            No users found matching query.
          </div>
        )}
      </div>

      {/* Manual Balance Adjustment Modal (PRD Phase 7) */}
      <Modal
        isOpen={!!adjustTargetUser}
        onClose={() => setAdjustTargetUser(null)}
        title={adjustTargetUser ? `Adjust Balance: ${adjustTargetUser.username}` : ''}
      >
        {adjustTargetUser && (
          <form onSubmit={handleAdjustBalance} className="space-y-4">
            
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

            <div className="p-3 bg-navy/80 rounded-xl border border-white/10 text-xs space-y-1">
              <p className="text-muted">Current Available Balance: <strong className="text-cyan">${adjustTargetUser.balance.toFixed(2)} USDT</strong></p>
              <p className="text-muted">Locked Balance: <strong className="text-primary">${adjustTargetUser.lockedBalance.toFixed(2)} USDT</strong></p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-mono text-muted uppercase mb-1.5">Action Direction</label>
                <select
                  value={adjustDirection}
                  onChange={(e) => setAdjustDirection(e.target.value)}
                  className="input-glass text-xs"
                >
                  <option value="credit">CREDIT (Add Funds)</option>
                  <option value="debit">DEBIT (Subtract Funds)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-muted uppercase mb-1.5">Amount (USDT) *</label>
                <input
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  placeholder="0.00"
                  className="input-glass text-xs font-mono font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-muted uppercase mb-1.5">
                Mandatory Audit Reason (PRD Phase 7 Requirement) *
              </label>
              <textarea
                required
                rows={3}
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="e.g. Manual correction for uncredited deposit TX #..."
                className="input-glass text-xs"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setAdjustTargetUser(null)}
                className="btn-ghost flex-1 text-xs py-2.5"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-gold flex-1 text-xs py-2.5 font-bold"
              >
                {loading ? 'Recording Ledger...' : 'Commit Balance Adjustment'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* User Portfolio Inspection Modal */}
      <Modal
        isOpen={!!selectedUserDetail}
        onClose={() => setSelectedUserDetail(null)}
        title={selectedUserDetail ? `Inspection: ${selectedUserDetail.user.username} (#${selectedUserDetail.user.id})` : ''}
        maxWidth="max-w-2xl"
      >
        {selectedUserDetail && (
          <div className="space-y-6 text-xs">
            
            {/* User Overview Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-navy/80 rounded-xl border border-cyan/20">
              <div>
                <span className="text-muted block text-[11px]">Available Balance:</span>
                <span className="font-heading font-bold text-cyan text-sm">${selectedUserDetail.user.balance.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-muted block text-[11px]">Locked Hold:</span>
                <span className="font-mono text-primary">${selectedUserDetail.user.lockedBalance.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-muted block text-[11px]">Total Deposited:</span>
                <span className="font-mono text-green-400">${selectedUserDetail.user.totalDeposited.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-muted block text-[11px]">Total Withdrawn:</span>
                <span className="font-mono text-primary">${selectedUserDetail.user.totalWithdrawn.toFixed(2)}</span>
              </div>
            </div>

            {/* Active Turbines Section */}
            <div>
              <h4 className="font-heading text-xs font-bold text-cyan mb-2 uppercase">
                Active Turbines ({selectedUserDetail.investments.length})
              </h4>
              {selectedUserDetail.investments.length > 0 ? (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {selectedUserDetail.investments.map(inv => (
                    <div key={inv.id} className="p-2.5 bg-navy/60 rounded-lg border border-white/5 flex justify-between items-center">
                      <div>
                        <strong className="text-primary">{inv.planNameSnapshot}</strong>
                        <span className="text-muted text-[11px] block">Day {inv.daysPassed}/{inv.durationDaysSnapshot} • +{inv.dailyRateSnapshot}%/d</span>
                      </div>
                      <div className="text-right">
                        <span className="text-cyan font-bold font-mono">${inv.investedAmount} USDT</span>
                        <span className="text-green-400 text-[11px] block">+${inv.totalEarned.toFixed(2)} Earned</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted">No active turbines.</p>
              )}
            </div>

            {/* Recent Ledger Records */}
            <div>
              <h4 className="font-heading text-xs font-bold text-gold mb-2 uppercase">
                Recent Ledger Events (Latest 10)
              </h4>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {selectedUserDetail.ledger.slice(0, 10).map(tx => (
                  <div key={tx.id} className="p-2 bg-navy/60 rounded border border-white/5 flex justify-between font-mono text-[11px]">
                    <span className="text-muted">{tx.type} ({tx.direction})</span>
                    <span className={tx.direction === 'credit' ? 'text-green-400' : 'text-danger'}>
                      {tx.direction === 'credit' ? '+' : '-'}${tx.amount.toFixed(2)} → Bal: ${tx.balanceAfter.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}
      </Modal>

    </div>
  );
}
