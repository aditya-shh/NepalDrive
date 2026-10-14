import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import SEO from '../components/SEO';
import { Search, Sliders, MapPin, Check, Star, Wind, Heart } from 'lucide-react';

export default function Vehicles() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<number[]>([]);

  // Filter States
  const [location, setLocation] = useState(searchParams.get('location') || 'Kathmandu');
  const [category, setCategory] = useState(searchParams.get('category') || 'All');
  const [transmission, setTransmission] = useState('All');
  const [fuel, setFuel] = useState('All');
  const [maxPrice, setMaxPrice] = useState(25000);
  const [isElectric, setIsElectric] = useState(false);
  const [selfDrive, setSelfDrive] = useState(false);
  const [withDriver, setWithDriver] = useState(false);
  const [sortOrder, setSortOrder] = useState('popular');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const queryParams: Record<string, any> = {
          location,
          category: category !== 'All' ? category : '',
          transmission: transmission !== 'All' ? transmission : '',
          fuel: fuel !== 'All' ? fuel : '',
          max_price: maxPrice,
          electric: isElectric ? 'true' : '',
          self_drive: selfDrive ? 'true' : '',
          with_driver: withDriver ? 'true' : '',
        };

        const res = await api.getVehicles(queryParams);
        if (res.success) {
          setVehicles(res.data);
        }

        // Load favorites if user logged in
        if (localStorage.getItem('nepaldrive_token')) {
          const favRes = await api.getFavorites();
          if (favRes.success) {
            setFavorites(favRes.data.map((f: any) => f.id));
          }
        }
      } catch (err) {
        console.error('Failed to load vehicles', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [location, category, transmission, fuel, maxPrice, isElectric, selfDrive, withDriver, searchParams]);

  const toggleFavorite = async (vehicleId: number) => {
    if (!localStorage.getItem('nepaldrive_token')) return; // ignore if guest
    try {
      if (favorites.includes(vehicleId)) {
        await api.removeFavorite(vehicleId);
        setFavorites(favorites.filter(id => id !== vehicleId));
      } else {
        await api.addFavorite(vehicleId);
        setFavorites([...favorites, vehicleId]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleResetFilters = () => {
    setLocation('Kathmandu');
    setCategory('All');
    setTransmission('All');
    setFuel('All');
    setMaxPrice(25000);
    setIsElectric(false);
    setSelfDrive(false);
    setWithDriver(false);
    setSearchParams({});
  };

  // Sorting
  const sortedVehicles = [...vehicles].sort((a, b) => {
    if (sortOrder === 'price-asc') return parseFloat(a.price_per_day) - parseFloat(b.price_per_day);
    if (sortOrder === 'price-desc') return parseFloat(b.price_per_day) - parseFloat(a.price_per_day);
    if (sortOrder === 'rating') return b.rating - a.rating;
    return b.review_count - a.review_count; // popular default
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <SEO
        title="Find & Rent Vehicles in Nepal | Elite Fleet | NepalDrive"
        description="Browse premium cars, SUVs, and bikes available for rent across Kathmandu and Pokhara. Filter by price, transmission, self-drive, or with professional driver."
      />

      <div className="mb-10 text-left">
        <span className="font-mono text-xs text-crimson-500 uppercase tracking-widest">
          The Premium Directory
        </span>
        <h1 className="text-3xl font-serif font-bold text-stone-900 mt-1">
          Explore Available Vehicles in {location}
        </h1>
        <p className="text-sm text-stone-500 mt-1">
          Each vehicle in our luxury fleet is rigorously inspected for safety, ground clearance, and reliability.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Filters Sidebar */}
        <aside className="lg:col-span-1 bg-white p-6 rounded-2xl border border-stone-200 h-max space-y-6">
          <div className="flex items-center justify-between border-b border-stone-100 pb-4">
            <h2 className="text-sm font-mono font-semibold uppercase tracking-wider text-stone-950 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-crimson-500" />
              Advanced Filters
            </h2>
            <button
              onClick={handleResetFilters}
              className="text-xs font-mono text-stone-400 hover:text-crimson-500"
            >
              Reset All
            </button>
          </div>

          {/* Location Filter */}
          <div className="space-y-2">
            <label className="block text-xs font-mono font-medium text-stone-500 uppercase">Region</label>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full text-sm bg-stone-50 border border-stone-200 rounded-lg p-2 focus:border-crimson-500"
            >
              <option value="Kathmandu">Kathmandu Valley</option>
              <option value="Pokhara">Pokhara Lake City</option>
              <option value="Lalitpur">Lalitpur Core</option>
              <option value="Bhaktapur">Bhaktapur Heritage</option>
              <option value="Chitwan">Chitwan Plains</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="space-y-2">
            <label className="block text-xs font-mono font-medium text-stone-500 uppercase">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full text-sm bg-stone-50 border border-stone-200 rounded-lg p-2 focus:border-crimson-500"
            >
              <option value="All">All Categories</option>
              <option value="SUV">SUV (Premium)</option>
              <option value="Jeep">Rugged 4WD Jeep</option>
              <option value="Electric">Eco EV Car</option>
              <option value="Bike">Touring Bike</option>
              <option value="Scooter">City Scooter</option>
            </select>
          </div>

          {/* Transmission Filter */}
          <div className="space-y-2">
            <label className="block text-xs font-mono font-medium text-stone-500 uppercase">Transmission</label>
            <select
              value={transmission}
              onChange={(e) => setTransmission(e.target.value)}
              className="w-full text-sm bg-stone-50 border border-stone-200 rounded-lg p-2 focus:border-crimson-500"
            >
              <option value="All">All Transmissions</option>
              <option value="Automatic">Automatic</option>
              <option value="Manual">Manual</option>
            </select>
          </div>

          {/* Max Price Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono font-medium text-stone-500">
              <span className="uppercase">Max Daily Price</span>
              <span className="text-crimson-500">Rs. {maxPrice.toLocaleString()}</span>
            </div>
            <input
              type="range"
              min="2000"
              max="25000"
              step="500"
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="w-full accent-crimson-500"
            />
          </div>

          {/* Fuel Filter */}
          <div className="space-y-2">
            <label className="block text-xs font-mono font-medium text-stone-500 uppercase">Fuel Type</label>
            <select
              value={fuel}
              onChange={(e) => setFuel(e.target.value)}
              className="w-full text-sm bg-stone-50 border border-stone-200 rounded-lg p-2 focus:border-crimson-500"
            >
              <option value="All">All Fuels</option>
              <option value="Diesel">Diesel</option>
              <option value="Petrol">Petrol</option>
              <option value="Electric">Electric</option>
            </select>
          </div>

          {/* Options Toggles (Zero Pill badge discipline: simple interactive toggles) */}
          <div className="space-y-3 pt-2">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-stone-700">
              <input
                type="checkbox"
                checked={isElectric}
                onChange={(e) => setIsElectric(e.target.checked)}
                className="rounded border-stone-300 text-crimson-500 focus:ring-crimson-500"
              />
              <span>100% Electric EV</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm text-stone-700">
              <input
                type="checkbox"
                checked={selfDrive}
                onChange={(e) => setSelfDrive(e.target.checked)}
                className="rounded border-stone-300 text-crimson-500 focus:ring-crimson-500"
              />
              <span>Self-drive Available</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm text-stone-700">
              <input
                type="checkbox"
                checked={withDriver}
                onChange={(e) => setWithDriver(e.target.checked)}
                className="rounded border-stone-300 text-crimson-500 focus:ring-crimson-500"
              />
              <span>Driver Service</span>
            </label>
          </div>
        </aside>

        {/* Results Main Grid */}
        <section className="lg:col-span-3 space-y-6">
          <div className="flex items-center justify-between bg-white px-4 py-3 rounded-xl border border-stone-200">
            <span className="text-xs font-mono text-stone-500">
              Showing {sortedVehicles.length} premium vehicles in Nepal
            </span>
            <div className="flex items-center gap-2">
              <label className="text-xs font-mono text-stone-400 uppercase">Sort</label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="text-xs font-medium bg-stone-50 border border-stone-200 rounded p-1"
              >
                <option value="popular">Most Popular</option>
                <option value="rating">Highest Rated</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
              </select>
            </div>
          </div>

          {loading ? (
            /* Skeleton Loaders */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {[1, 2, 4].map(k => (
                <div key={k} className="bg-white border border-stone-200 rounded-2xl h-96 animate-pulse" />
              ))}
            </div>
          ) : sortedVehicles.length === 0 ? (
            /* Empty state */
            <div className="bg-white rounded-2xl p-12 text-center border border-stone-200 space-y-4">
              <h3 className="font-serif text-xl font-bold">No Vehicles Found</h3>
              <p className="text-sm text-stone-500 max-w-sm mx-auto">
                No vehicles match your refined criteria inside {location}. Try adjusting your price range or selecting another region.
              </p>
              <button
                onClick={handleResetFilters}
                className="px-4 py-2 bg-crimson-500 hover:bg-crimson-600 text-white text-xs font-medium rounded-lg"
              >
                Clear All Filters
              </button>
            </div>
          ) : (
            /* Vehicle Cards List */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {sortedVehicles.map((vehicle) => {
                const isFav = favorites.includes(vehicle.id);
                return (
                  <div
                    key={vehicle.id}
                    className="bg-white border border-stone-200 hover:border-stone-300 rounded-2xl overflow-hidden group hover:shadow-sm transition-all flex flex-col justify-between"
                  >
                    {/* Media container */}
                    <div className="relative aspect-[4/3] bg-stone-100 overflow-hidden">
                      <img
                        src={vehicle.image_url}
                        alt={vehicle.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                      {/* Favorite button */}
                      <button
                        onClick={() => toggleFavorite(vehicle.id)}
                        className={`absolute top-4 right-4 p-2 rounded-full bg-white/95 border border-stone-100 shadow-sm hover:scale-105 transition-transform ${isFav ? 'text-crimson-500' : 'text-stone-400 hover:text-crimson-500'}`}
                      >
                        <Heart className="w-4 h-4 fill-current" />
                      </button>
                    </div>

                    {/* Content Block */}
                    <div className="p-6 space-y-4 flex-grow flex flex-col justify-between">
                      <div className="space-y-1 text-left">
                        {/* Zero-Pill Metadata Discipline */}
                        <div className="flex items-center gap-1.5 text-xs text-stone-500 font-mono">
                          <span>{vehicle.brand}</span>
                          <span aria-hidden="true">&middot;</span>
                          <span>{vehicle.type}</span>
                          <span aria-hidden="true">&middot;</span>
                          <span>{vehicle.transmission}</span>
                        </div>
                        <h3 className="text-lg font-serif font-bold text-stone-900 leading-tight">
                          {vehicle.name}
                        </h3>
                      </div>

                      {/* Technical specifications */}
                      <div className="grid grid-cols-3 gap-2 border-t border-b border-stone-100 py-3 text-center">
                        <div className="space-y-0.5">
                          <span className="block text-[10px] font-mono text-stone-400 uppercase">Seats</span>
                          <span className="text-sm font-bold font-mono text-stone-800">{vehicle.seats} pax</span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="block text-[10px] font-mono text-stone-400 uppercase">Fuel</span>
                          <span className="text-sm font-bold font-mono text-stone-800">{vehicle.fuel_type}</span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="block text-[10px] font-mono text-stone-400 uppercase">Rating</span>
                          <span className="text-sm font-bold font-mono text-stone-800 flex items-center justify-center gap-0.5">
                            <Star className="w-3 h-3 fill-crimson-500 text-crimson-500" />
                            {vehicle.rating}
                          </span>
                        </div>
                      </div>

                      {/* Pricing block & CTA */}
                      <div className="flex items-center justify-between pt-2">
                        <div className="text-left">
                          <span className="block text-[10px] font-mono text-stone-400 uppercase">Rental Fee</span>
                          <span className="text-lg font-mono font-bold text-stone-900">
                            Rs. {parseFloat(vehicle.price_per_day).toLocaleString()}
                          </span>
                          <span className="text-xs text-stone-400">/ day</span>
                        </div>

                        <Link
                          to={`/vehicles/${vehicle.slug}`}
                          className="px-4 py-2 bg-crimson-500 hover:bg-crimson-600 text-white font-semibold text-xs rounded-lg shadow-sm transition-all"
                        >
                          View Details
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
