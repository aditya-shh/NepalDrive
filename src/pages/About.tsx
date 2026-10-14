import React from 'react';
import SEO from '../components/SEO';
import { Shield, Sparkles, Map, Phone } from 'lucide-react';

export default function About() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16 text-left space-y-12">
      <SEO
        title="About Us | Premium Vehicle Hire in Nepal | NepalDrive"
        description="Learn more about NepalDrive, the leading premium vehicle rental service based in Kathmandu, Nepal. Our mission, values, and unmatched fleet quality."
      />

      <div className="space-y-4">
        <span className="font-mono text-xs uppercase tracking-widest text-crimson-500">
          Our Brand Story
        </span>
        <h1 className="text-4xl font-serif font-bold text-stone-900 leading-tight">
          Crafting Elite Journeys Across Nepal
        </h1>
        <p className="text-sm text-stone-600 leading-relaxed font-light">
          Founded in 2024, NepalDrive was established to bridge the gap between travelers seeking unmatched luxury and the rugged realities of Nepalese terrain. We recognized that exploring the breathtaking valleys, high mountain passes, and ancient towns of Nepal requires more than just a car—it demands meticulously prepared machinery, transparent pricing, and absolute security.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6">
        <div className="p-6 bg-white border border-stone-200 rounded-2xl space-y-3">
          <div className="p-2.5 bg-crimson-50 text-crimson-500 rounded-lg w-max">
            <Shield className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-serif font-bold text-stone-900">Safety First Strategy</h3>
          <p className="text-xs text-stone-500 leading-relaxed">
            Every vehicle in our fleet undergo rigorous 45-point mechanical checkups before delivery. We supply active backup fleet coverage across all Nepalese highways.
          </p>
        </div>

        <div className="p-6 bg-white border border-stone-200 rounded-2xl space-y-3">
          <div className="p-2.5 bg-crimson-50 text-crimson-500 rounded-lg w-max">
            <Sparkles className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-serif font-bold text-stone-900">Premium Standards Only</h3>
          <p className="text-xs text-stone-500 leading-relaxed">
            No unstyled dashboards, worn-out tires, or faulty air conditioning. We deliver vehicles in pristine showroom conditions, guaranteeing comfort.
          </p>
        </div>
      </div>

      <div className="p-8 bg-stone-100 rounded-2xl space-y-4">
        <h2 className="text-xl font-serif font-bold text-stone-900">Registered Office and Support</h2>
        <p className="text-xs text-stone-600 leading-relaxed">
          NepalDrive Private Limited is registered with the Nepal Tourism Authority and Department of Transport Management. Our primary showroom is strategically located in Lazimpat, Kathmandu.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 pt-2 text-xs font-mono text-stone-500">
          <span>Showroom: Lazimpat Road, Kathmandu</span>
          <span>Contact Hotline: +977 703900903</span>
        </div>
      </div>
    </div>
  );
}
