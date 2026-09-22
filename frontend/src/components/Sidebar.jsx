import React from 'react';
import { 
  LayoutDashboard, 
  Flame, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  Users2, 
  FileText
} from 'lucide-react';

export default function Sidebar({ currentPage, onNavigate }) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'plans', label: 'Turbine Plans', icon: Flame },
    { id: 'deposit', label: 'Deposit USDT', icon: ArrowDownCircle },
    { id: 'withdraw', label: 'Withdraw', icon: ArrowUpCircle },
    { id: 'team', label: 'Team & Referrals', icon: Users2 },
    { id: 'transactions', label: 'Ledger History', icon: FileText }
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 glass-sidebar min-h-[calc(100vh-72px)] p-4 select-none shrink-0">
      
      {/* Navigation List */}
      <div className="space-y-1.5 flex-1">
        <p className="px-3 text-[10px] font-heading font-semibold uppercase tracking-wider text-muted mb-2">
          Investor Portal
        </p>

        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-cyan/20 to-blue-950/40 text-cyan border border-cyan/40 shadow-cyan-glow font-semibold'
                  : 'text-secondary hover:text-primary hover:bg-white/5 border border-transparent'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-cyan' : 'text-muted'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Protocol Live Metric Box */}
      <div className="p-3.5 rounded-xl bg-navy/60 border border-cyan/15 mt-auto">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] text-muted uppercase font-mono">BEP20 Network</span>
          <span className="flex items-center gap-1 text-[10px] text-green-400 font-semibold font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-ping" /> Synchronized
          </span>
        </div>
        <div className="text-[11px] text-secondary leading-snug">
          24/7 Algorithmic hydrodynamic yield distribution.
        </div>
      </div>
    </aside>
  );
}
