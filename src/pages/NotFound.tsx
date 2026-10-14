import React from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';

export default function NotFound() {
  return (
    <div className="max-w-md mx-auto my-24 px-4 text-center space-y-6">
      <SEO title="Page Not Found | 404 Error | NepalDrive" description="The requested page could not be found. Return to NepalDrive homepage or find premium rental vehicles." noindex />
      
      <span className="font-mono text-3xl font-extrabold text-crimson-500 block">404</span>
      <h1 className="text-3xl font-serif font-bold text-stone-900">Oops! Lost in the Valleys</h1>
      <p className="text-sm text-stone-500 font-light leading-relaxed">
        We can&apos;t seem to find the route you are looking for. The page may have been moved, deleted, or does not exist.
      </p>

      <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
        <Link
          to="/"
          className="px-4 py-2.5 bg-crimson-500 hover:bg-crimson-600 text-white font-semibold text-xs rounded-lg shadow-sm"
        >
          Return to Home
        </Link>
        <Link
          to="/vehicles"
          className="px-4 py-2.5 border border-stone-200 text-stone-600 font-semibold text-xs rounded-lg hover:bg-stone-50"
        >
          Browse Vehicles
        </Link>
      </div>
    </div>
  );
}
