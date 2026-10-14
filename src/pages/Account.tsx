import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { api } from '../services/api';
import SEO from '../components/SEO';
import {
  User, ShieldCheck, ShieldAlert, CreditCard, Clock, FileText, CheckCircle,
  HelpCircle, Star, MessageSquare, Car, LogOut, ChevronRight, Check, X, Sparkles,
  UploadCloud, AlertTriangle, Eye, Trash2, RefreshCw, Download, Lock
} from 'lucide-react';
import UserAvatar from '../components/UserAvatar';
import DocumentPreviewModal from '../components/DocumentPreviewModal';
import { NEPAL_AVATARS, getAvatarForUser } from '../utils/avatars';

export default function Account() {
  const { user, loading, logout, reloadUser } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'rentals' | 'documents' | 'reviews' | 'profile'>('rentals');
  const [bookings, setBookings] = useState<any[]>([]);
  const [myReviews, setMyReviews] = useState<any[]>([]);
  const [myDocuments, setMyDocuments] = useState<any[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [fetchingBookings, setFetchingBookings] = useState(true);
  const [fetchingDocuments, setFetchingDocuments] = useState(false);

  // Document upload state
  const [uploadDocType, setUploadDocType] = useState('citizenship_front');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string>('');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [selectedDocForPreview, setSelectedDocForPreview] = useState<any | null>(null);
  const [replacingDocId, setReplacingDocId] = useState<number | null>(null);

  // Payment triggers
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentSuccessMessage, setPaymentSuccessMessage] = useState('');

  // Review modal state
  const [reviewModalBooking, setReviewModalBooking] = useState<any | null>(null);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState<string>('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewMessage, setReviewMessage] = useState('');

  // Avatar picker modal
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [updatingAvatar, setUpdatingAvatar] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  const loadBookingsAndReviews = async () => {
    if (!user) return;
    setFetchingBookings(true);
    try {
      const bRes = await api.getBookings();
      if (bRes.success) {
        setBookings(bRes.data);
      }

      const rRes = await api.getMyReviews();
      if (rRes.success) {
        setMyReviews(rRes.data);
      }
    } catch (err) {
      console.error('Failed to load user account records', err);
    } finally {
      setFetchingBookings(false);
    }
  };

  const loadUserDocuments = async () => {
    if (!user) return;
    setFetchingDocuments(true);
    try {
      const res = await api.getMyDocuments();
      if (res.success) {
        setMyDocuments(res.data);
      }
    } catch (err) {
      console.error('Failed to load user documents', err);
    } finally {
      setFetchingDocuments(false);
    }
  };

  useEffect(() => {
    loadBookingsAndReviews();
    loadUserDocuments();
  }, [user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError('');
    setUploadSuccess('');
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      setFileBase64('');
      return;
    }

    // 10MB maximum file size
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setUploadError(`File is too large (${(file.size / (1024 * 1024)).toFixed(2)} MB). Maximum allowed size is 10MB.`);
      setSelectedFile(null);
      setFileBase64('');
      return;
    }

    const validMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'application/pdf'];
    if (!validMimes.includes(file.type.toLowerCase())) {
      setUploadError('Invalid file type. Supported formats are JPG, PNG, WEBP, and PDF documents.');
      setSelectedFile(null);
      setFileBase64('');
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setFileBase64(reader.result as string);
    };
    reader.onerror = () => {
      setUploadError('Failed to read file contents. Please try another file.');
    };
    reader.readAsDataURL(file);
  };

  const handleUploadDocumentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !fileBase64) {
      setUploadError('Please choose a valid document file before submitting.');
      return;
    }

    setUploadLoading(true);
    setUploadError('');
    setUploadSuccess('');

    try {
      const res = await api.uploadDocument({
        document_type: uploadDocType,
        file_data: fileBase64,
        file_name: selectedFile.name,
        mime_type: selectedFile.type,
      });

      if (res.success) {
        setUploadSuccess(res.message || 'Document uploaded successfully! Pending fleet owner verification.');
        setSelectedFile(null);
        setFileBase64('');
        setReplacingDocId(null);
        loadUserDocuments();
        if (reloadUser) reloadUser();
      } else {
        setUploadError(res.message || 'Upload failed.');
      }
    } catch (err: any) {
      setUploadError(err.message || 'Error occurred while submitting document.');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleDeleteDocument = async (docId: number) => {
    if (!confirm('Are you sure you want to remove this document?')) return;
    try {
      const res = await api.deleteDocument(docId);
      if (res.success) {
        loadUserDocuments();
        if (reloadUser) reloadUser();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to remove document.');
    }
  };

  const handleViewBookingDetails = async (id: number) => {
    try {
      const res = await api.getBookingDetails(id);
      if (res.success) {
        setSelectedBooking(res.data);
        setPaymentSuccessMessage('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSimulatedPayment = async (bookingId: number, gateway: string) => {
    setPaymentLoading(true);
    setPaymentSuccessMessage('');
    try {
      const res = await api.verifyPayment({
        booking_id: bookingId,
        gateway,
      });
      if (res.success) {
        setPaymentSuccessMessage(`Payment of Rs. ${parseFloat(selectedBooking?.total_amount || 0).toLocaleString()} successfully processed via ${gateway}! Review unlocks below.`);
        handleViewBookingDetails(bookingId);
        loadBookingsAndReviews();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleCancelBooking = async (id: number) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    try {
      const res = await api.cancelBooking(id);
      if (res.success) {
        alert('Booking cancelled successfully.');
        if (selectedBooking && selectedBooking.id === id) {
          handleViewBookingDetails(id);
        }
        loadBookingsAndReviews();
      }
    } catch (err: any) {
      alert(err.message || 'Cancellation failed.');
    }
  };

  const handleSelectAvatar = async (avatarIndex: number) => {
    setUpdatingAvatar(true);
    try {
      const res = await api.updateProfile({ avatar_index: avatarIndex });
      if (res.success) {
        setShowAvatarPicker(false);
        if (reloadUser) reloadUser();
      }
    } catch (err) {
      console.error('Avatar update failed', err);
    } finally {
      setUpdatingAvatar(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewModalBooking) return;
    setSubmittingReview(true);
    setReviewMessage('');

    try {
      const payload = {
        booking_id: reviewModalBooking.id,
        vehicle_id: reviewModalBooking.vehicle_id,
        rating: reviewRating,
        comment: reviewComment,
      };

      const res = await api.submitReview(payload);
      if (res.success) {
        setReviewMessage('Review published successfully! Thank you for sharing your experience.');
        setTimeout(() => {
          setReviewModalBooking(null);
          setReviewComment('');
          setReviewRating(5);
          setReviewMessage('');
          loadBookingsAndReviews();
        }, 1500);
      } else {
        setReviewMessage(res.message || 'Failed to submit review.');
      }
    } catch (err: any) {
      setReviewMessage(err.message || 'Error occurred while submitting review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading || !user) {
    return <div className="py-24 text-center">Loading secure session...</div>;
  }

  const currentAvatar = getAvatarForUser(user);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-fade-in text-left">
      <SEO
        title="My Account &amp; Rentals Dashboard | NepalDrive"
        description="View your reserved vehicles, driver license verification status, submitted reviews, and Nepal travel profile."
        noindex
      />

      {/* Top Profile Card */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="relative group cursor-pointer" onClick={() => setShowAvatarPicker(true)}>
            <UserAvatar user={user} size="lg" showBadge />
            <div className="absolute inset-0 bg-stone-950/40 rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[10px] font-mono">
              Change
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-serif font-bold text-stone-900">
                {user.full_name}
              </h1>
              <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-stone-100 text-stone-700">
                {user.role}
              </span>
            </div>
            <p className="text-xs text-stone-500 font-mono">
              {user.email} &middot; {user.phone || '+977 98XXXXXXXX'}
            </p>
            <p className="text-[11px] text-terracotta-600 font-mono flex items-center gap-1">
              <span>Persona: <b>{currentAvatar.name}</b> ({currentAvatar.role})</span>
            </p>
          </div>
        </div>

        {/* Verification Status Pill */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="p-3 bg-stone-50 rounded-2xl border border-stone-100 space-y-1">
            <span className="block text-[10px] font-mono text-stone-400 uppercase">
              Identity Verification Status
            </span>
            {user.is_verified ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold font-mono text-green-700 bg-green-100/80 px-2.5 py-1 rounded-xl">
                <ShieldCheck className="w-4 h-4 text-green-600" />
                VERIFIED (Driver License Approved)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold font-mono text-amber-700 bg-amber-100/80 px-2.5 py-1 rounded-xl">
                <Clock className="w-4 h-4 text-amber-600" />
                UNVERIFIED (Pending ID Check)
              </span>
            )}
          </div>

          <button
            onClick={() => { logout(); navigate('/'); }}
            className="px-3.5 py-2 text-xs font-semibold text-stone-600 hover:text-crimson-600 border border-stone-200 hover:bg-stone-50 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Top Identity Verification Summary Bar */}
      {user.is_verified ? (
        <div className="p-5 bg-gradient-to-r from-emerald-50 via-teal-50 to-green-50 border border-emerald-200/90 rounded-3xl space-y-2 shadow-sm">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-600 text-white rounded-2xl shadow-sm">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-emerald-950 text-base sm:text-lg">
                  Identity &amp; Citizenship Authenticated
                </h3>
                <p className="text-xs text-emerald-800 font-mono">
                  Verified by Fleet Owner &middot; Full Himalayan Clearance Active
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('documents')}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-mono font-bold rounded-xl shadow-sm transition-colors cursor-pointer"
            >
              View Verified Documents ({myDocuments.length}) &rarr;
            </button>
          </div>
        </div>
      ) : (
        <div className="p-5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-3xl space-y-2 shadow-sm">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-500 text-white rounded-2xl shadow-sm">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-amber-950 text-base sm:text-lg">
                  ID &amp; Citizenship Verification (Action Required)
                </h3>
                <p className="text-xs text-amber-800">
                  Nepal Transport Authority requires citizenship (front &amp; back) or driving license verification before vehicle handover.
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('documents')}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-mono font-bold rounded-xl shadow-sm transition-colors cursor-pointer"
            >
              Upload Documents ({myDocuments.length} on file) &rarr;
            </button>
          </div>
        </div>
      )}

      {/* Account Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-stone-200 pb-3 flex-wrap gap-3">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab('rentals')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold cursor-pointer transition-colors flex items-center gap-2 ${
              activeTab === 'rentals'
                ? 'bg-stone-900 text-white shadow-sm'
                : 'bg-stone-100 text-stone-600 hover:text-stone-900'
            }`}
          >
            <Car className="w-4 h-4" />
            What I Have Rented ({bookings.length})
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold cursor-pointer transition-colors flex items-center gap-2 ${
              activeTab === 'documents'
                ? 'bg-stone-900 text-white shadow-sm'
                : 'bg-stone-100 text-stone-600 hover:text-stone-900'
            }`}
          >
            <FileText className="w-4 h-4 text-amber-500" />
            Identity Documents ({myDocuments.length})
            {myDocuments.some(d => d.verification_status === 'Rejected') && (
              <span className="w-2 h-2 rounded-full bg-red-500" title="Action required on rejected document" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold cursor-pointer transition-colors flex items-center gap-2 ${
              activeTab === 'reviews'
                ? 'bg-stone-900 text-white shadow-sm'
                : 'bg-stone-100 text-stone-600 hover:text-stone-900'
            }`}
          >
            <Star className="w-4 h-4 text-amber-400" />
            My Reviews ({myReviews.length})
          </button>
        </div>

        <button
          onClick={() => setShowAvatarPicker(true)}
          className="text-xs font-mono font-bold text-crimson-600 hover:underline flex items-center gap-1 cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Choose Persona Avatar ({NEPAL_AVATARS.length})
        </button>
      </div>

      {/* ----------------- TAB 1: WHAT I HAVE RENTED ----------------- */}
      {activeTab === 'rentals' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Bookings List (Left Column 8-Cols) */}
          <div className="lg:col-span-8 space-y-4">
            {fetchingBookings ? (
              <div className="py-16 text-center text-xs font-mono text-stone-400 bg-white rounded-3xl border">
                Loading your vehicle reservations...
              </div>
            ) : bookings.length === 0 ? (
              <div className="py-16 text-center text-stone-500 bg-white rounded-3xl border border-stone-200 space-y-3 p-8">
                <Car className="w-12 h-12 text-stone-300 mx-auto" />
                <h3 className="font-serif font-bold text-lg text-stone-900">No vehicle rentals yet</h3>
                <p className="text-xs text-stone-500 max-w-sm mx-auto">
                  Browse our Himalayan fleet of Toyota Fortuners, Mahindra Scorpios, Kona EVs and Royal Enfield cruisers.
                </p>
                <Link
                  to="/vehicles"
                  className="inline-block mt-2 px-5 py-2.5 bg-crimson-500 hover:bg-crimson-600 text-white text-xs font-semibold rounded-xl shadow-sm"
                >
                  Browse Available Fleet &rarr;
                </Link>
              </div>
            ) : (
              bookings.map((b) => (
                <div
                  key={b.id}
                  className="p-5 rounded-3xl border border-stone-200 bg-white shadow-sm space-y-4 hover:border-stone-300 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {b.image_url && (
                        <img
                          src={b.image_url}
                          alt={b.vehicle_name}
                          className="w-16 h-12 object-cover rounded-xl border border-stone-200 shrink-0"
                        />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-serif font-bold text-stone-900 text-base">
                            {b.vehicle_name}
                          </span>
                          <span className="text-[10px] text-stone-400 font-mono">Ref: ND-{b.id}</span>
                        </div>
                        <p className="text-xs text-stone-500 font-mono mt-0.5">
                          {b.start_date} to {b.end_date} &middot; Pickup: {b.pickup_location}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-mono font-bold uppercase px-2.5 py-1 rounded-lg ${
                        b.status === 'Confirmed' ? 'bg-green-100 text-green-800' :
                        b.status === 'Completed' ? 'bg-stone-200 text-stone-800' :
                        b.status === 'Cancelled' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {b.status}
                      </span>
                      <span className={`text-[10px] font-mono font-bold px-2 py-1 rounded-lg ${
                        b.payment_status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {b.payment_status}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-stone-100 text-xs font-mono">
                    <div>
                      <span className="text-stone-400">Total Invoice: </span>
                      <span className="font-bold text-stone-900 text-sm">
                        Rs. {parseFloat(b.total_amount).toLocaleString()}
                      </span>
                      {b.driving_license && (
                        <span className="text-stone-400 text-[10px] block mt-0.5">
                          License on Booking: {b.driving_license}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => handleViewBookingDetails(b.id)}
                        className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold rounded-lg text-xs cursor-pointer transition-colors"
                      >
                        Inspect Invoice
                      </button>

                      {/* REVIEW SYSTEM AFTER PAYMENT:
                          REQUIREMENT: "andd revie system after payment" */}
                      {(b.payment_status === 'Paid' || b.status === 'Confirmed' || b.status === 'Completed') && (
                        b.has_reviewed ? (
                          <span className="px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg text-xs font-semibold flex items-center gap-1">
                            <Check className="w-3.5 h-3.5 text-green-600" />
                            Reviewed
                          </span>
                        ) : (
                          <button
                            onClick={() => {
                              setReviewModalBooking(b);
                              setReviewRating(5);
                              setReviewComment('');
                              setReviewMessage('');
                            }}
                            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
                          >
                            <Star className="w-3.5 h-3.5 fill-white" />
                            Write Review
                          </button>
                        )
                      )}

                      {b.status === 'Pending' && (
                        <button
                          onClick={() => handleCancelBooking(b.id)}
                          className="px-2.5 py-1.5 text-red-600 hover:bg-red-50 rounded-lg text-xs cursor-pointer transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Booking Detail Inspector Card (Right Column 4-Cols) */}
          <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-stone-200 shadow-sm space-y-5 sticky top-24">
            <h3 className="font-serif font-bold text-lg text-stone-900 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-crimson-600" />
              Reservation &amp; Payment Desk
            </h3>

            {paymentSuccessMessage && (
              <div className="p-3 bg-green-50 border border-green-200 text-green-800 text-xs rounded-xl font-mono">
                {paymentSuccessMessage}
              </div>
            )}

            {selectedBooking ? (
              <div className="space-y-4 text-xs font-mono">
                <div className="p-3 bg-stone-50 rounded-xl space-y-1">
                  <span className="font-bold text-stone-900 block text-sm">{selectedBooking.vehicle_name}</span>
                  <span className="text-stone-500">Dates: {selectedBooking.start_date} to {selectedBooking.end_date}</span>
                  <span className="text-stone-500 block">Pickup: {selectedBooking.pickup_location}</span>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-stone-100">
                  <div className="flex justify-between text-stone-500">
                    <span>Base Vehicle Fee:</span>
                    <span>Rs. {parseFloat(selectedBooking.base_amount).toLocaleString()}</span>
                  </div>
                  {parseFloat(selectedBooking.driver_amount) > 0 && (
                    <div className="flex justify-between text-stone-500">
                      <span>Mountain Chauffeur:</span>
                      <span>Rs. {parseFloat(selectedBooking.driver_amount).toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-stone-500">
                    <span>Refundable Deposit:</span>
                    <span>Rs. {parseFloat(selectedBooking.deposit_amount).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold text-stone-900 pt-1 border-t text-sm">
                    <span>Total Amount:</span>
                    <span className="text-crimson-600">Rs. {parseFloat(selectedBooking.total_amount).toLocaleString()}</span>
                  </div>
                </div>

                {/* Instant Nepal Wallet Payment Simulator */}
                {selectedBooking.payment_status === 'Pending' && selectedBooking.status !== 'Cancelled' && (
                  <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-3 pt-3">
                    <span className="text-[10px] font-bold uppercase text-stone-700 block">
                      Pay &amp; Verify Booking Online
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={paymentLoading}
                        onClick={() => handleSimulatedPayment(selectedBooking.id, 'eSewa')}
                        className="py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl text-center cursor-pointer transition-colors"
                      >
                        {paymentLoading ? 'Processing...' : 'Pay with eSewa'}
                      </button>
                      <button
                        type="button"
                        disabled={paymentLoading}
                        onClick={() => handleSimulatedPayment(selectedBooking.id, 'Khalti')}
                        className="py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl text-center cursor-pointer transition-colors"
                      >
                        {paymentLoading ? 'Processing...' : 'Pay with Khalti'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-stone-400 font-mono">
                Click &ldquo;Inspect Invoice&rdquo; on any rental to view price breakdown and payment actions.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ----------------- TAB: IDENTITY DOCUMENTS & VERIFICATION ----------------- */}
      {activeTab === 'documents' && (
        <div className="space-y-6 animate-fade-in">
          {/* Statutory Policy Notice on Original Citizenship retention */}
          <div className="p-5 bg-stone-50 border border-stone-200 rounded-3xl space-y-2.5">
            <div className="flex items-center gap-2.5 text-stone-900 font-serif font-bold text-base">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <span>Original Document Custody Policy &amp; Renter Rights</span>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed max-w-4xl">
              In accordance with Nepal Transport Authority guidelines, <b>renters must always retain their original citizenship certificates and identity credentials in their personal possession</b>. Authenticated digital uploads are used for legitimate verification. If physical inspection is requested at a hub, simply present the original document for in-person visual verification and retain it immediately. <b>NepalDrive does not keep your original citizenship certificate as collateral.</b>
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Upload New / Corrected Document (5 cols) */}
            <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-stone-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b pb-3 border-stone-100">
                <h3 className="font-serif font-bold text-base text-stone-900 flex items-center gap-2">
                  <UploadCloud className="w-4 h-4 text-crimson-600" />
                  {replacingDocId ? 'Replace / Re-upload Document' : 'Upload Identity Document'}
                </h3>
                {replacingDocId && (
                  <button
                    onClick={() => { setReplacingDocId(null); setSelectedFile(null); setFileBase64(''); }}
                    className="text-[11px] font-mono text-stone-500 hover:text-stone-800 underline cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
              </div>

              {uploadSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{uploadSuccess}</span>
                </div>
              )}

              {uploadError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{uploadError}</span>
                </div>
              )}

              <form onSubmit={handleUploadDocumentSubmit} className="space-y-4 text-xs font-mono">
                <div className="space-y-1">
                  <label className="block text-stone-500 font-bold uppercase text-[10px]">
                    Document Category *
                  </label>
                  <select
                    value={uploadDocType}
                    onChange={(e) => setUploadDocType(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl p-2.5 focus:border-crimson-500"
                  >
                    <option value="citizenship_front">Citizenship Certificate (Front Side) *</option>
                    <option value="citizenship_back">Citizenship Certificate (Back Side) *</option>
                    <option value="driving_license">Government Driving License (Nepal / IDP)</option>
                    <option value="passport">Foreign Passport &amp; Tourist Visa</option>
                    <option value="other">Other Official Government Identity Document</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-stone-500 font-bold uppercase text-[10px]">
                    Select File (JPG, PNG, WEBP, or PDF &middot; Max 10MB) *
                  </label>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                    onChange={handleFileChange}
                    className="w-full text-xs text-stone-500 border border-dashed border-stone-300 rounded-xl p-3 bg-stone-50 hover:bg-stone-100 transition-colors cursor-pointer"
                    required
                  />
                  {selectedFile && (
                    <div className="p-2 bg-stone-100 rounded-lg text-[11px] text-stone-600 flex items-center justify-between">
                      <span className="truncate max-w-[200px]">{selectedFile.name}</span>
                      <span>{(selectedFile.size / 1024).toFixed(1)} KB</span>
                    </div>
                  )}
                </div>

                <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/60 text-[11px] text-amber-900 leading-snug">
                  <span className="font-bold block">Inspection Notice:</span>
                  Please ensure your name, date of birth, document number, and issuing district are clearly legible without glare.
                </div>

                <button
                  type="submit"
                  disabled={uploadLoading || !selectedFile}
                  className="w-full py-3 bg-stone-900 hover:bg-stone-800 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50 transition-colors"
                >
                  <UploadCloud className="w-4 h-4" />
                  {uploadLoading ? 'Uploading & Encrypting...' : replacingDocId ? 'Upload & Replace Document' : 'Submit for Verification'}
                </button>
              </form>
            </div>

            {/* Right Column: Submitted Documents List (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-serif font-bold text-lg text-stone-900">
                  Submitted Documents ({myDocuments.length})
                </h3>
                <button
                  onClick={loadUserDocuments}
                  disabled={fetchingDocuments}
                  className="text-xs font-mono text-stone-500 hover:text-stone-800 flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${fetchingDocuments ? 'animate-spin' : ''}`} />
                  Refresh Status
                </button>
              </div>

              {fetchingDocuments ? (
                <div className="py-12 bg-white rounded-3xl border border-stone-200 text-center text-xs font-mono text-stone-400">
                  Loading verification records...
                </div>
              ) : myDocuments.length === 0 ? (
                <div className="py-12 bg-white rounded-3xl border border-stone-200 text-center text-stone-500 p-8 space-y-3">
                  <FileText className="w-12 h-12 text-stone-300 mx-auto" />
                  <h4 className="font-serif font-bold text-stone-900">No documents uploaded yet</h4>
                  <p className="text-xs text-stone-500 max-w-sm mx-auto">
                    Upload your Citizenship Certificate (front &amp; back) or Driving License to begin verification.
                  </p>
                </div>
              ) : (
                myDocuments.map((doc) => {
                  const isApproved = doc.verification_status === 'Approved';
                  const isRejected = doc.verification_status === 'Rejected';
                  const isPending = doc.verification_status === 'Pending';

                  return (
                    <div
                      key={doc.id}
                      className={`p-5 bg-white rounded-3xl border shadow-sm space-y-3 transition-all ${
                        isApproved
                          ? 'border-emerald-200 hover:border-emerald-300'
                          : isRejected
                          ? 'border-red-200 bg-red-50/20'
                          : 'border-amber-200 hover:border-amber-300'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-2xl ${
                            isApproved ? 'bg-emerald-100 text-emerald-800' : isRejected ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            <FileText className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="font-serif font-bold text-stone-900 text-base block">
                              {doc.document_type === 'citizenship_front' && 'Citizenship Certificate (Front)'}
                              {doc.document_type === 'citizenship_back' && 'Citizenship Certificate (Back)'}
                              {doc.document_type === 'driving_license' && 'Government Driving License'}
                              {doc.document_type === 'passport' && 'Passport & Visa'}
                              {doc.document_type === 'other' && 'Identity Document'}
                            </span>
                            <span className="text-xs font-mono text-stone-500">
                              {doc.original_filename} &middot; {doc.file_size ? `${(doc.file_size / 1024).toFixed(1)} KB` : ''}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-mono font-bold uppercase px-2.5 py-1 rounded-lg ${
                            isApproved
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : isRejected
                              ? 'bg-red-100 text-red-800 border border-red-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}>
                            {isApproved && '✓ Approved'}
                            {isRejected && '✕ Rejected'}
                            {isPending && '⏳ Pending Review'}
                          </span>
                        </div>
                      </div>

                      {/* Rejection Alert Box */}
                      {isRejected && doc.rejection_reason && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900 space-y-1">
                          <span className="font-bold flex items-center gap-1.5 text-red-800">
                            <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                            Owner Feedback / Reason for Rejection:
                          </span>
                          <p className="text-red-800/90 leading-relaxed font-sans">{doc.rejection_reason}</p>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-stone-100 text-xs font-mono">
                        <span className="text-stone-400 text-[11px]">
                          Uploaded: {new Date(doc.uploaded_at).toLocaleDateString()}
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedDocForPreview(doc)}
                            className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Inspect Preview
                          </button>

                          {doc.download_url && (
                            <a
                              href={doc.download_url}
                              download={doc.original_filename}
                              className="px-3 py-1.5 border border-stone-200 hover:bg-stone-50 text-stone-700 rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
                            >
                              <Download className="w-3.5 h-3.5" />
                              Download
                            </a>
                          )}

                          {(isPending || isRejected) && (
                            <button
                              onClick={() => {
                                setUploadDocType(doc.document_type);
                                setReplacingDocId(doc.id);
                                window.scrollTo({ top: 300, behavior: 'smooth' });
                              }}
                              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              Replace
                            </button>
                          )}

                          {isPending && (
                            <button
                              onClick={() => handleDeleteDocument(doc.id)}
                              className="p-1.5 text-stone-400 hover:text-red-600 rounded-xl cursor-pointer transition-colors"
                              title="Delete Pending Document"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ----------------- TAB 2: MY REVIEWS ----------------- */}
      {activeTab === 'reviews' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 shadow-sm space-y-6 animate-fade-in">
          <div className="flex items-center justify-between border-b pb-4 border-stone-150">
            <div>
              <h2 className="text-xl font-serif font-bold text-stone-900 flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-500 fill-amber-400" />
                My Reviews &amp; Vehicle Ratings ({myReviews.length})
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Reviews submitted for vehicles you have rented and verified across Nepal.
              </p>
            </div>
          </div>

          {/* Trips ready to review after payment */}
          {(() => {
            const pendingReviews = bookings.filter(
              (b) => (b.payment_status === 'Paid' || b.status === 'Confirmed' || b.status === 'Completed') && !b.has_reviewed
            );
            if (pendingReviews.length === 0) return null;
            return (
              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-amber-900 font-serif font-bold text-sm">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>You have {pendingReviews.length} rental{pendingReviews.length > 1 ? 's' : ''} ready to rate &amp; review</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {pendingReviews.map((b) => (
                    <div key={b.id} className="p-3 bg-white rounded-xl border border-amber-200/80 flex items-center justify-between gap-3 text-xs font-mono">
                      <div>
                        <span className="font-bold text-stone-900 block font-serif text-sm">{b.vehicle_name}</span>
                        <span className="text-[10px] text-stone-500">{b.start_date} to {b.end_date} &middot; Rs. {parseFloat(b.total_amount).toLocaleString()}</span>
                      </div>
                      <button
                        onClick={() => {
                          setReviewModalBooking(b);
                          setReviewRating(5);
                          setReviewComment('');
                          setReviewMessage('');
                        }}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                      >
                        <Star className="w-3 h-3 fill-white" />
                        Write Review
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {myReviews.length === 0 ? (
            <div className="py-16 text-center text-stone-400 font-mono text-xs space-y-2">
              <MessageSquare className="w-10 h-10 text-stone-300 mx-auto" />
              <p>You haven&apos;t written any vehicle reviews yet.</p>
              <p className="text-stone-500">
                Complete a rental reservation and pay to unlock the review system!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {myReviews.map((rev) => (
                <div
                  key={rev.id}
                  className="p-5 rounded-2xl border border-stone-200 bg-stone-50/70 text-xs space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {rev.vehicle_image && (
                        <img
                          src={rev.vehicle_image}
                          alt={rev.vehicle_name}
                          className="w-12 h-10 object-cover rounded-lg border border-stone-200"
                        />
                      )}
                      <div>
                        <span className="font-serif font-bold text-stone-900 text-sm block">
                          {rev.vehicle_name}
                        </span>
                        <span className="text-[10px] text-stone-400 font-mono">
                          Reviewed on {new Date(rev.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-xl">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                      <span className="font-mono font-bold text-amber-900">{rev.rating}.0 / 5.0</span>
                    </div>
                  </div>

                  <p className="text-stone-700 leading-relaxed pl-1 font-light text-xs bg-white p-3 rounded-xl border border-stone-150">
                    &ldquo;{rev.comment}&rdquo;
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Review Submission Modal (Unlocked after payment) */}
      {reviewModalBooking && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 max-w-md w-full space-y-5 text-left animate-fade-in shadow-xl">
            <div className="flex items-center justify-between border-b pb-3 border-stone-150">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-500 fill-amber-400" />
                <h3 className="font-serif font-bold text-lg text-stone-900">
                  Rate &amp; Review Your Ride
                </h3>
              </div>
              <button
                onClick={() => setReviewModalBooking(null)}
                className="text-stone-400 hover:text-stone-700 text-sm font-mono cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="p-3 bg-stone-50 rounded-xl space-y-0.5 text-xs font-mono">
              <span className="text-stone-400 block text-[10px] uppercase">Rented Vehicle</span>
              <span className="font-bold text-stone-900 text-sm">{reviewModalBooking.vehicle_name}</span>
              <span className="text-stone-500 block">Trip Dates: {reviewModalBooking.start_date} to {reviewModalBooking.end_date}</span>
            </div>

            {reviewMessage && (
              <div className="p-3 bg-green-50 border border-green-200 text-green-800 text-xs rounded-xl font-mono">
                {reviewMessage}
              </div>
            )}

            <form onSubmit={handleSubmitReview} className="space-y-4">
              {/* Star Rating Selector */}
              <div className="space-y-1.5">
                <label className="block text-xs font-mono font-bold uppercase text-stone-600">
                  Select Rating (1 to 5 Stars)
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className="p-1 cursor-pointer transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-7 h-7 ${
                          star <= reviewRating
                            ? 'fill-amber-400 text-amber-500'
                            : 'text-stone-300'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="ml-2 font-mono font-bold text-xs text-stone-700">
                    {reviewRating === 5 ? '5.0 (Exceptional)' : reviewRating === 4 ? '4.0 (Great)' : reviewRating === 3 ? '3.0 (Good)' : `${reviewRating}.0`}
                  </span>
                </div>
              </div>

              {/* Review Text Area */}
              <div className="space-y-1">
                <label className="block text-xs font-mono font-bold uppercase text-stone-600">
                  Your Feedback &amp; Road Trip Notes
                </label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="How did the vehicle perform on Nepal's highways? Was the suspension comfortable? Any tips for future travelers?"
                  rows={4}
                  className="w-full text-xs bg-stone-50 border border-stone-200 rounded-xl p-3 focus:border-crimson-500 font-light"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReviewModalBooking(null)}
                  className="w-1/2 py-2.5 border border-stone-200 text-stone-600 font-semibold text-xs rounded-xl hover:bg-stone-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="w-1/2 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs rounded-xl cursor-pointer shadow-sm transition-colors"
                >
                  {submittingReview ? 'Publishing...' : 'Publish Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Avatar Picker Modal (At least 20 distinctive avatars) */}
      {showAvatarPicker && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 max-w-2xl w-full space-y-5 text-left animate-fade-in shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3 border-stone-150">
              <div className="space-y-0.5">
                <h3 className="font-serif font-bold text-xl text-stone-900 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-terracotta-500" />
                  Choose Your Nepal Persona Avatar
                </h3>
                <p className="text-xs text-stone-500">
                  Select from {NEPAL_AVATARS.length} curated Himalayan personas. Your avatar will appear on reviews and profile.
                </p>
              </div>
              <button
                onClick={() => setShowAvatarPicker(false)}
                className="text-stone-400 hover:text-stone-700 text-sm font-mono cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {NEPAL_AVATARS.map((av) => {
                const isSelected = user.avatar_index === av.id;
                return (
                  <button
                    key={av.id}
                    onClick={() => handleSelectAvatar(av.id)}
                    disabled={updatingAvatar}
                    className={`p-3 rounded-2xl border text-left cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
                      isSelected
                        ? 'bg-crimson-50 border-crimson-500 ring-2 ring-crimson-200'
                        : 'bg-stone-50 border-stone-200 hover:bg-stone-100 hover:border-stone-300'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-sm ${av.bg} ${av.border} border`}>
                      <span>{av.emoji}</span>
                    </div>
                    <div className="text-center">
                      <span className="font-bold text-stone-900 text-[11px] block truncate max-w-[120px]">
                        {av.name}
                      </span>
                      <span className="text-[9px] font-mono text-stone-500 block truncate max-w-[120px]">
                        {av.role}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Secure Document Preview Modal */}
      <DocumentPreviewModal
        isOpen={!!selectedDocForPreview}
        onClose={() => setSelectedDocForPreview(null)}
        document={selectedDocForPreview}
      />
    </div>
  );
}
