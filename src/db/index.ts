import pg from 'pg';
import bcrypt from 'bcryptjs';

const isProduction = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL) || Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);

// Support all standard Neon and Vercel PostgreSQL environment variable names
const rawConnectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.NEON_DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.PGURI;

const isPlaceholderUrl =
  !rawConnectionString ||
  rawConnectionString.includes('user:password@neon-host') ||
  rawConnectionString.includes('placeholder') ||
  rawConnectionString.includes('your-neon-host');

const connectionString = !isPlaceholderUrl ? rawConnectionString : undefined;
const isPostgres = Boolean(connectionString);

if (isProduction && !isPostgres) {
  console.error('❌ [CRITICAL PRODUCTION ERROR] No PostgreSQL connection string found in environment variables (DATABASE_URL / POSTGRES_URL).');
  console.error('👉 In-memory mock database is strictly prohibited in production. Please configure DATABASE_URL or POSTGRES_URL in Vercel Project Settings > Environment Variables.');
}

// In-Memory state for fallback mock database (development only)
const mockState: {
  users: any[];
  vehicles: any[];
  bookings: any[];
  reviews: any[];
  audit_logs: any[];
  favorites: any[];
  enquiries: any[];
  locations: any[];
  user_documents: any[];
  document_verification_history: any[];
  document_custody_records: any[];
  rental_agreement_acceptances: any[];
} = {
  users: [],
  vehicles: [],
  bookings: [],
  reviews: [],
  audit_logs: [],
  favorites: [],
  enquiries: [],
  locations: [],
  user_documents: [],
  document_verification_history: [],
  document_custody_records: [],
  rental_agreement_acceptances: [],
};

export let pool: pg.Pool | null = null;

if (isPostgres) {
  try {
    pool = new pg.Pool({
      connectionString,
      connectionTimeoutMillis: 10000, // 10s connection timeout for Neon cold-starts
      ssl: { rejectUnauthorized: false }, // Neon requires SSL
      max: isProduction ? 3 : 10, // Serverless instances should use smaller pools to prevent exhausting Neon connection limits
      idleTimeoutMillis: 15000,
      allowExitOnIdle: true, // Allow Node event loop to exit cleanly in serverless functions
    });

    // Prevent uncaught errors when idle serverless connections disconnect
    pool.on('error', (err) => {
      console.warn('⚠️ Idle PostgreSQL client error notice:', err.message);
    });

    // Verify actual connection asynchronously without terminating process
    pool.query('SELECT 1')
      .then(() => {
        const maskedHost = connectionString?.match(/@([^:/]+)/)?.[1] || 'remote';
        console.log(`🔌 Successfully connected and verified Neon PostgreSQL database at ${maskedHost}.`);
      })
      .catch((err: any) => {
        console.warn('⚠️ Neon PostgreSQL initial connection check notice:', err.message);
        console.log('ℹ️ Server will continue; pool will automatically connect on subsequent queries.');
      });
  } catch (err: any) {
    console.error('❌ Failed to initialize PostgreSQL pool:', err.message);
  }
} else {
  if (isPlaceholderUrl && connectionString) {
    console.warn(
      '⚠️ DATABASE_URL is set to a placeholder value. Running in mock database mode (DEV ONLY).'
    );
  } else {
    console.warn(
      '⚠️ No DATABASE_URL found. Running in mock database mode (DEV ONLY).'
    );
  }
}

