import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import AdminLayout from './components/AdminLayout';

// Public & Investor Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Plans from './pages/Plans';
import Deposit from './pages/Deposit';
import Withdraw from './pages/Withdraw';
import Team from './pages/Team';
import Transactions from './pages/Transactions';

// Admin Pages
import AdminLogin from './pages/Admin/AdminLogin';
import AdminDashboard from './pages/Admin/AdminDashboard';
import AdminDeposits from './pages/Admin/AdminDeposits';
import AdminWithdrawals from './pages/Admin/AdminWithdrawals';
import AdminUsers from './pages/Admin/AdminUsers';
import AdminPlans from './pages/Admin/AdminPlans';
import AdminWalletConfig from './pages/Admin/AdminWalletConfig';
import AdminReferrals from './pages/Admin/AdminReferrals';
import AdminAuditLogs from './pages/Admin/AdminAuditLogs';

function parseCurrentRoute() {
  const pathname = window.location.pathname.replace(/^\/+/, '');
  const hash = window.location.hash.replace(/^#\/?/, '');

  if (pathname.startsWith('rashidadmin')) {
    return pathname;
  }
  if (hash.startsWith('rashidadmin')) {
    return hash;
  }
  if (hash) {
    return hash;
  }
  return 'landing';
}

function MainApp() {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  
  const [currentPage, setCurrentPage] = useState(parseCurrentRoute);

  const navigate = (page) => {
    setCurrentPage(page);
    if (page.startsWith('rashidadmin')) {
      window.location.hash = `#/${page}`;
    } else {
      window.location.hash = `#/${page}`;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const handleNavigationChange = () => {
      setCurrentPage(parseCurrentRoute());
    };
    window.addEventListener('hashchange', handleNavigationChange);
    window.addEventListener('popstate', handleNavigationChange);
    return () => {
      window.removeEventListener('hashchange', handleNavigationChange);
      window.removeEventListener('popstate', handleNavigationChange);
    };
  }, []);

  // Redirect to dashboard if logged in on public investor login/register
  useEffect(() => {
    if (isAuthenticated) {
      if (currentPage === 'login' || currentPage === 'register') {
        navigate('dashboard');
      }
    }
  }, [isAuthenticated, currentPage]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0F2C] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-cyan/20 border border-cyan/40 flex items-center justify-center animate-spin-medium shadow-cyan-glow">
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-cyan" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" fill="currentColor" />
              <path d="M12 2C6.5 2 2 6.5 2 12C2 17.5 6.5 22 12 22C17.5 22 22 17.5 22 12" />
            </svg>
          </div>
          <span className="font-heading text-[11px] font-bold text-cyan tracking-widest uppercase">
            Synchronizing Aqua Vault...
          </span>
        </div>
      </div>
    );
  }

  // 1. ADMIN ROUTING NAMESPACE (/rashidadmin)
  if (currentPage.startsWith('rashidadmin')) {
    // If not authenticated as admin, render dedicated private AdminLogin
    if (!isAuthenticated || !isAdmin) {
      return <AdminLogin onNavigate={navigate} />;
    }

    // Authenticated Admin Dashboard Layout
    return (
      <AdminLayout currentPage={currentPage} onNavigate={navigate}>
        {(currentPage === 'rashidadmin' || currentPage === 'rashidadmin/dashboard') && <AdminDashboard onNavigate={navigate} />}
        {currentPage === 'rashidadmin/deposits' && <AdminDeposits />}
        {currentPage === 'rashidadmin/withdrawals' && <AdminWithdrawals />}
        {currentPage === 'rashidadmin/users' && <AdminUsers />}
        {currentPage === 'rashidadmin/plans' && <AdminPlans />}
        {currentPage === 'rashidadmin/wallet' && <AdminWalletConfig />}
        {currentPage === 'rashidadmin/referrals' && <AdminReferrals />}
        {currentPage === 'rashidadmin/audits' && <AdminAuditLogs />}
      </AdminLayout>
    );
  }

  // 2. PUBLIC USER & INVESTOR PAGES
  const isPublicPage = currentPage === 'landing' || currentPage === 'login' || currentPage === 'register';

  return (
    <div className="min-h-screen bg-[#090D16] text-[#F8FAFC] flex flex-col selection:bg-cyan-500 selection:text-slate-950">
      
      {/* Public / User Navbar */}
      <Navbar onNavigate={navigate} currentPage={currentPage} />

      {/* Main Viewport */}
      {isPublicPage ? (
        <main className="flex-1">
          {currentPage === 'landing' && <Landing onNavigate={navigate} />}
          {currentPage === 'login' && <Login onNavigate={navigate} />}
          {currentPage === 'register' && <Register onNavigate={navigate} />}
        </main>
      ) : (
        <div className="flex-1 w-full min-w-0 flex flex-col">
          {/* Main Protected Content Viewport */}
          <main className="flex-1 w-full min-w-0 overflow-x-hidden pb-20 md:pb-8">
            {currentPage === 'dashboard' && <Dashboard onNavigate={navigate} />}
            {currentPage === 'plans' && <Plans onNavigate={navigate} />}
            {currentPage === 'deposit' && <Deposit onNavigate={navigate} />}
            {currentPage === 'withdraw' && <Withdraw onNavigate={navigate} />}
            {currentPage === 'team' && (
              <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
                <Team onNavigate={navigate} />
              </div>
            )}
            {currentPage === 'transactions' && (
              <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
                <Transactions onNavigate={navigate} />
              </div>
            )}
          </main>
        </div>
      )}

      {/* Mobile Fixed Bottom Nav (<768px) */}
      {!isPublicPage && <BottomNav currentPage={currentPage} onNavigate={navigate} />}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
