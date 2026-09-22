import React from 'react';
import { LayoutDashboard, TrendingUp, ArrowDownLeft, ArrowUpRight, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function BottomNav({ currentPage, onNavigate }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated || currentPage.startsWith('rashidadmin')) return null;

  const items = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'plans', label: 'Plans', icon: TrendingUp },
    { id: 'deposit', label: 'Deposit', icon: ArrowDownLeft },
    { id: 'withdraw', label: 'Withdraw', icon: ArrowUpRight },
    { id: 'team', label: 'Affiliates', icon: Users }
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0B0F19]/95 backdrop-blur-lg border-t border-white/[0.08] px-2 py-1.5 flex justify-around items-center safe-area-bottom">
      {items.map(item => {
        const Icon = item.icon;
        const isActive = currentPage === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onNavigate(item.id)}
            className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all duration-150 ${
              isActive 
                ? 'text-cyan-400 font-semibold' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className={`p-1 rounded-lg transition-colors ${isActive ? 'bg-cyan-500/15' : ''}`}>
              <Icon className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight font-medium">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