// Pre-seed some premium vehicles in Nepal
const initialVehicles = [
  {
    id: 1,
    name: 'Toyota Fortuner SUV',
    brand: 'Toyota',
    model: 'Fortuner V6',
    year: 2023,
    type: 'SUV',
    price_per_day: 18500, // NPR
    security_deposit: 45000,
    seats: 7,
    transmission: 'Automatic',
    fuel_type: 'Diesel',
    is_electric: false,
    self_drive: true,
    with_driver: true,
    is_featured: true,
    is_popular: true,
    availability_status: 'Available',
    rating: 4.9,
    review_count: 24,
    image_url: '/assets/images/fortuner_suv_1791105671393.jpg',
    image_gallery: ['/assets/images/fortuner_suv_1791105671393.jpg'],
    pickup_locations: ['Kathmandu', 'Lalitpur', 'Bhaktapur'],
    description: 'The Toyota Fortuner is a powerful and rugged SUV, perfect for road trips from Kathmandu to Pokhara. Fully equipped for high-altitude mountain drives with massive ground clearance.',
    slug: 'toyota-fortuner-kathmandu',
  },
  {
    id: 2,
    name: 'Mahindra Scorpio-N 4WD',
    brand: 'Mahindra',
    model: 'Scorpio-N Z8',
    year: 2024,
    type: 'Jeep',
    price_per_day: 14000,
    security_deposit: 30000,
    seats: 7,
    transmission: 'Manual',
    fuel_type: 'Diesel',
    is_electric: false,
    self_drive: true,
    with_driver: true,
    is_featured: true,
    is_popular: true,
    availability_status: 'Available',
    rating: 4.8,
    review_count: 18,
    image_url: '/assets/images/scorpio_jeep_1791105688961.jpg',
    image_gallery: ['/assets/images/scorpio_jeep_1791105688961.jpg'],
    pickup_locations: ['Kathmandu', 'Pokhara', 'Chitwan'],
    description: 'Perfect for off-roading across Nepals challenging terrain. Scorpio-N provides premium comfort with high torque and raw power to conquer the hills.',
    slug: 'mahindra-scorpio-n-pokhara',
  },
  {
    id: 3,
    name: 'Hyundai Kona Electric',
    brand: 'Hyundai',
    model: 'Kona EV Premium',
    year: 2023,
    type: 'Electric',
    price_per_day: 9500,
    security_deposit: 20000,
    seats: 5,
    transmission: 'Automatic',
    fuel_type: 'Electric',
    is_electric: true,
    self_drive: true,
    with_driver: false,
    is_featured: false,
    is_popular: true,
    availability_status: 'Available',
    rating: 4.7,
    review_count: 12,
    image_url: '/assets/images/kona_ev_1791105704104.jpg',
    image_gallery: ['/assets/images/kona_ev_1791105704104.jpg'],
    pickup_locations: ['Kathmandu', 'Lalitpur', 'Bhaktapur'],
    description: 'Eco-friendly, quiet, and extremely cheap to run. Excellent for cruising inside Kathmandu Valley or Lalitpur.',
    slug: 'hyundai-kona-valley',
  },
  {
    id: 4,
    name: 'Royal Enfield Classic 350',
    brand: 'Royal Enfield',
    model: 'Classic 350 Reborn',
    year: 2022,
    type: 'Bike',
    price_per_day: 3500,
    security_deposit: 10000,
    seats: 2,
    transmission: 'Manual',
    fuel_type: 'Petrol',
    is_electric: false,
    self_drive: true,
    with_driver: false,
    is_featured: true,
    is_popular: true,
    availability_status: 'Available',
    rating: 4.9,
    review_count: 35,
    image_url: '/assets/images/classic_bike_1791105717263.jpg',
    image_gallery: ['/assets/images/classic_bike_1791105717263.jpg'],
    pickup_locations: ['Kathmandu', 'Pokhara'],
    description: 'The legendary bullet. There is no better way to feel the breeze and see Nepals scenic valleys than on a classic Royal Enfield ride.',
    slug: 'royal-enfield-classic-nepal',
  },
  {
    id: 5,
    name: 'Toyota Hilux 4x4 Double Cab',
    brand: 'Toyota',
    model: 'Hilux Revo 2.8L 4WD',
    year: 2024,
    type: 'Jeep',
    price_per_day: 16500,
    security_deposit: 40000,
    seats: 5,
    transmission: 'Automatic',
    fuel_type: 'Diesel',
    is_electric: false,
    self_drive: true,
    with_driver: true,
    is_featured: true,
    is_popular: true,
    availability_status: 'Available',
    rating: 4.95,
    review_count: 28,
    image_url: '/assets/images/hilux_pickup_1791109013549.jpg',
    image_gallery: ['/assets/images/hilux_pickup_1791109013549.jpg'],
    pickup_locations: ['Kathmandu', 'Pokhara', 'Chitwan'],
    description: 'Indestructible Toyota Hilux 4WD with heavy-duty suspension and high bed capacity. Unmatched durability for extreme Upper Mustang and Dolpo trails.',
    slug: 'toyota-hilux-4x4-nepal',
  },
  {
    id: 6,
    name: 'Jeep Wrangler Unlimited Rubicon',
    brand: 'Jeep',
    model: 'Wrangler Rubicon 4x4',
    year: 2023,
    type: 'Jeep',
    price_per_day: 26000,
    security_deposit: 60000,
    seats: 5,
    transmission: 'Automatic',
    fuel_type: 'Petrol',
    is_electric: false,
    self_drive: true,
    with_driver: true,
    is_featured: true,
    is_popular: true,
    availability_status: 'Available',
    rating: 5.0,
    review_count: 19,
    image_url: '/assets/images/wrangler_jeep_1791109063650.jpg',
    image_gallery: ['/assets/images/wrangler_jeep_1791109063650.jpg'],
    pickup_locations: ['Kathmandu', 'Pokhara'],
    description: 'The pinnacle of off-road prowess. Features Tru-Lok electronic lockers, Rock-Trac 4x4 system, and removable hardtop for open-air Himalayan panoramas.',
    slug: 'jeep-wrangler-rubicon-nepal',
  },
  {
    id: 7,
    name: 'BYD Atto 3 Extended Range EV',
    brand: 'BYD',
    model: 'Atto 3 Superior 60kWh',
    year: 2024,
    type: 'Electric',
    price_per_day: 11000,
    security_deposit: 25000,
    seats: 5,
    transmission: 'Automatic',
    fuel_type: 'Electric',
    is_electric: true,
    self_drive: true,
    with_driver: false,
    is_featured: true,
    is_popular: true,
    availability_status: 'Available',
    rating: 4.85,
    review_count: 16,
    image_url: '/assets/images/byd_atto_ev_1791109047744.jpg',
    image_gallery: ['/assets/images/byd_atto_ev_1791109047744.jpg'],
    pickup_locations: ['Kathmandu', 'Lalitpur', 'Bhaktapur', 'Pokhara'],
    description: '420km real-world WLTP range with Blade Battery technology. Ultra-quiet cabin, panoramic sunroof, and fast DC charging across major Nepali highway networks.',
    slug: 'byd-atto-3-electric-nepal',
  },
  {
    id: 8,
    name: 'Royal Enfield Himalayan 450',
    brand: 'Royal Enfield',
    model: 'Himalayan 450 Sherpa',
    year: 2024,
    type: 'Bike',
    price_per_day: 4800,
    security_deposit: 12000,
    seats: 2,
    transmission: 'Manual',
    fuel_type: 'Petrol',
    is_electric: false,
    self_drive: true,
    with_driver: false,
    is_featured: true,
    is_popular: true,
    availability_status: 'Available',
    rating: 4.95,
    review_count: 42,
    image_url: '/assets/images/himalayan_bike_1791109029852.jpg',
    image_gallery: ['/assets/images/himalayan_bike_1791109029852.jpg'],
    pickup_locations: ['Kathmandu', 'Pokhara'],
    description: 'Built for the Himalayas. Liquid-cooled 452cc Sherpa engine, 200mm Showa long-travel suspension, Tripper navigation dash, and spoked tubeless wheels for high-altitude passes.',
    slug: 'royal-enfield-himalayan-450-nepal',
  },
  {
    id: 9,
    name: 'Suzuki Vitara Brezza',
    brand: 'Suzuki',
    model: 'Brezza ZXI',
    year: 2022,
    type: 'Car',
    price_per_day: 8000,
    security_deposit: 15000,
    seats: 5,
    transmission: 'Manual',
    fuel_type: 'Petrol',
    is_electric: false,
    self_drive: true,
    with_driver: true,
    is_featured: false,
    is_popular: false,
    availability_status: 'Available',
    rating: 4.6,
    review_count: 9,
    image_url: '/assets/images/maruti_brezza_suv_1791630198242.jpg',
    image_gallery: ['/assets/images/maruti_brezza_suv_1791630198242.jpg'],
    pickup_locations: ['Kathmandu', 'Pokhara', 'Chitwan'],
    description: 'A compact SUV/car built for everyday commute. Perfect balance of price, convenience, and ground clearance for Nepali roads.',
    slug: 'suzuki-brezza-kathmandu',
  },
  {
    id: 10,
    name: 'Vespa VXL 150',
    brand: 'Vespa',
    model: 'VXL 150',
    year: 2023,
    type: 'Scooter',
    price_per_day: 2200,
    security_deposit: 5000,
    seats: 2,
    transmission: 'Automatic',
    fuel_type: 'Petrol',
    is_electric: false,
    self_drive: true,
    with_driver: false,
    is_featured: false,
    is_popular: true,
    availability_status: 'Available',
    rating: 4.7,
    review_count: 14,
    image_url: '/assets/images/vespa_scooter_red_1791628849538.jpg',
    image_gallery: ['/assets/images/vespa_scooter_red_1791628849538.jpg'],
    pickup_locations: ['Kathmandu', 'Lalitpur', 'Bhaktapur', 'Pokhara'],
    description: 'Stylish Vespa scooter. Skip the Kathmandu traffic and navigate alleys easily with maximum style.',
    slug: 'vespa-vxl-scooter',
  },
  {
    id: 11,
    name: 'Toyota HiAce Grand Cabin',
    brand: 'Toyota',
    model: 'HiAce 14-Seater Luxury',
    year: 2023,
    type: 'Van',
    price_per_day: 16000,
    security_deposit: 35000,
    seats: 14,
    transmission: 'Manual',
    fuel_type: 'Diesel',
    is_electric: false,
    self_drive: false,
    with_driver: true,
    is_featured: true,
    is_popular: false,
    availability_status: 'Available',
    rating: 4.85,
    review_count: 22,
    image_url: '/assets/images/toyota_hiace_van_1791628695584.jpg',
    image_gallery: ['/assets/images/toyota_hiace_van_1791628695584.jpg'],
    pickup_locations: ['Kathmandu', 'Pokhara', 'Chitwan'],
    description: 'Spacious 14-seater tourist coach van with dual AC, reclining captain seats, and ample mountain luggage storage. Dedicated certified chauffeur included for group travel.',
    slug: 'toyota-hiace-van-nepal',
  },
  {
    id: 12,
    name: 'Isuzu D-Max V-Cross 4x4',
    brand: 'Isuzu',
    model: 'D-Max 4WD Heavy Duty',
    year: 2024,
    type: 'Pickup',
    price_per_day: 15500,
    security_deposit: 40000,
    seats: 5,
    transmission: 'Manual',
    fuel_type: 'Diesel',
    is_electric: false,
    self_drive: true,
    with_driver: true,
    is_featured: false,
    is_popular: true,
    availability_status: 'Available',
    rating: 4.9,
    review_count: 16,
    image_url: '/assets/images/isuzu_dmax_truck_1791628777531.jpg',
    image_gallery: ['/assets/images/isuzu_dmax_truck_1791628777531.jpg'],
    pickup_locations: ['Kathmandu', 'Pokhara'],
    description: 'Tough 4x4 dual-cab pickup truck built for Himalayan expeditions, filming crews, trekking logistics, and rough riverbed trails.',
    slug: 'isuzu-dmax-4x4-pickup',
  },
  {
    id: 13,
    name: 'Audi A6 Quattro Prestige',
    brand: 'Audi',
    model: 'A6 Prestige V6',
    year: 2023,
    type: 'Luxury',
    price_per_day: 28000,
    security_deposit: 75000,
    seats: 5,
    transmission: 'Automatic',
    fuel_type: 'Petrol',
    is_electric: false,
    self_drive: false,
    with_driver: true,
    is_featured: true,
    is_popular: false,
    availability_status: 'Available',
    rating: 5.0,
    review_count: 8,
    image_url: '/assets/images/audi_a6_luxury_1791628731851.jpg',
    image_gallery: ['/assets/images/audi_a6_luxury_1791628731851.jpg'],
    pickup_locations: ['Kathmandu', 'Lalitpur'],
    description: 'Executive luxury limousine for diplomatic visits, high-profile corporate delegates, and VIP Kathmandu airport transfers.',
    slug: 'audi-a6-luxury-sedan',
  },
  {
    id: 14,
    name: 'Tata Nexon EV Empowered Plus',
    brand: 'Tata',
    model: 'Nexon EV Long Range 45kWh',
    year: 2024,
    type: 'Electric',
    price_per_day: 10500,
    security_deposit: 25000,
    seats: 5,
    transmission: 'Automatic',
    fuel_type: 'Electric',
    is_electric: true,
    self_drive: true,
    with_driver: false,
    is_featured: true,
    is_popular: true,
    availability_status: 'Available',
    rating: 4.88,
    review_count: 18,
    image_url: '/assets/images/tata_nexon_ev_1791628672277.jpg',
    image_gallery: ['/assets/images/tata_nexon_ev_1791628672277.jpg'],
    pickup_locations: ['Kathmandu', 'Lalitpur', 'Bhaktapur', 'Pokhara'],
    description: 'Nepal top-selling electric SUV with 465km range, liquid-cooled battery, 12.3-inch cinematic dash, and fast DC highway charging.',
    slug: 'tata-nexon-ev-long-range',
  },
  {
    id: 15,
    name: 'Suzuki Jimny 4x4 Alpha AllGrip',
    brand: 'Suzuki',
    model: 'Jimny 4WD Alpha',
    year: 2024,
    type: 'Jeep',
    price_per_day: 11500,
    security_deposit: 25000,
    seats: 4,
    transmission: 'Manual',
    fuel_type: 'Petrol',
    is_electric: false,
    self_drive: true,
    with_driver: false,
    is_featured: true,
    is_popular: true,
    availability_status: 'Available',
    rating: 4.92,
    review_count: 27,
    image_url: '/assets/images/suzuki_jimny_jeep_1791628929529.jpg',
    image_gallery: ['/assets/images/suzuki_jimny_jeep_1791628929529.jpg'],
    pickup_locations: ['Kathmandu', 'Pokhara', 'Mustang'],
    description: 'Lightweight ladder-frame 4x4 with low-range transfer case (AllGrip Pro) and 210mm ground clearance. Designed for narrow Mustang trails and Pokhara lakeside dirt roads.',
    slug: 'suzuki-jimny-4x4-nepal',
  },
  {
    id: 16,
    name: 'KTM 390 Adventure Tourer',
    brand: 'KTM',
    model: '390 Adventure Spoke Wheels',
    year: 2024,
    type: 'Bike',
    price_per_day: 5200,
    security_deposit: 14000,
    seats: 2,
    transmission: 'Manual',
    fuel_type: 'Petrol',
    is_electric: false,
    self_drive: true,
    with_driver: false,
    is_featured: true,
    is_popular: true,
    availability_status: 'Available',
    rating: 4.96,
    review_count: 35,
    image_url: '/assets/images/ktm_duke_bike_1791628996338.jpg',
    image_gallery: ['/assets/images/ktm_duke_bike_1791628996338.jpg'],
    pickup_locations: ['Kathmandu', 'Pokhara'],
    description: '43 bhp single-cylinder adrenaline machine with cornering ABS, traction control, and WP Apex adjustable suspension. The ultimate choice for swift mountain passes.',
    slug: 'ktm-390-adventure-tourer',
  },
  {
    id: 17,
    name: 'Hyundai Creta SX(O) Dual Tone',
    brand: 'Hyundai',
    model: 'Creta SX(O) 1.5 Petrol',
    year: 2024,
    type: 'SUV',
    price_per_day: 12000,
    security_deposit: 25000,
    seats: 5,
    transmission: 'Automatic',
    fuel_type: 'Petrol',
    is_electric: false,
    self_drive: true,
    with_driver: true,
    is_featured: true,
    is_popular: true,
    availability_status: 'Available',
    rating: 4.87,
    review_count: 21,
    image_url: '/assets/images/hyundai_creta_suv_1791629081920.jpg',
    image_gallery: ['/assets/images/hyundai_creta_suv_1791629081920.jpg'],
    pickup_locations: ['Kathmandu', 'Pokhara', 'Chitwan', 'Lalitpur'],
    description: 'Premium compact SUV featuring Level 2 ADAS, panoramic sunroof, Bose audio, and smooth IVT automatic transmission. Superb highway ride quality for Kathmandu-Pokhara drives.',
    slug: 'hyundai-creta-suv-kathmandu',
  },
  {
    id: 18,
    name: 'Mahindra Thar Roxx 4x4 Off-Road',
    brand: 'Mahindra',
    model: 'Thar Roxx 4WD 5-Door',
    year: 2024,
    type: 'Jeep',
    price_per_day: 16500,
    security_deposit: 38000,
    seats: 5,
    transmission: 'Automatic',
    fuel_type: 'Diesel',
    is_electric: false,
    self_drive: true,
    with_driver: true,
    is_featured: true,
    is_popular: true,
    availability_status: 'Available',
    rating: 4.98,
    review_count: 31,
    image_url: '/assets/images/thar_rox_jeep_1791629167698.jpg',
    image_gallery: ['/assets/images/thar_rox_jeep_1791629167698.jpg'],
    pickup_locations: ['Kathmandu', 'Pokhara', 'Mustang'],
    description: 'The all-new 5-door Thar Roxx equipped with mHawk diesel, electronic locking differential, crawl smart assist, and panoramic roof. Dominates Upper Mustang and Manang river crossings.',
    slug: 'mahindra-thar-roxx-4x4',
  },
  {
    id: 19,
    name: 'Hyundai Venue Turbo SX',
    brand: 'Hyundai',
    model: 'Venue 1.0 Turbo DCT',
    year: 2023,
    type: 'Car',
    price_per_day: 8500,
    security_deposit: 18000,
    seats: 5,
    transmission: 'Automatic',
    fuel_type: 'Petrol',
    is_electric: false,
    self_drive: true,
    with_driver: false,
    is_featured: false,
    is_popular: true,
    availability_status: 'Available',
    rating: 4.65,
    review_count: 15,
    image_url: '/assets/images/hyundai_venue_suv_1791630083597.jpg',
    image_gallery: ['/assets/images/hyundai_venue_suv_1791630083597.jpg'],
    pickup_locations: ['Kathmandu', 'Lalitpur', 'Bhaktapur'],
    description: 'Punchy 120PS turbo engine paired with 7-speed dual clutch automatic. Compact footprint for effortless parking across Patan and Kathmandu narrow alleys with modern connected tech.',
    slug: 'hyundai-venue-turbo',
  },
  {
    id: 20,
    name: 'MG ZS EV Exclusive Long Range',
    brand: 'MG',
    model: 'ZS EV 51.1kWh Long Range',
    year: 2024,
    type: 'Electric',
    price_per_day: 10000,
    security_deposit: 22000,
    seats: 5,
    transmission: 'Automatic',
    fuel_type: 'Electric',
    is_electric: true,
    self_drive: true,
    with_driver: false,
    is_featured: false,
    is_popular: true,
    availability_status: 'Available',
    rating: 4.8,
    review_count: 17,
    image_url: '/assets/images/mg_zs_ev_1791630141191.jpg',
    image_gallery: ['/assets/images/mg_zs_ev_1791630141191.jpg'],
    pickup_locations: ['Kathmandu', 'Lalitpur', 'Pokhara'],
    description: 'Spacious electric SUV boasting 320km practical range, 360-degree camera, wireless charging, and CCS2 fast DC charging support at all Nepal Electricity plazas.',
    slug: 'mg-zs-ev-long-range',
  },
  {
    id: 21,
    name: 'Bajaj Pulsar NS400Z Street Bike',
    brand: 'Bajaj',
    model: 'Pulsar NS400Z',
    year: 2024,
    type: 'Bike',
    price_per_day: 3800,
    security_deposit: 9000,
    seats: 2,
    transmission: 'Manual',
    fuel_type: 'Petrol',
    is_electric: false,
    self_drive: true,
    with_driver: false,
    is_featured: false,
    is_popular: true,
    availability_status: 'Available',
    rating: 4.75,
    review_count: 22,
    image_url: '/assets/images/bajaj_pulsar_bike_1791630254800.jpg',
    image_gallery: ['/assets/images/bajaj_pulsar_bike_1791630254800.jpg'],
    pickup_locations: ['Kathmandu', 'Lalitpur', 'Bhaktapur', 'Pokhara'],
    description: 'The biggest Pulsar ever built. 373cc liquid-cooled engine producing 40PS, ride-by-wire with 4 traction modes, 43mm upside-down forks, and aggressive streetfighter styling.',
    slug: 'bajaj-pulsar-ns400z-nepal',
  },
  {
    id: 22,
    name: 'BMW G 310 GS Adventure Tourer',
    brand: 'BMW',
    model: 'G 310 GS Triple Black',
    year: 2024,
    type: 'Bike',
    price_per_day: 6500,
    security_deposit: 18000,
    seats: 2,
    transmission: 'Manual',
    fuel_type: 'Petrol',
    is_electric: false,
    self_drive: true,
    with_driver: false,
    is_featured: true,
    is_popular: false,
    availability_status: 'Available',
    rating: 4.93,
    review_count: 19,
    image_url: '/assets/images/bmw_gs_bike_1791630320512.jpg',
    image_gallery: ['/assets/images/bmw_gs_bike_1791630320512.jpg'],
    pickup_locations: ['Kathmandu', 'Pokhara'],
    description: 'Bavarian engineering crafted for world travelers. Agile 313cc motor, 19-inch front adventure wheel, luggage rack, and refined ergonomics for comfortable day-long rides into the Annapurnas.',
    slug: 'bmw-g310gs-adventure-nepal',
  },
  {
    id: 23,
    name: 'Toyota Innova Crysta Luxury 2.4 ZX',
    brand: 'Toyota',
    model: 'Innova Crysta 2.4 Diesel ZX',
    year: 2023,
    type: 'Van',
    price_per_day: 14500,
    security_deposit: 30000,
    seats: 7,
    transmission: 'Manual',
    fuel_type: 'Diesel',
    is_electric: false,
    self_drive: false,
    with_driver: true,
    is_featured: true,
    is_popular: true,
    availability_status: 'Available',
    rating: 4.92,
    review_count: 28,
    image_url: '/assets/images/toyota_innova_crysta_1791630386498.jpg',
    image_gallery: ['/assets/images/toyota_innova_crysta_1791630386498.jpg'],
    pickup_locations: ['Kathmandu', 'Pokhara', 'Chitwan'],
    description: 'The benchmark of family touring comfort in South Asia. Middle-row captain lounge chairs, high-torque diesel reliability, and dedicated certified mountain chauffeur included.',
    slug: 'toyota-innova-crysta-luxury',
  },
  {
    id: 24,
    name: 'Honda CRF 300L Trail Dual Sport',
    brand: 'Honda',
    model: 'CRF 300L Rally Spec',
    year: 2024,
    type: 'Bike',
    price_per_day: 5800,
    security_deposit: 15000,
    seats: 1,
    transmission: 'Manual',
    fuel_type: 'Petrol',
    is_electric: false,
    self_drive: true,
    with_driver: false,
    is_featured: true,
    is_popular: false,
    availability_status: 'Available',
    rating: 4.97,
    review_count: 24,
    image_url: '/assets/images/honda_crf_dirtbike_1791630464554.jpg',
    image_gallery: ['/assets/images/honda_crf_dirtbike_1791630464554.jpg'],
    pickup_locations: ['Kathmandu', 'Pokhara', 'Mustang'],
    description: 'Ultra-durable authentic dual-sport enduro bike. 260mm ground clearance, long-travel Showa suspension, and lightweight 142kg chassis for remote off-camber Himalayan tracks.',
    slug: 'honda-crf-300l-dirtbike',
  },
  {
    id: 25,
    name: 'Toyota Land Cruiser Prado TX-L 4x4',
    brand: 'Toyota',
    model: 'Land Cruiser Prado TX-L 2.8L',
    year: 2023,
    type: 'SUV',
    price_per_day: 26000,
    security_deposit: 60000,
    seats: 7,
    transmission: 'Automatic',
    fuel_type: 'Diesel',
    is_electric: false,
    self_drive: true,
    with_driver: true,
    is_featured: true,
    is_popular: false,
    availability_status: 'Available',
    rating: 5.0,
    review_count: 15,
    image_url: '/assets/images/land_cruiser_prado_1791630548825.jpg',
    image_gallery: ['/assets/images/land_cruiser_prado_1791630548825.jpg'],
    pickup_locations: ['Kathmandu', 'Pokhara', 'Mustang'],
    description: 'Legendary bulletproof luxury 4WD. Full-time 4WD with Torsen limited-slip differential, kinetic dynamic suspension (KDSS), Multi-Terrain Select, and VIP executive seating.',
    slug: 'toyota-land-cruiser-prado-nepal',
  },
  {
    id: 26,
    name: 'Tata Tiago EV Tech Lux',
    brand: 'Tata',
    model: 'Tiago EV XZ+ Tech Lux 24kWh',
    year: 2024,
    type: 'Electric',
    price_per_day: 6500,
    security_deposit: 12000,
    seats: 5,
    transmission: 'Automatic',
    fuel_type: 'Electric',
    is_electric: true,
    self_drive: true,
    with_driver: false,
    is_featured: false,
    is_popular: true,
    availability_status: 'Available',
    rating: 4.7,
    review_count: 14,
    image_url: '/assets/images/tata_tiago_ev_1791630629715.jpg',
    image_gallery: ['/assets/images/tata_tiago_ev_1791630629715.jpg'],
    pickup_locations: ['Kathmandu', 'Lalitpur', 'Bhaktapur'],
    description: 'Nepal favorite budget city EV hatchback. Instant torque, regenerative braking, automatic climate control, and low running costs for navigating Kathmandu traffic.',
    slug: 'tata-tiago-ev-hatchback',
  },
  {
    id: 27,
    name: 'Yamaha FZ-X Crossover Roadster',
    brand: 'Yamaha',
    model: 'FZ-X 150 Bluetooth',
    year: 2023,
    type: 'Bike',
    price_per_day: 2800,
    security_deposit: 7000,
    seats: 2,
    transmission: 'Manual',
    fuel_type: 'Petrol',
    is_electric: false,
    self_drive: true,
    with_driver: false,
    is_featured: false,
    is_popular: true,
    availability_status: 'Available',
    rating: 4.65,
    review_count: 16,
    image_url: '/assets/images/yamaha_fzx_bike_1791630772698.jpg',
    image_gallery: ['/assets/images/yamaha_fzx_bike_1791630772698.jpg'],
    pickup_locations: ['Kathmandu', 'Lalitpur', 'Bhaktapur', 'Pokhara'],
    description: 'Neo-retro styled crossover commuter. Upright riding position, block pattern dual-purpose tires, LED projector headlight, and high fuel economy for casual city and valley cruising.',
    slug: 'yamaha-fzx-crossover-roadster',
  }
];

