/// <reference types="@types/google.maps" />
import React, { useEffect, useState } from 'react';
import { 
  APIProvider, 
  Map, 
  AdvancedMarker, 
  InfoWindow, 
  Pin,
  useMap 
} from '@vis.gl/react-google-maps';
import { Compass, Mountain, Gauge, Clock, ShieldAlert, Car, ArrowRight, Layers, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyAU8MVH6dH5oH3X_bMmEQFrZaw2wVMih8c';

export interface RouteStop {
  name: string;
  lat: number;
  lng: number;
  elevation: string;
  desc: string;
}

export interface RideRoute {
  id: string;
  name: string;
  tagline: string;
  origin: string;
  destination: string;
  distance_km: number;
  duration: string;
  difficulty: string;
  best_season: string;
  elevation_gain: string;
  permits_required: string[];
  highlights: string[];
  recommended_vehicles: string[];
  recommended_vehicle_ids: number[];
  key_stops: RouteStop[];
}

interface RideMapProps {
  routes: RideRoute[];
  selectedRouteId?: string;
  onSelectRoute?: (route: RideRoute) => void;
  interactiveHeight?: string;
}

// React component helper to draw lines on Google Maps cleanly
function Polyline({ path, color, weight, opacity, dashed = false }: { 
  path: { lat: number; lng: number }[]; 
  color: string; 
  weight: number; 
  opacity: number; 
  dashed?: boolean; 
}) {
  const map = useMap();

  useEffect(() => {
    if (!map || !path || path.length === 0) return;

    const options: google.maps.PolylineOptions = {
      path,
      strokeColor: color,
      strokeWeight: weight,
      strokeOpacity: opacity,
    };

    if (dashed) {
      options.strokeOpacity = 0;
      options.icons = [{
        icon: {
          path: 'M 0,-1 0,1',
          strokeOpacity: opacity,
          strokeWeight: weight,
          scale: 3
        },
        offset: '0',
        repeat: '20px'
      }];
    }

    const polyline = new google.maps.Polyline(options);
    polyline.setMap(map);

    return () => {
      polyline.setMap(null);
    };
  }, [map, path, color, weight, opacity, dashed]);

  return null;
}

// Declarative bounds controller to automatically pan/zoom map to fit selected route coordinates
function MapBoundsController({ path }: { path: { lat: number; lng: number }[] }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !path || path.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    path.forEach(coord => bounds.extend(coord));
    map.fitBounds(bounds, {
      top: 50,
      right: 50,
      bottom: 50,
      left: 50
    });
  }, [map, path]);

  return null;
}

