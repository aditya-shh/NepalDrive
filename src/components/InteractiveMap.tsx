/// <reference types="@types/google.maps" />
import React, { useState, useEffect, useRef } from 'react';
import { 
  APIProvider, 
  Map, 
  AdvancedMarker, 
  InfoWindow, 
  Pin,
  useMap
} from '@vis.gl/react-google-maps';
import { 
  MapPin, 
  Navigation, 
  Car, 
  Search, 
  Compass, 
  Maximize2, 
  Minimize2, 
  Layers, 
  Phone, 
  Clock, 
  CheckCircle2, 
  Sparkles,
  AlertCircle,
  X
} from 'lucide-react';
import { api } from '../services/api';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyAU8MVH6dH5oH3X_bMmEQFrZaw2wVMih8c';

// Controller component to smoothly reposition the map view in Google Maps
function MapCenterController({ center, zoom }: { center: { lat: number; lng: number }; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    if (map && center) {
      map.panTo(center);
      if (zoom !== undefined) {
        map.setZoom(zoom);
      }
    }
  }, [center, zoom, map]);
  return null;
}

export interface HubLocation {
  id: number;
  name: string;
  slug: string;
  address: string;
  city: string;
  latitude: number | string;
  longitude: number | string;
  is_active?: boolean;
  phone?: string;
  operating_hours?: string;
  description?: string;
  vehicle_count?: number;
}

interface InteractiveMapProps {
  locations?: HubLocation[];
  selectedLocation?: HubLocation | null;
  onSelectLocation?: (location: HubLocation) => void;
  pickerMode?: boolean;
  pickedPosition?: [number, number] | null;
  onPickPosition?: (lat: number, lng: number, addressHint?: string) => void;
  height?: string;
  className?: string;
  showSearchBar?: boolean;
  showHubCards?: boolean;
  allowFullscreen?: boolean;
  title?: string;
}