mockState.vehicles = [...initialVehicles];

// Pre-seed official Nepal fleet hub stations with real GPS coordinates
export const initialLocations = [
  {
    id: 1,
    name: 'Kathmandu Central Hub - Lazimpat',
    slug: 'kathmandu-lazimpat',
    address: 'Lazimpat Embassy Road, Kathmandu 44600',
    city: 'Kathmandu',
    latitude: 27.7190,
    longitude: 85.3210,
    is_active: true,
    phone: '+977-1-4428900',
    operating_hours: '6:00 AM - 10:00 PM',
    description: 'Flagship central hub located 5 minutes from Thamel. Full 4x4 SUV, EV charging, and luxury car fleet ready for dispatch.',
    vehicle_count: 6,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    id: 2,
    name: 'TIA Airport Terminal Station',
    slug: 'kathmandu-airport-tia',
    address: 'Tribhuvan International Airport Gate 2, Ring Road, Kathmandu',
    city: 'Kathmandu',
    latitude: 27.6966,
    longitude: 85.3591,
    is_active: true,
    phone: '+977-9801234567',
    operating_hours: '24/7 (Flight Scheduled)',
    description: 'Dedicated airport arrival desk. Instant vehicle handover with chauffeur upon international or domestic touchdown.',
    vehicle_count: 5,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    id: 3,
    name: 'Lalitpur Patan Hub - Pulchowk',
    slug: 'lalitpur-patan-pulchowk',
    address: 'Pulchowk Main Road, Lalitpur 44700',
    city: 'Lalitpur',
    latitude: 27.6780,
    longitude: 85.3175,
    is_active: true,
    phone: '+977-1-5534211',
    operating_hours: '7:00 AM - 9:00 PM',
    description: 'Convenient pickup point near UN House, Patan Durbar Square, and southern Kathmandu Valley trailheads.',
    vehicle_count: 4,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    id: 4,
    name: 'Bhaktapur Heritage Station',
    slug: 'bhaktapur-durbar-station',
    address: 'Durbar Square Gateway, Suryabinayak Road, Bhaktapur',
    city: 'Bhaktapur',
    latitude: 27.6715,
    longitude: 85.4280,
    is_active: true,
    phone: '+977-1-6612099',
    operating_hours: '7:00 AM - 8:00 PM',
    description: 'Eastern valley gateway hub. Ideal for Nagarkot mountain sunset drives, Dhulikhel, and Kodari border expeditions.',
    vehicle_count: 3,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    id: 5,
    name: 'Pokhara Lakeside Hub - Baidam',
    slug: 'pokhara-lakeside-baidam',
    address: 'Lakeside Baidam Road (Near Fewa Lake), Pokhara 33700',
    city: 'Pokhara',
    latitude: 28.2096,
    longitude: 83.9595,
    is_active: true,
    phone: '+977-61-463822',
    operating_hours: '6:30 AM - 9:30 PM',
    description: 'Premier Annapurna adventure outpost. Specializes in Royal Enfield Himalayan bikes, Scorpio-N 4x4s, and mountain Jeeps.',
    vehicle_count: 5,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    id: 6,
    name: 'Chitwan National Park Hub - Sauraha',
    slug: 'chitwan-sauraha-station',
    address: 'Rapti Riverfront Avenue, Sauraha, Chitwan 44200',
    city: 'Chitwan',
    latitude: 27.5794,
    longitude: 84.4965,
    is_active: true,
    phone: '+977-56-580199',
    operating_hours: '7:00 AM - 8:00 PM',
    description: 'Safari hub equipped with open-top and high-clearance 4WD vehicles for jungle wildlife tracking and Terai highway travel.',
    vehicle_count: 3,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    id: 7,
    name: 'Nagarkot Mountain Panorama Station',
    slug: 'nagarkot-viewpoint-station',
    address: 'Nagarkot Tower Hilltop, Bhaktapur District',
    city: 'Nagarkot',
    latitude: 27.7176,
    longitude: 85.5204,
    is_active: true,
    phone: '+977-1-6680214',
    operating_hours: '5:30 AM - 7:30 PM',
    description: 'High-altitude sunrise viewpoint station for easy drop-off after eastern rim mountain ridge rides.',
    vehicle_count: 2,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    id: 8,
    name: 'Jomsom Mustang Expedition Outpost',
    slug: 'jomsom-mustang-outpost',
    address: 'Jomsom Airport Strip, Mustang District, Gandaki',
    city: 'Mustang',
    latitude: 28.7833,
    longitude: 83.7333,
    is_active: true,
    phone: '+977-69-440055',
    operating_hours: '7:00 AM - 6:00 PM',
    description: 'Trans-Himalayan outpost for Muktinath pilgrimage and Upper Mustang Lo Manthang permits & heavy-duty 4x4 exchange.',
    vehicle_count: 3,
    created_at: new Date(),
    updated_at: new Date()
  }
];

