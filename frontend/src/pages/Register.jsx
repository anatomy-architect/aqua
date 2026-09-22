import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Waves, Lock, User, Mail, Gift, AlertCircle, ArrowRight, Eye, EyeOff, CheckCircle2 } from 'lucide-react';

export default function Register({ onNavigate }) {
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    referralCode: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Check URL query param for ref code e.g. ?ref=ALEX001
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      setFormData(prev => ({ ...prev, referralCode: ref.toUpperCase() }));
    }
  }, []);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.username.trim().length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match. Please verify.');
      return;
    }

    setLoading(true);
    try {
      await register({
        username: formData.username.trim(),
        email: formData.email.trim(),
        password: formData.password,
        referralCode: formData.referralCode.trim() || undefined
      });
      onNavigate('dashboard');
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-4 sm:p-6 relative">
      {/* Ambient background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyan/10 rounded-full blur-[130px] pointer-events-none" />

      <div className="w-full max-w-[500px] glass-card p-7 sm:p-9 relative z-10">
        
        {/* Brand Header */}
        <div className="text-center mb-7">
          <div className="w-13 h-13 rounded-2xl bg-cyan/15 border border-cyan/30 flex items-center justify-center mx-auto mb-3 shadow-cyan-glow">
            <Waves className="w-6 h-6 text-cyan animate-pulse" />
          </div>
          <h1 className="font-heading text-xl sm:text-2xl font-bold text-primary tracking-wide">
            CREATE YOUR ACCOUNT
          </h1>
          <p className="text-xs text-secondary mt-1">
            Join the premier algorithmic ocean-energy yield network
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-danger shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div>
            <label className="block text-xs font-mono text-muted uppercase mb-1.5 font-medium">
              Username *
            </label>
            <div className="relative">
              <input
                type="text"
                name="username"
                required
                value={formData.username}
                onChange={handleChange}
                placeholder="Choose a username"
                className="input-glass pl-10 text-xs sm:text-sm"
                autoComplete="username"
              />
              <User className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-muted uppercase mb-1.5 font-medium">
              Email Address *
            </label>
            <div className="relative">
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="you@domain.com"
                className="input-glass pl-10 text-xs sm:text-sm"
                autoComplete="email"
              />
              <Mail className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono text-muted uppercase mb-1.5 font-medium">
                Password *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Min 6 chars"
                  className="input-glass pl-10 pr-9 text-xs sm:text-sm"
                  autoComplete="new-password"
                />
                <Lock className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-primary p-1"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-muted uppercase mb-1.5 font-medium">
                Confirm Password *
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Re-enter password"
                  className="input-glass pl-10 pr-9 text-xs sm:text-sm"
                  autoComplete="new-password"
                />
                <Lock className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-primary p-1"
                >
                  {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-muted uppercase mb-1.5 font-medium">
              Referral Code (Optional)
            </label>
            <div className="relative">
              <input
                type="text"
                name="referralCode"
                value={formData.referralCode}
                onChange={handleChange}
                placeholder="e.g. AQUAVIP or CLARA03"
                className="input-glass pl-10 font-mono uppercase text-xs sm:text-sm"
              />
              <Gift className="w-4 h-4 text-gold absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-cyan py-3.5 text-xs sm:text-sm font-bold shadow-cyan-glow mt-6"
          >
            {loading ? 'Creating Portfolio...' : 'Complete Registration'} <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Footer Navigation Link */}
        <div className="mt-8 pt-6 border-t border-white/10 text-center text-xs text-secondary">
          Already have an account?{' '}
          <button
            onClick={() => onNavigate('login')}
            className="text-cyan font-bold hover:underline transition-colors ml-1"
          >
            Sign In
          </button>
        </div>

      </div>
    </div>
  );
}
