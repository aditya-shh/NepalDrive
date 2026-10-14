import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import SEO from '../components/SEO';
import { Search, MapPin, Calendar, Compass, Shield, Award, Sparkles, Map, ArrowRight, Mountain, Store } from 'lucide-react';
import InteractiveMap, { HubLocation } from '../components/InteractiveMap';
import { api } from '../services/api';

export default function Home() {
  const navigate = useNavigate();

  // Search widget state
  const [location, setLocation] = useState('Kathmandu');
  const [category, setCategory] = useState('All');
  const [pickupDate, setPickupDate] = useState('');
  const [returnDate, setReturnDate] = useState('');

  // Shops locations state
  const [locations, setLocations] = useState<HubLocation[]>([]);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const res = await api.getLocations();
        if (res.success && res.data) {
          setLocations(res.data);
        }
      } catch (err) {
        console.error('Failed to load shop locations on home', err);
      }
    };
    fetchLocations();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = new URLSearchParams();
    if (location) query.append('location', location);
    if (category !== 'All') query.append('category', category);
    if (pickupDate) query.append('pickup', pickupDate);
    if (returnDate) query.append('return', returnDate);
    navigate(`/vehicles?${query.toString()}`);
  };

  // Structured Data Schema for Search / Local Business
  const webSiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    'name': 'NepalDrive',
    'url': window.location.origin,
    'description': 'Rent premium cars, SUVs, Jeeps, and bikes in Kathmandu, Pokhara and across Nepal.',
    'potentialAction': {
      '@type': 'SearchAction',
      'target': {
        '@type': 'EntryPoint',
        'urlTemplate': `${window.location.origin}/vehicles?category={search_term_string}`
      },
      'query-input': 'required name=search_term_string'
    }
  };

  return (
    <div className="relative">
      <SEO
        title="Vehicle Rental in Nepal | Cars, Bikes & SUVs | NepalDrive"
        description="Premium vehicle rentals in Kathmandu, Pokhara & Lalitpur. Secure booking with self-drive or certified local drivers. Book Toyota, Scorpio & Enfield Classic."
        schema={webSiteSchema}
      />

      {/* Hero Section with high-fidelity background */}
      <section className="relative h-[85vh] min-h-[600px] flex items-center justify-center overflow-hidden">
        {/* Background Image with optimized dark overlay scrim */}
        <div className="absolute inset-0 z-0">
          <img
            src="/assets/images/hero_nepal_roadtrip_1791105653973.jpg"
            alt="Silver SUV driving in front of towering snowy Himalayas in Pokhara, Nepal"
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-stone-900/60 mix-blend-multiply" />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-transparent to-stone-900/35" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 max-w-5xl mx-auto px-4 text-center text-white space-y-6">
          <span className="font-mono text-xs uppercase tracking-widest text-crimson-300">
            Certified Self-Drive & Premium Driver Hire
          </span>
          <h1 className="text-4xl sm:text-6xl font-serif font-bold tracking-tight text-white leading-tight max-w-4xl mx-auto text-wrap">
            Conquer the Majestic Ridges of Nepal with NepalDrive
          </h1>
          <p className="text-base sm:text-xl text-stone-200 font-light max-w-2xl mx-auto">
            Rent luxury 4x4 SUVs, off-road Jeeps, hybrid EVs, and touring motorcycles. Seamless delivery inside Kathmandu Valley, Pokhara & Chitwan.
          </p>

          {/* Search Widget integrated directly on Hero */}
          <form
            onSubmit={handleSearchSubmit}
            className="mt-12 bg-white/95 backdrop-blur-md p-6 rounded-2xl shadow-xl border border-stone-100 max-w-4xl mx-auto text-stone-900 grid grid-cols-1 sm:grid-cols-4 gap-4"
          >
            {/* Location Selector */}
            <div className="text-left">
              <label className="block text-xs font-mono font-medium text-stone-500 uppercase tracking-wider mb-1">
                Pickup Location
              </label>
              <div className="relative flex items-center">
                <MapPin className="absolute left-3 w-4 h-4 text-crimson-500" />
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm font-medium focus:border-crimson-500"
                >
                  <option value="Kathmandu">Kathmandu Valley</option>
                  <option value="Pokhara">Pokhara Lake City</option>
                  <option value="Lalitpur">Lalitpur Core</option>
                  <option value="Bhaktapur">Bhaktapur Heritage</option>
                  <option value="Chitwan">Chitwan Plains</option>
                </select>
              </div>
            </div>

            {/* Category Selector */}
            <div className="text-left">
              <label className="block text-xs font-mono font-medium text-stone-500 uppercase tracking-wider mb-1">
                Vehicle Type
              </label>
              <div className="relative flex items-center">
                <Compass className="absolute left-3 w-4 h-4 text-crimson-500" />
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm font-medium focus:border-crimson-500"
                >
                  <option value="All">All Categories</option>
                  <option value="SUV">SUV (Premium)</option>
                  <option value="Jeep">Rugged 4WD Jeep</option>
                  <option value="Electric">Eco EV Car</option>
                  <option value="Bike">Touring Bike</option>
                  <option value="Scooter">City Scooter</option>
                </select>
              </div>
            </div>

            {/* Date Picker */}
            <div className="text-left">
              <label className="block text-xs font-mono font-medium text-stone-500 uppercase tracking-wider mb-1">
                Rent Range (Start - End)
              </label>
              <div className="relative flex items-center">
                <Calendar className="absolute left-3 w-4 h-4 text-crimson-500" />
                <input
                  type="date"
                  value={pickupDate}
                  onChange={(e) => setPickupDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm font-medium focus:border-crimson-500 text-stone-800"
                  required
                />
              </div>
            </div>

            {/* Submit CTA */}
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full bg-crimson-500 hover:bg-crimson-600 text-white font-medium text-sm py-2 px-4 rounded-lg flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer h-10"
              >
                <Search className="w-4 h-4" />
                Find Vehicle
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Trust & Verification Badges: Claim-to-proof adjacency */}
      <section className="bg-white py-8 border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center md:text-left">
            <div className="flex items-center gap-4 flex-col md:flex-row">
              <div className="p-3 bg-crimson-50 text-crimson-500 rounded-xl">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-lg text-stone-900">Verified Nepalese Drivers</h3>
                <p className="text-sm text-stone-500">Every single hire driver is background-checked and expert on Nepal mountain passes.</p>
              </div>
            </div>
            <div className="flex items-center gap-4 flex-col md:flex-row">
              <div className="p-3 bg-crimson-50 text-crimson-500 rounded-xl">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-lg text-stone-900">Zero Hidden Surcharges</h3>
                <p className="text-sm text-stone-500">Price shown includes taxes and comprehensive road insurance across Nepal.</p>
              </div>
            </div>
            <div className="flex items-center gap-4 flex-col md:flex-row">
              <div className="p-3 bg-crimson-50 text-crimson-500 rounded-xl">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-lg text-stone-900">Instant Fuel calculations</h3>
                <p className="text-sm text-stone-500">Choose between with-fuel or standard mileage rental formulas dynamically.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bento Grid Category Discovery */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="font-mono text-xs uppercase tracking-widest text-crimson-500">
            Curated Categories
          </span>
          <h2 className="text-3xl font-serif font-bold tracking-tight text-stone-900 mt-2">
            Select Your Vessel for the Nepal Road Trip
          </h2>
          <p className="text-sm text-stone-500 mt-2">
            Browse our carefully selected fleet suited to Nepals diverse roads, from highways to dirt tracks.
          </p>
        </div>

        {/* Spatial Bento Grid Layout */}
        <div className="bento-grid">
          
          {/* Card 1: SUVs (Large 6-cols) */}
          <Link
            to="/vehicles?category=SUV"
            className="col-span-12 lg:col-span-7 bg-stone-100 hover:shadow-md rounded-2xl overflow-hidden group transition-all relative min-h-[320px] flex items-end p-8"
          >
            <div className="absolute inset-0">
              <img
                src="/assets/images/fortuner_suv_1791105671393.jpg"
                alt="White Toyota Fortuner parked at a mountain resort in Nepal"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-stone-950/40 to-transparent" />
            </div>
            <div className="relative z-10 text-white">
              <span className="text-xs font-mono tracking-widest uppercase text-crimson-300">Class-Leading SUV</span>
              <h3 className="text-2xl font-serif font-bold mt-1">Toyota Fortuner &amp; Premium 4WDs</h3>
              <p className="text-sm text-stone-200 mt-2 max-w-md">
                Experience high-altitude peaks with maximum luxury. Seven seats, immense off-road control.
              </p>
              <div className="mt-4 text-xs font-mono text-white/95">
                From Rs. 18,500 / day
              </div>
            </div>
          </Link>

          {/* Card 2: Jeeps (5-cols) */}
          <Link
            to="/vehicles?category=Jeep"
            className="col-span-12 lg:col-span-5 bg-stone-100 hover:shadow-md rounded-2xl overflow-hidden group transition-all relative min-h-[320px] flex items-end p-8"
          >
            <div className="absolute inset-0">
              <img
                src="/assets/images/scorpio_jeep_1791105688961.jpg"
                alt="Rugged Mahindra Scorpio jeep riding across dusty valleys in Nepal"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-stone-950/40 to-transparent" />
            </div>
            <div className="relative z-10 text-white">
              <span className="text-xs font-mono tracking-widest uppercase text-crimson-300">Nepal-Tested Ruggedness</span>
              <h3 className="text-2xl font-serif font-bold mt-1">Mahindra Scorpio-N Jeeps</h3>
              <p className="text-sm text-stone-200 mt-2 max-w-xs">
                Perfect for long drives to Mustang, Pokhara or Chitwan. Unbeatable suspension.
              </p>
              <div className="mt-4 text-xs font-mono text-white/95">
                From Rs. 14,000 / day
              </div>
            </div>
          </Link>

          {/* Card 3: Bikes (4-cols) */}
          <Link
            to="/vehicles?category=Bike"
            className="col-span-12 lg:col-span-4 bg-stone-100 hover:shadow-md rounded-2xl overflow-hidden group transition-all relative min-h-[280px] flex items-end p-8"
          >
            <div className="absolute inset-0">
              <img
                src="/assets/images/classic_bike_1791105717263.jpg"
                alt="Royal Enfield Classic 350 on stone overlook in Nepalese village"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-stone-950/40 to-transparent" />
            </div>
            <div className="relative z-10 text-white">
              <span className="text-xs font-mono tracking-widest uppercase text-crimson-300">Legendary Cruiser</span>
              <h3 className="text-xl font-serif font-bold mt-1">Royal Enfield Classic</h3>
              <div className="mt-3 text-xs font-mono text-white/95">
                From Rs. 3,500 / day
              </div>
            </div>
          </Link>

          {/* Card 4: Electric (4-cols) */}
          <Link
            to="/vehicles?category=Electric"
            className="col-span-12 lg:col-span-4 bg-stone-100 hover:shadow-md rounded-2xl overflow-hidden group transition-all relative min-h-[280px] flex items-end p-8"
          >
            <div className="absolute inset-0">
              <img
                src="/assets/images/kona_ev_1791105704104.jpg"
                alt="Blue Hyundai Kona Electric charging in modern Kathmandu district"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-stone-950/40 to-transparent" />
            </div>
            <div className="relative z-10 text-white">
              <span className="text-xs font-mono tracking-widest uppercase text-crimson-300">Clean Tech</span>
              <h3 className="text-xl font-serif font-bold mt-1">Eco-Friendly Hybrid &amp; EVs</h3>
              <div className="mt-3 text-xs font-mono text-white/95">
                From Rs. 9,500 / day
              </div>
            </div>
          </Link>

          {/* Card 5: Cities / Tour Guide (4-cols) */}
          <div className="col-span-12 lg:col-span-4 bg-crimson-50 rounded-2xl p-8 flex flex-col justify-between border border-crimson-100/50">
            <div className="space-y-4">
              <div className="p-2 bg-crimson-100 text-crimson-500 rounded-lg w-max">
                <Store className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-serif font-bold text-stone-900">Nepal Rental Shops</h3>
              <p className="text-sm text-stone-600 leading-relaxed">
                Visit our physical showrooms and rental offices in Kathmandu, Lalitpur, Pokhara, Chitwan, or Bhaktapur. See and test your chosen vehicle before departure.
              </p>
            </div>
            <Link
              to="/map"
              className="text-xs font-mono font-bold text-crimson-500 hover:underline flex items-center gap-1 mt-6"
            >
              Explore Shops Location Map &rarr;
            </Link>
          </div>

        </div>
      </section>

      {/* Interactive Rental Shops Map Section */}
      <section className="bg-stone-50 py-16 border-t border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-2">
              <span className="font-mono text-xs uppercase tracking-widest text-terracotta-600 font-bold flex items-center gap-1.5">
                <Map className="w-4 h-4 text-terracotta-500" />
                Verified Nepal Rental Offices
              </span>
              <h2 className="text-3xl sm:text-4xl font-serif font-bold text-stone-900 leading-tight">
                Our Showrooms &amp; Delivery Stations
              </h2>
              <p className="text-sm text-stone-600 max-w-2xl">
                Find verified NepalDrive rental shops, pick up your vehicle in person, or request immediate key handovers at major airports and travel hubs.
              </p>
            </div>
            <Link
              to="/map"
              className="inline-flex items-center gap-2 text-xs font-mono font-bold text-crimson-600 hover:text-crimson-700 bg-white border border-stone-200 hover:border-stone-300 px-4 py-2.5 rounded-xl shadow-sm transition-all"
            >
              <span>View Fullscreen Branch Locator</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="space-y-4">
            <InteractiveMap
              locations={locations}
              height="450px"
              showSearchBar={false}
              showHubCards={false}
              title="Nepal Rental Shops Map"
            />
          </div>
        </div>
      </section>

      {/* Featured Nepal Road Trip Highlights */}
      <section className="bg-stone-100 py-16 sm:py-24 border-t border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            
            {/* Visual Block with Himalayan Road trip focus */}
            <div className="relative rounded-2xl overflow-hidden aspect-[4/3] shadow-lg">
              <img
                src="/assets/images/hero_nepal_roadtrip_1791105653973.jpg"
                alt="Silver SUV navigating mountain hairpin bends in Pokhara Nepal"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>

            {/* Content block */}
            <div className="space-y-6">
              <span className="font-mono text-xs uppercase tracking-widest text-crimson-500">
                The Himalayan Experience
              </span>
              <h2 className="text-3xl sm:text-4xl font-serif font-bold text-stone-900 leading-tight">
                Authentic, Worry-free Nepal Journeys
              </h2>
              <p className="text-sm text-stone-600 leading-relaxed">
                Nepal offers some of the most scenic road drives in Asia, but the terrain requires seasoned hardware. NepalDrive handpicks and maintains vehicles with optimal ground clearance, specialized tires, and comprehensive mechanical fitness certificates.
              </p>
              <p className="text-sm text-stone-600 leading-relaxed">
                Whether you select self-drive to navigate at your own pace or opt for a verified driver who knows every hairpin curve of the Prithvi Highway, we guarantee safety, punctuality, and pure premium reliability.
              </p>

              <div className="pt-4">
                <Link
                  to="/vehicles"
                  className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-semibold rounded-lg shadow-sm text-white bg-crimson-500 hover:bg-crimson-600 transition-colors"
                >
                  Browse Available Fleet
                </Link>
              </div>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
}