mockState.locations = [...initialLocations];

// Enquiries start pristine and empty
mockState.enquiries = [];

// Helper to create PostgreSQL schema if not exists
export async function initializeDatabase() {
  if (isPostgres && pool) {
    try {
      // 1. Execute complete DDL schema definition and column migrations in a single round-trip
      const ddlStatements = `
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          role VARCHAR(50) DEFAULT 'CUSTOMER',
          full_name VARCHAR(255) NOT NULL DEFAULT '',
          phone VARCHAR(50),
          is_verified BOOLEAN DEFAULT FALSE,
          verification_token VARCHAR(255),
          reset_token VARCHAR(255),
          reset_token_expires TIMESTAMP,
          driving_license VARCHAR(255),
          citizenship_no VARCHAR(255),
          avatar_index INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS vehicles (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          brand VARCHAR(100) NOT NULL,
          model VARCHAR(100) NOT NULL,
          year INTEGER NOT NULL,
          type VARCHAR(50) NOT NULL,
          price_per_day NUMERIC(10, 2) NOT NULL,
          security_deposit NUMERIC(10, 2) NOT NULL,
          seats INTEGER NOT NULL,
          transmission VARCHAR(50) NOT NULL,
          fuel_type VARCHAR(50) NOT NULL,
          is_electric BOOLEAN DEFAULT FALSE,
          self_drive BOOLEAN DEFAULT TRUE,
          with_driver BOOLEAN DEFAULT TRUE,
          is_featured BOOLEAN DEFAULT FALSE,
          is_popular BOOLEAN DEFAULT FALSE,
          availability_status VARCHAR(50) DEFAULT 'Available',
          rating NUMERIC(3, 2) DEFAULT 5.0,
          review_count INTEGER DEFAULT 0,
          image_url TEXT NOT NULL,
          image_gallery TEXT[],
          pickup_locations TEXT[] NOT NULL,
          description TEXT NOT NULL,
          slug VARCHAR(255) UNIQUE NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS bookings (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE RESTRICT,
          start_date DATE NOT NULL,
          end_date DATE NOT NULL,
          pickup_location VARCHAR(255) NOT NULL,
          dropoff_location VARCHAR(255) NOT NULL,
          self_drive BOOLEAN DEFAULT TRUE,
          has_driver BOOLEAN DEFAULT FALSE,
          base_amount NUMERIC(10, 2) NOT NULL,
          driver_amount NUMERIC(10, 2) NOT NULL,
          deposit_amount NUMERIC(10, 2) NOT NULL,
          total_amount NUMERIC(10, 2) NOT NULL,
          payment_method VARCHAR(100) NOT NULL,
          payment_status VARCHAR(50) DEFAULT 'Pending',
          status VARCHAR(50) DEFAULT 'Pending',
          driving_license VARCHAR(255),
          citizenship_no VARCHAR(255),
          destination_location VARCHAR(255),
          payment_receipt_url TEXT,
          payment_transaction_id VARCHAR(255),
          payment_notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS reviews (
          id SERIAL PRIMARY KEY,
          booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE CASCADE,
          rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
          comment TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS audit_logs (
          id SERIAL PRIMARY KEY,
          actor_id INTEGER,
          actor_email VARCHAR(255),
          action VARCHAR(255) NOT NULL,
          resource VARCHAR(255) NOT NULL,
          details TEXT,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS favorites (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, vehicle_id)
        );

        CREATE TABLE IF NOT EXISTS enquiries (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) NOT NULL,
          phone VARCHAR(50),
          subject VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          status VARCHAR(50) DEFAULT 'NEW',
          ip_address VARCHAR(100),
          admin_notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS locations (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          slug VARCHAR(255) UNIQUE NOT NULL,
          address TEXT NOT NULL,
          city VARCHAR(100) NOT NULL,
          latitude NUMERIC(10, 6) NOT NULL,
          longitude NUMERIC(10, 6) NOT NULL,
          is_active BOOLEAN DEFAULT TRUE,
          phone VARCHAR(50),
          operating_hours VARCHAR(100),
          description TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS user_documents (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
          document_type VARCHAR(50) NOT NULL,
          storage_key VARCHAR(255) NOT NULL,
          original_filename VARCHAR(255) NOT NULL,
          mime_type VARCHAR(100) NOT NULL,
          file_size INTEGER NOT NULL,
          uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          verification_status VARCHAR(50) DEFAULT 'Pending',
          verified_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          verified_at TIMESTAMP,
          rejection_reason TEXT,
          retention_until TIMESTAMP,
          deleted_at TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS document_verification_history (
          id SERIAL PRIMARY KEY,
          document_id INTEGER REFERENCES user_documents(id) ON DELETE CASCADE,
          reviewer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
          action VARCHAR(50) NOT NULL,
          reason TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS document_custody_records (
          id SERIAL PRIMARY KEY,
          booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
          document_type VARCHAR(50) NOT NULL,
          handover_required BOOLEAN DEFAULT FALSE,
          handed_over_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          received_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          handover_at TIMESTAMP,
          returned_at TIMESTAMP,
          renter_acknowledgment BOOLEAN DEFAULT FALSE,
          staff_acknowledgment BOOLEAN DEFAULT FALSE,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS rental_agreement_acceptances (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
          agreement_version VARCHAR(50) DEFAULT 'v1.0-nepal-kyc',
          accepted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          accepted_ip VARCHAR(100),
          confirm_identity_ownership BOOLEAN DEFAULT TRUE,
          confirm_original_retention BOOLEAN DEFAULT TRUE,
          confirm_rental_terms BOOLEAN DEFAULT TRUE
        );

        -- Safe idempotent column additions across all tables
        ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'CUSTOMER';
        ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(255) DEFAULT '';
        ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token VARCHAR(255);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS driving_license VARCHAR(255);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS citizenship_no VARCHAR(255);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_index INTEGER DEFAULT 0;

        ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS name VARCHAR(255);
        ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS brand VARCHAR(100);
        ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS model VARCHAR(100);
        ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS year INTEGER;
        ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS type VARCHAR(50);
        ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS price_per_day NUMERIC(10, 2) DEFAULT 0;
        ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS security_deposit NUMERIC(10, 2) DEFAULT 0;
        ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS seats INTEGER DEFAULT 4;
        ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS transmission VARCHAR(50) DEFAULT 'Manual';
        ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS fuel_type VARCHAR(50) DEFAULT 'Petrol';
        ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS is_electric BOOLEAN DEFAULT FALSE;
        ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS self_drive BOOLEAN DEFAULT TRUE;
        ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS with_driver BOOLEAN DEFAULT TRUE;
        ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;
        ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS is_popular BOOLEAN DEFAULT FALSE;
        ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS availability_status VARCHAR(50) DEFAULT 'Available';
        ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS rating NUMERIC(3, 2) DEFAULT 5.0;
        ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;
        ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '/assets/images/fortuner_suv_1791105671393.jpg';
        ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS image_gallery TEXT[] DEFAULT ARRAY[]::TEXT[];
        ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS pickup_locations TEXT[] DEFAULT ARRAY['Kathmandu']::TEXT[];
        ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
        ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS slug VARCHAR(255);
        ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

        ALTER TABLE bookings ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
        ALTER TABLE bookings ADD COLUMN IF NOT EXISTS vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE RESTRICT;
        ALTER TABLE bookings ADD COLUMN IF NOT EXISTS start_date DATE;
        ALTER TABLE bookings ADD COLUMN IF NOT EXISTS end_date DATE;
        ALTER TABLE bookings ADD COLUMN IF NOT EXISTS pickup_location VARCHAR(255);
        ALTER TABLE bookings ADD COLUMN IF NOT EXISTS dropoff_location VARCHAR(255);
        ALTER TABLE bookings ADD COLUMN IF NOT EXISTS self_drive BOOLEAN DEFAULT TRUE;
        ALTER TABLE bookings ADD COLUMN IF NOT EXISTS has_driver BOOLEAN DEFAULT FALSE;
        ALTER TABLE bookings ADD COLUMN IF NOT EXISTS base_amount NUMERIC(10, 2) DEFAULT 0;
        ALTER TABLE bookings ADD COLUMN IF NOT EXISTS driver_amount NUMERIC(10, 2) DEFAULT 0;
        ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC(10, 2) DEFAULT 0;
        ALTER TABLE bookings ADD COLUMN IF NOT EXISTS total_amount NUMERIC(10, 2) DEFAULT 0;
        ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_method VARCHAR(100);
        ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'Pending';
        ALTER TABLE bookings ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Pending';
        ALTER TABLE bookings ADD COLUMN IF NOT EXISTS driving_license VARCHAR(255);
        ALTER TABLE bookings ADD COLUMN IF NOT EXISTS citizenship_no VARCHAR(255);
        ALTER TABLE bookings ADD COLUMN IF NOT EXISTS destination_location VARCHAR(255);
        ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_receipt_url TEXT;
        ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_transaction_id VARCHAR(255);
        ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_notes TEXT;
        ALTER TABLE bookings ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        ALTER TABLE bookings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

        ALTER TABLE reviews ADD COLUMN IF NOT EXISTS booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL;
        ALTER TABLE reviews ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
        ALTER TABLE reviews ADD COLUMN IF NOT EXISTS vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE CASCADE;
        ALTER TABLE reviews ADD COLUMN IF NOT EXISTS rating INTEGER DEFAULT 5;
        ALTER TABLE reviews ADD COLUMN IF NOT EXISTS comment TEXT DEFAULT '';
        ALTER TABLE reviews ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

        ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS actor_id INTEGER;
        ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS actor_email VARCHAR(255);
        ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS action VARCHAR(255);
        ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS resource VARCHAR(255);
        ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS details TEXT;
        ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

        ALTER TABLE favorites ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
        ALTER TABLE favorites ADD COLUMN IF NOT EXISTS vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE CASCADE;
        ALTER TABLE favorites ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

        ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS name VARCHAR(255);
        ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS email VARCHAR(255);
        ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
        ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS subject VARCHAR(255);
        ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS message TEXT;
        ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'NEW';
        ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS ip_address VARCHAR(100);
        ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS admin_notes TEXT;
        ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

        ALTER TABLE locations ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
        ALTER TABLE locations ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
        ALTER TABLE locations ADD COLUMN IF NOT EXISTS operating_hours VARCHAR(100);
        ALTER TABLE locations ADD COLUMN IF NOT EXISTS description TEXT;
        ALTER TABLE locations ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        ALTER TABLE locations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

        ALTER TABLE user_documents ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
        ALTER TABLE user_documents ADD COLUMN IF NOT EXISTS booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL;
        ALTER TABLE user_documents ADD COLUMN IF NOT EXISTS document_type VARCHAR(50);
        ALTER TABLE user_documents ADD COLUMN IF NOT EXISTS storage_key VARCHAR(255);
        ALTER TABLE user_documents ADD COLUMN IF NOT EXISTS original_filename VARCHAR(255);
        ALTER TABLE user_documents ADD COLUMN IF NOT EXISTS mime_type VARCHAR(100);
        ALTER TABLE user_documents ADD COLUMN IF NOT EXISTS file_size INTEGER DEFAULT 0;
        ALTER TABLE user_documents ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        ALTER TABLE user_documents ADD COLUMN IF NOT EXISTS verification_status VARCHAR(50) DEFAULT 'Pending';
        ALTER TABLE user_documents ADD COLUMN IF NOT EXISTS verified_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
        ALTER TABLE user_documents ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP;
        ALTER TABLE user_documents ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
        ALTER TABLE user_documents ADD COLUMN IF NOT EXISTS retention_until TIMESTAMP;
        ALTER TABLE user_documents ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

        ALTER TABLE document_verification_history ADD COLUMN IF NOT EXISTS document_id INTEGER REFERENCES user_documents(id) ON DELETE CASCADE;
        ALTER TABLE document_verification_history ADD COLUMN IF NOT EXISTS reviewer_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
        ALTER TABLE document_verification_history ADD COLUMN IF NOT EXISTS action VARCHAR(50);
        ALTER TABLE document_verification_history ADD COLUMN IF NOT EXISTS reason TEXT;
        ALTER TABLE document_verification_history ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

        ALTER TABLE document_custody_records ADD COLUMN IF NOT EXISTS booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE;
        ALTER TABLE document_custody_records ADD COLUMN IF NOT EXISTS document_type VARCHAR(50);
        ALTER TABLE document_custody_records ADD COLUMN IF NOT EXISTS handover_required BOOLEAN DEFAULT FALSE;
        ALTER TABLE document_custody_records ADD COLUMN IF NOT EXISTS handed_over_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
        ALTER TABLE document_custody_records ADD COLUMN IF NOT EXISTS received_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
        ALTER TABLE document_custody_records ADD COLUMN IF NOT EXISTS handover_at TIMESTAMP;
        ALTER TABLE document_custody_records ADD COLUMN IF NOT EXISTS returned_at TIMESTAMP;
        ALTER TABLE document_custody_records ADD COLUMN IF NOT EXISTS renter_acknowledgment BOOLEAN DEFAULT FALSE;
        ALTER TABLE document_custody_records ADD COLUMN IF NOT EXISTS staff_acknowledgment BOOLEAN DEFAULT FALSE;
        ALTER TABLE document_custody_records ADD COLUMN IF NOT EXISTS notes TEXT;
        ALTER TABLE document_custody_records ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

        ALTER TABLE rental_agreement_acceptances ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
        ALTER TABLE rental_agreement_acceptances ADD COLUMN IF NOT EXISTS booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE;
        ALTER TABLE rental_agreement_acceptances ADD COLUMN IF NOT EXISTS agreement_version VARCHAR(50) DEFAULT 'v1.0-nepal-kyc';
        ALTER TABLE rental_agreement_acceptances ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        ALTER TABLE rental_agreement_acceptances ADD COLUMN IF NOT EXISTS accepted_ip VARCHAR(100);
        ALTER TABLE rental_agreement_acceptances ADD COLUMN IF NOT EXISTS confirm_identity_ownership BOOLEAN DEFAULT TRUE;
        ALTER TABLE rental_agreement_acceptances ADD COLUMN IF NOT EXISTS confirm_original_retention BOOLEAN DEFAULT TRUE;
        ALTER TABLE rental_agreement_acceptances ADD COLUMN IF NOT EXISTS confirm_rental_terms BOOLEAN DEFAULT TRUE;
      `;

      await pool.query(ddlStatements);

      // 2. Check counts in a single fast query
      const countsRes = await pool.query(`
        SELECT 
          (SELECT count(*) FROM locations) AS loc_count,
          (SELECT count(*) FROM vehicles) AS veh_count,
          (SELECT count(*) FROM users WHERE role = 'ADMIN') AS admin_count;
      `);

      const locCount = Number(countsRes.rows[0]?.loc_count || 0);
      const vehCount = Number(countsRes.rows[0]?.veh_count || 0);
      const adminCount = Number(countsRes.rows[0]?.admin_count || 0);

      // 3. Seed locations if table is empty
      if (locCount === 0) {
        console.log('📍 Seeding initial fleet hubs in PostgreSQL...');
        for (const loc of initialLocations) {
          await pool.query(
            `INSERT INTO locations (name, slug, address, city, latitude, longitude, is_active, phone, operating_hours, description)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             ON CONFLICT (slug) DO NOTHING`,
            [loc.name, loc.slug, loc.address, loc.city, loc.latitude, loc.longitude, loc.is_active, loc.phone, loc.operating_hours, loc.description]
          );
        }
      }

      // 4. Seed vehicles if table is empty
      if (vehCount === 0) {
        console.log('🚗 Seeding initial vehicles in PostgreSQL...');
        for (const v of initialVehicles) {
          await pool.query(
            `INSERT INTO vehicles (
              name, brand, model, year, type, price_per_day, security_deposit, 
              seats, transmission, fuel_type, is_electric, self_drive, with_driver, 
              is_featured, is_popular, availability_status, rating, review_count, 
              image_url, image_gallery, pickup_locations, description, slug
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
            ON CONFLICT (slug) DO NOTHING`,
            [
              v.name, v.brand, v.model, v.year, v.type, v.price_per_day, v.security_deposit,
              v.seats, v.transmission, v.fuel_type, v.is_electric, v.self_drive, v.with_driver,
              v.is_featured, v.is_popular, v.availability_status, v.rating, v.review_count,
              v.image_url, v.image_gallery, v.pickup_locations, v.description, v.slug
            ]
          );
        }
      }

      // 5. Ensure owner administrator exists
      const ownerEmail = (process.env.ADMIN_EMAIL || 'aditya.shh15@gmail.com').toLowerCase().trim();
      const explicitPassword = process.env.ADMIN_PASSWORD;

      if (adminCount === 0) {
        let initPass = explicitPassword;
        if (!initPass) {
          initPass = isProduction ? 'NepalDrive2026Admin!' : 'NepalDriveAdmin2026!';
          if (isProduction) {
            console.warn('⚠️ [SECURITY] ADMIN_PASSWORD environment variable is recommended in production. Set ADMIN_PASSWORD in Vercel settings.');
          }
        }
        const ownerHash = await bcrypt.hash(initPass, 10);
        await pool.query(
          `INSERT INTO users (email, password_hash, role, full_name, phone, is_verified)
           VALUES ($1, $2, 'ADMIN', 'Aditya Raj Shah (Fleet Owner)', '+977-9801234567', true)
           ON CONFLICT (email) DO UPDATE SET role = 'ADMIN'`,
          [ownerEmail, ownerHash]
        );
        console.log(`👤 Verified fleet owner account (${ownerEmail}) with role ADMIN.`);
      }

      console.log('⚡ Neon Database Schema & Tables verified successfully.');
    } catch (err: any) {
      console.error('❌ Failed to initialize database schema:', err.message || err);
      throw err; // Re-throw so failures are NOT silently ignored!
    }
  } else {
    if (isProduction) {
      throw new Error('Database initialization failed: In-memory mock database is disabled in production. Please set DATABASE_URL.');
    }
    // Mock Setup: Preseed strictly ONE admin in development
    const adminExists = mockState.users.some(u => u.role === 'ADMIN');
    if (!adminExists) {
      mockState.users.push({
        id: 1,
        email: 'aditya.shh15@gmail.com',
        password_hash: '$2b$10$vucuXNXkLsA1JWaJGqAjuO/2FmmQgngB.5oC6P1SAKPM/X/YLwho.',
        role: 'ADMIN',
        full_name: 'Aditya Raj Shah (Fleet Owner)',
        phone: '+977-9801234567',
        is_verified: true,
        verification_token: null,
        driving_license: '01-06-00458921',
        citizenship_no: '27-01-78-12490',
        avatar_index: 0,
        created_at: new Date(Date.now() - 3600 * 1000 * 48),
        updated_at: new Date(Date.now() - 3600 * 1000 * 48)
      });
    }
  }
}

