import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Shield, 
  LayoutDashboard, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  Users2, 
  Flame, 
  Wallet, 
  FileText, 
  LogOut, 
  Zap, 
  Play, 
  CheckCircle2, 
  AlertCircle,
  Menu,
  X,
  RefreshCw
} from 'lucide-react';
import { api } from '../api/client';

export default function AdminLayout({ currentPage, onNavigate, children }) {
  const { user, logout } = useAuth();
  const [runningEngine, setRunningEngine] = useState(false);
  const [engineMsg, setEngineMsg] = useState('');
  const [mobileAdminMenuOpen, setMobileAdminMenuOpen] = useState(false);

  const adminNavItems = [
    { id: 'rashidadmin/dashboard', label: 'Dashboard Overview', icon: LayoutDashboard },
    { id: 'rashidadmin/deposits', label: 'Deposit Queue', icon: ArrowDownCircle },
    { id: 'rashidadmin/withdrawals', label: 'Withdrawal Payouts', icon: ArrowUpCircle },
    { id: 'rashidadmin/users', label: 'User Manager', icon: Users2 },
    { id: 'rashidadmin/plans', label: 'Turbine Plan Matrix', icon: Flame },
    { id: 'rashidadmin/wallet', label: 'Wallet Configuration', icon: Wallet },
    { id: 'rashidadmin/referrals', label: 'Referral Logs', icon: Users2 },
    { id: 'rashidadmin/audits', label: 'Audit Trail', icon: FileText }
  ];

  const handleRunDailyEngine = async () => {
    if (!window.confirm('Trigger immediate on-demand calculation of daily earnings & 3-tier referral commissions for all active turbines?')) {
      return;
    }
    setRunningEngine(true);
    setEngineMsg('');
    try {
      const res = await api.runDailyEngine();
      setEngineMsg(`Engine executed: ${res.result?.investmentsCount || 0} active turbines processed successfully.`);
      setTimeout(() => setEngineMsg(''), 5000);
    } catch (err) {
      setEngineMsg(`Error: ${err.message}`);
      setTimeout(() => setEngineMsg(''), 5000);
    } finally {
      setRunningEngine(false);
    }
  };

  const handleAdminLogout = () => {
    logout();
    onNavigate('rashidadmin');
  };

  return (
    <div className="min-h-screen bg-[#070B1F] text-primary flex flex-col selection:bg-gold selection:text-navy">
      
      {/* Top Executive Admin Bar */}
      <header className="sticky top-0 z-40 bg-[#0A0F2C]/95 backdrop-blur-xl border-b border-gold/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Admin Brand */}
            <div 
              onClick={() => onNavigate('rashidadmin/dashboard')}
              className="flex items-center gap-3 cursor-pointer select-none"
            >
              <div className="w-9 h-9 rounded-xl bg-amber-950/80 border border-gold/50 flex items-center justify-center shadow-gold-glow">
                <Shield className="w-5 h-5 text-gold" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-heading font-bold text-base tracking-wider text-primary">
                    AQUA<span className="text-gold">VAULT</span>
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-gold/20 text-gold border border-gold/40 font-mono font-bold uppercase">
                    Admin
                  </span>
                </div>
                <p className="text-[9px] text-muted font-mono uppercase tracking-widest hidden sm:block">
                  Control Center
                </p>
              </div>
            </div>

            {/* Right Admin Header Controls */}
            <div className="flex items-center gap-3">
              {/* Daily Simulator Button */}
              <button
                type="button"
                onClick={handleRunDailyEngine}
                disabled={runningEngine}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-950/60 text-gold border border-gold/30 hover:border-gold text-xs font-mono transition-all"
                title="Simulate 24-Hour Cycle On-Demand"
              >
                <Play className={`w-3 h-3 ${runningEngine ? 'animate-spin' : ''}`} />
                <span>{runningEngine ? 'Running Cycle...' : 'Daily Cycle Simulator'}</span>
              </button>

              {/* Admin Email Pill */}
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-navy/80 border border-white/10 text-xs">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="font-mono text-muted text-[11px] truncate max-w-[180px]">{user?.email || 'admin'}</span>
              </div>

              {/* Sign Out Button */}
              <button
                type="button"
                onClick={handleAdminLogout}
                className="btn-ghost py-1.5 px-3 text-xs text-danger hover:bg-red-500/15 border-red-500/30"
              >
                <LogOut className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Logout</span>
              </button>

              {/* Mobile Menu Toggle */}
              <button
                type="button"
                onClick={() => setMobileAdminMenuOpen(!mobileAdminMenuOpen)}
                className="md:hidden p-2 rounded-xl bg-navy/80 border border-white/10 text-primary"
              >
                {mobileAdminMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>

          </div>
        </div>

        {/* Engine Toast Message */}
        {engineMsg && (
          <div className="bg-gold/15 border-t border-gold/30 px-4 py-2 text-center text-xs font-mono text-gold flex items-center justify-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5" /> {engineMsg}
          </div>
        )}
      </header>

      {/* Main Admin View */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        
        {/* Desktop Admin Sidebar */}
        <aside className="hidden md:flex flex-col w-64 bg-[#0A0F2C]/90 border-r border-gold/15 min-h-[calc(100vh-64px)] p-4 select-none shrink-0">
          <div className="space-y-1 flex-1">
            <p className="px-3 text-[10px] font-heading font-semibold uppercase tracking-wider text-gold mb-3">
              Management Modules
            </p>

            {adminNavItems.map(item => {
              const Icon = item.icon;
              const isActive = currentPage === item.id || (currentPage === 'rashidadmin' && item.id === 'rashidadmin/dashboard');

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-amber-500/20 to-amber-950/40 text-gold border border-gold/40 shadow-gold-glow font-semibold'
                      : 'text-secondary hover:text-primary hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-gold' : 'text-muted'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="p-3 rounded-xl bg-navy/60 border border-gold/20 mt-auto text-[11px] text-muted">
            <span className="text-gold font-mono font-bold block mb-0.5">AQUA VAULT OS</span>
            <span>Restricted Internal Console</span>
          </div>
        </aside>

        {/* Mobile Admin Drawer */}
        {mobileAdminMenuOpen && (
          <div className="md:hidden fixed inset-x-0 top-16 z-50 bg-[#0A0F2C]/98 border-b border-gold/20 p-4 space-y-1.5 shadow-2xl">
            {adminNavItems.map(item => {
              const Icon = item.icon;
              const isActive = currentPage === item.id || (currentPage === 'rashidadmin' && item.id === 'rashidadmin/dashboard');
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => { onNavigate(item.id); setMobileAdminMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-xs font-medium ${
                    isActive ? 'bg-gold/20 text-gold font-bold' : 'text-secondary hover:text-primary'
                  }`}
                >
                  <Icon className="w-4 h-4 text-gold" />
                  <span>{item.label}</span>
                </button>
              );
            })}
            <div className="pt-2 border-t border-white/10 mt-2">
              <button
                type="button"
                onClick={handleRunDailyEngine}
                className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl bg-amber-950/50 text-gold border border-gold/30 text-xs font-mono"
              >
                <Play className="w-3.5 h-3.5" /> Run Daily Engine Simulation
              </button>
            </div>
          </div>
        )}

        {/* Admin Content Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 overflow-hidden">
          {children}
        </main>
      </div>

    </div>
  );
}
