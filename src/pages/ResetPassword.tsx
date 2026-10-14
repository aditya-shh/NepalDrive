import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import SEO from '../components/SEO';
import { api } from '../services/api';
import { KeyRound, Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ShieldCheck, ArrowRight } from 'lucide-react';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || 
    (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('token') : null);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Password requirement checks
  const minLength = password.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Missing or invalid password reset token.');
      return;
    }

    if (!minLength || !hasLetter || !hasNumber) {
      setError('Please choose a password with at least 8 characters including letters and numbers.');
      return;
    }

    if (password !== confirmPassword) {
      setError('New password and confirmation password do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.resetPassword({
        token,
        password,
        confirmPassword,
      });

      if (res.success) {
        setSuccess(true);
      } else {
        setError(res.message || 'Failed to reset password. The link may have expired or already been used.');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid or expired password reset token.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center bg-stone-50 py-12 px-4 sm:px-6 lg:px-8">
      <SEO
        title="Set New Password | NepalDrive"
        description="Create a secure new password for your NepalDrive account."
      />

      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-3xl border border-stone-200 shadow-sm text-left">
        
        {/* Header */}
        <div className="space-y-3 text-center">
          <div className="w-14 h-14 bg-crimson-50 text-crimson-600 rounded-2xl flex items-center justify-center mx-auto border border-crimson-100 shadow-2xs">
            <Lock className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 tracking-tight">
            Create New Password
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 font-light max-w-sm mx-auto">
            Please enter your new secure password below. Existing sessions will be securely revoked.
          </p>
        </div>

        {!token ? (
          <div className="space-y-5 py-4 text-center">
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs">
              <AlertCircle className="w-6 h-6 text-red-600 mx-auto mb-2" />
              <strong>Missing Reset Token:</strong> No security token was provided in the URL. Please request a new password reset link.
            </div>
            <Link
              to="/forgot-password"
              className="inline-block w-full py-3 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-xl font-mono transition-colors text-center"
            >
              Request New Reset Link
            </Link>
          </div>
        ) : success ? (
          <div className="space-y-6 animate-fade-in py-4 text-center">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-3xl flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-serif font-bold text-stone-900">
                Password Changed Successfully
              </h2>
              <p className="text-xs sm:text-sm text-stone-600 max-w-sm mx-auto leading-relaxed">
                Your password has been updated successfully. You can now sign in using your new credentials.
              </p>
            </div>

            <Link
              to="/login"
              className="block w-full py-3.5 px-4 rounded-xl bg-crimson-600 hover:bg-crimson-700 text-white font-semibold text-xs font-mono tracking-wide uppercase shadow-sm transition-colors text-center"
            >
              Sign In Now &rarr;
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* New Password */}
            <div className="space-y-1.5">
              <label className="block text-xs font-mono font-bold uppercase text-stone-700">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full pl-4 pr-12 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 outline-none focus:border-crimson-500 transition-colors font-sans"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label className="block text-xs font-mono font-bold uppercase text-stone-700">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full pl-4 pr-12 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 outline-none focus:border-crimson-500 transition-colors font-sans"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Password requirements helper */}
            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 text-xs space-y-1.5 font-mono">
              <span className="font-bold uppercase text-stone-500 text-[10px] block">Password Requirements:</span>
              <div className={`flex items-center gap-2 ${minLength ? 'text-green-700 font-semibold' : 'text-stone-400'}`}>
                <span>{minLength ? '✓' : '•'}</span> At least 8 characters long
              </div>
              <div className={`flex items-center gap-2 ${hasLetter && hasNumber ? 'text-green-700 font-semibold' : 'text-stone-400'}`}>
                <span>{hasLetter && hasNumber ? '✓' : '•'}</span> Contains both letters and numbers
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-crimson-600 hover:bg-crimson-700 disabled:bg-stone-300 text-white font-semibold text-xs font-mono tracking-wide uppercase shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? 'Updating Password...' : 'Reset Password'}
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
