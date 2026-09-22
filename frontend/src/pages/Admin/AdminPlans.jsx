import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import Modal from '../../components/Modal';
import { 
  Flame, 
  Edit, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Zap, 
  Clock, 
  Percent,
  DollarSign
} from 'lucide-react';

export default function AdminPlans() {
  const [plans, setPlans] = useState([]);
  const [editingPlan, setEditingPlan] = useState(null);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const res = await api.getAdminPlans();
      if (res?.plans) setPlans(res.plans);
    } catch (e) {
      console.error(e);
    }
  };

  const openEditModal = (plan) => {
    setEditingPlan(plan);
    setFormData({ ...plan });
    setError('');
    setSuccess('');
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingPlan) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await api.updateAdminPlan(editingPlan.id, formData);
      setSuccess(`Plan ${formData.name} updated successfully! Future investments will use these parameters.`);
      await loadPlans();
      setTimeout(() => setEditingPlan(null), 1200);
    } catch (err) {
      setError(err.message || 'Failed to update plan.');
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
            <Flame className="w-3.5 h-3.5 text-cyan" /> Hydro-Turbine Configuration Matrix
          </div>
          <h1 className="font-heading text-2xl font-bold text-primary">
            TURBINE <span className="text-cyan">PLAN MANAGEMENT</span>
          </h1>
          <p className="text-xs text-muted">
            Configure ROI rates, duration, and fee parameters. Active investment snapshots remain strictly immutable per PRD Phase 7.
          </p>
        </div>

        <div className="p-3 bg-navy/80 rounded-xl border border-cyan/20 text-xs text-muted flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-green-400" />
          <span>Snapshot Immutability Protected</span>
        </div>
      </div>

      {/* Plans List Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map(plan => (
          <div key={plan.id} className="glass-card p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-heading text-lg font-bold text-primary">{plan.name}</h3>
                  <span className="badge-tier">{plan.tier}</span>
                </div>
                <button
                  onClick={() => openEditModal(plan)}
                  className="p-1.5 rounded-lg bg-cyan/15 text-cyan hover:bg-cyan/25 border border-cyan/30 text-xs flex items-center gap-1 font-semibold"
                >
                  <Edit className="w-3.5 h-3.5" /> Edit
                </button>
              </div>

              <p className="text-xs text-muted mb-4 min-h-[36px]">{plan.description}</p>

              <div className="space-y-2 text-xs py-3 border-y border-white/5 font-mono">
                <div className="flex justify-between">
                  <span className="text-muted">Daily ROI Rate:</span>
                  <span className="text-cyan font-bold">+{plan.dailyRoi}% / day</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Duration Cycle:</span>
                  <span className="text-primary font-bold">{plan.durationDays} Days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Min – Max Deposit:</span>
                  <span className="text-primary">${plan.minDeposit} – ${plan.maxDeposit.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Withdrawal Fee:</span>
                  <span className="text-primary font-bold">{plan.withdrawalFee === 0 ? '0% Free' : `${plan.withdrawalFee}%`}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Kinetic Rotor Speed:</span>
                  <span className="text-cyan">{plan.speedRpm} RPM</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-2 text-[11px] text-muted flex items-center justify-between">
              <span>Status: <strong className="text-green-400 uppercase">{plan.status}</strong></span>
              <span>ID: #{plan.id}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Plan Modal */}
      <Modal
        isOpen={!!editingPlan}
        onClose={() => setEditingPlan(null)}
        title={editingPlan ? `Edit Turbine: ${editingPlan.name}` : ''}
      >
        {editingPlan && (
          <form onSubmit={handleUpdate} className="space-y-4 text-xs">
            
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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-muted font-mono uppercase mb-1">Plan Name</label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-glass"
                />
              </div>

              <div>
                <label className="block text-muted font-mono uppercase mb-1">Daily ROI (%)</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={formData.dailyRoi || ''}
                  onChange={(e) => setFormData({ ...formData, dailyRoi: e.target.value })}
                  className="input-glass font-bold text-cyan"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-muted font-mono uppercase mb-1">Min Deposit ($)</label>
                <input
                  type="number"
                  required
                  value={formData.minDeposit || ''}
                  onChange={(e) => setFormData({ ...formData, minDeposit: e.target.value })}
                  className="input-glass font-mono"
                />
              </div>

              <div>
                <label className="block text-muted font-mono uppercase mb-1">Max Deposit ($)</label>
                <input
                  type="number"
                  required
                  value={formData.maxDeposit || ''}
                  onChange={(e) => setFormData({ ...formData, maxDeposit: e.target.value })}
                  className="input-glass font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-muted font-mono uppercase mb-1">Duration (Days)</label>
                <input
                  type="number"
                  required
                  value={formData.durationDays || ''}
                  onChange={(e) => setFormData({ ...formData, durationDays: e.target.value })}
                  className="input-glass font-mono"
                />
              </div>

              <div>
                <label className="block text-muted font-mono uppercase mb-1">Withdrawal Fee (%)</label>
                <input
                  type="number"
                  step="0.5"
                  required
                  value={formData.withdrawalFee !== undefined ? formData.withdrawalFee : ''}
                  onChange={(e) => setFormData({ ...formData, withdrawalFee: e.target.value })}
                  className="input-glass font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-muted font-mono uppercase mb-1">Description</label>
              <textarea
                rows={2}
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input-glass text-xs"
              />
            </div>

            <div className="p-3 bg-navy/60 rounded-xl border border-white/5 text-[11px] text-muted flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
              <span>
                <strong>PRD Phase 7 Invariant:</strong> Modifying these parameters affects FUTURE investments only. All active user investments preserve their original snapshots.
              </span>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditingPlan(null)}
                className="btn-ghost flex-1 text-xs py-2.5"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-cyan flex-1 text-xs py-2.5 font-bold"
              >
                {loading ? 'Saving...' : 'Save Plan Changes'}
              </button>
            </div>
          </form>
        )}
      </Modal>

    </div>
  );
}
