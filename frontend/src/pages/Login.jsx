import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Waves, Lock, User, AlertCircle, ArrowRight, Eye, EyeOff } from 'lucide-react';

export default function Login({ onNavigate }) {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(identifier, password);
      if (user.role === 'admin') {
        onNavigate('rashidadmin/dashboard');
      } else {
        onNavigate('dashboard');
      }
    } catch (err) {
      setError(err.message || 'Invalid username/email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-4 sm:p-6 relative">
      {/* Ambient background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] bg-cyan/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-[460px] glass-card p-7 sm:p-9 relative z-10">
        
        {/* Brand Header */}
        <div className="text-center mb-7">
          <div className="w-13 h-13 rounded-2xl bg-cyan/15 border border-cyan/30 flex items-center justify-center mx-auto mb-3 shadow-cyan-glow">
            <Waves className="w-6 h-6 text-cyan animate-pulse" />
          </div>
          <h1 className="font-heading text-xl sm:text-2xl font-bold text-primary tracking-wide">
            WELCOME BACK
          </h1>
          <p className="text-xs text-secondary mt-1">
            Access your ocean-energy investment portfolio
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-danger shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-muted uppercase mb-1.5 font-medium">
              Username or Email
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Enter your email or username"
                className="input-glass pl-10 text-xs sm:text-sm"
                autoComplete="username"
              />
              <User className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-mono text-muted uppercase font-medium">
                Password
              </label>
              <button
                type="button"
                onClick={() => alert('To reset your password, please contact Aqua Vault support with your verified email address.')}
                className="text-[11px] text-cyan/80 hover:text-cyan transition-colors"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="input-glass pl-10 pr-10 text-xs sm:text-sm"
                autoComplete="current-password"
              />
              <Lock className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-primary p-1"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-cyan py-3.5 text-xs sm:text-sm font-bold shadow-cyan-glow mt-6"
          >
            {loading ? 'Authenticating...' : 'Sign In to Vault'} <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Footer Navigation Link */}
        <div className="mt-8 pt-6 border-t border-white/10 text-center text-xs text-secondary">
          Don't have an investment account?{' '}
          <button
            onClick={() => onNavigate('register')}
            className="text-cyan font-bold hover:underline transition-colors ml-1"
          >
            Join Aqua Vault
          </button>
        </div>

      </div>
    </div>
  );
}