export default function RideMap({
  routes,
  selectedRouteId,
  onSelectRoute,
  interactiveHeight = 'h-[540px]'
}: RideMapProps) {
  const [activeRouteId, setActiveRouteId] = useState<string>(selectedRouteId || routes[0]?.id || 'upper-mustang');
  const [mapTypeId, setMapTypeId] = useState<'roadmap' | 'terrain' | 'hybrid'>('roadmap');
  const [activePopupStopIndex, setActivePopupStopIndex] = useState<number | null>(null);
  const navigate = useNavigate();

  const activeRoute = routes.find(r => r.id === activeRouteId) || routes[0];

  // Route colors for visual distinction
  const routeColors: Record<string, string> = {
    'upper-mustang': '#b56544', // Terracotta
    'kathmandu-pokhara': '#9e2a2b', // Crimson
    'manang-circuit': '#21629c', // Himalaya Blue
    'rara-lake': '#597d58', // Alpine Moss Green
    'nagarkot-dhulikhel': '#d97706', // Amber
    'chitwan-safari': '#059669', // Emerald
  };

  const activeColor = routeColors[activeRoute?.id] || '#9e2a2b';
  const activePathCoords = activeRoute?.key_stops.map(s => ({ lat: s.lat, lng: s.lng })) || [];

  const [mapBlocked, setMapBlocked] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (typeof window !== 'undefined' && !((window as any).google?.maps)) {
        setMapBlocked(true);
      }
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  const handleRouteSelect = (route: RideRoute) => {
    setActiveRouteId(route.id);
    setActivePopupStopIndex(null);
    if (onSelectRoute) onSelectRoute(route);
  };

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY} libraries={['marker']} onError={() => setMapBlocked(true)}>
      <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-sm">
        {/* Route Switcher Tabs Bar */}
        <div className="p-4 sm:p-5 border-b border-stone-200 bg-stone-50/70">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 text-left">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono uppercase font-bold tracking-wider bg-crimson-100 text-crimson-800">
                  <Compass className="w-3.5 h-3.5 text-crimson-600" />
                  Interactive Nepal Highway &amp; Trail Map
                </span>
                <span className="text-xs text-stone-400 font-mono hidden sm:inline">&middot; Google Maps Platform Integration</span>
              </div>
              <h3 className="text-lg sm:text-xl font-serif font-bold text-stone-900 mt-1">
                Top Himalayan Ride &amp; Road Trip Routes
              </h3>
            </div>

            {/* Map Layer Style Toggle */}
            <div className="flex items-center gap-2 self-start md:self-auto">
              <span className="text-[11px] font-mono text-stone-500 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5" /> Map View:
              </span>
              <div className="inline-flex p-1 bg-stone-200/80 rounded-xl text-xs font-mono">
                <button
                  type="button"
                  onClick={() => setMapTypeId('roadmap')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                    mapTypeId === 'roadmap' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Road
                </button>
                <button
                  type="button"
                  onClick={() => setMapTypeId('terrain')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                    mapTypeId === 'terrain' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Terrain
                </button>
                <button
                  type="button"
                  onClick={() => setMapTypeId('hybrid')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                    mapTypeId === 'hybrid' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Satellite
                </button>
              </div>
            </div>
          </div>

          {/* Scrollable Horizontal Route Badges */}
          <div className="flex gap-2 overflow-x-auto pb-1 mt-4 scrollbar-thin">
            {routes.map((r) => {
              const isSelected = r.id === activeRouteId;
              const badgeColor = routeColors[r.id] || '#9e2a2b';
              return (
                <button
                  key={r.id}
                  onClick={() => handleRouteSelect(r)}
                  className={`px-3.5 py-2 rounded-xl text-left whitespace-nowrap transition-all border shrink-0 cursor-pointer ${
                    isSelected
                      ? 'bg-stone-900 text-white border-stone-900 shadow-md ring-2 ring-stone-900/10'
                      : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100 hover:border-stone-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: badgeColor }}
                    />
                    <span className="text-xs font-bold font-serif">{r.name.split(' ')[0]} {r.name.split(' ')[1]}</span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${isSelected ? 'bg-stone-800 text-stone-300' : 'bg-stone-100 text-stone-500'}`}>
                      {r.distance_km}km
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Grid: Interactive Map (Left) + Route Brief Detail (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12">
          {/* Google Map Canvas */}
          <div className={`lg:col-span-8 relative ${interactiveHeight} w-full bg-stone-100 overflow-hidden`}>
            {mapBlocked ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-stone-50 p-6 text-center z-10 overflow-y-auto">
                <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mb-3">
                  <Compass className="w-6 h-6" />
                </div>
                <h4 className="font-serif font-bold text-stone-900 text-base mb-1">
                  {activeRoute?.name || 'Himalayan Expedition Trail'}
                </h4>
                <p className="text-xs text-stone-600 max-w-md mb-4 font-mono">
                  Google Maps was blocked by a browser extension (such as an ad blocker). You can still inspect all route waypoints and elevation profiles below:
                </p>
                <div className="flex flex-wrap gap-2 justify-center max-w-xl max-h-56 overflow-y-auto p-1">
                  {activeRoute?.key_stops.map((stop, idx) => (
                    <div key={idx} className="bg-white border border-stone-200 rounded-xl p-2.5 text-xs text-left font-mono shadow-2xs">
                      <div className="font-bold text-stone-900 flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-crimson-100 text-crimson-800 text-[10px] flex items-center justify-center font-bold">
                          {idx + 1}
                        </span>
                        <span>{stop.name}</span>
                      </div>
                      <div className="text-[10px] text-stone-500 mt-1">{stop.elevation} &bull; {stop.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <Map
                mapId="DEMO_MAP_ID"
                defaultCenter={{ lat: 28.3949, lng: 84.1240 }}
                defaultZoom={7}
              mapTypeId={mapTypeId}
              gestureHandling="greedy"
              disableDefaultUI={false}
              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
              style={{ width: '100%', height: '100%' }}
            >
              {/* Auto bounds controller */}
              <MapBoundsController path={activePathCoords} />

              {/* Draw other inactive routes as subtle dashed lines */}
              {routes.map(r => {
                if (r.id === activeRouteId) return null;
                const path = r.key_stops.map(s => ({ lat: s.lat, lng: s.lng }));
                return (
                  <Polyline
                    key={r.id}
                    path={path}
                    color={routeColors[r.id] || '#78716c'}
                    weight={3}
                    opacity={0.4}
                    dashed={true}
                  />
                );
              })}

              {/* Draw active route with thick glowing stroke */}
              {activeRoute && (
                <>
                  <Polyline 
                    path={activePathCoords}
                    color={activeColor}
                    weight={8}
                    opacity={0.3}
                  />
                  <Polyline 
                    path={activePathCoords}
                    color={activeColor}
                    weight={4}
                    opacity={0.95}
                  />

                  {/* Render interactive markers for each stop */}
                  {activeRoute.key_stops.map((stop, idx) => {
                    const isStart = idx === 0;
                    const isEnd = idx === activeRoute.key_stops.length - 1;
                    const pinColor = isStart ? '#15803d' : isEnd ? activeColor : '#1c1917';
                    const glyphText = isStart ? 'A' : isEnd ? 'B' : String(idx + 1);

                    return (
                      <React.Fragment key={idx}>
                        <AdvancedMarker
                          position={{ lat: stop.lat, lng: stop.lng }}
                          title={stop.name}
                          onClick={() => setActivePopupStopIndex(idx)}
                        >
                          <Pin
                            background={pinColor}
                            borderColor="#ffffff"
                            glyphColor="#ffffff"
                            scale={isStart || isEnd ? 1.1 : 0.9}
                          >
                            <span className="text-[10px] font-bold">{glyphText}</span>
                          </Pin>
                        </AdvancedMarker>

                        {activePopupStopIndex === idx && (
                          <InfoWindow
                            position={{ lat: stop.lat, lng: stop.lng }}
                            onCloseClick={() => setActivePopupStopIndex(null)}
                          >
                            <div className="p-1 space-y-1.5 min-w-[200px] text-left text-stone-900 font-sans">
                              <div className="text-[10px] text-stone-500 font-mono font-bold uppercase">
                                Stop {idx + 1} of {activeRoute.key_stops.length}
                              </div>
                              <h4 className="text-xs font-serif font-bold text-stone-950">
                                {stop.name}
                              </h4>
                              <div className="text-[10px] text-stone-500 font-mono">
                                ⛰️ Altitude: <strong>{stop.elevation}</strong>
                              </div>
                              <p className="text-[11px] text-stone-600 leading-relaxed font-light">
                                {stop.desc}
                              </p>
                            </div>
                          </InfoWindow>
                        )}
                      </React.Fragment>
                    );
                  })}
                </>
              )}
            </Map>
          )}
            
            {/* Map Overlay Badge */}
            <div className="absolute top-4 left-4 z-[400] bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-stone-200/80 shadow-md flex items-center gap-2 text-xs font-mono">
              <span className="w-2 h-2 rounded-full animate-ping bg-green-500" />
              <span className="font-bold text-stone-800">{activeRoute?.name}</span>
              <span className="text-stone-400">({activeRoute?.key_stops.length} Waypoints)</span>
            </div>

            <div className="absolute bottom-4 left-4 z-[400] bg-stone-950/80 backdrop-blur-md px-3 py-1.5 rounded-lg text-[10px] font-mono text-stone-200 flex items-center gap-3">
              <span>A: {activeRoute?.origin}</span>
              <span>&rarr;</span>
              <span>B: {activeRoute?.destination}</span>
            </div>
          </div>

          {/* Selected Route Info Sidebar */}
          {activeRoute && (
            <div className="lg:col-span-4 p-6 bg-white border-t lg:border-t-0 lg:border-l border-stone-200 flex flex-col justify-between space-y-5 text-left">
              <div className="space-y-4">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-crimson-600 block">
                    {activeRoute.origin} &rarr; {activeRoute.destination}
                  </span>
                  <h4 className="text-xl font-serif font-bold text-stone-900 mt-1">
                    {activeRoute.name}
                  </h4>
                  <p className="text-xs text-stone-500 mt-1.5 leading-relaxed">
                    {activeRoute.tagline}
                  </p>
                </div>

                {/* Quick Metrics Bento */}
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-100">
                    <span className="text-[10px] text-stone-400 block uppercase">Total Distance</span>
                    <span className="font-bold text-stone-900 text-sm">{activeRoute.distance_km} km</span>
                  </div>
                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-100">
                    <span className="text-[10px] text-stone-400 block uppercase">Recommended Time</span>
                    <span className="font-bold text-stone-900 text-sm">{activeRoute.duration}</span>
                  </div>
                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-100">
                    <span className="text-[10px] text-stone-400 block uppercase">Altitude Profile</span>
                    <span className="font-bold text-stone-900 text-sm flex items-center gap-1">
                      <Mountain className="w-3.5 h-3.5 text-crimson-500" />
                      {activeRoute.elevation_gain}
                    </span>
                  </div>
                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-100">
                    <span className="text-[10px] text-stone-400 block uppercase">Road Difficulty</span>
                    <span className="font-bold text-stone-900 text-sm">{activeRoute.difficulty.split(' ')[0]}</span>
                  </div>
                </div>

                {/* Key Waypoint Path */}
                <div>
                  <span className="text-[10px] font-mono uppercase font-bold text-stone-400 block mb-2">
                    Key Stops &amp; Altitude Progression
                  </span>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {activeRoute.key_stops.map((stop, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs p-2 rounded-lg bg-stone-50 hover:bg-stone-100/80 transition-colors">
                        <span className="flex items-center gap-2 font-medium text-stone-800">
                          <MapPin className="w-3 h-3 text-stone-400" />
                          {stop.name}
                        </span>
                        <span className="font-mono text-[11px] text-crimson-600 font-bold bg-white px-1.5 py-0.5 rounded border border-stone-200">
                          {stop.elevation}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recommended Fleet */}
                <div>
                  <span className="text-[10px] font-mono uppercase font-bold text-stone-400 block mb-1.5">
                    Best Matching Rental Vehicles
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {activeRoute.recommended_vehicles.map((vName, idx) => (
                      <span key={idx} className="px-2 py-1 bg-stone-100 text-stone-800 text-[11px] font-mono rounded-md font-semibold flex items-center gap-1">
                        <Car className="w-3 h-3 text-stone-500" />
                        {vName}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action CTA */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const query = new URLSearchParams();
                    if (activeRoute.difficulty.includes('4x4')) {
                      query.append('category', 'SUV');
                    } else if (activeRoute.id.includes('pokhara')) {
                      query.append('location', 'Kathmandu');
                    }
                    navigate(`/vehicles?${query.toString()}`);
                  }}
                  className="w-full py-3 bg-crimson-500 hover:bg-crimson-600 text-white font-semibold text-xs rounded-xl shadow-md cursor-pointer transition-all flex items-center justify-center gap-2 group"
                >
                  <span>Hire Vehicle Suitable for This Route</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </APIProvider>
  );
}
