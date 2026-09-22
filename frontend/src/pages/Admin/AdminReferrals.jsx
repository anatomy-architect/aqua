import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { Users2, Clock, Coins, ShieldCheck, Flame } from 'lucide-react';

export default function AdminReferrals() {
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReferrals();
  }, []);

  const loadReferrals = async () => {
    setLoading(true);
    try {
      const res = await api.getAdminReferrals();
      if (res?.referrals) setReferrals(res.referrals);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/15 text-gold border border-gold/30 text-xs font-mono mb-2">
          <Users2 className="w-3.5 h-3.5 text-gold" /> Global Network Operations
        </div>
        <h1 className="font-heading text-2xl font-bold text-primary">
          REFERRAL <span className="text-gold">COMMISSION AUDIT</span>
        </h1>
        <p className="text-xs text-muted">
          Chronological platform-wide 3-level referral commission events and payout progress.
        </p>
      </div>

      {/* Referrals Table */}
      <div className="glass-card p-6">
        {referrals.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="vault-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Inv. ID</th>
                  <th>Beneficiary (Referrer)</th>
                  <th>Referred User</th>
                  <th>Turbine Plan</th>
                  <th>Level</th>
                  <th>Daily Rate</th>
                  <th>Progress</th>
                  <th>Credit Amount</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {referrals.map(r => (
                  <tr key={r.id}>
                    <td className="font-mono text-xs text-muted">#{r.id}</td>
                    <td className="font-mono text-xs text-cyan">#{r.investmentId}</td>
                    <td className="font-semibold text-gold">{r.referrer}</td>
                    <td className="text-primary">{r.referredUser}</td>
                    <td className="text-xs">
                      <span className="flex items-center gap-1 text-cyan font-mono">
                        <Flame className="w-3 h-3" /> {r.planNameSnapshot}
                      </span>
                    </td>
                    <td>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-mono font-bold ${
                        r.level === 3 ? 'badge-gold' : 'badge-tier'
                      }`}>
                        Level {r.level}
                      </span>
                    </td>
                    <td className="font-mono text-xs text-cyan font-bold">
                      +{r.ratePercent}%
                    </td>
                    <td className="text-xs text-muted font-mono">
                      Day {r.earningDay} of {r.maxDays}
                    </td>
                    <td className="font-heading font-bold text-sm text-green-400">
                      +${r.amount.toFixed(2)} USDT
                    </td>
                    <td className="text-xs text-muted font-mono">
                      {new Date(r.creditedAt).toLocaleDateString()} {new Date(r.creditedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-xs text-muted">
            No referral commissions generated yet.
          </div>
        )}
      </div>

    </div>
  );
}
