import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SEO from '../components/SEO';
import RideMap, { RideRoute } from '../components/RideMap';
import { api } from '../services/api';
import { Compass, Mountain, Gauge, Clock, ShieldAlert, Car, ArrowRight, CheckCircle2, MapPin, Fuel, AlertTriangle } from 'lucide-react';

export default function Routes() {
  const [routes, setRoutes] = useState<RideRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoute, setSelectedRoute] = useState<RideRoute | null>(null);
  const [filterDifficulty, setFilterDifficulty] = useState<string>('All');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRoutes = async () => {
      try {
        const res = await api.getRideRoutes();
        if (res.success && res.data) {
          setRoutes(res.data);
          setSelectedRoute(res.data[0]);
        }
      } catch (err) {
        console.error('Failed to load routes from backend API', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRoutes();
  }, []);

  const filteredRoutes = routes.filter(r => {
    if (filterDifficulty === 'All') return true;
    if (filterDifficulty === '4x4') return r.difficulty.includes('4x4') || r.difficulty.includes('Off-Road');
    if (filterDifficulty === 'Paved') return r.difficulty.includes('Paved') || r.difficulty.includes('Easy');
    return true;
  });

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    'itemListElement': routes.map((r, index) => ({
      '@type': 'TouristTrip',
      'position': index + 1,
      'name': r.name,
      'description': r.tagline,
      'touristType': r.difficulty,
    }))
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12 animate-fade-in text-left">
      <SEO
        title="Famous Himalayan Ride Routes & Road Trips | NepalDrive"
        description="Explore iconic road trips across Nepal: Upper Mustang 4x4 circuit, Kathmandu-Pokhara river highway, Manang trail, and Rara Lake. Interactive map, GPS waypoints, and vehicle recommendations."
        canonical="https://nepaldrive.com/routes"
        schema={structuredData}
      />

      {/* Hero Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono uppercase font-bold tracking-wider bg-terracotta-100 text-terracotta-800">
          <Compass className="w-3.5 h-3.5 text-terracotta-600" />
          Himalayan Road Trip &amp; Adventure Guide
        </span>
        <h1 className="text-3xl sm:text-5xl font-serif font-bold text-stone-900 tracking-tight leading-tight">
          Famous Ride Locations &amp; Epic Nepal Routes
        </h1>
        <p className="text-stone-600 text-sm sm:text-base leading-relaxed">
          From ancient Tibetan kingdom canyons in Mustang to pristine alpine waters in Rara, navigate Nepal&apos;s most breathtaking roads with confidence. Use the interactive GPS map to plan your journey and match the ideal vehicle.
        </p>
      </div>

      {/* Interactive Map Component */}
      {loading ? (
        <div className="h-96 flex items-center justify-center bg-stone-100 rounded-3xl text-stone-500 font-mono text-xs">
          Loading Himalayan Highway Coordinates...
        </div>
      ) : (
        <RideMap
          routes={routes}
          selectedRouteId={selectedRoute?.id}
          onSelectRoute={(r) => setSelectedRoute(r)}
        />
      )}

      {/* Route Filter Navigation */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-stone-200">
        <div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-stone-900">
            Curated Expedition Details &amp; Road Advisories
          </h2>
          <p className="text-xs text-stone-500">
            Review terrain technicalities, checkpoint permits, and fuel recommendations for each circuit.
          </p>
        </div>

        <div className="flex gap-2 p-1 bg-stone-100 rounded-xl text-xs font-mono">
          <button
            onClick={() => setFilterDifficulty('All')}
            className={`px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${filterDifficulty === 'All' ? 'bg-white text-stone-950 font-bold shadow-sm' : 'text-stone-600 hover:text-stone-900'}`}
          >
            All Circuits ({routes.length})
          </button>
          <button
            onClick={() => setFilterDifficulty('4x4')}
            className={`px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${filterDifficulty === '4x4' ? 'bg-white text-stone-950 font-bold shadow-sm' : 'text-stone-600 hover:text-stone-900'}`}
          >
            Extreme 4x4 / Off-Road
          </button>
          <button
            onClick={() => setFilterDifficulty('Paved')}
            className={`px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${filterDifficulty === 'Paved' ? 'bg-white text-stone-950 font-bold shadow-sm' : 'text-stone-600 hover:text-stone-900'}`}
          >
            Scenic Highway / Paved
          </button>
        </div>
      </div>

      {/* Detailed Route Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredRoutes.map((r) => (
          <div
            key={r.id}
            className={`p-6 rounded-3xl border bg-white shadow-sm flex flex-col justify-between transition-all hover:shadow-md ${
              selectedRoute?.id === r.id ? 'border-crimson-500 ring-2 ring-crimson-100' : 'border-stone-200'
            }`}
          >
            <div className="space-y-4">
              {/* Badge & Distance */}
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-mono font-bold uppercase px-2.5 py-1 rounded-md ${
                  r.difficulty.includes('4x4')
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-green-100 text-green-800'
                }`}>
                  {r.difficulty}
                </span>
                <span className="text-xs font-mono font-bold text-stone-600 bg-stone-100 px-2 py-0.5 rounded">
                  {r.distance_km} km &middot; {r.duration}
                </span>
              </div>

              <div>
                <h3 className="text-xl font-serif font-bold text-stone-900 hover:text-crimson-600 transition-colors">
                  {r.name}
                </h3>
                <p className="text-xs text-stone-500 font-mono mt-0.5">
                  {r.origin} &rarr; {r.destination}
                </p>
                <p className="text-xs text-stone-600 mt-2 leading-relaxed">
                  {r.tagline}
                </p>
              </div>

              {/* Specs Bento */}
              <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
                <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-100">
                  <span className="text-[10px] text-stone-400 block uppercase">Elevation Profile</span>
                  <span className="font-bold text-stone-800">{r.elevation_gain}</span>
                </div>
                <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-100">
                  <span className="text-[10px] text-stone-400 block uppercase">Best Season</span>
                  <span className="font-bold text-stone-800">{r.best_season}</span>
                </div>
              </div>

              {/* Highlights List */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-mono uppercase font-bold text-stone-400 block">
                  Route Highlights
                </span>
                {r.highlights.slice(0, 3).map((hl, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-stone-700">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0 mt-0.5" />
                    <span>{hl}</span>
                  </div>
                ))}
              </div>

              {/* Permits Note */}
              <div className="p-3 bg-amber-50/70 border border-amber-200/60 rounded-xl space-y-1 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-amber-900 font-mono text-[11px]">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Required Entry Permits</span>
                </div>
                <p className="text-amber-800/90 text-[11px] leading-relaxed">
                  {r.permits_required.join(' • ')}
                </p>
              </div>

              {/* Recommended Fleet */}
              <div>
                <span className="text-[10px] font-mono uppercase font-bold text-stone-400 block mb-1">
                  Ideal Vehicles for this Highway
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {r.recommended_vehicles.map((v, i) => (
                    <span key={i} className="px-2 py-0.5 bg-stone-100 text-stone-800 text-[11px] font-mono rounded font-medium">
                      {v}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Book Vehicle for this Route CTA */}
            <div className="pt-6 border-t border-stone-100 mt-6 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setSelectedRoute(r)}
                className="text-xs font-mono font-bold text-stone-600 hover:text-stone-900 cursor-pointer"
              >
                Focus on Map &uarr;
              </button>
              <button
                type="button"
                onClick={() => {
                  const query = new URLSearchParams();
                  if (r.difficulty.includes('4x4')) query.append('category', 'SUV');
                  navigate(`/vehicles?${query.toString()}`);
                }}
                className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs rounded-xl cursor-pointer transition-colors flex items-center gap-1.5"
              >
                <span>Book Vehicle for Route</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Safety & Local Road Advisory Callout */}
      <div className="p-6 sm:p-8 bg-stone-900 text-white rounded-3xl space-y-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-terracotta-400" />
          <h3 className="font-serif font-bold text-xl text-white">
            NepalDrive High-Altitude &amp; Monsoon Road Protocol
          </h3>
        </div>
        <p className="text-xs sm:text-sm text-stone-300 leading-relaxed max-w-4xl">
          Driving in Nepal requires local respect for monsoon weather (July - August), steep mountain gradients, and single-lane suspension bridges. All NepalDrive 4x4 SUVs and Jeeps are equipped with all-terrain tires, full emergency toolkits, and 24/7 mountain breakdown support. If you are not accustomed to driving manual 4WD on rough rocky riverbeds, consider hiring one of our certified local mountain chauffeurs.
        </p>
        <div className="pt-2 flex flex-wrap gap-4 text-xs font-mono text-stone-400">
          <span>&check; 24/7 Highway Rescue</span>
          <span>&check; GPS Satellite Tracking</span>
          <span>&check; Complimentary Tire Chains (Winter)</span>
          <span>&check; Spare Fuel Canisters Provided</span>
        </div>
      </div>
    </div>
  );
}
