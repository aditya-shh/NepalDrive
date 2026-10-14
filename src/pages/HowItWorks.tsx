import React from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import { MousePointerClick, Calendar, ShieldCheck, Car } from 'lucide-react';

export default function HowItWorks() {
  const steps = [
    {
      icon: <MousePointerClick className="w-6 h-6 text-crimson-500" />,
      title: '1. Select Your Vessel',
      desc: 'Browse our curated, Nepal-optimized fleet. Filter by region, pricing, transmission, fuel type, or driver availability.'
    },
    {
      icon: <Calendar className="w-6 h-6 text-crimson-500" />,
      title: '2. Select Your Rental Dates',
      desc: 'Pick your pickup and drop-off dates. Choose self-drive or add a verified professional local driver service.'
    },
    {
      icon: <ShieldCheck className="w-6 h-6 text-crimson-500" />,
      title: '3. Identity Verification',
      desc: 'Upload your driving license or passport securely through our ID verification dashboard to fulfill legal safety mandates.'
    },
    {
      icon: <Car className="w-6 h-6 text-crimson-500" />,
      title: '4. Handover & Delivery',
      desc: 'Our staff will deliver the sanitized vehicle directly to your hotel, airport, or residence in Kathmandu, Pokhara, or Chitwan.'
    }
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-16 text-left space-y-12">
      <SEO
        title="How It Works | Booking Steps &amp; Surcharges | NepalDrive"
        description="Learn the simple 4-step process to rent premium cars, SUVs, or touring bikes in Nepal. Secure booking flow with physical vehicle delivery."
      />

      <div className="space-y-4 text-center max-w-2xl mx-auto">
        <span className="font-mono text-xs uppercase tracking-widest text-crimson-500">
          Booking Blueprint
        </span>
        <h1 className="text-4xl font-serif font-bold text-stone-900 leading-tight">
          How Vehicle Rental Works in Nepal
        </h1>
        <p className="text-sm text-stone-500 font-light">
          We have simplified car and bike rental to be transparent, quick, and compliant with Nepalese regulations.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-6">
        {steps.map((step, idx) => (
          <div key={idx} className="p-6 bg-white border border-stone-200 rounded-2xl space-y-4">
            <div className="p-3 bg-crimson-50 rounded-xl w-max">
              {step.icon}
            </div>
            <h3 className="text-lg font-serif font-bold text-stone-900">{step.title}</h3>
            <p className="text-sm text-stone-600 leading-relaxed font-light">{step.desc}</p>
          </div>
        ))}
      </div>

      <div className="text-center pt-8">
        <Link
          to="/vehicles"
          className="inline-flex items-center px-6 py-3 bg-crimson-500 hover:bg-crimson-600 text-white font-semibold text-sm rounded-lg shadow-sm"
        >
          View Available Fleet
        </Link>
      </div>
    </div>
  );
}
