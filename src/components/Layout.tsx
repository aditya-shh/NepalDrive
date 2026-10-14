import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { Compass, Menu, X, User, LogOut, Shield, MapPin } from 'lucide-react';
import UserAvatar from './UserAvatar';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="flex flex-col min-h-screen bg-stone-50 font-sans">
      {/* 15% mobile sticky height cap compliance: top bar is small and slim */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Zone 1: Brand title, single element, elegant Playfair serif */}
            <div className="flex items-center shrink-0">
              <Link to="/" className="text-xl sm:text-2xl font-serif font-bold tracking-tight text-crimson-500">
                NepalDrive
              </Link>
            </div>

            {/* Zone 2: 4-6 navigation links, single line, no badges */}
            <nav className="hidden md:flex items-center space-x-7 text-sm font-medium text-stone-600">
              <Link to="/vehicles" className={`hover:text-crimson-500 transition-colors whitespace-nowrap ${isActive('/vehicles') ? 'text-crimson-500 font-semibold' : ''}`}>
                Vehicles
              </Link>
              <Link to="/map" className={`hover:text-crimson-500 transition-colors whitespace-nowrap flex items-center gap-1 ${isActive('/map') ? 'text-crimson-500 font-semibold' : ''}`}>
                <MapPin className="w-3.5 h-3.5 text-crimson-500" />
                Shops Location
              </Link>
              <Link to="/how-it-works" className={`hover:text-crimson-500 transition-colors whitespace-nowrap ${isActive('/how-it-works') ? 'text-crimson-500 font-semibold' : ''}`}>
                How It Works
              </Link>
              <Link to="/faq" className={`hover:text-crimson-500 transition-colors whitespace-nowrap ${isActive('/faq') ? 'text-crimson-500 font-semibold' : ''}`}>
                FAQ
              </Link>
              <Link to="/contact" className={`hover:text-crimson-500 transition-colors whitespace-nowrap ${isActive('/contact') ? 'text-crimson-500 font-semibold' : ''}`}>
                Contact
              </Link>
            </nav>

            {/* Zone 3: 1-2 primary actions */}
            <div className="hidden md:flex items-center space-x-4">
              {user ? (
                <div className="flex items-center space-x-3">
                  {isAdmin && (
                    <Link
                      to="/admin"
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 rounded-lg shadow-sm transition-colors whitespace-nowrap"
                    >
                      <Shield className="w-3.5 h-3.5 text-amber-400" />
                      Owner Portal
                    </Link>
                  )}
                  <Link
                    to="/account"
                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-stone-800 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors whitespace-nowrap"
                  >
                    <UserAvatar user={user} size="xs" />
                    <span>My Account</span>
                  </Link>
                  <button
                    onClick={() => {
                      logout();
                      navigate('/');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-500 hover:text-crimson-500 transition-colors whitespace-nowrap"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  <Link
                    to="/login"
                    className="text-xs font-medium text-stone-600 hover:text-crimson-500 transition-colors whitespace-nowrap"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    className="px-4 py-2 text-xs font-medium text-white bg-crimson-500 hover:bg-crimson-600 rounded-lg shadow-sm transition-colors whitespace-nowrap"
                  >
                    Register
                  </Link>
                  <Link
                    to="/login?role=owner"
                    className="text-[11px] font-mono font-medium text-stone-400 hover:text-stone-900 transition-colors border-l pl-3 border-stone-200 whitespace-nowrap"
                  >
                    Owner Login &rarr;
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile menu trigger */}
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-stone-500 hover:text-crimson-500 p-2"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu panel */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-stone-200 py-4 px-4 space-y-3">
            <Link
              to="/vehicles"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-stone-600 hover:text-crimson-500 text-sm font-medium"
            >
              Browse Vehicles
            </Link>
            <Link
              to="/map"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-stone-600 hover:text-crimson-500 text-sm font-medium flex items-center gap-1.5"
            >
              <MapPin className="w-4 h-4 text-crimson-600" />
              Shops Location
            </Link>
            <Link
              to="/how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-stone-600 hover:text-crimson-500 text-sm font-medium"
            >
              How It Works
            </Link>
            <Link
              to="/faq"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-stone-600 hover:text-crimson-500 text-sm font-medium"
            >
              FAQ
            </Link>
            <Link
              to="/contact"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-stone-600 hover:text-crimson-500 text-sm font-medium"
            >
              Contact Support
            </Link>
            <hr className="border-stone-100" />
            {user ? (
              <div className="space-y-2">
                {isAdmin && (
                  <Link
                    to="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block text-stone-600 hover:text-crimson-500 text-sm font-medium"
                  >
                    Admin Console
                  </Link>
                )}
                <Link
                  to="/account"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-stone-600 hover:text-crimson-500 text-sm font-medium"
                >
                  My Account Profile
                </Link>
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                    navigate('/');
                  }}
                  className="block w-full text-left text-stone-500 hover:text-crimson-500 text-sm font-medium"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2 pt-1">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-center py-2 text-stone-600 hover:text-crimson-500 text-sm font-medium border border-stone-200 rounded-lg"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-center py-2 bg-crimson-500 hover:bg-crimson-600 text-white text-sm font-medium rounded-lg"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-grow">
        {children}
      </main>

      {/* Premium Footer */}
      <footer className="bg-stone-900 text-stone-400 border-t border-stone-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12">
            
            {/* Column 1: Brand details */}
            <div className="space-y-4">
              <span className="font-serif text-2xl font-bold tracking-tight text-white block">
                NepalDrive
              </span>
              <p className="text-sm text-stone-500 leading-relaxed">
                Nepals elite vehicle hire platform. Premium cars, rugged 4WD SUVs, hybrid EVs, and traditional touring bikes with certified drivers or self-drive.
              </p>
              <div className="text-sm font-mono text-stone-500 pt-2">
                Kathmandu Valley, Nepal
              </div>
            </div>

            {/* Column 2: Navigation links (Sitemap compliant) */}
            <div>
              <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-white mb-4">
                Explore Fleet
              </h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link to="/vehicles?category=SUV" className="hover:text-white transition-colors">
                    Premium SUVs
                  </Link>
                </li>
                <li>
                  <Link to="/vehicles?category=Jeep" className="hover:text-white transition-colors">
                    Off-road Jeeps
                  </Link>
                </li>
                <li>
                  <Link to="/vehicles?category=Electric" className="hover:text-white transition-colors">
                    Electric EVs
                  </Link>
                </li>
                <li>
                  <Link to="/vehicles?category=Bike" className="hover:text-white transition-colors">
                    Classic Motorcycles
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 3: Corporate */}
            <div>
              <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-white mb-4">
                Information
              </h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link to="/about" className="hover:text-white transition-colors">
                    About NepalDrive
                  </Link>
                </li>
                <li>
                  <Link to="/map" className="hover:text-white transition-colors flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-terracotta-400" />
                    Ride Routes &amp; Map
                  </Link>
                </li>
                <li>
                  <Link to="/how-it-works" className="hover:text-white transition-colors">
                    How Booking Works
                  </Link>
                </li>
                <li>
                  <Link to="/faq" className="hover:text-white transition-colors">
                    FAQs
                  </Link>
                </li>
                <li>
                  <Link to="/contact" className="hover:text-white transition-colors">
                    Contact Us
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 4: Contact & Verification links */}
            <div>
              <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-white mb-4">
                Support Desk
              </h3>
              <p className="text-sm text-stone-500 leading-relaxed mb-4">
                Need premium assistance or route recommendations for Nepalese terrain? Speak directly to our travel experts.
              </p>
              <div className="text-white font-mono text-base font-semibold">
                9703900903
              </div>
              <div className="text-stone-500 text-xs mt-1">
                support@nepaldrive.com
              </div>
            </div>
          </div>

          <hr className="border-stone-800 my-8 sm:my-12" />

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs text-stone-500">
            <div>
              © 2026 NepalDrive Private Limited. All rights reserved. Registered under Nepal Tourism Authority.
            </div>
            <div className="flex items-center space-x-6">
              <Link to="/privacy" className="hover:text-white transition-colors">
                Privacy
              </Link>
              <Link to="/terms" className="hover:text-white transition-colors">
                Terms
              </Link>
              <a href="/sitemap.xml" className="hover:text-white transition-colors" target="_blank">
                Sitemap
              </a>
              <a href="/robots.txt" className="hover:text-white transition-colors" target="_blank">
                Robots.txt
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
