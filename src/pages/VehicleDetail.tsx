import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../store/AuthContext';
import SEO from '../components/SEO';
import {
  MapPin, Calendar, Compass, ShieldCheck, HelpCircle, ChevronRight, Check,
  FileText, Star, MessageSquare, QrCode, UploadCloud, AlertTriangle, Lock, Eye, Sparkles, Navigation
} from 'lucide-react';
import UserAvatar from '../components/UserAvatar';
import RentalAgreementSection from '../components/RentalAgreementSection';

const POPULAR_DESTINATIONS = [
  'Upper Mustang Circuit',
  'Pokhara Lakeside & Sarangkot',
  'Chitwan Safari & Wildlife Trail',
  'Rara Lake Wilderness',
  'Manang & Tilicho Base',
  'Kathmandu Valley & Nagarkot',
  'Everest Highway (Jiri/Salleri)',
  'Lumbini Peace Sanctuary',
];

export default function VehicleDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [vehicle, setVehicle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reviews, setReviews] = useState<any[]>([]);

  // Booking widget Form states
  const [pickupDate, setPickupDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [pickupLoc, setPickupLoc] = useState('Kathmandu');
  const [dropoffLoc, setDropoffLoc] = useState('Kathmandu');
  const [destinationLoc, setDestinationLoc] = useState('Upper Mustang Circuit');
  const [selfDrive, setSelfDrive] = useState(true);
  const [hasDriver, setHasDriver] = useState(false);
  const [payMethod, setPayMethod] = useState<'Nepal QR Payment' | 'Pay at Office' | 'eSewa' | 'Khalti'>('Nepal QR Payment');

  // Mandatory identification fields
  const [drivingLicense, setDrivingLicense] = useState(user?.driving_license || '');
  const [citizenshipNo, setCitizenshipNo] = useState(user?.citizenship_no || '');

  // Mandatory identity document responsibility checkboxes
  const [confirmIdentity, setConfirmIdentity] = useState(false);
  const [confirmOriginalRetention, setConfirmOriginalRetention] = useState(false);
  const [confirmRentalTerms, setConfirmRentalTerms] = useState(false);

  // Booking submission states
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState<any>(null);
  const [bookingError, setBookingError] = useState('');

  // QR Code & Screenshot Upload Modal states
  const [showQrModal, setShowQrModal] = useState(false);
  const [receiptImage, setReceiptImage] = useState<string>('');
  const [receiptFileName, setReceiptFileName] = useState<string>('');
  const [transactionId, setTransactionId] = useState<string>('');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [receiptSuccess, setReceiptSuccess] = useState('');

  useEffect(() => {
    if (user?.driving_license && !drivingLicense) setDrivingLicense(user.driving_license);
    if (user?.citizenship_no && !citizenshipNo) setCitizenshipNo(user.citizenship_no);
  }, [user]);

  useEffect(() => {
    async function loadVehicle() {
      if (!slug) return;
      setLoading(true);
      try {
        const res = await api.getVehicleBySlug(slug);
        if (res.success) {
          setVehicle(res.data);
          if (res.data.pickup_locations && res.data.pickup_locations[0]) {
            setPickupLoc(res.data.pickup_locations[0]);
            setDropoffLoc(res.data.pickup_locations[0]);
          }

          const revRes = await api.getVehicleReviews(res.data.id);
          if (revRes.success) {
            setReviews(revRes.data);
          }
        } else {
          setError('Vehicle not found.');
        }
      } catch (err: any) {
        setError(err.message || 'Vehicle fetch failed.');
      } finally {
        setLoading(false);
      }
    }
    loadVehicle();
  }, [slug]);

  const calculatePrice = () => {
    if (!vehicle || !pickupDate || !returnDate) return { total: 0, days: 0, base: 0, driver: 0, deposit: 0 };
    const start = new Date(pickupDate);
    const end = new Date(returnDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;

    const basePrice = parseFloat(vehicle.price_per_day);
    const base = basePrice * diffDays;
    const driver = hasDriver && vehicle.with_driver ? 1500 * diffDays : 0;
    const deposit = parseFloat(vehicle.security_deposit);
    const total = base + driver + deposit;

    return { total, days: diffDays, base, driver, deposit };
  };

  const compressImageFile = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
        return;
      }

      const img = new Image();
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      img.onload = () => {
        const maxWidth = 1600;
        const maxHeight = 1600;
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        } else {
          resolve(img.src);
        }
      };
      img.onerror = () => {
        const fallbackReader = new FileReader();
        fallbackReader.onloadend = () => resolve(fallbackReader.result as string);
        fallbackReader.readAsDataURL(file);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleReceiptFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 25 * 1024 * 1024) {
        setBookingError('The selected file is too large. Please upload an image under 25MB.');
        return;
      }
      setReceiptFileName(file.name);
      try {
        const base64Data = await compressImageFile(file);
        setReceiptImage(base64Data);
      } catch {
        const reader = new FileReader();
        reader.onloadend = () => {
          setReceiptImage(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }

    if (vehicle.availability_status === 'Rented') {
      setBookingError('This vehicle is currently rented out on an expedition. Please select another vehicle.');
      return;
    }

    if (!destinationLoc.trim()) {
      setBookingError('Please enter where you are traveling to in Nepal.');
      return;
    }

    const licenseToUse = (user.is_verified && !drivingLicense.trim() && user.driving_license)
      ? user.driving_license
      : drivingLicense.trim();

    const citizenshipToUse = (user.is_verified && !citizenshipNo.trim() && user.citizenship_no)
      ? user.citizenship_no
      : citizenshipNo.trim();

    if (!licenseToUse) {
      setBookingError('Before requesting a ride, please provide your driving license number.');
      return;
    }

    if (!citizenshipToUse) {
      setBookingError('Before requesting a ride, please provide your citizenship or passport number.');
      return;
    }

    if (!confirmIdentity || !confirmOriginalRetention || !confirmRentalTerms) {
      setBookingError('Please review and check all 3 mandatory identity document retention and rental terms checkboxes below before requesting a ride.');
      return;
    }

    setBookingError('');
    setBookingLoading(true);

    try {
      if (licenseToUse && citizenshipToUse && (!user.driving_license || !user.citizenship_no)) {
        try {
          await api.updateProfile({
            driving_license: licenseToUse,
            citizenship_no: citizenshipToUse,
          });
        } catch (ignored) {}
      }

      const payload = {
        vehicle_id: vehicle.id,
        start_date: pickupDate,
        end_date: returnDate,
        pickup_location: pickupLoc,
        dropoff_location: dropoffLoc,
        destination_location: destinationLoc.trim(),
        self_drive: selfDrive,
        has_driver: hasDriver,
        payment_method: payMethod,
        driving_license: licenseToUse,
        citizenship_no: citizenshipToUse,
      };

      const res = await api.createBooking(payload);
      if (res.success) {
        setBookingSuccess(res.data);
        setShowQrModal(true);
        // Persist rental agreement & document responsibility acceptance
        try {
          await api.acceptRentalAgreement({
            booking_id: res.data.id,
            confirm_identity_ownership: confirmIdentity,
            confirm_original_retention: confirmOriginalRetention,
            confirm_rental_terms: confirmRentalTerms,
          });
        } catch (agErr) {
          console.warn('Agreement acceptance logged', agErr);
        }
      } else {
        setBookingError(res.message || 'Booking failed.');
      }
    } catch (err: any) {
      setBookingError(err.message || 'Overlap reservation conflict occurred. Please select other dates.');
    } finally {
      setBookingLoading(false);
    }
  };

  const handleUploadPaymentReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingSuccess) return;

    if (!transactionId.trim() && !receiptImage) {
      alert('Please attach your payment screenshot or provide your Transaction Reference ID.');
      return;
    }

    setUploadingReceipt(true);
    setReceiptSuccess('');
    try {
      const res = await api.submitPaymentReceipt({
        booking_id: bookingSuccess.id,
        receipt_image: receiptImage || undefined,
        transaction_id: transactionId.trim() || `QR-${Date.now()}`,
        payment_notes: paymentNotes.trim() || undefined,
      });

      if (res.success) {
        setReceiptSuccess('Payment receipt submitted! The fleet owner will verify your screenshot and confirm your vehicle handover.');
        setTimeout(() => {
          navigate('/account');
        }, 2200);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to submit payment receipt.');
    } finally {
      setUploadingReceipt(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-24 text-center animate-pulse">
        <div className="h-12 bg-stone-200 rounded-xl max-w-sm mx-auto mb-6" />
        <div className="h-96 bg-stone-100 rounded-2xl max-w-5xl mx-auto" />
      </div>
    );
  }

  if (error || !vehicle) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-24 text-center">
        <h2 className="text-2xl font-serif font-bold text-stone-900 mb-2">Vehicle Not Found</h2>
        <p className="text-sm text-stone-500 mb-6">{error || 'The requested vehicle slug is invalid.'}</p>
        <Link to="/vehicles" className="px-4 py-2 bg-crimson-500 hover:bg-crimson-600 text-white font-medium text-xs rounded-lg">
          Back to Directory
        </Link>
      </div>
    );
  }

  const priceBreakdown = calculatePrice();
  const isRented = vehicle.availability_status === 'Rented';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <SEO
        title={`${vehicle.name} Rental in ${vehicle.pickup_locations[0]} | NepalDrive`}
        description={`Hire the ${vehicle.brand} ${vehicle.model} (${vehicle.year}) in Nepal. Priced from Rs. ${parseFloat(vehicle.price_per_day).toLocaleString()} per day. Self-drive or with professional driver.`}
      />

      {/* Breadcrumb Navigation */}
      <nav className="flex items-center space-x-2 text-xs font-mono text-stone-400 mb-8">
        <Link to="/" className="hover:text-crimson-500">Home</Link>
        <ChevronRight className="w-3 h-3" />
        <Link to="/vehicles" className="hover:text-crimson-500">Vehicles</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-stone-800">{vehicle.name}</span>
      </nav>

      {/* Rented Notice Banner if vehicle is on active road trip */}
      {isRented && (
        <div className="mb-8 p-5 bg-amber-500/10 border-2 border-amber-500/30 rounded-3xl flex items-center gap-4 text-amber-950 animate-fade-in shadow-xs">
          <div className="p-3 bg-amber-500 text-white rounded-2xl shrink-0">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-base sm:text-lg">
              Currently Rented &mdash; Out on Himalayan Expedition
            </h3>
            <p className="text-xs text-amber-800 leading-relaxed">
              This vehicle is currently exploring the highways of Nepal. To prevent double-booking, reservations for this vehicle are temporarily locked until returned by the current voyager.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Area: Gallery, description, specifications (8 Columns) */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Main Photo Gallery */}
          <div className="relative rounded-3xl overflow-hidden aspect-[16/9] bg-stone-100 border border-stone-200 shadow-sm">
            <img
              src={vehicle.image_url}
              alt={`${vehicle.name} - Premium rental in Nepal`}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            {isRented && (
              <div className="absolute top-4 right-4 px-3.5 py-1.5 bg-amber-500 text-white font-mono font-bold text-xs rounded-xl shadow-md uppercase tracking-wider flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                Rented
              </div>
            )}
          </div>

          <div className="text-left space-y-4">
            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-stone-900">
              {vehicle.name}
            </h1>
            <div className="flex flex-wrap gap-4 text-xs font-mono text-stone-500">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-crimson-500" />
                Hubs: {vehicle.pickup_locations.join(', ')}
              </span>
              <span>Model Year: {vehicle.year}</span>
              <span>Category: {vehicle.type}</span>
              <span>Availability: <b className={isRented ? 'text-amber-600' : 'text-green-600'}>{vehicle.availability_status}</b></span>
            </div>
            
            <hr className="border-stone-200" />

            <div className="space-y-2">
              <h2 className="text-sm font-mono font-bold uppercase text-stone-950">About this Vehicle</h2>
              <p className="text-sm text-stone-600 leading-relaxed font-light">
                {vehicle.description}
              </p>
            </div>
          </div>

          {/* Technical specifications */}
          <div className="space-y-4 text-left">
            <h2 className="text-sm font-mono font-bold uppercase text-stone-950">Technical Specifications</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/70">
                <span className="block text-[10px] font-mono text-stone-400 uppercase">Transmission</span>
                <span className="text-sm font-bold font-mono text-stone-800">{vehicle.transmission}</span>
              </div>
              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/70">
                <span className="block text-[10px] font-mono text-stone-400 uppercase">Fuel Type</span>
                <span className="text-sm font-bold font-mono text-stone-800">{vehicle.fuel_type}</span>
              </div>
              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/70">
                <span className="block text-[10px] font-mono text-stone-400 uppercase">Capacity</span>
                <span className="text-sm font-bold font-mono text-stone-800">{vehicle.seats} Seats</span>
              </div>
              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/70">
                <span className="block text-[10px] font-mono text-stone-400 uppercase">Security Deposit</span>
                <span className="text-sm font-bold font-mono text-stone-800">Rs. {parseFloat(vehicle.security_deposit).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Reviews & Road Ratings */}
          <div className="space-y-6 text-left pt-6 border-t border-stone-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-serif font-bold text-stone-900 flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-500 fill-amber-400" />
                  Verified Rider Reviews ({reviews.length})
                </h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  Real feedback from voyagers who rented this vehicle across Nepal.
                </p>
              </div>
              <div className="text-right">
                <div className="text-xl font-mono font-bold text-stone-900">{vehicle.rating} / 5.0</div>
                <div className="text-[10px] font-mono text-stone-400">Average Aggregate</div>
              </div>
            </div>

            {reviews.length === 0 ? (
              <div className="p-8 bg-stone-50 rounded-2xl border border-stone-200 text-center text-xs font-mono text-stone-500">
                No reviews yet for this vehicle. Be the first to rent and rate!
              </div>
            ) : (
              <div className="space-y-3">
                {reviews.map((r) => (
                  <div key={r.id} className="p-4 rounded-2xl border border-stone-200 bg-stone-50/70 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <UserAvatar user={{ full_name: r.author_name, avatar_index: r.avatar_index }} size="sm" />
                        <div>
                          <span className="font-bold text-stone-900 block">{r.author_name}</span>
                          <span className="text-[10px] text-stone-400 font-mono">
                            {new Date(r.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                        <span className="font-mono font-bold text-amber-900 text-xs">{r.rating}.0</span>
                      </div>
                    </div>
                    <p className="text-stone-700 leading-relaxed pl-10 font-light text-xs bg-white p-3 rounded-xl border border-stone-100">
                      &ldquo;{r.comment}&rdquo;
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Area: Interactive Booking Card Widget (4 Columns) */}
        <div className="lg:col-span-4 bg-white p-6 sm:p-7 rounded-3xl border border-stone-200 sticky top-24 shadow-sm text-left space-y-5">
          <div className="border-b border-stone-100 pb-4">
            <span className="block text-xs font-mono text-stone-400 uppercase">Rental rate</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-mono font-bold text-stone-950">Rs. {parseFloat(vehicle.price_per_day).toLocaleString()}</span>
              <span className="text-xs text-stone-500 font-mono">/ day</span>
            </div>
          </div>

          {bookingSuccess ? (
            /* Success State with QR Code Prompt */
            <div className="space-y-5 text-center py-2 animate-fade-in">
              <div className="w-12 h-12 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
                <Check className="w-6 h-6" />
              </div>
              <div className="space-y-1 text-left">
                <h3 className="font-serif text-lg font-bold text-stone-900 text-center">
                  Reservation Created
                </h3>
                <p className="text-xs text-stone-500 text-center leading-relaxed">
                  To lock this vehicle, scan the QR code to pay and upload your receipt for owner verification.
                </p>
              </div>

              <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 text-left text-xs font-mono space-y-1">
                <div className="flex justify-between">
                  <span className="text-stone-500">Destination:</span>
                  <span className="font-bold text-stone-900">{bookingSuccess.destination_location || destinationLoc}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Total Invoice:</span>
                  <span className="font-bold text-crimson-600">Rs. {parseFloat(bookingSuccess.total_amount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Status:</span>
                  <span className="text-amber-700 font-bold">{bookingSuccess.payment_status}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowQrModal(true)}
                className="w-full py-3 bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs rounded-xl shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <QrCode className="w-4 h-4 text-amber-400" />
                Open Nepal QR &amp; Upload Receipt
              </button>

              <Link
                to="/account"
                className="block w-full py-2.5 text-stone-600 hover:bg-stone-50 border border-stone-200 font-semibold text-xs rounded-xl text-center transition-colors"
              >
                Go to My Account
              </Link>
            </div>
          ) : (
            /* Booking Widget Form */
            <form onSubmit={handleBookingSubmit} className="space-y-4">
              
              {/* Pickup location */}
              <div className="space-y-1">
                <label className="block text-[10px] font-mono font-bold text-stone-400 uppercase">Pickup Location</label>
                <select
                  value={pickupLoc}
                  onChange={(e) => {
                    setPickupLoc(e.target.value);
                    setDropoffLoc(e.target.value);
                  }}
                  className="w-full text-xs bg-stone-50 border border-stone-200 rounded-xl p-2.5 focus:border-crimson-500 font-mono"
                >
                  {vehicle.pickup_locations.map((loc: string) => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>

              {/* Destination Location: REQUIREMENT: "ask for location where user is going" */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-[10px] font-mono font-bold text-stone-600 uppercase flex items-center justify-between">
                  <span>Where are you going? (Travel Route) *</span>
                </label>
                <input
                  type="text"
                  value={destinationLoc}
                  onChange={(e) => setDestinationLoc(e.target.value)}
                  placeholder="e.g. Upper Mustang, Pokhara, Chitwan, Rara Lake"
                  className="w-full text-xs bg-stone-50 border border-stone-200 rounded-xl p-2.5 focus:border-crimson-500 font-mono"
                  required
                />
                {/* Fast Route Pills */}
                <div className="flex flex-wrap gap-1 pt-1">
                  {POPULAR_DESTINATIONS.slice(0, 4).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDestinationLoc(d)}
                      className={`text-[9px] font-mono px-2 py-0.5 rounded-lg border transition-colors cursor-pointer ${
                        destinationLoc === d
                          ? 'bg-crimson-50 border-crimson-500 text-crimson-600 font-bold'
                          : 'bg-stone-50 border-stone-200 text-stone-500 hover:text-stone-900'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* Start & End Dates */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="block text-[10px] font-mono font-bold text-stone-400 uppercase">Pickup Date</label>
                  <input
                    type="date"
                    value={pickupDate}
                    onChange={(e) => setPickupDate(e.target.value)}
                    className="w-full text-xs bg-stone-50 border border-stone-200 rounded-xl p-2 focus:border-crimson-500 font-mono"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-mono font-bold text-stone-400 uppercase">Return Date</label>
                  <input
                    type="date"
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                    className="w-full text-xs bg-stone-50 border border-stone-200 rounded-xl p-2 focus:border-crimson-500 font-mono"
                    required
                  />
                </div>
              </div>

              {/* Self drive or With Driver Choice */}
              <div className="space-y-2 pt-2 border-t border-stone-100">
                <label className="block text-[10px] font-mono font-bold text-stone-400 uppercase">Driver Formula</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={!vehicle.self_drive}
                    onClick={() => {
                      setSelfDrive(true);
                      setHasDriver(false);
                    }}
                    className={`p-2 rounded-xl border text-xs font-mono font-semibold text-center transition-all cursor-pointer ${selfDrive ? 'bg-crimson-50 border-crimson-500 text-crimson-600' : 'bg-stone-50 border-stone-200 text-stone-600 disabled:opacity-40'}`}
                  >
                    Self Drive
                  </button>
                  <button
                    type="button"
                    disabled={!vehicle.with_driver}
                    onClick={() => {
                      setSelfDrive(false);
                      setHasDriver(true);
                    }}
                    className={`p-2 rounded-xl border text-xs font-mono font-semibold text-center transition-all cursor-pointer ${hasDriver ? 'bg-crimson-50 border-crimson-500 text-crimson-600' : 'bg-stone-50 border-stone-200 text-stone-600 disabled:opacity-40'}`}
                  >
                    With Driver
                  </button>
                </div>
              </div>

              {/* Payment Option: QR Code First */}
              <div className="space-y-1 pt-1">
                <label className="block text-[10px] font-mono font-bold text-stone-400 uppercase">Payment Method</label>
                <select
                  value={payMethod}
                  onChange={(e: any) => setPayMethod(e.target.value)}
                  className="w-full text-xs bg-stone-50 border border-stone-200 rounded-xl p-2.5 focus:border-crimson-500 font-mono"
                >
                  <option value="Nepal QR Payment">Nepal Fonepay / eSewa QR Code (Instant Scan)</option>
                  <option value="eSewa">eSewa Mobile Wallet</option>
                  <option value="Khalti">Khalti Digital Wallet</option>
                  <option value="Pay at Office">Pay at Office Counter</option>
                </select>
              </div>

              {/* Driver Verification Credentials */}
              <div className="space-y-3 pt-3 border-t border-stone-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-crimson-600" />
                    <span className="text-[11px] font-mono font-bold uppercase text-stone-900">
                      Driver License &amp; Citizenship (Required)
                    </span>
                  </div>
                  {user?.is_verified && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full font-bold">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" /> Verified Rider
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-stone-500 leading-tight">
                  NepalTransport Authority requires your driving license &amp; citizenship/passport before dispatching vehicles.
                </p>

                <div className="space-y-1">
                  <label className="block text-[10px] font-mono font-bold text-stone-500 uppercase">
                    Driving License Number *
                  </label>
                  <input
                    type="text"
                    value={drivingLicense}
                    onChange={(e) => setDrivingLicense(e.target.value)}
                    placeholder="e.g. 01-06-00458921 or Intl IDP"
                    className="w-full text-xs bg-stone-50 border border-stone-200 rounded-xl p-2.5 focus:border-crimson-500 font-mono"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-mono font-bold text-stone-500 uppercase">
                    Citizenship / Passport Number *
                  </label>
                  <input
                    type="text"
                    value={citizenshipNo}
                    onChange={(e) => setCitizenshipNo(e.target.value)}
                    placeholder="e.g. 27-01-78-12490 or Foreign Passport #"
                    className="w-full text-xs bg-stone-50 border border-stone-200 rounded-xl p-2.5 focus:border-crimson-500 font-mono"
                    required
                  />
                </div>
              </div>

              {/* Cost Breakdown calculation */}
              {pickupDate && returnDate && (
                <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200/70 space-y-2 text-xs font-mono">
                  <div className="flex justify-between text-stone-500">
                    <span>Base Fee ({priceBreakdown.days} Days):</span>
                    <span>Rs. {priceBreakdown.base.toLocaleString()}</span>
                  </div>
                  {hasDriver && (
                    <div className="flex justify-between text-stone-500">
                      <span>Driver Charge (Rs. 1500/d):</span>
                      <span>Rs. {priceBreakdown.driver.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-stone-500">
                    <span>Refundable Deposit:</span>
                    <span>Rs. {priceBreakdown.deposit.toLocaleString()}</span>
                  </div>
                  <hr className="border-stone-200" />
                  <div className="flex justify-between font-bold text-stone-900 text-sm">
                    <span>Grand Total:</span>
                    <span className="text-crimson-600 font-bold">Rs. {priceBreakdown.total.toLocaleString()}</span>
                  </div>
                </div>
              )}

              {/* Mandatory Rental Agreement & Original Document Responsibility Section */}
              <RentalAgreementSection
                confirmIdentity={confirmIdentity}
                onConfirmIdentityChange={setConfirmIdentity}
                confirmOriginalRetention={confirmOriginalRetention}
                onConfirmOriginalRetentionChange={setConfirmOriginalRetention}
                confirmRentalTerms={confirmRentalTerms}
                onConfirmRentalTermsChange={setConfirmRentalTerms}
              />

              {bookingError && (
                <div className="text-xs text-crimson-600 bg-crimson-50 border border-crimson-100 p-3 rounded-xl flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{bookingError}</span>
                </div>
              )}

              {/* Submit / Action Button */}
              {user ? (
                <button
                  type="submit"
                  disabled={bookingLoading || isRented}
                  className="w-full py-3 bg-crimson-500 hover:bg-crimson-600 text-white font-semibold text-xs text-center rounded-xl shadow-sm cursor-pointer disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  <QrCode className="w-4 h-4" />
                  {isRented ? 'Vehicle Currently Rented' : bookingLoading ? 'Creating Reservation...' : 'Request Ride & Pay with QR'}
                </button>
              ) : (
                <Link
                  to="/register"
                  className="block w-full py-3 bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs text-center rounded-xl shadow-sm"
                >
                  Register Account to Book
                </Link>
              )}
            </form>
          )}
        </div>

      </div>

      {/* QR Code Payment & Screenshot Upload Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 max-w-lg w-full space-y-5 text-left animate-fade-in shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3 border-stone-150">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-500 text-white rounded-xl shadow-xs">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-lg text-stone-900">
                    Nepal QR Payment &amp; Receipt Upload
                  </h3>
                  <p className="text-[11px] text-stone-500 font-mono">
                    Scan via Fonepay / eSewa / Khalti / Mobile Banking
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="text-stone-400 hover:text-stone-700 text-lg font-mono cursor-pointer"
              >
                &times;
              </button>
            </div>

            {receiptSuccess ? (
              <div className="p-5 bg-green-50 border border-green-200 rounded-2xl text-center space-y-2 text-green-900">
                <div className="w-10 h-10 bg-green-600 text-white rounded-full flex items-center justify-center mx-auto shadow-sm">
                  <Check className="w-5 h-5" />
                </div>
                <h4 className="font-serif font-bold text-base">Payment Screenshot Submitted!</h4>
                <p className="text-xs text-green-800">{receiptSuccess}</p>
              </div>
            ) : (
              <form onSubmit={handleUploadPaymentReceipt} className="space-y-4 text-xs font-mono">
                {/* QR Code Graphic Card */}
                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 flex flex-col sm:flex-row items-center gap-4">
                  {/* Generated Dynamic SVG QR Code */}
                  <div className="w-36 h-36 bg-white p-2 rounded-2xl border-2 border-stone-900 shadow-sm flex flex-col items-center justify-center shrink-0">
                    <svg viewBox="0 0 100 100" className="w-full h-full text-stone-900">
                      {/* Top-left position marker */}
                      <rect x="10" y="10" width="24" height="24" fill="currentColor" rx="4" />
                      <rect x="14" y="14" width="16" height="16" fill="white" rx="2" />
                      <rect x="18" y="18" width="8" height="8" fill="currentColor" rx="1" />
                      {/* Top-right position marker */}
                      <rect x="66" y="10" width="24" height="24" fill="currentColor" rx="4" />
                      <rect x="70" y="14" width="16" height="16" fill="white" rx="2" />
                      <rect x="74" y="18" width="8" height="8" fill="currentColor" rx="1" />
                      {/* Bottom-left position marker */}
                      <rect x="10" y="66" width="24" height="24" fill="currentColor" rx="4" />
                      <rect x="14" y="70" width="16" height="16" fill="white" rx="2" />
                      <rect x="18" y="74" width="8" height="8" fill="currentColor" rx="1" />
                      {/* Data dots representation */}
                      <circle cx="42" cy="18" r="3" fill="currentColor" />
                      <circle cx="54" cy="18" r="3" fill="currentColor" />
                      <circle cx="42" cy="30" r="3" fill="currentColor" />
                      <circle cx="54" cy="30" r="3" fill="currentColor" />
                      <circle cx="18" cy="48" r="3" fill="currentColor" />
                      <circle cx="30" cy="48" r="3" fill="currentColor" />
                      <circle cx="42" cy="48" r="3" fill="currentColor" />
                      <circle cx="54" cy="48" r="3" fill="currentColor" />
                      <circle cx="66" cy="48" r="3" fill="currentColor" />
                      <circle cx="78" cy="48" r="3" fill="currentColor" />
                      <circle cx="90" cy="48" r="3" fill="currentColor" />
                      <circle cx="42" cy="66" r="3" fill="currentColor" />
                      <circle cx="54" cy="66" r="3" fill="currentColor" />
                      <circle cx="66" cy="66" r="3" fill="currentColor" />
                      <circle cx="78" cy="66" r="3" fill="currentColor" />
                      <circle cx="42" cy="84" r="3" fill="currentColor" />
                      <circle cx="54" cy="84" r="3" fill="currentColor" />
                      <circle cx="66" cy="84" r="3" fill="currentColor" />
                      <circle cx="78" cy="84" r="3" fill="currentColor" />
                      <circle cx="90" cy="84" r="3" fill="currentColor" />
                    </svg>
                    <span className="text-[8px] font-bold text-crimson-600 uppercase tracking-tighter">NepalPay &bull; Fonepay</span>
                  </div>

                  <div className="space-y-1 text-left">
                    <span className="text-[10px] text-stone-400 block uppercase font-bold">Official Merchant Account</span>
                    <span className="font-bold text-stone-900 block font-serif text-sm">NepalDrive Fleet Pvt. Ltd.</span>
                    <span className="text-[11px] text-stone-600 block">Fonepay ID: <b>9801234567</b></span>
                    <span className="text-[11px] text-stone-600 block">PAN: <b>609823412</b></span>
                    <span className="text-xs font-bold text-crimson-600 block pt-1">
                      Payable Amount: Rs. {parseFloat(bookingSuccess?.total_amount || priceBreakdown.total).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* File Upload Section */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-stone-700 uppercase">
                    Upload Payment Screenshot / Receipt *
                  </label>
                  <label className="border-2 border-dashed border-stone-300 hover:border-amber-500 rounded-2xl p-4 flex flex-col items-center justify-center gap-1.5 bg-stone-50/50 cursor-pointer transition-colors">
                    <UploadCloud className="w-6 h-6 text-stone-400" />
                    <span className="text-xs text-stone-600 font-sans font-medium">
                      {receiptFileName ? receiptFileName : 'Click to browse or drop payment screenshot image'}
                    </span>
                    <span className="text-[10px] text-stone-400">Supports JPG, PNG, Screenshots</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleReceiptFileChange}
                      className="hidden"
                    />
                  </label>

                  {/* Image Preview if selected */}
                  {receiptImage && (
                    <div className="p-2 bg-stone-100 rounded-xl flex items-center gap-3">
                      <img src={receiptImage} alt="Payment receipt" className="w-12 h-12 object-cover rounded-lg border" />
                      <div className="overflow-hidden">
                        <span className="font-bold text-stone-900 text-xs block truncate">{receiptFileName}</span>
                        <span className="text-[10px] text-green-700">Receipt image ready for upload</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Transaction ID input */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-stone-700 uppercase">
                    Transaction ID / Reference Number *
                  </label>
                  <input
                    type="text"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    placeholder="e.g. ESEWA-98234109 or KHL-78219"
                    className="w-full text-xs bg-stone-50 border border-stone-200 rounded-xl p-2.5 focus:border-amber-500"
                    required
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowQrModal(false)}
                    className="w-1/3 py-2.5 border border-stone-200 text-stone-600 font-semibold rounded-xl text-xs hover:bg-stone-50 cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={uploadingReceipt}
                    className="w-2/3 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl text-xs shadow-sm cursor-pointer transition-colors"
                  >
                    {uploadingReceipt ? 'Submitting...' : 'Submit Screenshot for Verification'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
