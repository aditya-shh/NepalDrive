import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import SEO from '../components/SEO';
import { User, Mail, Phone, KeyRound, AlertTriangle, CheckCircle2, ShieldCheck, Eye, EyeOff } from 'lucide-react';

export default function Register() {
  const navigate = useNavigate();
  const { registerUser } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    try {
      const res = await registerUser({
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        password,
      });

      if (res.success) {
        setRegistrationSuccess(true);
      } else {
        setError(res.message || 'Registration could not be completed.');
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed. Email might already be taken.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-16 px-4">
      <SEO
        title="Create Account | Register at NepalDrive"
        description="Register a secure customer account at NepalDrive to search, filter and book premium vehicles across Nepal with or without certified drivers."
        noindex
      />

      <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm text-left space-y-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400 font-bold">
              Account Registration
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-mono text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200">
              <ShieldCheck className="w-3 h-3 text-green-600" /> SSL Secured
            </span>
          </div>
          <h1 className="text-2xl font-serif font-bold text-stone-900">Create Account</h1>
          <p className="text-xs text-stone-500 leading-relaxed font-sans">
            Join NepalDrive for premium vehicle hire, Himalayan expeditions, and personal driver services.
          </p>
        </div>

        {error && (
          <div className="p-3.5 bg-crimson-50 border border-crimson-100 text-crimson-700 text-xs rounded-xl flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {registrationSuccess ? (
          <div className="p-6 bg-green-50 border border-green-200 text-green-900 rounded-2xl space-y-4 text-center animate-fade-in">
            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center mx-auto shadow-2xs">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h2 className="font-serif font-bold text-lg text-green-950">Registration Complete!</h2>
              <p className="text-xs text-green-800 leading-relaxed">
                Welcome to NepalDrive, <strong>{fullName}</strong>. Your account has been registered successfully. You can now sign in to explore our fleet and book reservations.
              </p>
            </div>
            <Link
              to="/login"
              className="block w-full py-3 bg-crimson-600 hover:bg-crimson-700 text-white font-semibold text-xs text-center rounded-xl shadow-sm transition-colors cursor-pointer"
            >
              Sign In to Your Account &rarr;
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div className="space-y-1">
              <label className="block text-xs font-mono font-medium text-stone-500 uppercase">Full Name</label>
              <div className="relative flex items-center">
                <User className="absolute left-3 w-4 h-4 text-stone-400" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:bg-white focus:border-stone-400 outline-none transition-colors"
                  placeholder="e.g. Aarav Sharma"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1">
              <label className="block text-xs font-mono font-medium text-stone-500 uppercase">Email Address</label>
              <div className="relative flex items-center">
                <Mail className="absolute left-3 w-4 h-4 text-stone-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:bg-white focus:border-stone-400 outline-none transition-colors"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-1">
              <label className="block text-xs font-mono font-medium text-stone-500 uppercase">Contact Phone Number</label>
              <div className="relative flex items-center">
                <Phone className="absolute left-3 w-4 h-4 text-stone-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:bg-white focus:border-stone-400 outline-none transition-colors"
                  placeholder="+977-9801234567"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label className="block text-xs font-mono font-medium text-stone-500 uppercase">Password</label>
              <div className="relative flex items-center">
                <KeyRound className="absolute left-3 w-4 h-4 text-stone-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:bg-white focus:border-stone-400 outline-none transition-colors"
                  placeholder="Minimum 8 characters"
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
              className="w-full py-3 bg-crimson-600 hover:bg-crimson-700 text-white font-semibold text-xs rounded-xl shadow-sm cursor-pointer disabled:opacity-50 transition-all uppercase tracking-wide font-mono"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>
        )}

        <div className="text-center text-xs text-stone-500 pt-2 border-t border-stone-100">
          Already registered?{' '}
          <Link to="/login" className="text-crimson-600 font-semibold hover:underline">
            Sign In Here &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
