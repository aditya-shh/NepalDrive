import React from 'react';
import SEO from '../components/SEO';

export default function Terms() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16 text-left space-y-6 font-light">
      <SEO title="Terms and Conditions | NepalDrive" description="NepalDrive Terms of Service. Learn the legal conditions of self-drive car rentals and driver hire in Nepal." noindex />
      <h1 className="text-3xl font-serif font-bold text-stone-900 mb-4">Terms and Conditions</h1>
      <p className="text-xs text-stone-400 font-mono">Last updated: October 4, 2026</p>

      <p className="text-sm text-stone-600 leading-relaxed">
        Welcome to NepalDrive! These terms and conditions outline the rules and regulations for the use of NepalDrive Private Limited&apos;s Website and Fleet Services.
      </p>

      <h2 className="text-lg font-serif font-bold text-stone-900 mt-6">Rental Eligibility</h2>
      <p className="text-sm text-stone-600 leading-relaxed">
        To rent a self-drive vehicle, the driver must be at least 21 years of age and hold a valid Nepalese driver license or an international driving permit with at least 1 year of active driving experience.
      </p>

      <h2 className="text-lg font-serif font-bold text-stone-900 mt-6">Vehicle Damage &amp; Insurance Surcharge</h2>
      <p className="text-sm text-stone-600 leading-relaxed">
        In case of collision or mechanical damage resulting from off-road negligence, the customer will be liable for insurance deductible limits (up to the amount of the authorized security deposit). Additional damages are covered by our comprehensive road insurance policy.
      </p>
    </div>
  );
}
