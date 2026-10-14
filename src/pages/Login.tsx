import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import SEO from '../components/SEO';
import { KeyRound, Mail, AlertTriangle, ShieldCheck, UserCheck, Shield, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();

  const isOwnerDefault = searchParams.get('role') === 'owner';
  const [loginMode, setLoginMode] = useState<'customer' | 'owner'>(isOwnerDefault ? 'owner' : 'customer');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const loggedIn = await login({ email: email.trim().toLowerCase(), password });
      if (loginMode === 'owner' || loggedIn?.role === 'ADMIN' || email.trim().toLowerCase() === 'aditya.shh15@gmail.com') {
        navigate('/admin');
      } else {
        navigate('/account');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid email credentials or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-16 px-4">
      <SEO
        title="Sign In | Customer & Fleet Owner Portal | NepalDrive"
        description="Login securely to your NepalDrive customer account or fleet owner console to manage vehicle reservations and road-trip services."
        noindex
      />

      <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm text-left space-y-6">
        {/* Header and Security Badge */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400 font-bold">
              Enterprise SSL Security
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-mono text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200">
              <ShieldCheck className="w-3 h-3 text-green-600" /> Server Verified
            </span>
          </div>

          <h1 className="text-2xl font-serif font-bold text-stone-900">
            {loginMode === 'owner' ? 'Fleet Owner & Admin Console' : 'Sign In to NepalDrive'}
          </h1>

          <p className="text-xs text-stone-500 leading-relaxed">
            {loginMode === 'owner'
              ? 'Authorized portal for fleet owners to verify customer reservations, inspect dispatch records, and manage fleet inventory.'
              : 'Access your active reservations, trip receipts, and driver license profile.'}
          </p>
        </div>

        {/* Role Switcher Tabs */}
        <div className="grid grid-cols-2 p-1 bg-stone-100 rounded-xl text-xs font-mono">
          <button
            type="button"
            onClick={() => { setLoginMode('customer'); setError(''); }}
            className={`py-2 rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1.5 font-bold ${
              loginMode === 'customer'
                ? 'bg-white text-stone-900 shadow-sm'
                : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            Customer
          </button>
          <button
            type="button"
            onClick={() => { setLoginMode('owner'); setError(''); }}
            className={`py-2 rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1.5 font-bold ${
              loginMode === 'owner'
                ? 'bg-stone-900 text-white shadow-sm'
                : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-amber-400" />
            Fleet Owner
          </button>
        </div>

        {error && (
          <div className="p-3 bg-crimson-50 border border-crimson-100 text-crimson-600 text-xs rounded-lg flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-xs font-mono font-medium text-stone-500 uppercase">
              {loginMode === 'owner' ? 'Owner Email Account' : 'Registered Email Address'}
            </label>
            <div className="relative flex items-center">
              <Mail className="absolute left-3 w-4 h-4 text-stone-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:bg-white focus:border-stone-400 outline-none transition-colors"
                placeholder={loginMode === 'owner' ? 'admin@nepaldrive.com' : 'you@example.com'}
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-mono font-medium text-stone-500 uppercase">Password</label>
              <Link
                to="/forgot-password"
                className="text-[11px] text-crimson-500 hover:underline"
              >
                Forgot Password?
              </Link>
            </div>
            <div className="relative flex items-center">
              <KeyRound className="absolute left-3 w-4 h-4 text-stone-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-10 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:bg-white focus:border-stone-400 outline-none transition-colors"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 p-1 text-stone-400 hover:text-stone-700 cursor-pointer focus:outline-none transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 font-semibold text-xs rounded-xl shadow-sm cursor-pointer disabled:opacity-50 transition-all ${
              loginMode === 'owner'
                ? 'bg-stone-900 hover:bg-stone-800 text-white'
                : 'bg-crimson-600 hover:bg-crimson-700 text-white'
            }`}
          >
            {loading ? 'Authenticating...' : loginMode === 'owner' ? 'Enter Fleet Owner Portal' : 'Sign In as Customer'}
          </button>
        </form>

        <div className="text-center text-xs text-stone-500 pt-2 border-t border-stone-100 flex items-center justify-between">
          <span>Don&apos;t have an account?</span>
          <Link to="/register" className="text-crimson-600 font-semibold hover:underline">
            Register as Customer &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
