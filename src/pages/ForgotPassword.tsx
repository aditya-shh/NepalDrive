import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import { api } from '../services/api';
import { KeyRound, Mail, ArrowLeft, CheckCircle2, AlertCircle, Clock, Sparkles } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [debugResetLink, setDebugResetLink] = useState('');
  
  // Cooldown timer for resend
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    let timer: any;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.forgotPassword(email.trim());
      // Always show generic success to prevent account enumeration
      setSubmitted(true);
      setCooldown(60); // 60 seconds cooldown

      if (res.data?.resetLink) {
        setDebugResetLink(res.data.resetLink);
      }
    } catch (err: any) {
      // Even if network error occurs, show generic success for security, but log or show friendly error if needed
      setSubmitted(true);
      setCooldown(60);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center bg-stone-50 py-12 px-4 sm:px-6 lg:px-8">
      <SEO
        title="Forgot Password | NepalDrive"
        description="Reset your NepalDrive account password securely using email verification."
      />

      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-3xl border border-stone-200 shadow-sm text-left">
        
        {/* Header */}
        <div className="space-y-3 text-center">
          <div className="w-14 h-14 bg-crimson-50 text-crimson-600 rounded-2xl flex items-center justify-center mx-auto border border-crimson-100 shadow-2xs">
            <KeyRound className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 tracking-tight">
            Reset Your Password
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 font-light max-w-sm mx-auto">
            Enter your registered account email and we will send you a secure one-time link to create a new password.
          </p>
        </div>

        {submitted ? (
          <div className="space-y-6 animate-fade-in py-2">
            <div className="p-5 rounded-2xl bg-green-50 border border-green-200 text-green-800 text-xs sm:text-sm space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-green-950 text-sm">Reset Link Dispatched</p>
                  <p className="leading-relaxed text-green-800 text-xs">
                    If an account is associated with <strong>{email}</strong>, we have dispatched a secure password reset link to your email inbox. Please check your inbox (and spam/promotions folder) to complete resetting your password.
                  </p>
                </div>
              </div>
            </div>

            {debugResetLink && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2.5">
                <div className="flex items-center gap-2 font-semibold text-amber-950">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>Direct Password Reset Link</span>
                </div>
                <p className="text-amber-800 leading-relaxed text-xs">
                  You can also click directly below to set your new password immediately:
                </p>
                <div>
                  <a
                    href={debugResetLink}
                    className="inline-flex items-center gap-1.5 font-mono text-xs bg-amber-700 hover:bg-amber-800 text-white font-semibold py-2.5 px-4 rounded-xl shadow-2xs transition-colors"
                  >
                    <span>Open Password Reset Screen &rarr;</span>
                  </a>
                </div>
              </div>
            )}

            <div className="space-y-3 pt-2">
              <button
                type="button"
                disabled={cooldown > 0}
                onClick={() => {
                  if (cooldown === 0) {
                    setSubmitted(false);
                    setDebugResetLink('');
                  }
                }}
                className={`w-full py-3 px-4 rounded-xl text-xs font-semibold font-mono transition-colors text-center ${
                  cooldown > 0
                    ? 'bg-stone-100 text-stone-400 cursor-not-allowed'
                    : 'bg-stone-900 hover:bg-stone-800 text-white cursor-pointer'
                }`}
              >
                {cooldown > 0 ? `Resend email available in ${cooldown}s` : 'Request Another Reset Email'}
              </button>

              <Link
                to="/login"
                className="block w-full py-3 px-4 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold text-center transition-colors font-mono"
              >
                &larr; Back to Sign In
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-mono font-bold uppercase text-stone-700">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. aditya.shh15@gmail.com"
                  className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 outline-none focus:border-crimson-500 transition-colors font-sans"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-crimson-600 hover:bg-crimson-700 disabled:bg-stone-300 text-white font-semibold text-xs font-mono tracking-wide uppercase shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? 'Sending Secure Link...' : 'Send Reset Link'}
            </button>

            <div className="text-center pt-2">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-600 hover:text-crimson-600 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Sign In</span>
              </Link>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
