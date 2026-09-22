import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  LogOut, 
  ChevronDown, 
  RefreshCw, 
  Menu, 
  X,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Sparkles
} from 'lucide-react';

export default function Navbar({ onNavigate, currentPage }) {
  const { user, isAuthenticated, logout, refreshUser } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshUser();
    setTimeout(() => setRefreshing(false), 600);
  };

  if (currentPage.startsWith('rashidadmin')) {
    return null;
  }

  const navLinks = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'plans', label: 'Plans' },
    { id: 'deposit', label: 'Deposit' },
    { id: 'withdraw', label: 'Withdraw' },
    { id: 'team', label: 'Affiliates' },
    { id: 'transactions', label: 'History' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-[#090D16]/90 backdrop-blur-md border-b border-white/[0.08]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Brand */}
        <div 
          onClick={() => onNavigate(isAuthenticated ? 'dashboard' : 'landing')}
          className="flex items-center gap-3 cursor-pointer select-none group shrink-0"
        >
          <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform">
            <span className="material-symbols-outlined text-lg">water_drop</span>
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold text-white tracking-tight leading-tight">
              AQUA VAULT
            </span>
          </div>
        </div>

        {/* Desktop Navigation */}
        {isAuthenticated && (
          <nav className="hidden md:flex items-center gap-1 bg-white/[0.03] p-1 rounded-xl border border-white/[0.06]">
            {navLinks.map((link) => {
              const isActive = currentPage === link.id;
              return (
                <button
                  key={link.id}
                  type="button"
                  onClick={() => onNavigate(link.id)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isActive 
                      ? 'bg-cyan-500/20 text-cyan-300 font-semibold shadow-sm' 
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  {link.label}
                </button>
              );
            })}
            {user?.role === 'admin' && (
              <button
                type="button"
                onClick={() => onNavigate('rashidadmin')}
                className="text-amber-400 hover:text-amber-300 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 transition-all ml-1"
              >
                Admin Panel
              </button>
            )}
          </nav>
        )}

        {/* User / Action Area */}
        <div className="flex items-center gap-2.5">
          {isAuthenticated ? (
            <>
              {/* Live Balance Pill */}
              <div 
                onClick={handleRefresh}
                title="Click to refresh balance"
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:border-cyan-500/30 cursor-pointer transition-colors"
              >
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-slate-400 font-medium">Balance:</span>
                <span className="text-xs font-bold text-white font-mono">
                  ${(user?.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <RefreshCw className={`w-3.5 h-3.5 text-slate-400 hover:text-cyan-400 transition-colors ${refreshing ? 'animate-spin' : ''}`} />
              </div>

              {/* User Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 p-1.5 pl-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-colors"
                >
                  <span className="text-xs font-medium text-slate-300 max-w-[90px] truncate">
                    {user?.username}
                  </span>
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                    {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {dropdownOpen && (
                  <div 
                    className="absolute right-0 mt-2 w-52 bg-[#111726] rounded-xl border border-white/[0.1] shadow-xl py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <div className="px-3.5 py-2 border-b border-white/[0.08]">
                      <p className="text-xs text-slate-400">Signed in as</p>
                      <p className="text-sm font-semibold text-white truncate">{user?.username}</p>
                      <p className="text-xs text-emerald-400 font-mono mt-0.5 sm:hidden">
                        ${(user?.balance || 0).toFixed(2)} USDT
                      </p>
                    </div>

                    <button
                      onClick={() => onNavigate('deposit')}
                      className="w-full px-3.5 py-2 text-left text-xs text-slate-300 hover:text-white hover:bg-white/[0.05] flex items-center gap-2 transition-colors"
                    >
                      <ArrowDownLeft className="w-4 h-4 text-cyan-400" />
                      Deposit USDT
                    </button>

                    <button
                      onClick={() => onNavigate('withdraw')}
                      className="w-full px-3.5 py-2 text-left text-xs text-slate-300 hover:text-white hover:bg-white/[0.05] flex items-center gap-2 transition-colors"
                    >
                      <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                      Withdraw Funds
                    </button>

                    <div className="border-t border-white/[0.08] my-1" />

                    <button
                      onClick={logout}
                      className="w-full px-3.5 py-2 text-left text-xs text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>

              {/* Mobile Menu Toggle Button */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-xl bg-white/[0.04] text-slate-300 hover:text-white"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onNavigate('login')}
                className="text-xs font-semibold text-slate-300 hover:text-white px-3 py-1.5 transition-colors"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => onNavigate('register')}
                className="btn-primary text-xs !py-1.5 !px-3"
              >
                Get Started
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && isAuthenticated && (
        <div className="md:hidden border-t border-white/[0.08] bg-[#0B0F19] px-4 py-3 space-y-1 shadow-2xl">
          {navLinks.map((link) => (
            <button
              key={link.id}
              type="button"
              onClick={() => {
                onNavigate(link.id);
                setMobileMenuOpen(false);
              }}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                currentPage === link.id
                  ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              {link.label}
            </button>
          ))}
          {user?.role === 'admin' && (
            <button
              type="button"
              onClick={() => {
                onNavigate('rashidadmin');
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-semibold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 transition-colors"
            >
              Admin Panel
            </button>
          )}
        </div>
      )}
    </header>
  );
}
