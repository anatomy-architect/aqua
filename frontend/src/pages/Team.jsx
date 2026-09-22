import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import QRCode from 'qrcode';
import { 
  Users, 
  Copy, 
  Check, 
  Gift, 
  TrendingUp, 
  ShieldCheck, 
  Clock, 
  ChevronRight 
} from 'lucide-react';

export default function Team({ onNavigate }) {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [commissions, setCommissions] = useState([]);
  const [copied, setCopied] = useState(false);
  const [qrUrl, setQrUrl] = useState('');
  const [activeTab, setActiveTab] = useState('l1');

  const referralLink = `${window.location.origin}/register?ref=${user?.referralCode || ''}`;

  useEffect(() => {
    loadReferralData();
    QRCode.toDataURL(referralLink, {
      width: 180,
      margin: 2,
      color: { dark: '#06B6D4', light: '#0B0F19' }
    }).then(setQrUrl).catch(console.error);
  }, [user?.referralCode]);

  const loadReferralData = async () => {
    try {
      const [statsData, commData] = await Promise.all([
        api.getReferralStats(),
        api.getReferralCommissions()
      ]);
      if (statsData) setStats(statsData);
      if (commData?.commissions) setCommissions(commData.commissions);
    } catch (e) {
      console.error('Error loading team stats:', e);
    }
  };

  const copyRefLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Affiliate & Team
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Share your referral link to earn commissions across 3 downline levels.
        </p>
      </div>

      {/* Referral Link & QR Showcase Banner */}
      <div className="clean-card p-6 sm:p-8 bg-[#111726]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          
          <div className="lg:col-span-8 space-y-4">
            <div>
              <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider block mb-1">
                Your Unique Invite Link
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-white">
                Invite Partners, Earn Daily Commissions
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 leading-relaxed">
                When downline partners activate investment plans, you receive automated payouts: Level 1 (8%), Level 2 (4%), Level 3 (2%).
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
              <div className="w-full sm:flex-1 relative">
                <input
                  type="text"
                  readOnly
                  value={referralLink}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-xs font-mono text-purple-300 outline-none truncate select-all"
                />
              </div>
              <button
                type="button"
                onClick={copyRefLink}
                className="w-full sm:w-auto btn-primary !bg-purple-600 hover:!bg-purple-500 !shadow-purple-500/20 text-xs !py-2.5 !px-5 shrink-0"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied to Clipboard' : 'Copy Link'}
              </button>
            </div>
          </div>

          <div className="lg:col-span-4 flex flex-col items-center justify-center p-4 bg-[#0B0F19] rounded-2xl border border-white/[0.08]">
            {qrUrl && <img src={qrUrl} alt="Referral QR" className="w-32 h-32 rounded-xl mb-2 object-contain" />}
            <span className="text-[11px] text-slate-400">Scan to register</span>
            <span className="text-xs font-mono font-bold text-white mt-0.5">Code: {user?.referralCode || '—'}</span>
          </div>

        </div>
      </div>

      {/* 3 Tier Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        
        {/* Tier 1 */}
        <div 
          onClick={() => setActiveTab('l1')}
          className={`clean-card p-5 cursor-pointer transition-all ${
            activeTab === 'l1' ? 'border-cyan-500/60 bg-cyan-500/[0.04]' : 'hover:border-white/20'
          }`}
        >
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Level 1 (Direct)</span>
            <span className="text-xs font-mono text-cyan-300 font-bold">8.0%</span>
          </div>
          <p className="text-2xl font-bold text-white font-mono my-1">
            {stats?.levels?.l1?.count || 0} <span className="text-xs text-slate-400 font-normal">Members</span>
          </p>
          <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex justify-between text-xs">
            <span className="text-slate-400">Earned:</span>
            <span className="text-emerald-400 font-bold font-mono">${(stats?.levels?.l1?.earned || 0).toFixed(2)} USDT</span>
          </div>
        </div>

        {/* Tier 2 */}
        <div 
          onClick={() => setActiveTab('l2')}
          className={`clean-card p-5 cursor-pointer transition-all ${
            activeTab === 'l2' ? 'border-purple-500/60 bg-purple-500/[0.04]' : 'hover:border-white/20'
          }`}
        >
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">Level 2 (Secondary)</span>
            <span className="text-xs font-mono text-purple-300 font-bold">4.0%</span>
          </div>
          <p className="text-2xl font-bold text-white font-mono my-1">
            {stats?.levels?.l2?.count || 0} <span className="text-xs text-slate-400 font-normal">Members</span>
          </p>
          <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex justify-between text-xs">
            <span className="text-slate-400">Earned:</span>
            <span className="text-emerald-400 font-bold font-mono">${(stats?.levels?.l2?.earned || 0).toFixed(2)} USDT</span>
          </div>
        </div>

        {/* Tier 3 */}
        <div 
          onClick={() => setActiveTab('l3')}
          className={`clean-card p-5 cursor-pointer transition-all ${
            activeTab === 'l3' ? 'border-amber-500/60 bg-amber-500/[0.04]' : 'hover:border-white/20'
          }`}
        >
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Level 3 (Tertiary)</span>
            <span className="text-xs font-mono text-amber-300 font-bold">2.0%</span>
          </div>
          <p className="text-2xl font-bold text-white font-mono my-1">
            {stats?.levels?.l3?.count || 0} <span className="text-xs text-slate-400 font-normal">Members</span>
          </p>
          <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex justify-between text-xs">
            <span className="text-slate-400">Earned:</span>
            <span className="text-emerald-400 font-bold font-mono">${(stats?.levels?.l3?.earned || 0).toFixed(2)} USDT</span>
          </div>
        </div>

      </div>

      {/* Referral Commissions List */}
      <div className="clean-card p-5 sm:p-6 bg-[#111726]">
        <h2 className="text-base font-bold text-white mb-4">Commission Payout History</h2>

        {commissions.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No affiliate commissions earned yet. Share your invite link to start building your network.
          </div>
        ) : (
          <div className="divide-y divide-white/[0.05] overflow-x-auto">
            {commissions.map((c) => (
              <div key={c.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
                    <Gift className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">
                      Level {c.level || 1} Referral Bonus from <span className="text-purple-300 font-mono">{c.refereeUsername || 'Partner'}</span>
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="font-bold text-emerald-400 font-mono">
                    +${c.amount?.toFixed(2)} USDT
                  </p>
                  <span className="text-[10px] text-slate-400">
                    Credited to Balance
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