// Global query engine representing our clean DB abstraction
export async function dbQuery(text: string, params: any[] = []): Promise<{ rows: any[] }> {
  if (isProduction && !isPostgres) {
    throw new Error('Database unavailable: In-memory mock database is strictly prohibited in production. Please configure DATABASE_URL in Vercel.');
  }

  if (isPostgres) {
    if (!pool) {
      throw new Error('Database pool failed to initialize. Please check DATABASE_URL.');
    }
    try {
      const result = await pool.query(text, params);
      return { rows: result.rows };
    } catch (err: any) {
      const isTransient =
        err.message?.includes('Connection terminated') ||
        err.message?.includes('timeout') ||
        err.message?.includes('socket') ||
        err.code === 'ECONNRESET' ||
        err.code === 'ETIMEDOUT' ||
        err.code === '57P01';

      if (isTransient) {
        console.warn(`⚠️ Transient PostgreSQL error (${err.message}). Retrying once in 800ms...`);
        await new Promise(r => setTimeout(r, 800));
        try {
          const retryRes = await pool.query(text, params);
          return { rows: retryRes.rows };
        } catch (retryErr: any) {
          console.error(`❌ PostgreSQL Retry query failed:`, retryErr.message);
          throw retryErr;
        }
      }
      console.error(`❌ PostgreSQL Query failed [${text.slice(0, 80)}]:`, err.message);
      throw err;
    }
  }

  // High-fidelity Mock SQL engine
  const queryClean = text.trim().replace(/\s+/g, ' ');
  
  // LOGIC FOR USERS
  if (queryClean.includes('FROM users WHERE LOWER(email) =') || queryClean.includes('FROM users WHERE email =')) {
    const email = params[0];
    const found = mockState.users.filter(u => u.email?.toLowerCase() === email?.toLowerCase());
    return { rows: found };
  }
  
  if (queryClean.includes('FROM users WHERE id =')) {
    const id = Number(params[0]);
    const found = mockState.users.filter(u => u.id === id);
    return { rows: found };
  }

  if (queryClean.includes('FROM users') && !queryClean.includes('WHERE')) {
    return { rows: [...mockState.users].reverse() };
  }

  if (queryClean.includes('INSERT INTO users')) {
    const newId = mockState.users.length + 1;
    let newUser: any;
    // Check if query matches INSERT INTO users (email, password_hash, role, full_name, phone, is_verified, verification_token)
    if (queryClean.includes('(email, password_hash')) {
      newUser = {
        id: newId,
        email: params[0]?.toLowerCase().trim(),
        password_hash: params[1],
        role: 'CUSTOMER',
        full_name: params[2],
        phone: params[3] || '',
        is_verified: false,
        verification_token: params[4] || null,
        driving_license: null,
        citizenship_no: null,
        avatar_index: 0,
        created_at: new Date(),
        updated_at: new Date()
      };
    } else {
      newUser = {
        id: newId,
        full_name: params[0],
        email: params[1]?.toLowerCase().trim(),
        password_hash: params[2],
        role: params[3] || 'CUSTOMER',
        phone: params[4] || '',
        is_verified: params[5] || false,
        verification_token: params[6] || null,
        driving_license: null,
        citizenship_no: null,
        avatar_index: 0,
        created_at: new Date(),
        updated_at: new Date()
      };
    }
    mockState.users.push(newUser);
    return { rows: [newUser] };
  }

  if (queryClean.includes('UPDATE users SET is_verified =')) {
    const verified = Boolean(params[0]);
    const id = Number(params[1]);
    const idx = mockState.users.findIndex(u => u.id === id);
    if (idx !== -1) {
      mockState.users[idx].is_verified = verified;
      return { rows: [mockState.users[idx]] };
    }
    return { rows: [] };
  }

  if (queryClean.includes('UPDATE users SET role =')) {
    const role = params[0];
    const id = Number(params[1]);
    const idx = mockState.users.findIndex(u => u.id === id);
    if (idx !== -1) {
      mockState.users[idx].role = role;
      return { rows: [mockState.users[idx]] };
    }
    return { rows: [] };
  }

  if (queryClean.includes('UPDATE users SET reset_token =')) {
    const token = params[0];
    const expires = params[1];
    const emailOrId = params[2];
    let idx = -1;
    if (typeof emailOrId === 'number') {
      idx = mockState.users.findIndex(u => u.id === emailOrId);
    } else if (typeof emailOrId === 'string') {
      if (emailOrId.includes('@')) {
        idx = mockState.users.findIndex(u => u.email?.toLowerCase() === emailOrId.toLowerCase());
      } else {
        const idNum = Number(emailOrId);
        if (!isNaN(idNum)) {
          idx = mockState.users.findIndex(u => u.id === idNum);
        }
      }
    }
    if (idx !== -1) {
      mockState.users[idx].reset_token = token;
      mockState.users[idx].reset_token_expires = expires;
      return { rows: [mockState.users[idx]] };
    }
    return { rows: [] };
  }

  if (queryClean.includes('reset_token =')) {
    const token = params[0];
    const altToken = params[1];
    const found = mockState.users.filter(u => 
      (u.reset_token === token || (altToken && u.reset_token === altToken)) && 
      (!u.reset_token_expires || new Date(u.reset_token_expires) > new Date())
    );
    return { rows: found };
  }

  if (queryClean.includes('UPDATE users SET password_hash =')) {
    const passwordHash = params[0];
    const id = Number(params[1]);
    const idx = mockState.users.findIndex(u => u.id === id);
    if (idx !== -1) {
      mockState.users[idx].password_hash = passwordHash;
      mockState.users[idx].reset_token = null;
      mockState.users[idx].reset_token_expires = null;
      return { rows: [mockState.users[idx]] };
    }
    return { rows: [] };
  }

  if (queryClean.includes('UPDATE users SET full_name =') || queryClean.includes('UPDATE users SET')) {
    const id = Number(params[params.length - 1]);
    const idx = mockState.users.findIndex(u => u.id === id);
    if (idx !== -1) {
      if (params[0]) mockState.users[idx].full_name = params[0];
      if (params[1]) mockState.users[idx].phone = params[1];
      if (params[2]) mockState.users[idx].driving_license = params[2];
      if (params[3]) mockState.users[idx].citizenship_no = params[3];
      if (params[4] !== undefined && params[4] !== null) mockState.users[idx].avatar_index = params[4];
      return { rows: [mockState.users[idx]] };
    }
  }

  // LOGIC FOR VEHICLES
  if (queryClean.includes('SELECT * FROM vehicles') && !queryClean.includes('WHERE')) {
    return { rows: mockState.vehicles };
  }

  if (queryClean.includes('SELECT * FROM vehicles WHERE slug =')) {
    const slug = params[0];
    const found = mockState.vehicles.filter(v => v.slug === slug);
    return { rows: found };
  }

  if (queryClean.includes('SELECT * FROM vehicles WHERE id =')) {
    const id = Number(params[0]);
    const found = mockState.vehicles.filter(v => v.id === id);
    return { rows: found };
  }

  if (queryClean.includes('INSERT INTO vehicles')) {
    const id = mockState.vehicles.length + 1;
    const newVehicle = {
      id,
      name: params[0],
      brand: params[1],
      model: params[2],
      year: Number(params[3]),
      type: params[4],
      price_per_day: Number(params[5]),
      security_deposit: Number(params[6]),
      seats: Number(params[7]),
      transmission: params[8],
      fuel_type: params[9],
      is_electric: params[10] || false,
      self_drive: params[11] || true,
      with_driver: params[12] || true,
      is_featured: params[13] || false,
      is_popular: params[14] || false,
      availability_status: params[15] || 'Available',
      rating: 5.0,
      review_count: 0,
      image_url: params[16] || '/assets/fortuner_hero.png',
      image_gallery: params[17] || [],
      pickup_locations: params[18] || ['Kathmandu'],
      description: params[19] || '',
      slug: params[20],
      created_at: new Date(),
      updated_at: new Date()
    };
    mockState.vehicles.push(newVehicle);
    return { rows: [newVehicle] };
  }

  if (queryClean.includes('UPDATE vehicles SET')) {
    // simple patch handler for mock
    const id = Number(params[params.length - 1]);
    const idx = mockState.vehicles.findIndex(v => v.id === id);
    if (idx !== -1) {
      // Just modify status or standard attributes as needed
      if (queryClean.includes('availability_status =')) {
        mockState.vehicles[idx].availability_status = params[0];
      }
      return { rows: [mockState.vehicles[idx]] };
    }
    return { rows: [] };
  }

  if (queryClean.includes('DELETE FROM vehicles WHERE id =')) {
    const id = Number(params[0]);
    mockState.vehicles = mockState.vehicles.filter(v => v.id !== id);
    return { rows: [{ id }] };
  }

  // LOGIC FOR BOOKINGS
  if (queryClean.includes('INSERT INTO bookings')) {
    const id = mockState.bookings.length + 1;
    const newBooking = {
      id,
      user_id: params[0],
      vehicle_id: params[1],
      start_date: params[2],
      end_date: params[3],
      pickup_location: params[4],
      dropoff_location: params[5],
      self_drive: params[6],
      has_driver: params[7],
      base_amount: Number(params[8]),
      driver_amount: Number(params[9]),
      deposit_amount: Number(params[10]),
      total_amount: Number(params[11]),
      payment_method: params[12],
      payment_status: params[13] || 'Pending',
      status: params[14] || 'Pending',
      created_at: new Date(),
      updated_at: new Date()
    };
    mockState.bookings.push(newBooking);
    return { rows: [newBooking] };
  }

  if (queryClean.includes('SELECT * FROM bookings WHERE user_id =')) {
    const userId = Number(params[0]);
    const found = mockState.bookings.filter(b => b.user_id === userId);
    return { rows: found };
  }

  if (queryClean.includes('SELECT * FROM bookings WHERE id =')) {
    const id = Number(params[0]);
    const found = mockState.bookings.filter(b => b.id === id);
    return { rows: found };
  }

  if (queryClean.includes('SELECT * FROM bookings') && !queryClean.includes('WHERE')) {
    return { rows: mockState.bookings };
  }

  if (queryClean.includes('FROM bookings WHERE id =') && queryClean.includes('user_id =')) {
    const id = Number(params[0]);
    const userId = Number(params[1]);
    const found = mockState.bookings.filter(b => b.id === id && b.user_id === userId);
    return { rows: found };
  }

  if (queryClean.includes('UPDATE bookings SET status =')) {
    const status = params[0];
    const id = Number(params[1]);
    const idx = mockState.bookings.findIndex(b => b.id === id);
    if (idx !== -1) {
      mockState.bookings[idx].status = status;
      if (params[2]) {
        mockState.bookings[idx].payment_status = params[2];
      }
      return { rows: [mockState.bookings[idx]] };
    }
  }

  if (queryClean.includes('UPDATE bookings SET payment_status =')) {
    const payment_status = params[0];
    const id = Number(params[1]);
    const idx = mockState.bookings.findIndex(b => b.id === id);
    if (idx !== -1) {
      mockState.bookings[idx].payment_status = payment_status;
      return { rows: [mockState.bookings[idx]] };
    }
  }

  // FAVORITES
  if (queryClean.includes('INSERT INTO favorites')) {
    const id = mockState.favorites.length + 1;
    const newFavorite = {
      id,
      user_id: params[0],
      vehicle_id: params[1],
      created_at: new Date()
    };
    const exists = mockState.favorites.some(f => f.user_id === params[0] && f.vehicle_id === params[1]);
    if (!exists) {
      mockState.favorites.push(newFavorite);
    }
    return { rows: [newFavorite] };
  }

  if (queryClean.includes('DELETE FROM favorites WHERE user_id =')) {
    const userId = params[0];
    const vehicleId = params[1];
    mockState.favorites = mockState.favorites.filter(f => !(f.user_id === userId && f.vehicle_id === vehicleId));
    return { rows: [] };
  }

  if (queryClean.includes('SELECT * FROM favorites WHERE user_id =')) {
    const userId = params[0];
    const found = mockState.favorites.filter(f => f.user_id === userId);
    return { rows: found };
  }

  // AUDIT LOGS
  if (queryClean.includes('INSERT INTO audit_logs')) {
    const id = mockState.audit_logs.length + 1;
    const newLog = {
      id,
      actor_id: params[0],
      actor_email: params[1],
      action: params[2],
      resource: params[3],
      details: params[4],
      timestamp: new Date()
    };
    mockState.audit_logs.push(newLog);
    return { rows: [newLog] };
  }

  if (queryClean.includes('SELECT * FROM audit_logs')) {
    // Return sorted newest first
    return { rows: [...mockState.audit_logs].reverse() };
  }

  // REVIEWS
  if (queryClean.includes('INSERT INTO reviews')) {
    const id = mockState.reviews.length + 1;
    const newReview = {
      id,
      booking_id: params[0],
      user_id: params[1],
      vehicle_id: params[2],
      rating: Number(params[3]),
      comment: params[4],
      created_at: new Date()
    };
    mockState.reviews.push(newReview);
    return { rows: [newReview] };
  }

  if (queryClean.includes('FROM reviews WHERE booking_id =')) {
    const bookingId = Number(params[0]);
    const found = mockState.reviews.filter(r => r.booking_id === bookingId);
    return { rows: found };
  }

  if (queryClean.includes('FROM reviews r') && queryClean.includes('JOIN vehicles v') && queryClean.includes('WHERE r.user_id =')) {
    const userId = Number(params[0]);
    const userReviews = mockState.reviews.filter(r => r.user_id === userId);
    const enriched = userReviews.map(r => {
      const v = mockState.vehicles.find(veh => veh.id === r.vehicle_id);
      return {
        ...r,
        vehicle_name: v?.name || 'NepalDrive Expedition Vehicle',
        vehicle_image: v?.image_url || '/assets/images/fortuner_suv_1791105671393.jpg',
        vehicle_slug: v?.slug || 'vehicle'
      };
    }).reverse();
    return { rows: enriched };
  }

  if (queryClean.includes('FROM reviews r') && queryClean.includes('JOIN users u') && queryClean.includes('WHERE r.vehicle_id =')) {
    const vehicleId = Number(params[0]);
    const vReviews = mockState.reviews.filter(r => r.vehicle_id === vehicleId);
    const enriched = vReviews.map(r => {
      const u = mockState.users.find(usr => usr.id === r.user_id);
      return {
        ...r,
        author_name: u?.full_name || 'Verified Explorer',
        avatar_index: u?.avatar_index ?? 0,
        author_verified: u?.is_verified ?? true
      };
    }).reverse();
    return { rows: enriched };
  }

  if (queryClean.includes('SELECT COUNT(*) as total_reviews, AVG(rating) as avg_rating FROM reviews WHERE vehicle_id =')) {
    const vehicleId = Number(params[0]);
    const vReviews = mockState.reviews.filter(r => r.vehicle_id === vehicleId);
    const total = vReviews.length;
    const avg = total > 0 ? vReviews.reduce((sum, r) => sum + r.rating, 0) / total : 5.0;
    return { rows: [{ total_reviews: total, avg_rating: avg.toFixed(2) }] };
  }

  if (queryClean.includes('SELECT * FROM reviews WHERE vehicle_id =')) {
    const vehicleId = Number(params[0]);
    const found = mockState.reviews.filter(r => r.vehicle_id === vehicleId);
    return { rows: found };
  }

  if (queryClean.includes('SELECT * FROM reviews') && !queryClean.includes('WHERE')) {
    return { rows: mockState.reviews };
  }

  // ENQUIRIES / CONTACT SUBMISSIONS
  if (queryClean.includes('INSERT INTO enquiries')) {
    const id = mockState.enquiries.length + 1;
    const newEnquiry = {
      id,
      name: params[0],
      email: params[1],
      phone: params[2] || null,
      subject: params[3],
      message: params[4],
      status: params[5] || 'NEW',
      ip_address: params[6] || null,
      admin_notes: null,
      created_at: new Date(),
      updated_at: new Date(),
    };
    mockState.enquiries.unshift(newEnquiry);
    return { rows: [newEnquiry] };
  }

  if (queryClean.includes('SELECT * FROM enquiries WHERE id =')) {
    const id = Number(params[0]);
    const found = mockState.enquiries.filter(e => e.id === id);
    return { rows: found };
  }

  if (queryClean.includes('UPDATE enquiries SET status =') || queryClean.includes('UPDATE enquiries SET admin_notes =')) {
    const id = Number(params[params.length - 1]);
    const enquiry = mockState.enquiries.find(e => e.id === id);
    if (enquiry) {
      if (queryClean.includes('status = $1')) {
        enquiry.status = params[0];
      }
      if (queryClean.includes('admin_notes =')) {
        const notesIndex = queryClean.includes('status = $1') ? 1 : 0;
        enquiry.admin_notes = params[notesIndex];
      }
      enquiry.updated_at = new Date();
      return { rows: [enquiry] };
    }
    return { rows: [] };
  }

  if (queryClean.includes('DELETE FROM enquiries WHERE id =')) {
    const id = Number(params[0]);
    const initialLen = mockState.enquiries.length;
    mockState.enquiries = mockState.enquiries.filter(e => e.id !== id);
    return { rows: [{ count: initialLen - mockState.enquiries.length }] };
  }

  if (queryClean.includes('FROM enquiries')) {
    let list = [...mockState.enquiries];
    if (queryClean.includes('WHERE status =')) {
      const statusParam = params[0];
      list = list.filter(e => e.status === statusParam);
    }
    return { rows: list };
  }

  // LOCATIONS / FLEET HUBS
  if (queryClean.includes('INSERT INTO locations')) {
    const id = mockState.locations.length + 1;
    const newLoc = {
      id,
      name: params[0],
      slug: params[1],
      address: params[2],
      city: params[3],
      latitude: parseFloat(params[4]),
      longitude: parseFloat(params[5]),
      is_active: params[6] !== undefined ? Boolean(params[6]) : true,
      phone: params[7] || null,
      operating_hours: params[8] || null,
      description: params[9] || '',
      vehicle_count: 0,
      created_at: new Date(),
      updated_at: new Date()
    };
    mockState.locations.push(newLoc);
    return { rows: [newLoc] };
  }

  if (queryClean.includes('SELECT * FROM locations WHERE slug =')) {
    const slug = params[0];
    const found = mockState.locations.filter(l => l.slug === slug);
    return { rows: found };
  }

  if (queryClean.includes('SELECT * FROM locations WHERE id =')) {
    const id = Number(params[0]);
    const found = mockState.locations.filter(l => l.id === id);
    return { rows: found };
  }

  if (queryClean.includes('SELECT * FROM locations') && !queryClean.includes('WHERE')) {
    // Enrich with dynamic available vehicle count per hub
    const enriched = mockState.locations.map(loc => {
      const activeVehicles = mockState.vehicles.filter(v =>
        v.pickup_locations && v.pickup_locations.some((p: string) =>
          p.toLowerCase().includes(loc.city.toLowerCase()) || loc.name.toLowerCase().includes(p.toLowerCase())
        )
      );
      return {
        ...loc,
        vehicle_count: activeVehicles.length
      };
    });
    return { rows: enriched };
  }

  if (queryClean.includes('DELETE FROM locations WHERE id =')) {
    const id = Number(params[0]);
    mockState.locations = mockState.locations.filter(l => l.id !== id);
    return { rows: [{ count: 1 }] };
  }

  // USER DOCUMENTS
  if (queryClean.includes('INSERT INTO user_documents')) {
    const id = mockState.user_documents.length + 1;
    const doc = {
      id,
      user_id: params[0],
      booking_id: params[1] || null,
      document_type: params[2],
      storage_key: params[3],
      original_filename: params[4],
      mime_type: params[5],
      file_size: params[6],
      verification_status: 'Pending',
      verified_by: null,
      verified_at: null,
      rejection_reason: null,
      retention_until: params[7] || null,
      deleted_at: null,
      uploaded_at: new Date()
    };
    mockState.user_documents.push(doc);
    return { rows: [doc] };
  }

  if (queryClean.includes('FROM user_documents') && queryClean.includes('WHERE id =')) {
    const id = Number(params[0]);
    const found = mockState.user_documents.filter(d => d.id === id && !d.deleted_at);
    return { rows: found };
  }

  if (queryClean.includes('FROM user_documents') && queryClean.includes('WHERE user_id =')) {
    const userId = Number(params[0]);
    const found = mockState.user_documents.filter(d => d.user_id === userId && !d.deleted_at);
    return { rows: [...found].reverse() };
  }

  if (queryClean.includes('FROM user_documents') && !queryClean.includes('WHERE')) {
    const enriched = mockState.user_documents.filter(d => !d.deleted_at).map(d => {
      const user = mockState.users.find(u => u.id === d.user_id) || {};
      const booking = d.booking_id ? mockState.bookings.find(b => b.id === d.booking_id) : null;
      return {
        ...d,
        user_name: user.full_name || 'Customer',
        user_email: user.email || '',
        user_phone: user.phone || '',
        user_is_verified: user.is_verified || false,
        booking_status: booking?.status || null
      };
    });
    return { rows: enriched.reverse() };
  }

  if (queryClean.includes('UPDATE user_documents SET verification_status =')) {
    const status = params[0];
    const reviewerId = params[1];
    const reason = params[2];
    const id = Number(params[3]);
    const doc = mockState.user_documents.find(d => d.id === id);
    if (doc) {
      doc.verification_status = status;
      doc.verified_by = reviewerId;
      doc.verified_at = new Date();
      doc.rejection_reason = reason || null;
      return { rows: [doc] };
    }
    return { rows: [] };
  }

  if (queryClean.includes('UPDATE user_documents SET deleted_at =')) {
    const id = Number(params[0]);
    const doc = mockState.user_documents.find(d => d.id === id);
    if (doc) {
      doc.deleted_at = new Date();
      return { rows: [doc] };
    }
    return { rows: [] };
  }

  // DOCUMENT VERIFICATION HISTORY
  if (queryClean.includes('INSERT INTO document_verification_history')) {
    const id = mockState.document_verification_history.length + 1;
    const item = {
      id,
      document_id: params[0],
      reviewer_id: params[1],
      action: params[2],
      reason: params[3] || null,
      created_at: new Date()
    };
    mockState.document_verification_history.push(item);
    return { rows: [item] };
  }

  if (queryClean.includes('FROM document_verification_history WHERE document_id =')) {
    const docId = Number(params[0]);
    const list = mockState.document_verification_history.filter(h => h.document_id === docId);
    return { rows: [...list].reverse() };
  }

  // RENTAL AGREEMENT ACCEPTANCES
  if (queryClean.includes('INSERT INTO rental_agreement_acceptances')) {
    const id = mockState.rental_agreement_acceptances.length + 1;
    const item = {
      id,
      user_id: params[0],
      booking_id: params[1],
      agreement_version: params[2] || 'v1.0-nepal-kyc',
      accepted_ip: params[3] || '127.0.0.1',
      confirm_identity_ownership: params[4] !== undefined ? params[4] : true,
      confirm_original_retention: params[5] !== undefined ? params[5] : true,
      confirm_rental_terms: params[6] !== undefined ? params[6] : true,
      accepted_at: new Date()
    };
    mockState.rental_agreement_acceptances.push(item);
    return { rows: [item] };
  }

  // DOCUMENT CUSTODY RECORDS
  if (queryClean.includes('INSERT INTO document_custody_records')) {
    const id = mockState.document_custody_records.length + 1;
    const item = {
      id,
      booking_id: params[0],
      document_type: params[1],
      handover_required: Boolean(params[2]),
      handed_over_by: params[3] || null,
      received_by: params[4] || null,
      handover_at: params[5] || new Date(),
      returned_at: params[6] || null,
      renter_acknowledgment: Boolean(params[7]),
      staff_acknowledgment: Boolean(params[8]),
      notes: params[9] || '',
      created_at: new Date()
    };
    mockState.document_custody_records.push(item);
    return { rows: [item] };
  }

  if (queryClean.includes('FROM document_custody_records WHERE booking_id =')) {
    const bookingId = Number(params[0]);
    const list = mockState.document_custody_records.filter(c => c.booking_id === bookingId);
    return { rows: list };
  }

  return { rows: [] };
}

// Safe server-side diagnostic logging (does not expose credentials)
export function getDatabaseDiagnostics() {
  const maskedHost = connectionString ? (connectionString.match(/@([^:/]+)/)?.[1] || 'configured') : 'not-configured';
  return {
    is_production: isProduction,
    is_postgres: isPostgres,
    pool_initialized: Boolean(pool),
    connection_host: maskedHost,
    total_connections: pool?.totalCount ?? 0,
    idle_connections: pool?.idleCount ?? 0,
    waiting_requests: pool?.waitingCount ?? 0,
  };
}

export { isPostgres, isProduction };