export default function InteractiveMap({
  locations: initialLocationsProp,
  selectedLocation,
  onSelectLocation,
  pickerMode = false,
  pickedPosition,
  onPickPosition,
  height = '480px',
  className = '',
  showSearchBar = true,
  showHubCards = true,
  allowFullscreen = true,
  title,
}: InteractiveMapProps) {
  const [locations, setLocations] = useState<HubLocation[]>(initialLocationsProp || []);
  const [loading, setLoading] = useState(!initialLocationsProp);
  const [mapTypeId, setMapTypeId] = useState<'roadmap' | 'terrain' | 'satellite'>('roadmap');

  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({ lat: 27.7172, lng: 85.3240 }); // Default Kathmandu
  const [mapZoom, setMapZoom] = useState<number>(8);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [activeCityFilter, setActiveCityFilter] = useState<string>('ALL');
  const [activePopupId, setActivePopupId] = useState<number | null>(null);
  const [mapBlocked, setMapBlocked] = useState(false);

  // Detect if client ad-blocker blocked Google Maps script
  useEffect(() => {
    const timer = setTimeout(() => {
      if (typeof window !== 'undefined' && !((window as any).google?.maps)) {
        setMapBlocked(true);
      }
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  // Fetch locations from backend if not provided as props
  useEffect(() => {
    let isMounted = true;
    const loadMapData = async () => {
      try {
        const locsRes = initialLocationsProp 
          ? { success: true, data: initialLocationsProp } 
          : await api.getLocations().catch(() => ({ success: false, data: null }));

        if (isMounted && locsRes.success && locsRes.data) {
          setLocations(locsRes.data);
        }
      } catch (err) {
        console.error('Map data load error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadMapData();
    return () => { isMounted = false; };
  }, [initialLocationsProp]);

  // Sync selected location center
  useEffect(() => {
    if (selectedLocation) {
      const lat = typeof selectedLocation.latitude === 'string' ? parseFloat(selectedLocation.latitude) : selectedLocation.latitude;
      const lng = typeof selectedLocation.longitude === 'string' ? parseFloat(selectedLocation.longitude) : selectedLocation.longitude;
      if (!isNaN(lat) && !isNaN(lng)) {
        setMapCenter({ lat, lng });
        setMapZoom(13);
        setActivePopupId(selectedLocation.id);
      }
    }
  }, [selectedLocation]);

  // Handle picked position sync
  useEffect(() => {
    if (pickedPosition) {
      setMapCenter({ lat: pickedPosition[0], lng: pickedPosition[1] });
      setMapZoom(14);
    }
  }, [pickedPosition]);

  // Debounced geocoding search
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.geocodeLocation(searchQuery);
        if (res.success && res.data) {
          setSearchResults(res.data);
        }
      } catch (err) {
        console.error('Geocode search failed', err);
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectSearchResult = (result: any) => {
    const lat = parseFloat(result.lat || result.latitude);
    const lon = parseFloat(result.lon || result.longitude);
    if (!isNaN(lat) && !isNaN(lon)) {
      setMapCenter({ lat, lng: lon });
      setMapZoom(13);
      setSearchResults([]);
      setSearchQuery(result.display_name.split(',')[0]);
      if (pickerMode && onPickPosition) {
        onPickPosition(lat, lon, result.display_name);
      }
    }
  };

  const handleMapClick = (lat: number, lng: number) => {
    if (pickerMode && onPickPosition) {
      onPickPosition(lat, lng, `Selected Pin (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
    }
  };

  const handleResetToNepal = () => {
    setMapCenter({ lat: 28.3949, lng: 84.1240 });
    setMapZoom(7);
  };

  // Filter locations by city tab
  const filteredLocations = locations.filter((loc) => {
    if (activeCityFilter === 'ALL') return true;
    return loc.city.toLowerCase() === activeCityFilter.toLowerCase();
  });

  const uniqueCities = Array.from(new Set(locations.map((l) => l.city)));

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY} libraries={['marker']} onError={() => setMapBlocked(true)}>
      <div className={`relative flex flex-col bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-sm ${className} ${isFullscreen ? 'fixed inset-0 z-50 rounded-none border-none' : ''}`}>
        
        {/* Top Map Header & Controls Bar */}
        <div className="p-4 sm:p-5 bg-stone-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-stone-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-crimson-600 rounded-xl">
              <Compass className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-sm sm:text-base flex items-center gap-2 text-white">
                {title || 'Nepal Fleet Hubs & Station Map'}
                <span className="text-[10px] font-mono px-2 py-0.5 bg-crimson-500/30 text-crimson-300 rounded-full border border-crimson-400/40 uppercase">
                  Google Maps API
                </span>
              </h3>
              <p className="text-[11px] text-stone-400 font-mono">
                Live interactive branches across Kathmandu Valley, Pokhara, Chitwan, and Himalayan hubs.
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={handleResetToNepal}
              className="px-2.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-mono rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Reset to All Nepal View"
            >
              <Navigation className="w-3.5 h-3.5 text-amber-400" />
              <span>All Nepal</span>
            </button>

            <button
              type="button"
              onClick={() => setMapTypeId(mapTypeId === 'roadmap' ? 'terrain' : mapTypeId === 'terrain' ? 'satellite' : 'roadmap')}
              className="px-2.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-mono rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Toggle Map Style"
            >
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <span>{mapTypeId === 'roadmap' ? 'Road' : mapTypeId === 'terrain' ? 'Terrain' : 'Satellite'}</span>
            </button>

            {allowFullscreen && (
              <button
                type="button"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl transition-colors cursor-pointer"
                title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Map'}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>

        {/* Geocoding Search & Quick City Pills */}
        {showSearchBar && (
          <div className="p-3.5 bg-stone-50 border-b border-stone-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            
            {/* Search input with live geocoding dropdown */}
            <div className="relative w-full md:w-80">
              <div className="relative flex items-center">
                <Search className="absolute left-3 w-4 h-4 text-stone-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search city or highway in Nepal..."
                  className="w-full pl-9 pr-8 py-2 bg-white border border-stone-200 rounded-xl text-xs font-mono focus:border-crimson-500 focus:bg-white transition-all shadow-xs"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => { setSearchQuery(''); setSearchResults([]); }}
                    className="absolute right-2.5 text-stone-400 hover:text-stone-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Geocode Autocomplete dropdown */}
              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-stone-200 rounded-xl shadow-xl z-50 overflow-hidden text-xs font-mono">
                  {searchResults.map((res, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleSelectSearchResult(res)}
                      className="w-full text-left px-3.5 py-2.5 hover:bg-crimson-50 hover:text-crimson-900 border-b border-stone-100 last:border-b-0 flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <MapPin className="w-3.5 h-3.5 text-crimson-600 shrink-0" />
                      <span className="truncate">{res.display_name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Filter City Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono w-full md:w-auto">
              <span className="text-[11px] text-stone-400 uppercase font-bold mr-1 hidden lg:inline">Hubs:</span>
              <button
                type="button"
                onClick={() => setActiveCityFilter('ALL')}
                className={`px-3 py-1 rounded-xl cursor-pointer transition-colors ${
                  activeCityFilter === 'ALL'
                    ? 'bg-stone-900 text-white font-bold shadow-xs'
                    : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-100'
                }`}
              >
                All Hubs ({locations.length})
              </button>
              {uniqueCities.map((city) => (
                <button
                  key={city}
                  type="button"
                  onClick={() => {
                    setActiveCityFilter(city);
                    const firstInCity = locations.find((l) => l.city === city);
                    if (firstInCity) {
                      const lat = typeof firstInCity.latitude === 'string' ? parseFloat(firstInCity.latitude) : firstInCity.latitude;
                      const lng = typeof firstInCity.longitude === 'string' ? parseFloat(firstInCity.longitude) : firstInCity.longitude;
                      setMapCenter({ lat, lng });
                      setMapZoom(12);
                    }
                  }}
                  className={`px-3 py-1 rounded-xl cursor-pointer transition-colors ${
                    activeCityFilter === city
                      ? 'bg-crimson-600 text-white font-bold shadow-xs'
                      : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  {city}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Interactive Picker Instruction Banner */}
        {pickerMode && (
          <div className="px-4 py-2 bg-amber-50 border-b border-amber-200 text-amber-900 text-xs font-mono flex items-center justify-between gap-2 animate-fade-in">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Click anywhere on the map or select a hub to pinpoint your exact pickup &amp; drop-off point.</span>
            </div>
            {pickedPosition && (
              <span className="text-[10px] font-bold bg-amber-200/80 px-2 py-0.5 rounded text-amber-950">
                Pinned: {pickedPosition[0].toFixed(4)}, {pickedPosition[1].toFixed(4)}
              </span>
            )}
          </div>
        )}

        {/* Main Map Container */}
        <div className="relative w-full overflow-hidden bg-stone-100" style={{ height: isFullscreen ? 'calc(100vh - 120px)' : height }}>
          {mapBlocked ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-stone-50 p-6 text-center z-10 overflow-y-auto">
              <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mb-3">
                <Compass className="w-6 h-6" />
              </div>
              <h4 className="font-serif font-bold text-stone-900 text-base mb-1">
                Fleet Station &amp; Branch Directory
              </h4>
              <p className="text-xs text-stone-600 max-w-md mb-4 font-mono">
                Google Maps was blocked by a browser extension (such as an ad blocker). You can still select your pickup and drop-off stations below:
              </p>
              <div className="flex flex-wrap gap-2.5 justify-center max-w-2xl max-h-56 overflow-y-auto p-1">
                {filteredLocations.map((loc) => {
                  const isSelected = selectedLocation && selectedLocation.id === loc.id;
                  return (
                    <button
                      key={loc.id}
                      type="button"
                      onClick={() => {
                        if (onSelectLocation) onSelectLocation(loc);
                        if (pickerMode && onPickPosition) {
                          const lat = typeof loc.latitude === 'string' ? parseFloat(loc.latitude) : loc.latitude;
                          const lng = typeof loc.longitude === 'string' ? parseFloat(loc.longitude) : loc.longitude;
                          onPickPosition(lat, lng, loc.name);
                        }
                        setActivePopupId(loc.id);
                      }}
                      className={`px-3.5 py-2.5 rounded-xl text-xs font-mono text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-crimson-600 text-white shadow-sm'
                          : 'bg-white border border-stone-200 text-stone-800 hover:border-crimson-400'
                      }`}
                    >
                      <div className="font-bold flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span>{loc.name}</span>
                      </div>
                      <div className="text-[10px] opacity-75 mt-0.5">{loc.city} &bull; {loc.address}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : loading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-stone-50/80 z-20 space-y-2 flex-col">
              <div className="w-8 h-8 border-3 border-crimson-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-mono text-stone-500">Loading Nepal Google Maps...</p>
            </div>
          ) : (
            <Map
              mapId="DEMO_MAP_ID"
              center={mapCenter}
              zoom={mapZoom}
              mapTypeId={mapTypeId}
              gestureHandling="greedy"
              disableDefaultUI={false}
              onClick={(e) => {
                if (e.detail.latLng) {
                  handleMapClick(e.detail.latLng.lat, e.detail.latLng.lng);
                }
              }}
              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
              style={{ width: '100%', height: '100%' }}
            >
              {/* Smooth Pan/Zoom Controller */}
              <MapCenterController center={mapCenter} zoom={mapZoom} />

              {/* Location Hub Markers */}
              {filteredLocations.map((loc) => {
                const lat = typeof loc.latitude === 'string' ? parseFloat(loc.latitude) : loc.latitude;
                const lng = typeof loc.longitude === 'string' ? parseFloat(loc.longitude) : loc.longitude;
                if (isNaN(lat) || isNaN(lng)) return null;

                const isAirport = loc.slug.includes('airport') || loc.name.toLowerCase().includes('airport');
                const isSelected = selectedLocation && selectedLocation.id === loc.id;
                const pinColor = isSelected ? '#2563eb' : isAirport ? '#b56544' : '#9e2a2b';

                return (
                  <React.Fragment key={loc.id}>
                    <AdvancedMarker
                      position={{ lat, lng }}
                      title={loc.name}
                      onClick={() => {
                        if (onSelectLocation) onSelectLocation(loc);
                        if (pickerMode && onPickPosition) onPickPosition(lat, lng, loc.name);
                        setActivePopupId(loc.id);
                      }}
                    >
                      <Pin 
                        background={pinColor}
                        borderColor="#ffffff"
                        glyphColor="#ffffff"
                        scale={isSelected ? 1.2 : 1.0}
                      >
                        <span className="text-[10px]">{isAirport ? '✈️' : '📍'}</span>
                      </Pin>
                    </AdvancedMarker>

                    {activePopupId === loc.id && (
                      <InfoWindow
                        position={{ lat, lng }}
                        onCloseClick={() => setActivePopupId(null)}
                      >
                        <div className="p-2 space-y-2 min-w-[200px] text-left text-stone-900 font-sans">
                          <div className="border-b border-stone-100 pb-1">
                            <span className="text-[9px] font-mono font-bold uppercase text-crimson-600 block">
                              {loc.city} &middot; Fleet Hub
                            </span>
                            <h4 className="font-serif font-bold text-xs text-stone-950">
                              {loc.name}
                            </h4>
                          </div>

                          <div className="space-y-1 text-[11px] text-stone-600 font-mono">
                            <div className="flex items-start gap-1">
                              <MapPin className="w-3 h-3 text-stone-400 shrink-0 mt-0.5" />
                              <span className="leading-tight">{loc.address}</span>
                            </div>
                            {loc.phone && (
                              <div className="flex items-center gap-1">
                                <Phone className="w-3 h-3 text-stone-400 shrink-0" />
                                <a href={`tel:${loc.phone}`} className="text-stone-800 hover:underline">
                                  {loc.phone}
                                </a>
                              </div>
                            )}
                          </div>

                          <div className="pt-1">
                            {onSelectLocation && (
                              <button
                                type="button"
                                onClick={() => {
                                  onSelectLocation(loc);
                                  setActivePopupId(null);
                                }}
                                className="w-full py-1 bg-crimson-600 hover:bg-crimson-700 text-white font-semibold text-[10px] rounded-lg shadow-sm transition-colors text-center cursor-pointer"
                              >
                                Select Pickup Hub
                              </button>
                            )}
                          </div>
                        </div>
                      </InfoWindow>
                    )}
                  </React.Fragment>
                );
              })}

              {/* Custom Picked Marker in interactive Picker Mode */}
              {pickedPosition && (
                <AdvancedMarker
                  position={{ lat: pickedPosition[0], lng: pickedPosition[1] }}
                >
                  <Pin 
                    background="#16a34a"
                    borderColor="#ffffff"
                    glyphColor="#ffffff"
                  >
                    <span className="text-[10px]">✨</span>
                  </Pin>
                </AdvancedMarker>
              )}
            </Map>
          )}
        </div>

        {/* Bottom Hub Quick Cards Horizontal Strip */}
        {showHubCards && locations.length > 0 && (
          <div className="p-4 bg-stone-50 border-t border-stone-200">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-mono font-bold uppercase text-stone-500 flex items-center gap-1.5">
                <Car className="w-3.5 h-3.5 text-crimson-600" />
                Direct Station Pickup Hubs ({filteredLocations.length})
              </span>
              <span className="text-[11px] text-stone-400 font-mono">
                Click any hub to focus map
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {filteredLocations.slice(0, 4).map((loc) => {
                const lat = typeof loc.latitude === 'string' ? parseFloat(loc.latitude) : loc.latitude;
                const lng = typeof loc.longitude === 'string' ? parseFloat(loc.longitude) : loc.longitude;
                const isSelected = selectedLocation && selectedLocation.id === loc.id;

                return (
                  <div
                    key={loc.id}
                    onClick={() => {
                      setMapCenter({ lat, lng });
                      setMapZoom(13);
                      if (onSelectLocation) onSelectLocation(loc);
                      setActivePopupId(loc.id);
                    }}
                    className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-crimson-50/80 border-crimson-400 shadow-sm'
                        : 'bg-white border-stone-200 hover:border-stone-300 hover:shadow-xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1.5 mb-1">
                      <h5 className="font-serif font-bold text-xs text-stone-900 truncate">
                        {loc.name}
                      </h5>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-stone-100 text-stone-700 uppercase font-bold shrink-0">
                        {loc.city}
                      </span>
                    </div>
                    <p className="text-[10px] text-stone-500 truncate font-mono mb-2">
                      {loc.address}
                    </p>
                    <div className="flex items-center justify-between text-[10px] font-mono pt-1.5 border-t border-stone-100">
                      <span className="text-green-700 font-bold">&check; {loc.vehicle_count || 4} Units</span>
                      <span className="text-crimson-600 hover:underline">Focus &rarr;</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </APIProvider>
  );
}
