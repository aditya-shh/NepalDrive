import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import InteractiveMap, { HubLocation } from '../components/InteractiveMap';
import { api } from '../services/api';
import { 
  MapPin, 
  Car, 
  Phone, 
  Clock, 
  ShieldCheck, 
  Navigation, 
  CheckCircle2, 
  Sparkles, 
  ArrowRight, 
  Compass,
  Store,
  Fuel,
  Zap,
  Users
} from 'lucide-react';

export default function HubsMap() {
  const [locations, setLocations] = useState<HubLocation[]>([]);
  const [selectedHub, setSelectedHub] = useState<HubLocation | null>(null);
  const [hubVehicles, setHubVehicles] = useState<any[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const res = await api.getLocations();
        if (res.success && res.data) {
          setLocations(res.data);
          if (res.data.length > 0) {
            setSelectedHub(res.data[0]);
          }
        }
      } catch (err) {
        console.error('Failed to load shop locations', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLocations();
  }, []);

  // Fetch available vehicles at selected shop location
  useEffect(() => {
    if (!selectedHub) return;
    const fetchVehiclesForHub = async () => {
      setLoadingVehicles(true);
      try {
        const res = await api.getVehicles({ location: selectedHub.city });
        if (res.success && res.data) {
          setHubVehicles(res.data);
        }
      } catch (err) {
        console.error('Failed to load vehicles for shop location', err);
      } finally {
        setLoadingVehicles(false);
      }
    };

    fetchVehiclesForHub();
  }, [selectedHub]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10 animate-fade-in text-left">
      <SEO
        title="Nepal Rental Shops Location &amp; Branches | NepalDrive"
        description="Visit official NepalDrive vehicle rental shops and showrooms across Kathmandu, Lalitpur, Bhaktapur, Pokhara, and Chitwan. Interactive OpenStreetMap branch locator."
      />

      {/* Page Header */}
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 border-b border-stone-200 pb-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-crimson-50 text-crimson-700 text-xs font-mono font-bold rounded-full border border-crimson-200">
            <Store className="w-3.5 h-3.5 text-crimson-600" />
            <span>Official Rental Showrooms &amp; Branches</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-stone-900 tracking-tight">
            Nepal Rental Shops Location
          </h1>
          <p className="text-sm text-stone-600 leading-relaxed">
            Find verified NepalDrive rental shops and pickup branches across Kathmandu Valley, Pokhara Lakeside, and major travel corridors. Inspect vehicles in person or book online for immediate dispatch.
          </p>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 text-center">
            <span className="block text-lg font-bold text-stone-900">{locations.length}</span>
            <span className="text-[10px] text-stone-400 uppercase">Active Shops</span>
          </div>
          <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 text-center">
            <span className="block text-lg font-bold text-green-700">100%</span>
            <span className="text-[10px] text-stone-400 uppercase">Verified Open</span>
          </div>
        </div>
      </div>

      {/* Interactive Map Component */}
      <div className="space-y-4">
        <InteractiveMap
          locations={locations}
          selectedLocation={selectedHub}
          onSelectLocation={(hub) => setSelectedHub(hub)}
          height="540px"
          showSearchBar={true}
          showHubCards={true}
          title="Nepal Rental Shops Location Map"
        />
      </div>

      {/* Selected Shop Detail Section */}
      {selectedHub && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pt-6">
          
          {/* Shop Info Card (4 cols) */}
          <div className="lg:col-span-4 bg-white p-6 sm:p-7 rounded-3xl border border-stone-200 shadow-sm space-y-6">
            <div className="space-y-2 border-b border-stone-100 pb-4">
              <span className="text-[10px] font-mono font-bold uppercase text-crimson-600 px-2 py-0.5 rounded bg-crimson-50 inline-block">
                {selectedHub.city} Rental Branch
              </span>
              <h2 className="text-2xl font-serif font-bold text-stone-900">
                {selectedHub.name}
              </h2>
              <p className="text-xs text-stone-500 font-mono">
                GPS: {parseFloat(String(selectedHub.latitude)).toFixed(4)}&deg; N, {parseFloat(String(selectedHub.longitude)).toFixed(4)}&deg; E
              </p>
            </div>

            <div className="space-y-3 text-xs font-mono text-stone-700">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-crimson-600 shrink-0 mt-0.5" />
                <span>{selectedHub.address}</span>
              </div>

              {selectedHub.phone && (
                <div className="flex items-center gap-2.5">
                  <Phone className="w-4 h-4 text-stone-400 shrink-0" />
                  <a href={`tel:${selectedHub.phone}`} className="text-stone-900 font-bold hover:underline">
                    {selectedHub.phone}
                  </a>
                </div>
              )}

              {selectedHub.operating_hours && (
                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-stone-400 shrink-0" />
                  <span>{selectedHub.operating_hours}</span>
                </div>
              )}
            </div>

            {selectedHub.description && (
              <p className="text-xs text-stone-600 leading-relaxed font-light">
                {selectedHub.description}
              </p>
            )}

            <div className="pt-2">
              <Link
                to={`/vehicles?location=${selectedHub.city}`}
                className="w-full py-3 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold font-mono flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                <span>View Vehicles at {selectedHub.city} Shop</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Vehicles Available at this Shop (8 cols) */}
          <div className="lg:col-span-8 bg-white p-6 sm:p-7 rounded-3xl border border-stone-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-stone-100 pb-4">
              <div>
                <h3 className="text-lg font-serif font-bold text-stone-900">
                  Available Fleet at {selectedHub.name}
                </h3>
                <p className="text-xs text-stone-500 font-mono">
                  Ready for immediate self-drive or chauffeur booking
                </p>
              </div>
              <span className="text-xs font-mono font-bold bg-green-50 text-green-700 px-3 py-1 rounded-full border border-green-200">
                {hubVehicles.length} Vehicles Listed
              </span>
            </div>

            {loadingVehicles ? (
              <div className="py-12 text-center text-xs font-mono text-stone-400">
                Loading shop vehicle inventory...
              </div>
            ) : hubVehicles.length === 0 ? (
              <div className="py-12 text-center space-y-3 bg-stone-50 rounded-2xl border border-stone-200">
                <Car className="w-8 h-8 text-stone-300 mx-auto" />
                <p className="text-xs text-stone-500 font-mono">
                  No specific vehicles currently staged at this exact shop. Browse our central fleet or request delivery.
                </p>
                <Link
                  to="/vehicles"
                  className="inline-block text-xs font-semibold text-crimson-600 hover:underline font-mono"
                >
                  View Full Fleet &rarr;
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {hubVehicles.slice(0, 4).map((veh) => (
                  <div 
                    key={veh.id}
                    className="p-4 rounded-2xl border border-stone-200 bg-stone-50/50 hover:bg-white hover:border-crimson-300 transition-all space-y-3 flex flex-col justify-between"
                  >
                    <div className="flex items-start gap-3">
                      <img 
                        src={veh.image_url} 
                        alt={veh.name}
                        className="w-20 h-16 object-cover rounded-xl border border-stone-200 shrink-0" 
                      />
                      <div className="space-y-1 min-w-0">
                        <span className="text-[10px] font-mono font-bold text-crimson-700 bg-crimson-50 px-2 py-0.5 rounded uppercase">
                          {veh.type} &bull; {veh.year}
                        </span>
                        <h4 className="font-serif font-bold text-stone-900 text-sm truncate">
                          {veh.name}
                        </h4>
                        <div className="text-xs font-mono font-semibold text-stone-900">
                          Rs. {Number(veh.price_per_day).toLocaleString()} <span className="text-stone-400 font-normal text-[10px]">/ day</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-stone-200 flex items-center justify-between">
                      <span className="text-[10px] font-mono text-stone-500">
                        {veh.transmission} &bull; {veh.seats} Seats
                      </span>
                      <Link
                        to={`/vehicles/${veh.slug}`}
                        className="text-xs font-semibold font-mono text-crimson-600 hover:text-crimson-700 flex items-center gap-1"
                      >
                        Book Now &rarr;
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
