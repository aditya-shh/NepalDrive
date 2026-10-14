import React from 'react';
import SEO from '../components/SEO';

export default function Privacy() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16 text-left space-y-6 font-light">
      <SEO title="Privacy Policy | NepalDrive" description="NepalDrive Privacy Policy. Read how we protect and process customer identity and transaction data safely." noindex />
      <h1 className="text-3xl font-serif font-bold text-stone-900 mb-4">Privacy Policy</h1>
      <p className="text-xs text-stone-400 font-mono">Last updated: October 4, 2026</p>
      
      <p className="text-sm text-stone-600 leading-relaxed">
        At NepalDrive, accessible from NepalDrive.com, one of our main priorities is the privacy of our visitors and customers. This Privacy Policy document contains types of information that is collected and recorded by NepalDrive and how we use it.
      </p>

      <h2 className="text-lg font-serif font-bold text-stone-900 mt-6">Identity Verification Data</h2>
      <p className="text-sm text-stone-600 leading-relaxed">
        We collect identification files (citizenship cards, driving licenses, passport numbers) strictly to satisfy tourism security regulations mandated by the Government of Nepal. These documents are stored securely and are never disclosed to third parties unless required by legal authorities.
      </p>

      <h2 className="text-lg font-serif font-bold text-stone-900 mt-6">Payment Transactions</h2>
      <p className="text-sm text-stone-600 leading-relaxed">
        All payments made via Khalti or eSewa wallets are handled securely through API integrations. We never log or store full banking pins or password credentials on our local database.
      </p>
    </div>
  );
}
