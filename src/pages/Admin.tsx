import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { api } from '../services/api';
import SEO from '../components/SEO';
import {
  Shield, Users, Calendar, Banknote, ListCollapse, PlusCircle, Trash,
  ShieldCheck, CheckCircle2, AlertCircle, UserCheck, UserX, Clock,
  FileCheck, FileText, Check, X, Car, Filter, RefreshCw, Sparkles, MapPin, Compass,
  Inbox, MessageSquare, Mail, Reply, Send, Phone, Eye, Download, AlertTriangle, HardDrive
} from 'lucide-react';
import { auditCurrentPage, SEOAuditResult } from '../utils/seoAudit';
import UserAvatar from '../components/UserAvatar';
import InteractiveMap from '../components/InteractiveMap';
import DocumentPreviewModal from '../components/DocumentPreviewModal';

// Preset Templates for Admin to add all category vehicles with 1 click
const QUICK_VEHICLE_TEMPLATES = [
  {
    categoryLabel: '4x4 SUV',
    name: 'Toyota Fortuner 4x4 SUV',
    brand: 'Toyota',
    model: 'Fortuner V6 4WD',
    year: 2024,
    type: 'SUV',
    price_per_day: 18500,
    security_deposit: 45000,
    seats: 7,
    transmission: 'Automatic',
    fuel_type: 'Diesel',
    is_electric: false,
    self_drive: true,
    with_driver: true,
    image_url: '/assets/images/fortuner_suv_1791105671393.jpg',
    pickup_locations: 'Kathmandu, Pokhara, Chitwan',
    description: 'Rugged 7-seater full-size SUV with high ground clearance and 4WD crawl control, engineered for mountain passes.',
  },
  {
    categoryLabel: 'Mountain Jeep',
    name: 'Mahindra Scorpio-N 4WD',
    brand: 'Mahindra',
    model: 'Scorpio-N Z8 4x4',
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
    image_url: '/assets/images/scorpio_jeep_1791105688961.jpg',
    pickup_locations: 'Kathmandu, Pokhara, Chitwan',
    description: 'Heavy-duty 4x4 mountain Jeep with high torque for rocky terrain, off-road riverbeds, and steep hill ascents.',
  },
  {
    categoryLabel: 'Electric EV',
    name: 'Hyundai Kona Electric EV',
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
    image_url: '/assets/images/kona_ev_1791105704104.jpg',
    pickup_locations: 'Kathmandu, Lalitpur, Bhaktapur',
    description: 'Eco-friendly, quiet electric SUV with 300km range per charge. Smooth silent cruising inside Kathmandu Valley.',
  },
  {
    categoryLabel: '14-Seater Tour Van',
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
    image_url: '/assets/images/fortuner_suv_1791105671393.jpg',
    pickup_locations: 'Kathmandu, Pokhara, Chitwan',
    description: 'Spacious tourist passenger coach with dual AC, reclining captain seats, and certified mountain chauffeur.',
  },
  {
    categoryLabel: '4x4 Pickup Truck',
    name: 'Isuzu D-Max V-Cross 4x4',
    brand: 'Isuzu',
    model: 'D-Max 4WD Dual Cab',
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
    image_url: '/assets/images/scorpio_jeep_1791105688961.jpg',
    pickup_locations: 'Kathmandu, Pokhara',
    description: 'Tough dual-cab pickup truck built for Himalayan cargo, filming equipment, trekking support, and rough trails.',
  },
  {
    categoryLabel: 'Touring Motorcycle',
    name: 'Royal Enfield Himalayan 450',
    brand: 'Royal Enfield',
    model: 'Himalayan 452cc Sherpa',
    year: 2024,
    type: 'Bike',
    price_per_day: 5500,
    security_deposit: 15000,
    seats: 2,
    transmission: 'Manual',
    fuel_type: 'Petrol',
    is_electric: false,
    self_drive: true,
    with_driver: false,
    image_url: '/assets/images/himalayan_bike_1791109029852.jpg',
    pickup_locations: 'Kathmandu, Pokhara',
    description: 'Liquid-cooled 452cc Sherpa engine with 200mm long-travel suspension, Tripper navigation dash, and tubeless spoked wheels.',
  },
  {
    categoryLabel: 'City Scooter',
    name: 'Vespa VXL 150 Classic',
    brand: 'Vespa',
    model: 'VXL 150 Elegante',
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
    image_url: '/assets/images/classic_bike_1791105717263.jpg',
    pickup_locations: 'Kathmandu, Lalitpur, Bhaktapur',
    description: 'Italian styling scooter for navigating city streets, historical alleys, and heritage routes effortlessly.',
  },
  {
    categoryLabel: 'VIP Luxury Sedan',
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
    image_url: '/assets/images/fortuner_suv_1791105671393.jpg',
    pickup_locations: 'Kathmandu, Lalitpur',
    description: 'VIP executive sedan with certified chauffeur for diplomatic events and luxury five-star hotel transfers.',
  },
  {
    categoryLabel: 'City Car / Hatchback',
    name: 'Suzuki Vitara Brezza',
    brand: 'Suzuki',
    model: 'Brezza ZXI',
    year: 2023,
    type: 'Car',
    price_per_day: 8000,
    security_deposit: 15000,
    seats: 5,
    transmission: 'Manual',
    fuel_type: 'Petrol',
    is_electric: false,
    self_drive: true,
    with_driver: true,
    image_url: '/assets/images/fortuner_suv_1791105671393.jpg',
    pickup_locations: 'Kathmandu, Pokhara, Chitwan',
    description: 'Compact 5-seater car with high ground clearance for reliable everyday city commutes and highway cruising.',
  }
];

// Available asset images for admin quick selection
const AVAILABLE_VEHICLE_IMAGES = [
  { label: 'Toyota Fortuner SUV', url: '/assets/images/fortuner_suv_1791105671393.jpg' },
  { label: 'Mahindra Scorpio Jeep', url: '/assets/images/scorpio_jeep_1791105688961.jpg' },
  { label: 'Hyundai Kona Electric EV', url: '/assets/images/kona_ev_1791105704104.jpg' },
  { label: 'Royal Enfield Himalayan Bike', url: '/assets/images/himalayan_bike_1791109029852.jpg' },
  { label: 'Classic Bike / Vespa Scooter', url: '/assets/images/classic_bike_1791105717263.jpg' },
];

export default function Admin() {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  // Stats / Overview
  const [stats, setStats] = useState<any>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [bookingsList, setBookingsList] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [vehiclesList, setVehiclesList] = useState<any[]>([]);
  const [enquiriesList, setEnquiriesList] = useState<any[]>([]);
  const [locationsList, setLocationsList] = useState<any[]>([]);

  // Filter states
  const [userFilter, setUserFilter] = useState<'all' | 'pending' | 'verified'>('all');
  const [bookingFilter, setBookingFilter] = useState<'all' | 'pending' | 'confirmed' | 'paid'>('all');
  const [enquiryFilter, setEnquiryFilter] = useState<'ALL' | 'NEW' | 'READ' | 'REPLIED' | 'ARCHIVED'>('ALL');
  const [enquirySearchQuery, setEnquirySearchQuery] = useState('');
  const [selectedEnquiryToView, setSelectedEnquiryToView] = useState<any | null>(null);
  const [selectedBookingForModal, setSelectedBookingForModal] = useState<any | null>(null);

  // Enquiry Reply Modal State
  const [selectedEnquiryForReply, setSelectedEnquiryForReply] = useState<any | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [replySubjectOverride, setReplySubjectOverride] = useState('');
  const [replySending, setReplySending] = useState(false);

  // New Location Form State
  const [newLocName, setNewLocName] = useState('');
  const [newLocCity, setNewLocCity] = useState('Kathmandu');
  const [newLocAddress, setNewLocAddress] = useState('');
  const [newLocLat, setNewLocLat] = useState('27.7172');
  const [newLocLng, setNewLocLng] = useState('85.3240');
  const [newLocPhone, setNewLocPhone] = useState('+977-1-4428900');
  const [newLocHours, setNewLocHours] = useState('6:00 AM - 10:00 PM');
  const [newLocDesc, setNewLocDesc] = useState('');
  const [submittingLoc, setSubmittingLoc] = useState(false);

  // Add Vehicle Form state
  const [newName, setNewName] = useState('');
  const [newBrand, setNewBrand] = useState('Toyota');
  const [newModel, setNewModel] = useState('');
  const [newYear, setNewYear] = useState(2024);
  const [newType, setNewType] = useState('SUV');
  const [newPrice, setNewPrice] = useState(18500);
  const [newDeposit, setNewDeposit] = useState(45000);
  const [newSeats, setNewSeats] = useState(7);
  const [newTransmission, setNewTransmission] = useState('Automatic');
  const [newFuel, setNewFuel] = useState('Diesel');
  const [newElectric, setNewElectric] = useState(false);
  const [newSelfDrive, setNewSelfDrive] = useState(true);
  const [newWithDriver, setNewWithDriver] = useState(true);
  const [newFeatured, setNewFeatured] = useState(false);
  const [newPopular, setNewPopular] = useState(false);
  const [newImg, setNewImg] = useState('/assets/images/fortuner_suv_1791105671393.jpg');
  const [newLocations, setNewLocations] = useState('Kathmandu, Pokhara');
  const [newDesc, setNewDesc] = useState('');

  // Dashboard Tab state
  const [activeTab, setActiveTab] = useState<'overview' | 'bookings' | 'documents' | 'users' | 'fleet' | 'hubs' | 'enquiries' | 'audit' | 'seo'>('overview');
  const [seoAudit, setSeoAudit] = useState<SEOAuditResult | null>(null);

  // Document verification & inspection states
  const [adminDocumentsList, setAdminDocumentsList] = useState<any[]>([]);
  const [docStatusFilter, setDocStatusFilter] = useState<'ALL' | 'Pending' | 'Approved' | 'Rejected'>('ALL');
  const [selectedDocForModal, setSelectedDocForModal] = useState<any | null>(null);
  const [rejectingDocId, setRejectingDocId] = useState<number | null>(null);
  const [rejectionReasonText, setRejectionReasonText] = useState('');
  const [verifyingDocLoadingId, setVerifyingDocLoadingId] = useState<number | null>(null);

  // Document Custody Handover modal & records
  const [showCustodyModal, setShowCustodyModal] = useState(false);
  const [custodyBookingId, setCustodyBookingId] = useState<number | null>(null);
  const [custodyDocType, setCustodyDocType] = useState('citizenship_original');
  const [custodyNotes, setCustodyNotes] = useState('');
  const [custodyStaffAck, setCustodyStaffAck] = useState(true);
  const [custodyRenterAck, setCustodyRenterAck] = useState(true);
  const [submittingCustody, setSubmittingCustody] = useState(false);

  useEffect(() => {
    if (activeTab === 'seo') {
      const res = auditCurrentPage();
      setSeoAudit(res);
    }
  }, [activeTab]);

  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate('/login?role=owner');
    }
  }, [isAdmin, loading, navigate]);

  const loadAllAdminData = async () => {
    if (!isAdmin) return;
    try {
      const statsRes = await api.getAdminStats();
      if (statsRes.success) setStats(statsRes.data);

      const usersRes = await api.getAdminUsers();
      if (usersRes.success) setUsersList(usersRes.data);

      const bookingsRes = await api.getAdminBookings(); // returns all bookings for fleet owner
      if (bookingsRes.success) setBookingsList(bookingsRes.data);

      const docsRes = await api.getAdminDocuments();
      if (docsRes.success) setAdminDocumentsList(docsRes.data);

      const auditRes = await api.getAdminAuditLogs();
      if (auditRes.success) setAuditLogs(auditRes.data);

      const fleetRes = await api.getVehicles({ include_rented: 'true' });
      if (fleetRes.success) setVehiclesList(fleetRes.data);

      const enquiriesRes = await api.getAdminEnquiries();
      if (enquiriesRes.success) setEnquiriesList(enquiriesRes.data);

      const locationsRes = await api.getLocations();
      if (locationsRes.success) setLocationsList(locationsRes.data);
    } catch (err) {
      console.error('Failed to load administrative console data.', err);
    }
  };

  const handleVerifyDocument = async (docId: number, action: 'Approved' | 'Rejected', reason?: string) => {
    setVerifyingDocLoadingId(docId);
    try {
      const res = await api.verifyDocument(docId, action, reason);
      if (res.success) {
        setMessage(res.message);
        setRejectingDocId(null);
        setRejectionReasonText('');
        loadAllAdminData();
      } else {
        setMessage('❌ ' + (res.message || 'Verification update failed.'));
      }
    } catch (err: any) {
      setMessage('❌ ' + (err.message || 'Error occurred while verifying document.'));
    } finally {
      setVerifyingDocLoadingId(null);
    }
  };

  const handleSaveCustodyRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!custodyBookingId) return;
    setSubmittingCustody(true);
    try {
      const res = await api.createCustodyRecord(custodyBookingId, {
        document_type: custodyDocType,
        handover_required: true,
        handover_at: new Date(),
        staff_acknowledgment: custodyStaffAck,
        renter_acknowledgment: custodyRenterAck,
        notes: custodyNotes,
      });
      if (res.success) {
        setMessage('Physical custody record documented and logged in database.');
        setShowCustodyModal(false);
        setCustodyNotes('');
        loadAllAdminData();
      }
    } catch (err: any) {
      setMessage('❌ ' + (err.message || 'Failed to record custody handover.'));
    } finally {
      setSubmittingCustody(false);
    }
  };

  useEffect(() => {
    loadAllAdminData();
  }, [isAdmin]);

  // OWNER ACTION: MANAGE LOCATIONS / MAP HUBS
  const handleCreateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingLoc(true);
    try {
      const payload = {
        name: newLocName,
        city: newLocCity,
        address: newLocAddress,
        latitude: parseFloat(newLocLat),
        longitude: parseFloat(newLocLng),
        phone: newLocPhone,
        operating_hours: newLocHours,
        description: newLocDesc,
      };

      const res = await api.createLocation(payload);
      if (res.success) {
        setMessage(`Fleet hub station '${newLocName}' created successfully!`);
        setNewLocName('');
        setNewLocAddress('');
        setNewLocDesc('');
        loadAllAdminData();
      }
    } catch (err: any) {
      setMessage('❌ ' + (err.message || 'Failed to create hub location'));
    } finally {
      setSubmittingLoc(false);
    }
  };

  const handleDeleteLocation = async (id: number) => {
    if (!confirm('Are you sure you want to remove this station hub from the map?')) return;
    try {
      const res = await api.deleteLocation(id);
      if (res.success) {
        setMessage('Location hub removed successfully.');
        loadAllAdminData();
      }
    } catch (err: any) {
      setMessage('❌ ' + (err.message || 'Failed to delete hub.'));
    }
  };

  // OWNER ACTION: MANAGE CUSTOMER CONTACT ENQUIRIES
  const handleUpdateEnquiryStatus = async (enquiryId: number, status: string, admin_notes?: string) => {
    setActionLoadingId(enquiryId);
    try {
      const res = await api.updateAdminEnquiry(enquiryId, { status, admin_notes });
      if (res.success) {
        setMessage(res.message);
        loadAllAdminData();
      }
    } catch (err: any) {
      setMessage('❌ ' + (err.message || 'Failed to update enquiry status.'));
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleOpenReplyModal = (enquiry: any) => {
    setSelectedEnquiryForReply(enquiry);
    setReplySubjectOverride(`Re: [NepalDrive] ${enquiry.subject}`);
    setReplyMessage('');
  };

  const handleSendEnquiryReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEnquiryForReply || !replyMessage.trim()) return;

    setReplySending(true);
    try {
      const res = await api.replyAdminEnquiry(selectedEnquiryForReply.id, {
        reply_message: replyMessage.trim(),
        subject_override: replySubjectOverride.trim() || undefined,
      });

      if (res.success) {
        setMessage(res.message);
        setSelectedEnquiryForReply(null);
        setReplyMessage('');
        loadAllAdminData();
      }
    } catch (err: any) {
      setMessage('❌ ' + (err.message || 'Failed to send reply email to customer.'));
    } finally {
      setReplySending(false);
    }
  };

  const handleDeleteEnquiry = async (enquiryId: number) => {
    if (!confirm(`Are you sure you want to permanently delete enquiry #${enquiryId}?`)) return;
    try {
      const res = await api.deleteAdminEnquiry(enquiryId);
      if (res.success) {
        setMessage(res.message);
        loadAllAdminData();
      }
    } catch (err: any) {
      setMessage('❌ ' + (err.message || 'Failed to delete enquiry.'));
    }
  };

  // OWNER ACTION: VERIFY USER IDENTITY & DRIVER LICENSE
  const handleVerifyUser = async (userId: number, verifyStatus: boolean) => {
    setActionLoadingId(userId);
    try {
      const res = await api.verifyUser(userId, verifyStatus, 'Owner verified driver license & passport');
      if (res.success) {
        setMessage(res.message);
        loadAllAdminData();
      }
    } catch (err: any) {
      setMessage('❌ ' + (err.message || 'Failed to update user verification.'));
    } finally {
      setActionLoadingId(null);
    }
  };

  // OWNER ACTION: VERIFY & MANAGE BOOKINGS
  const handleVerifyBooking = async (bookingId: number, action: 'approve' | 'reject' | 'mark_paid' | 'complete') => {
    setActionLoadingId(bookingId);
    try {
      const res = await api.verifyBooking(bookingId, action, `Action ${action} executed by Fleet Owner`);
      if (res.success) {
        setMessage(res.message);
        if (selectedBookingForModal?.id === bookingId) {
          setSelectedBookingForModal(null);
        }
        loadAllAdminData();
      }
    } catch (err: any) {
      setMessage('❌ ' + (err.message || 'Failed to verify booking.'));
    } finally {
      setActionLoadingId(null);
    }
  };

  // OWNER ACTION: UPDATE VEHICLE AVAILABILITY STATUS
  const handleUpdateVehicleStatus = async (vehicleId: number, status: string) => {
    try {
      const res = await api.updateVehicleStatus(vehicleId, status);
      if (res.success) {
        setMessage(`Vehicle availability status updated to '${status}'.`);
        loadAllAdminData();
      }
    } catch (err: any) {
      setMessage('❌ ' + (err.message || 'Failed to update vehicle availability'));
    }
  };

  const handleUpdateUserRole = async (userId: number, newRole: string) => {
    try {
      const res = await api.updateUserRole(userId, newRole);
      if (res.success) {
        setMessage(`User role upgraded successfully.`);
        loadAllAdminData();
      }
    } catch (err: any) {
      setMessage('❌ ' + (err.message || 'Failed to update user role'));
    }
  };

  const handleDeleteVehicle = async (vehicleId: number) => {
    if (!confirm('Are you sure you want to retire/delete this vehicle from the active fleet?')) return;
    try {
      const res = await api.deleteVehicle(vehicleId);
      if (res.success) {
        setMessage('Vehicle retired successfully from the active Nepal fleet.');
        loadAllAdminData();
      }
    } catch (err: any) {
      setMessage('❌ ' + (err.message || 'Retire operation failed.'));
    }
  };

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setSubmitting(true);
    try {
      const locArray = newLocations.split(',').map(s => s.trim()).filter(Boolean);
      const payload = {
        name: newName,
        brand: newBrand,
        model: newModel,
        year: Number(newYear),
        type: newType,
        price_per_day: Number(newPrice),
        security_deposit: Number(newDeposit),
        seats: Number(newSeats),
        transmission: newTransmission,
        fuel_type: newFuel,
        is_electric: newElectric,
        self_drive: newSelfDrive,
        with_driver: newWithDriver,
        is_featured: newFeatured,
        is_popular: newPopular,
        image_url: newImg || '/assets/images/fortuner_suv_1791105671393.jpg',
        pickup_locations: locArray,
        description: newDesc,
      };

      await api.createVehicle(payload);
      setMessage(`Vehicle '${newName}' created and added to the Nepal fleet database.`);
      
      // Clear inputs
      setNewName('');
      setNewModel('');
      setNewImg('');
      setNewDesc('');

      loadAllAdminData();
    } catch (err: any) {
      setMessage('❌ ' + (err.message || 'Failed to register vehicle.'));
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered lists
  const filteredUsers = usersList.filter(u => {
    if (userFilter === 'pending') return !u.is_verified && u.role === 'CUSTOMER';
    if (userFilter === 'verified') return u.is_verified;
    return true;
  });

  const filteredBookings = bookingsList.filter(b => {
    if (bookingFilter === 'pending') return b.status === 'Pending';
    if (bookingFilter === 'confirmed') return b.status === 'Confirmed';
    if (bookingFilter === 'paid') return b.payment_status === 'Paid';
    return true;
  });

  const pendingBookingsCount = bookingsList.filter(b => b.status === 'Pending').length;
  const unverifiedUsersCount = usersList.filter(u => !u.is_verified && u.role === 'CUSTOMER').length;

  const filteredEnquiries = enquiriesList.filter(e => {
    if (enquiryFilter !== 'ALL' && e.status !== enquiryFilter) return false;
    if (enquirySearchQuery.trim()) {
      const q = enquirySearchQuery.toLowerCase().trim();
      const matchName = e.name?.toLowerCase().includes(q);
      const matchEmail = e.email?.toLowerCase().includes(q);
      const matchPhone = e.phone?.toLowerCase().includes(q);
      const matchSubject = e.subject?.toLowerCase().includes(q);
      const matchMessage = e.message?.toLowerCase().includes(q);
      return matchName || matchEmail || matchPhone || matchSubject || matchMessage;
    }
    return true;
  });
  const newEnquiriesCount = enquiriesList.filter(e => e.status === 'NEW').length;
  const pendingDocsCount = adminDocumentsList.filter(d => d.verification_status === 'Pending').length;

  if (loading || !isAdmin) {
    return <div className="py-24 text-center">Loading administrative workspace...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 text-left space-y-8 animate-fade-in">
      <SEO
        title="Fleet Owner & Administrative Portal | NepalDrive"
        description="Owner management console. Verify customer licenses, confirm vehicle bookings, inspect payments, manage Himalayan fleet and audit database events."
        noindex
      />

      {/* Top Header & Owner Badge */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-amber-600 font-bold uppercase tracking-wider bg-amber-50 px-2.5 py-0.5 rounded border border-amber-200 flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-amber-500" />
              Verified Fleet Owner Access
            </span>
            <span className="text-xs text-stone-400 font-mono hidden sm:inline">&middot; Server-Side Authorization Enforced</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 mt-1">
            Owner &amp; Fleet Operations Center
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Verify customer identity credentials, authorize bookings, manage active Himalayan fleet, and monitor real-time audit logs.
          </p>
        </div>

        {/* Dashboard Nav Tabs */}
        <div className="flex flex-wrap gap-1.5 p-1 bg-stone-100 rounded-xl self-start md:self-auto">
          <button
            onClick={() => { setActiveTab('overview'); setMessage(''); }}
            className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg cursor-pointer transition-colors ${activeTab === 'overview' ? 'bg-white text-stone-950 shadow-sm' : 'text-stone-500 hover:text-stone-900'}`}
          >
            Overview
          </button>
          <button
            onClick={() => { setActiveTab('bookings'); setMessage(''); }}
            className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg cursor-pointer transition-colors relative ${activeTab === 'bookings' ? 'bg-white text-stone-950 shadow-sm' : 'text-stone-500 hover:text-stone-900'}`}
          >
            Verify Bookings
            {pendingBookingsCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 bg-crimson-500 text-white rounded-full text-[10px] font-mono">
                {pendingBookingsCount}
              </span>
            )}
          </button>
          <button
            onClick={() => { setActiveTab('documents'); setMessage(''); }}
            className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg cursor-pointer transition-colors relative ${activeTab === 'documents' ? 'bg-white text-stone-950 shadow-sm' : 'text-stone-500 hover:text-stone-900'}`}
          >
            <span className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-amber-500" />
              Verify Documents
              {pendingDocsCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[10px] font-mono">
                  {pendingDocsCount}
                </span>
              )}
            </span>
          </button>
          <button
            onClick={() => { setActiveTab('users'); setMessage(''); }}
            className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg cursor-pointer transition-colors relative ${activeTab === 'users' ? 'bg-white text-stone-950 shadow-sm' : 'text-stone-500 hover:text-stone-900'}`}
          >
            Verify Users
            {unverifiedUsersCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[10px] font-mono">
                {unverifiedUsersCount}
              </span>
            )}
          </button>
          <button
            onClick={() => { setActiveTab('enquiries'); setMessage(''); }}
            className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg cursor-pointer transition-colors relative ${activeTab === 'enquiries' ? 'bg-white text-stone-950 shadow-sm' : 'text-stone-500 hover:text-stone-900'}`}
          >
            <span className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-crimson-500" />
              Enquiries &amp; Messages
              {newEnquiriesCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-crimson-600 text-white rounded-full text-[10px] font-mono font-bold">
                  {newEnquiriesCount}
                </span>
              )}
            </span>
          </button>
          <button
            onClick={() => { setActiveTab('fleet'); setMessage(''); }}
            className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg cursor-pointer transition-colors ${activeTab === 'fleet' ? 'bg-white text-stone-950 shadow-sm' : 'text-stone-500 hover:text-stone-900'}`}
          >
            Fleet &amp; Inventory
          </button>
          <button
            onClick={() => { setActiveTab('audit'); setMessage(''); }}
            className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg cursor-pointer transition-colors ${activeTab === 'audit' ? 'bg-white text-stone-950 shadow-sm' : 'text-stone-500 hover:text-stone-900'}`}
          >
            Audit Trails
          </button>
          <button
            onClick={() => { setActiveTab('seo'); setMessage(''); }}
            className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg cursor-pointer transition-colors ${activeTab === 'seo' ? 'bg-white text-stone-950 shadow-sm' : 'text-stone-500 hover:text-stone-900'}`}
          >
            SEO Audit
          </button>
        </div>
      </div>

      {message && (
        <div className={`p-3.5 border text-xs rounded-xl font-medium flex items-center justify-between ${
          message.startsWith('❌') 
            ? 'bg-red-50 border-red-200 text-red-800' 
            : 'bg-green-50 border-green-200 text-green-800'
        }`}>
          <span className="flex items-center gap-2">
            {message.startsWith('❌') ? (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
            )}
            {message}
          </span>
          <button 
            onClick={() => setMessage('')} 
            className={`text-xs font-mono font-bold hover:scale-115 transition-transform ${
              message.startsWith('❌') ? 'text-red-500 hover:text-red-700' : 'text-green-600 hover:text-green-800'
            }`}
          >
            &times;
          </button>
        </div>
      )}

      {/* ----------------- TAB 1: OVERVIEW STATISTICS ----------------- */}
      {activeTab === 'overview' && stats && (
        <div className="space-y-8 animate-fade-in">
          {/* Top 4 KPI Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-white border border-stone-200 rounded-2xl shadow-sm space-y-1">
              <div className="flex items-center justify-between text-stone-400">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider">Registered Customers</span>
                <Users className="w-4 h-4 text-crimson-500" />
              </div>
              <span className="text-3xl font-mono font-bold text-stone-900 block">{stats.total_customers}</span>
              <div className="text-[11px] text-stone-500 font-mono flex items-center gap-1 pt-1">
                <span className="text-amber-600 font-bold">{unverifiedUsersCount} Pending Verification</span>
              </div>
            </div>

            <div className="p-5 bg-white border border-stone-200 rounded-2xl shadow-sm space-y-1">
              <div className="flex items-center justify-between text-stone-400">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider">Total Reservations</span>
                <Calendar className="w-4 h-4 text-crimson-500" />
              </div>
              <span className="text-3xl font-mono font-bold text-stone-900 block">{stats.total_bookings}</span>
              <div className="text-[11px] text-stone-500 font-mono flex items-center gap-1 pt-1">
                <span className="text-crimson-600 font-bold">{pendingBookingsCount} Pending Confirmation</span>
              </div>
            </div>

            <div className="p-5 bg-white border border-stone-200 rounded-2xl shadow-sm space-y-1">
              <div className="flex items-center justify-between text-stone-400">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider">Active Fleet Size</span>
                <Car className="w-4 h-4 text-crimson-500" />
              </div>
              <span className="text-3xl font-mono font-bold text-stone-900 block">{stats.total_vehicles}</span>
              <div className="text-[11px] text-green-600 font-mono flex items-center gap-1 pt-1">
                <span className="font-semibold">&check; 4x4 SUVs, Jeeps, EVs &amp; Bikes</span>
              </div>
            </div>

            <div className="p-5 bg-white border border-stone-200 rounded-2xl shadow-sm space-y-1">
              <div className="flex items-center justify-between text-stone-400">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider">Verified Revenue</span>
                <Banknote className="w-4 h-4 text-green-600" />
              </div>
              <span className="text-3xl font-mono font-bold text-green-700 block">
                Rs. {stats.total_revenue_paid.toLocaleString()}
              </span>
              <div className="text-[11px] text-stone-400 font-mono pt-1">
                Processed via eSewa &amp; Bank
              </div>
            </div>
          </div>

          {/* Quick Action Banners for Owner */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 bg-amber-50/60 border border-amber-200/80 rounded-2xl flex items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-mono uppercase font-bold text-amber-700 tracking-wider">
                  Pending Document Approvals
                </span>
                <h3 className="font-serif font-bold text-stone-900 text-lg">
                  {unverifiedUsersCount} User{unverifiedUsersCount === 1 ? '' : 's'} Awaiting Verification
                </h3>
                <p className="text-xs text-stone-600 mt-1">
                  Inspect tourist driving licenses, citizenship cards, and ID certificates before vehicle handover.
                </p>
              </div>
              <button
                onClick={() => { setActiveTab('users'); setUserFilter('pending'); }}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-xl shadow-sm shrink-0 cursor-pointer"
              >
                Verify Users &rarr;
              </button>
            </div>

            <div className="p-5 bg-crimson-50/60 border border-crimson-200/80 rounded-2xl flex items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-mono uppercase font-bold text-crimson-700 tracking-wider">
                  Pending Reservations
                </span>
                <h3 className="font-serif font-bold text-stone-900 text-lg">
                  {pendingBookingsCount} Rental Booking{pendingBookingsCount === 1 ? '' : 's'} to Authorize
                </h3>
                <p className="text-xs text-stone-600 mt-1">
                  Confirm vehicle allocation, driver assignment, and verify security deposit invoices.
                </p>
              </div>
              <button
                onClick={() => { setActiveTab('bookings'); setBookingFilter('pending'); }}
                className="px-4 py-2 bg-crimson-600 hover:bg-crimson-700 text-white font-semibold text-xs rounded-xl shadow-sm shrink-0 cursor-pointer"
              >
                Verify Bookings &rarr;
              </button>
            </div>
          </div>

          {/* Recent Reservations Table */}
          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif font-bold text-lg text-stone-900">Recent Customer Bookings</h3>
              <button
                onClick={() => setActiveTab('bookings')}
                className="text-xs font-mono font-bold text-crimson-600 hover:underline"
              >
                View All {bookingsList.length} &rarr;
              </button>
            </div>
            <div className="space-y-3">
              {stats.recent_bookings?.map((b: any) => (
                <div key={b.id} className="p-4 rounded-xl bg-stone-50 border border-stone-150 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs font-mono">
                  <div>
                    <span className="font-bold text-stone-900 text-sm block">{b.vehicle_name}</span>
                    <span className="text-stone-500">Customer: {b.full_name} &middot; Dates: {b.start_date} to {b.end_date}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div>
                      <span className="font-bold text-stone-900 block text-right">Rs. {parseFloat(b.total_amount).toLocaleString()}</span>
                      <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${b.status === 'Confirmed' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                        {b.status}
                      </span>
                    </div>
                    {b.status === 'Pending' && (
                      <button
                        onClick={() => handleVerifyBooking(b.id, 'approve')}
                        className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded font-semibold cursor-pointer"
                      >
                        Confirm
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ----------------- TAB 2: MANAGE & VERIFY BOOKINGS ----------------- */}
      {activeTab === 'bookings' && (
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 border-stone-150">
            <div>
              <h3 className="font-serif font-bold text-xl text-stone-900 flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-crimson-600" />
                Booking Verification &amp; Dispatch Console
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Review rental requests, verify driver credentials, mark bank/eSewa receipts as paid, and approve dispatch.
              </p>
            </div>

            {/* Filter Buttons */}
            <div className="flex gap-1.5 p-1 bg-stone-100 rounded-xl text-xs font-mono">
              <button
                onClick={() => setBookingFilter('all')}
                className={`px-3 py-1 rounded-lg cursor-pointer ${bookingFilter === 'all' ? 'bg-white font-bold text-stone-900 shadow-sm' : 'text-stone-500'}`}
              >
                All ({bookingsList.length})
              </button>
              <button
                onClick={() => setBookingFilter('pending')}
                className={`px-3 py-1 rounded-lg cursor-pointer ${bookingFilter === 'pending' ? 'bg-white font-bold text-crimson-600 shadow-sm' : 'text-stone-500'}`}
              >
                Pending ({pendingBookingsCount})
              </button>
              <button
                onClick={() => setBookingFilter('confirmed')}
                className={`px-3 py-1 rounded-lg cursor-pointer ${bookingFilter === 'confirmed' ? 'bg-white font-bold text-green-700 shadow-sm' : 'text-stone-500'}`}
              >
                Confirmed
              </button>
              <button
                onClick={() => setBookingFilter('paid')}
                className={`px-3 py-1 rounded-lg cursor-pointer ${bookingFilter === 'paid' ? 'bg-white font-bold text-stone-900 shadow-sm' : 'text-stone-500'}`}
              >
                Paid
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {filteredBookings.length === 0 ? (
              <div className="py-12 text-center text-stone-400 font-mono text-xs">
                No bookings matching the current filter.
              </div>
            ) : (
              filteredBookings.map((b) => (
                <div
                  key={b.id}
                  className="p-5 border border-stone-200 rounded-2xl bg-stone-50/70 hover:bg-stone-50 transition-all text-xs font-mono grid grid-cols-1 md:grid-cols-12 gap-4 items-center"
                >
                  <div className="md:col-span-4 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-stone-900 text-sm">{b.vehicle_name}</span>
                      <span className="text-[10px] text-stone-400">Ref: ND-{b.id}</span>
                    </div>
                    <div className="text-stone-600">
                      Customer: <b>{b.user_name}</b> ({b.user_email})
                    </div>
                    <div className="text-stone-400 text-[11px] flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-stone-400" />
                      Pickup: {b.pickup_location}
                    </div>
                  </div>

                  <div className="md:col-span-3 space-y-1">
                    <div>
                      <span className="text-stone-400 block text-[10px] uppercase">Rental Period</span>
                      <span className="font-semibold text-stone-800">{b.start_date} to {b.end_date}</span>
                    </div>
                    <div>
                      <span className="text-stone-400 block text-[10px] uppercase">Total Cost</span>
                      <span className="font-bold text-crimson-600 text-sm">
                        Rs. {parseFloat(b.total_amount).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="md:col-span-2 space-y-1">
                    <div>
                      <span className="text-stone-400 block text-[10px] uppercase">Reservation Status</span>
                      <span className={`inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                        b.status === 'Confirmed' ? 'bg-green-100 text-green-800' :
                        b.status === 'Completed' ? 'bg-stone-200 text-stone-800' :
                        b.status === 'Cancelled' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {b.status}
                      </span>
                    </div>
                    <div>
                      <span className="text-stone-400 block text-[10px] uppercase">Payment</span>
                      <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        b.payment_status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {b.payment_status} ({b.payment_method})
                      </span>
                    </div>
                  </div>

                  {/* Owner Action Buttons */}
                  <div className="md:col-span-3 flex flex-wrap gap-1.5 justify-end">
                    {b.status === 'Pending' && (
                      <button
                        disabled={actionLoadingId === b.id}
                        onClick={() => handleVerifyBooking(b.id, 'approve')}
                        className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white font-semibold text-xs rounded-lg cursor-pointer transition-colors shadow-sm flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Verify &amp; Confirm
                      </button>
                    )}

                    {b.payment_status !== 'Paid' && b.status !== 'Cancelled' && (
                      <button
                        disabled={actionLoadingId === b.id}
                        onClick={() => handleVerifyBooking(b.id, 'mark_paid')}
                        className="px-2.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-white font-semibold text-[11px] rounded-lg cursor-pointer transition-colors"
                      >
                        Mark Paid
                      </button>
                    )}

                    {b.status === 'Confirmed' && (
                      <button
                        disabled={actionLoadingId === b.id}
                        onClick={() => handleVerifyBooking(b.id, 'complete')}
                        className="px-2.5 py-1.5 bg-stone-700 hover:bg-stone-800 text-white font-semibold text-[11px] rounded-lg cursor-pointer transition-colors"
                      >
                        Complete
                      </button>
                    )}

                    {b.status !== 'Cancelled' && (
                      <button
                        disabled={actionLoadingId === b.id}
                        onClick={() => {
                          if (confirm(`Reject/Cancel booking #${b.id}?`)) {
                            handleVerifyBooking(b.id, 'reject');
                          }
                        }}
                        className="px-2 py-1.5 border border-stone-200 text-stone-600 hover:bg-red-50 hover:text-red-600 text-[11px] rounded-lg cursor-pointer transition-colors"
                      >
                        Reject
                      </button>
                    )}
                  </div>

                  {/* Attached Customer Identity Documents & Custody Controls */}
                  {(() => {
                    const attachedDocs = adminDocumentsList.filter(d => d.booking_id === b.id || d.user_id === b.user_id);
                    return (
                      <div className="md:col-span-12 pt-3 border-t border-stone-200/80 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] text-stone-500 font-bold uppercase flex items-center gap-1">
                            <FileCheck className="w-3.5 h-3.5 text-amber-600" />
                            Customer ID Documents ({attachedDocs.length}):
                          </span>
                          {attachedDocs.length === 0 ? (
                            <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              ⚠️ No documents uploaded yet
                            </span>
                          ) : (
                            attachedDocs.map(d => (
                              <button
                                key={d.id}
                                type="button"
                                onClick={() => setSelectedDocForModal(d)}
                                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1 border cursor-pointer hover:scale-102 transition-transform ${
                                  d.verification_status === 'Approved'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                    : d.verification_status === 'Rejected'
                                    ? 'bg-red-50 text-red-800 border-red-300'
                                    : 'bg-amber-50 text-amber-800 border-amber-300'
                                }`}
                              >
                                <span>{d.document_type.replace('_', ' ').toUpperCase()}</span>
                                <span>({d.verification_status})</span>
                                <Eye className="w-3 h-3 opacity-70" />
                              </button>
                            ))
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setCustodyBookingId(b.id);
                              setShowCustodyModal(true);
                            }}
                            className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 border border-stone-300 rounded-lg text-[10px] font-mono text-stone-700 flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <ShieldCheck className="w-3 h-3 text-stone-600" />
                            Record Custody Handover
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ----------------- TAB: VERIFY DOCUMENTS (OWNER/ADMIN DASHBOARD) ----------------- */}
      {activeTab === 'documents' && (
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 border-stone-150">
            <div>
              <h3 className="font-serif font-bold text-xl text-stone-900 flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-amber-600" />
                Submitted Identity Documents &amp; Citizenship Verification
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Inspect citizenship certificates, driving licenses, and identity proofs before confirming vehicle releases.
              </p>
            </div>

            {/* Filter Buttons */}
            <div className="flex flex-wrap gap-1.5 p-1 bg-stone-100 rounded-xl text-xs font-mono">
              <button
                onClick={() => setDocStatusFilter('ALL')}
                className={`px-3 py-1 rounded-lg cursor-pointer transition-colors ${docStatusFilter === 'ALL' ? 'bg-white font-bold text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-900'}`}
              >
                All Documents ({adminDocumentsList.length})
              </button>
              <button
                onClick={() => setDocStatusFilter('Pending')}
                className={`px-3 py-1 rounded-lg cursor-pointer transition-colors ${docStatusFilter === 'Pending' ? 'bg-white font-bold text-amber-700 shadow-sm' : 'text-stone-500 hover:text-stone-900'}`}
              >
                Pending Review ({adminDocumentsList.filter(d => d.verification_status === 'Pending').length})
              </button>
              <button
                onClick={() => setDocStatusFilter('Approved')}
                className={`px-3 py-1 rounded-lg cursor-pointer transition-colors ${docStatusFilter === 'Approved' ? 'bg-white font-bold text-emerald-700 shadow-sm' : 'text-stone-500 hover:text-stone-900'}`}
              >
                Approved ({adminDocumentsList.filter(d => d.verification_status === 'Approved').length})
              </button>
              <button
                onClick={() => setDocStatusFilter('Rejected')}
                className={`px-3 py-1 rounded-lg cursor-pointer transition-colors ${docStatusFilter === 'Rejected' ? 'bg-white font-bold text-red-700 shadow-sm' : 'text-stone-500 hover:text-stone-900'}`}
              >
                Rejected ({adminDocumentsList.filter(d => d.verification_status === 'Rejected').length})
              </button>
            </div>
          </div>

          {/* Privacy & Custody Policy Notice */}
          <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-950 font-mono">
            <div className="flex items-start sm:items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
              <div>
                <b>NepalDrive Identity Verification Standard:</b> Digital documents are securely stored in persistent object storage with short-lived signed URLs. Renters retain their physical original citizenship certificates; do not withhold original citizenship documents as collateral.
              </div>
            </div>
          </div>

          {/* Documents Grid / List */}
          <div className="space-y-4">
            {adminDocumentsList.filter(d => docStatusFilter === 'ALL' || d.verification_status === docStatusFilter).length === 0 ? (
              <div className="py-16 text-center text-stone-400 font-mono text-xs">
                No identity documents matching &ldquo;{docStatusFilter}&rdquo; status.
              </div>
            ) : (
              adminDocumentsList
                .filter(d => docStatusFilter === 'ALL' || d.verification_status === docStatusFilter)
                .map((d) => (
                  <div
                    key={d.id}
                    className="p-5 border border-stone-200 rounded-2xl bg-stone-50/70 hover:bg-stone-50 transition-all text-xs font-mono space-y-4 shadow-xs"
                  >
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      {/* User Info */}
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-stone-900 text-sm">{d.full_name}</span>
                          <span className="text-[10px] text-stone-500">({d.email})</span>
                          <span className="text-[10px] text-stone-500">&middot; {d.phone || '+977 98XXXXXXXX'}</span>
                          {d.user_is_verified && (
                            <span className="text-[10px] text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full font-bold">
                              ✓ Verified Rider
                            </span>
                          )}
                        </div>

                        {/* Document details */}
                        <div className="flex flex-wrap items-center gap-3 pt-1">
                          <span className="font-bold text-stone-800 px-2.5 py-1 bg-white border border-stone-200 rounded-lg">
                            {d.document_type === 'citizenship_front' && '🇳🇵 Citizenship Certificate (Front)'}
                            {d.document_type === 'citizenship_back' && '🇳🇵 Citizenship Certificate (Back)'}
                            {d.document_type === 'driving_license' && '🚗 Driving License'}
                            {d.document_type === 'passport' && '✈️ Passport & Visa'}
                            {!['citizenship_front', 'citizenship_back', 'driving_license', 'passport'].includes(d.document_type) && d.document_type}
                          </span>
                          <span className="text-stone-500">File: <b>{d.original_filename}</b></span>
                          <span className="text-stone-400">({(d.file_size ? (d.file_size / 1024).toFixed(1) : '0')} KB)</span>
                          <span className="text-stone-400">Uploaded: {new Date(d.uploaded_at).toLocaleString()}</span>
                        </div>

                        {/* Associated Booking Info (if any) */}
                        {d.booking_id && (
                          <div className="p-2.5 bg-white border border-stone-200 rounded-xl flex flex-wrap items-center gap-3 text-[11px] text-stone-700 mt-2">
                            <span className="font-bold text-stone-900">Linked Booking: Ref #{d.booking_id}</span>
                            {d.vehicle_name && <span>Vehicle: <b>{d.vehicle_name}</b></span>}
                            {d.start_date && <span>Period: {d.start_date} &rarr; {d.end_date}</span>}
                            {d.pickup_location && <span>Pickup: {d.pickup_location}</span>}
                            {d.booking_status && (
                              <span className="px-1.5 py-0.5 rounded bg-stone-100 text-stone-800 font-bold uppercase text-[10px]">
                                {d.booking_status}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Status Badge & Inspection Buttons */}
                      <div className="flex flex-col sm:items-end gap-2 shrink-0">
                        <span className={`inline-block text-[11px] font-bold uppercase px-3 py-1 rounded-full text-center ${
                          d.verification_status === 'Approved'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : d.verification_status === 'Rejected'
                            ? 'bg-red-100 text-red-800 border border-red-300'
                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}>
                          {d.verification_status === 'Approved' && '✓ Approved & Verified'}
                          {d.verification_status === 'Rejected' && '✕ Rejected'}
                          {d.verification_status === 'Pending' && '⏳ Pending Owner Review'}
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedDocForModal(d)}
                            className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
                          >
                            <Eye className="w-3.5 h-3.5 text-amber-400" />
                            Inspect / Preview
                          </button>
                          {d.download_url && (
                            <a
                              href={d.download_url}
                              download={d.original_filename}
                              className="p-1.5 bg-white border border-stone-200 hover:bg-stone-100 text-stone-700 rounded-xl transition-colors cursor-pointer"
                              title="Download document"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Rejection Reason Display if rejected */}
                    {d.verification_status === 'Rejected' && d.rejection_reason && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-900 text-xs flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                        <div>
                          <b className="font-mono uppercase text-[10px] text-red-700 block">Owner Rejection Reason:</b>
                          {d.rejection_reason}
                        </div>
                      </div>
                    )}

                    {/* Verification Actions (Approve / Reject) */}
                    <div className="pt-2 border-t border-stone-200/80 flex flex-wrap items-center justify-between gap-3">
                      <div className="text-[11px] text-stone-400 font-mono">
                        {d.verified_at && (
                          <span>Last audited: {new Date(d.verified_at).toLocaleString()}</span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {d.verification_status !== 'Approved' && (
                          <button
                            disabled={verifyingDocLoadingId === d.id}
                            onClick={() => handleVerifyDocument(d.id, 'Approved')}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl cursor-pointer transition-colors shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Approve Document
                          </button>
                        )}

                        {d.verification_status !== 'Rejected' && (
                          rejectingDocId === d.id ? (
                            <div className="flex items-center gap-2 bg-stone-100 p-1.5 rounded-xl border border-stone-300">
                              <input
                                type="text"
                                value={rejectionReasonText}
                                onChange={(e) => setRejectionReasonText(e.target.value)}
                                placeholder="State reason (e.g. Blurry photo, expired)..."
                                className="px-2.5 py-1 text-xs bg-white border border-stone-300 rounded-lg outline-none w-64"
                                autoFocus
                              />
                              <button
                                disabled={verifyingDocLoadingId === d.id || !rejectionReasonText.trim()}
                                onClick={() => handleVerifyDocument(d.id, 'Rejected', rejectionReasonText.trim())}
                                className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50"
                              >
                                Confirm Reject
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setRejectingDocId(null);
                                  setRejectionReasonText('');
                                }}
                                className="px-2 py-1 text-stone-500 hover:text-stone-800 text-xs cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              disabled={verifyingDocLoadingId === d.id}
                              onClick={() => {
                                setRejectingDocId(d.id);
                                setRejectionReasonText('');
                              }}
                              className="px-3 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold rounded-xl cursor-pointer transition-colors flex items-center gap-1"
                            >
                              <X className="w-3.5 h-3.5" />
                              Reject with Reason
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      )}

      {/* ----------------- TAB 3: VERIFY USERS & DRIVING LICENSES ----------------- */}
      {activeTab === 'users' && (
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 border-stone-150">
            <div>
              <h3 className="font-serif font-bold text-xl text-stone-900 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-amber-600" />
                Customer Identity &amp; Driver License Verification
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Verify customer driving licenses, passports, and citizenship cards. Verified riders bypass deposit holding queues.
              </p>
            </div>

            {/* Filter Buttons */}
            <div className="flex gap-1.5 p-1 bg-stone-100 rounded-xl text-xs font-mono">
              <button
                onClick={() => setUserFilter('all')}
                className={`px-3 py-1 rounded-lg cursor-pointer ${userFilter === 'all' ? 'bg-white font-bold text-stone-900 shadow-sm' : 'text-stone-500'}`}
              >
                All Accounts ({usersList.length})
              </button>
              <button
                onClick={() => setUserFilter('pending')}
                className={`px-3 py-1 rounded-lg cursor-pointer ${userFilter === 'pending' ? 'bg-white font-bold text-amber-700 shadow-sm' : 'text-stone-500'}`}
              >
                Pending Review ({unverifiedUsersCount})
              </button>
              <button
                onClick={() => setUserFilter('verified')}
                className={`px-3 py-1 rounded-lg cursor-pointer ${userFilter === 'verified' ? 'bg-white font-bold text-green-700 shadow-sm' : 'text-stone-500'}`}
              >
                Verified Users
              </button>
            </div>
          </div>

          {/* Single Admin Policy Notice */}
          <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-2xl flex items-center gap-2.5 text-xs text-amber-900 font-mono">
            <Shield className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <b>Single-Owner Policy:</b> NepalDrive operates strictly under ONE authoritative Fleet Owner. Customer accounts can submit licenses &amp; citizenship for verification but cannot hold administrative roles.
            </span>
          </div>

          <div className="space-y-3">
            {filteredUsers.length === 0 ? (
              <div className="py-12 text-center text-stone-400 font-mono text-xs">
                No users match the current filter.
              </div>
            ) : (
              filteredUsers.map((u) => (
                <div
                  key={u.id}
                  className="p-5 rounded-2xl border border-stone-200 bg-stone-50/70 hover:bg-stone-50 text-xs font-mono flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all shadow-xs"
                >
                  <div className="flex items-start gap-4">
                    <UserAvatar user={u} size="md" showBadge={u.is_verified} />
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-stone-900 text-sm">{u.full_name}</span>
                        {u.role === 'ADMIN' ? (
                          <span className="text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                            <Shield className="w-3 h-3 text-amber-600" />
                            Sole Fleet Owner &amp; Admin
                          </span>
                        ) : (
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-stone-200 text-stone-700">
                            Customer
                          </span>
                        )}
                        {u.is_verified ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-green-800 bg-green-100 px-2 py-0.5 rounded font-bold">
                            <CheckCircle2 className="w-3 h-3 text-green-600" /> License Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] text-amber-800 bg-amber-100 px-2 py-0.5 rounded font-bold">
                            <Clock className="w-3 h-3 text-amber-600" /> Pending Review
                          </span>
                        )}
                      </div>

                      <div className="text-stone-500">
                        Email: <b>{u.email}</b> &middot; Phone: {u.phone || '+977 9800000000'}
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-stone-600 pt-0.5">
                        <span>Driving License: <b className="text-stone-800">{u.driving_license || 'Not submitted yet'}</b></span>
                        <span>Citizenship / Passport: <b className="text-stone-800">{u.citizenship_no || 'Not submitted yet'}</b></span>
                        <span className="text-stone-400">Member: {new Date(u.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Verification Actions */}
                  <div className="flex flex-wrap items-center gap-2">
                    {u.role === 'CUSTOMER' && (
                      u.is_verified ? (
                        <button
                          disabled={actionLoadingId === u.id}
                          onClick={() => handleVerifyUser(u.id, false)}
                          className="px-3 py-1.5 border border-stone-300 text-stone-600 hover:text-red-600 hover:border-red-300 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                        >
                          Revoke Verification
                        </button>
                      ) : (
                        <button
                          disabled={actionLoadingId === u.id}
                          onClick={() => handleVerifyUser(u.id, true)}
                          className="px-3.5 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors shadow-sm flex items-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Approve &amp; Verify ID
                        </button>
                      )
                    )}

                    {u.role === 'ADMIN' && (
                      <span className="text-[11px] font-mono font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                        Sole Authority
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ----------------- TAB 4: MANAGE FLEET / ADD VEHICLE ----------------- */}
      {activeTab === 'fleet' && (
        <div className="space-y-8 animate-fade-in">
          {/* Active Fleet List with Status Toggles */}
          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4">
            <h3 className="font-serif font-bold text-lg text-stone-900">
              Active Vehicles in Fleet ({vehiclesList.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {vehiclesList.map((v) => (
                <div key={v.id} className="p-4 border border-stone-200 rounded-xl bg-stone-50 flex gap-4 text-xs font-mono">
                  <img
                    src={v.image_url}
                    alt={v.name}
                    className="w-24 h-20 object-cover rounded-lg shrink-0 border border-stone-200"
                  />
                  <div className="flex-grow space-y-1">
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-stone-900 text-sm">{v.name}</span>
                      <button
                        onClick={() => handleDeleteVehicle(v.id)}
                        className="text-stone-400 hover:text-crimson-500 cursor-pointer p-1"
                        title="Retire Vehicle"
                      >
                        <Trash className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="text-stone-500">
                      {v.type} &middot; {v.transmission} &middot; {v.seats} Seats
                    </div>
                    <div className="font-bold text-crimson-600">
                      Rs. {parseFloat(v.price_per_day).toLocaleString()}/day
                    </div>

                    {/* Status Toggle Buttons */}
                    <div className="pt-2 flex items-center gap-1.5">
                      <span className="text-[10px] text-stone-400">Status:</span>
                      <button
                        onClick={() => handleUpdateVehicleStatus(v.id, 'Available')}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                          v.availability_status === 'Available' ? 'bg-green-600 text-white' : 'bg-stone-200 text-stone-600'
                        }`}
                      >
                        Available
                      </button>
                      <button
                        onClick={() => handleUpdateVehicleStatus(v.id, 'Maintenance')}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                          v.availability_status === 'Maintenance' ? 'bg-amber-600 text-white' : 'bg-stone-200 text-stone-600'
                        }`}
                      >
                        Maintenance
                      </button>
                      <button
                        onClick={() => handleUpdateVehicleStatus(v.id, 'Reserved')}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                          v.availability_status === 'Reserved' ? 'bg-stone-800 text-white' : 'bg-stone-200 text-stone-600'
                        }`}
                      >
                        Reserved
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Add Vehicle Form */}
          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4">
            <h3 className="font-serif font-bold text-lg text-stone-900 flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-crimson-500" />
              Register New Vehicle into Nepal Fleet
            </h3>

            <form onSubmit={handleAddVehicle} className="space-y-4 text-xs font-mono">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-stone-400 uppercase mb-0.5">Vehicle Title</label>
                  <input type="text" value={newName} onChange={e => setNewName(e.target.value)} className="w-full p-2 bg-stone-50 border rounded text-stone-800" placeholder="e.g. Toyota Land Cruiser" required />
                </div>
                <div>
                  <label className="block text-stone-400 uppercase mb-0.5">Brand</label>
                  <input type="text" value={newBrand} onChange={e => setNewBrand(e.target.value)} className="w-full p-2 bg-stone-50 border rounded text-stone-800" required />
                </div>
                <div>
                  <label className="block text-stone-400 uppercase mb-0.5">Model</label>
                  <input type="text" value={newModel} onChange={e => setNewModel(e.target.value)} className="w-full p-2 bg-stone-50 border rounded text-stone-800" placeholder="Prado TX" required />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-stone-400 uppercase mb-0.5">Year</label>
                  <input type="number" value={newYear} onChange={e => setNewYear(Number(e.target.value))} className="w-full p-2 bg-stone-50 border rounded text-stone-800" required />
                </div>
                <div>
                  <label className="block text-stone-400 uppercase mb-0.5">Category</label>
                  <select value={newType} onChange={e => setNewType(e.target.value)} className="w-full p-2 bg-stone-50 border rounded text-stone-800">
                    <option value="SUV">SUV</option>
                    <option value="Jeep">Jeep</option>
                    <option value="Electric">Electric</option>
                    <option value="Sedan">Sedan</option>
                    <option value="Bike">Bike / Scooter</option>
                  </select>
                </div>
                <div>
                  <label className="block text-stone-400 uppercase mb-0.5">Price/Day (Rs.)</label>
                  <input type="number" value={newPrice} onChange={e => setNewPrice(Number(e.target.value))} className="w-full p-2 bg-stone-50 border rounded text-stone-800" required />
                </div>
                <div>
                  <label className="block text-stone-400 uppercase mb-0.5">Deposit (Rs.)</label>
                  <input type="number" value={newDeposit} onChange={e => setNewDeposit(Number(e.target.value))} className="w-full p-2 bg-stone-50 border rounded text-stone-800" required />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-stone-400 uppercase mb-0.5">Transmission</label>
                  <select value={newTransmission} onChange={e => setNewTransmission(e.target.value)} className="w-full p-2 bg-stone-50 border rounded text-stone-800">
                    <option value="Automatic">Automatic</option>
                    <option value="Manual">Manual</option>
                  </select>
                </div>
                <div>
                  <label className="block text-stone-400 uppercase mb-0.5">Fuel</label>
                  <select value={newFuel} onChange={e => setNewFuel(e.target.value)} className="w-full p-2 bg-stone-50 border rounded text-stone-800">
                    <option value="Diesel">Diesel</option>
                    <option value="Petrol">Petrol</option>
                    <option value="Electric">Electric</option>
                  </select>
                </div>
                <div>
                  <label className="block text-stone-400 uppercase mb-0.5">Seats</label>
                  <input type="number" value={newSeats} onChange={e => setNewSeats(Number(e.target.value))} className="w-full p-2 bg-stone-50 border rounded text-stone-800" />
                </div>
                <div className="flex items-center gap-4 pt-4">
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input type="checkbox" checked={newSelfDrive} onChange={e => setNewSelfDrive(e.target.checked)} />
                    <span>Self-Drive</span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input type="checkbox" checked={newWithDriver} onChange={e => setNewWithDriver(e.target.checked)} />
                    <span>Driver Option</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-stone-400 uppercase mb-0.5">Image URL</label>
                <input type="text" value={newImg} onChange={e => setNewImg(e.target.value)} className="w-full p-2 bg-stone-50 border rounded text-stone-800" placeholder="/assets/images/fortuner_suv_1791105671393.jpg" />
              </div>

              <div>
                <label className="block text-stone-400 uppercase mb-0.5">Pickup Regions (Comma split)</label>
                <input type="text" value={newLocations} onChange={e => setNewLocations(e.target.value)} className="w-full p-2 bg-stone-50 border rounded text-stone-800" />
              </div>

              <div>
                <label className="block text-stone-400 uppercase mb-0.5">Description</label>
                <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} className="w-full p-2 bg-stone-50 border rounded text-stone-800" rows={2} required />
              </div>

              <button type="submit" disabled={submitting} className="w-full py-3 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-xl cursor-pointer transition-colors shadow-sm">
                {submitting ? 'Registering...' : 'Add Vehicle to Nepal Fleet'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ----------------- TAB: CUSTOMER CONTACT ENQUIRIES & MESSAGES ----------------- */}
      {activeTab === 'enquiries' && (
        <div className="space-y-6 animate-fade-in text-left">
          {/* Header & Filter Controls */}
          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-150 pb-4">
              <div>
                <h3 className="font-serif font-bold text-xl text-stone-900 flex items-center gap-2">
                  <Inbox className="w-5 h-5 text-crimson-600" />
                  Customer Inquiries &amp; Contact Messages ({filteredEnquiries.length})
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Submissions from the public contact form. Direct email replies trigger transactional delivery via Resend.
                </p>
              </div>

              {/* Filter Tabs */}
              <div className="flex flex-wrap gap-1 bg-stone-100 p-1 rounded-xl font-mono text-xs">
                {(['ALL', 'NEW', 'READ', 'REPLIED', 'ARCHIVED'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setEnquiryFilter(st)}
                    className={`px-3 py-1 rounded-lg cursor-pointer transition-colors font-semibold ${
                      enquiryFilter === st ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-900'
                    }`}
                  >
                    {st === 'ALL' ? 'All Messages' : st}
                    {st === 'NEW' && newEnquiriesCount > 0 && (
                      <span className="ml-1.5 px-1.5 py-0.2 bg-crimson-600 text-white rounded-full text-[10px]">
                        {newEnquiriesCount}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Input Filter */}
            <div className="flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs">
              <Filter className="w-4 h-4 text-stone-400 shrink-0" />
              <input
                type="text"
                value={enquirySearchQuery}
                onChange={(e) => setEnquirySearchQuery(e.target.value)}
                placeholder="Search messages by sender name, email, phone, subject, or message content..."
                className="w-full bg-transparent outline-none text-stone-900 placeholder:text-stone-400 font-sans"
              />
              {enquirySearchQuery && (
                <button
                  type="button"
                  onClick={() => setEnquirySearchQuery('')}
                  className="text-stone-400 hover:text-stone-700 text-xs font-mono font-bold"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Inquiries Cards List */}
            {filteredEnquiries.length === 0 ? (
              <div className="py-16 text-center text-xs font-mono text-stone-400 bg-stone-50 rounded-xl border border-stone-200">
                No customer inquiries matching &quot;{enquiryFilter}&quot; filter {enquirySearchQuery ? `and search "${enquirySearchQuery}"` : ''}.
              </div>
            ) : (
              <div className="space-y-4">
                {filteredEnquiries.map((enq) => {
                  const isNew = enq.status === 'NEW';
                  const isReplied = enq.status === 'REPLIED';
                  const isArchived = enq.status === 'ARCHIVED';

                  return (
                    <div
                      key={enq.id}
                      className={`p-5 rounded-2xl border transition-all ${
                        isNew
                          ? 'bg-red-50/40 border-crimson-200 shadow-xs'
                          : isReplied
                          ? 'bg-green-50/20 border-green-200'
                          : isArchived
                          ? 'bg-stone-50 border-stone-200 opacity-75'
                          : 'bg-white border-stone-200'
                      } space-y-3.5`}
                    >
                      {/* Top Row: Client Info, Date, Status */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-200/70 pb-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedEnquiryToView(enq)}
                              className="font-bold text-stone-900 text-sm hover:text-crimson-600 transition-colors text-left cursor-pointer"
                            >
                              {enq.name}
                            </button>
                            <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold uppercase ${
                              isNew
                                ? 'bg-crimson-600 text-white animate-pulse'
                                : isReplied
                                ? 'bg-green-100 text-green-800 border border-green-200'
                                : enq.status === 'READ'
                                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                : 'bg-stone-200 text-stone-700'
                            }`}>
                              {enq.status}
                            </span>
                            <span className="text-xs font-mono text-stone-400">
                              {new Date(enq.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-3 text-xs text-stone-600">
                            <a
                              href={`mailto:${enq.email}`}
                              className="text-crimson-700 hover:underline font-mono flex items-center gap-1"
                            >
                              <Mail className="w-3.5 h-3.5" />
                              {enq.email}
                            </a>
                            {enq.phone && (
                              <a
                                href={`tel:${enq.phone}`}
                                className="text-stone-700 hover:underline font-mono flex items-center gap-1"
                              >
                                <Phone className="w-3.5 h-3.5 text-stone-400" />
                                {enq.phone}
                              </a>
                            )}
                            {enq.ip_address && (
                              <span className="text-[10px] font-mono text-stone-400">
                                IP: {enq.ip_address}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-stone-400">
                            {new Date(enq.created_at).toLocaleString()}
                          </span>

                          {/* Quick Status Picker */}
                          <select
                            value={enq.status}
                            disabled={actionLoadingId === enq.id}
                            onChange={(e) => handleUpdateEnquiryStatus(enq.id, e.target.value, enq.admin_notes)}
                            className="text-xs py-1 px-2 bg-white border border-stone-300 rounded-lg font-mono font-medium text-stone-800 cursor-pointer shadow-2xs"
                          >
                            <option value="NEW">Status: NEW</option>
                            <option value="READ">Status: READ</option>
                            <option value="REPLIED">Status: REPLIED</option>
                            <option value="ARCHIVED">Status: ARCHIVED</option>
                          </select>
                        </div>
                      </div>

                      {/* Subject */}
                      <div className="font-semibold text-stone-900 text-sm flex items-center gap-1.5">
                        <span className="text-stone-500 font-normal text-xs font-mono uppercase">Subject:</span>
                        <span>{enq.subject}</span>
                      </div>

                      {/* Message Body */}
                      <div className="p-3.5 bg-white rounded-xl border border-stone-200/80 text-xs sm:text-sm text-stone-800 leading-relaxed whitespace-pre-wrap font-light">
                        {enq.message}
                      </div>

                      {/* Admin Internal Notes (if any) */}
                      {enq.admin_notes && (
                        <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 font-mono space-y-0.5">
                          <span className="font-bold text-[10px] uppercase text-amber-700 block">Owner Internal Notes &amp; History:</span>
                          <p className="whitespace-pre-wrap">{enq.admin_notes}</p>
                        </div>
                      )}

                      {/* Actions Toolbar */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedEnquiryToView(enq)}
                            className="py-1.5 px-3 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-semibold font-mono flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            Open Message
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenReplyModal(enq)}
                            className="py-1.5 px-3 bg-crimson-600 hover:bg-crimson-700 text-white rounded-lg text-xs font-semibold font-mono flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
                          >
                            <Reply className="w-3.5 h-3.5" />
                            Reply via Email (Resend)
                          </button>

                          {isNew && (
                            <button
                              type="button"
                              onClick={() => handleUpdateEnquiryStatus(enq.id, 'READ', enq.admin_notes)}
                              className="py-1.5 px-3 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg text-xs font-mono font-medium cursor-pointer transition-colors"
                            >
                              Mark as Read
                            </button>
                          )}

                          {!isReplied && (
                            <button
                              type="button"
                              onClick={() => handleUpdateEnquiryStatus(enq.id, 'REPLIED', enq.admin_notes)}
                              className="py-1.5 px-3 bg-green-50 hover:bg-green-100 text-green-800 rounded-lg text-xs font-mono font-medium cursor-pointer transition-colors border border-green-200"
                            >
                              Mark Replied
                            </button>
                          )}

                          {!isArchived ? (
                            <button
                              type="button"
                              onClick={() => handleUpdateEnquiryStatus(enq.id, 'ARCHIVED', enq.admin_notes)}
                              className="py-1.5 px-3 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-lg text-xs font-mono font-medium cursor-pointer transition-colors"
                            >
                              Archive
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleUpdateEnquiryStatus(enq.id, 'READ', enq.admin_notes)}
                              className="py-1.5 px-3 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-lg text-xs font-mono font-medium cursor-pointer transition-colors"
                            >
                              Unarchive
                            </button>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteEnquiry(enq.id)}
                          className="text-xs font-mono text-stone-400 hover:text-crimson-600 flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Trash className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ----------------- TAB 5: AUDIT LOGS ----------------- */}
      {activeTab === 'audit' && (
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4 animate-fade-in">
          <div className="space-y-1 text-left">
            <h3 className="font-serif font-bold text-lg text-stone-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-crimson-500" />
              System Audit &amp; Event Logs
            </h3>
            <p className="text-xs text-stone-500 leading-relaxed">
              Every sensitive database operation, identity verification, status update, and role change is logged with full actor metadata.
            </p>
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-3 border-b border-stone-100 hover:bg-stone-50 text-[11px] font-mono leading-relaxed space-y-1">
                <div className="flex justify-between font-bold text-stone-800">
                  <span className="text-crimson-600">Action: {log.action}</span>
                  <span className="text-stone-400 font-light">{new Date(log.timestamp).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-stone-500">Actor: {log.actor_email || 'System Registry'}</span>
                </div>
                <div className="text-stone-600 text-xs bg-stone-100 p-2 rounded border border-stone-200/50">
                  {log.details}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ----------------- TAB 6: ON-SCREEN LIVE SEO AUDIT ----------------- */}
      {activeTab === 'seo' && seoAudit && (
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-6 animate-fade-in text-left">
          <div className="space-y-1">
            <h3 className="font-serif font-bold text-lg text-stone-900 flex items-center gap-1.5">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              On-Screen SEO Validation Audit
            </h3>
            <p className="text-xs text-stone-500 leading-relaxed">
              Verify compliance with WCAG heading hierarchies, canonical mappings, JSON-LD Schema structures, title and description length criteria.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
            <div className="p-4 bg-stone-50 border rounded-xl space-y-2">
              <span className="block font-bold text-stone-400">Page Properties</span>
              <div className="flex justify-between">
                <span>Title Length:</span>
                <span className={seoAudit.titleLength >= 30 && seoAudit.titleLength <= 60 ? 'text-green-600' : 'text-crimson-500'}>
                  {seoAudit.titleLength} Chars (Target: 30-60)
                </span>
              </div>
              <div className="flex justify-between">
                <span>Description Length:</span>
                <span className={seoAudit.descriptionLength >= 120 && seoAudit.descriptionLength <= 160 ? 'text-green-600' : 'text-crimson-500'}>
                  {seoAudit.descriptionLength} Chars (Target: 120-160)
                </span>
              </div>
              <div className="flex justify-between">
                <span>H1 Headings:</span>
                <span className={seoAudit.h1Count === 1 ? 'text-green-600' : 'text-crimson-500 font-bold'}>
                  {seoAudit.h1Count} (Target: Exactly 1 H1)
                </span>
              </div>
            </div>

            <div className="p-4 bg-stone-50 border rounded-xl space-y-2">
              <span className="block font-bold text-stone-400">SEO Element Status</span>
              <div className="flex justify-between">
                <span>Canonical Tag:</span>
                <span className={seoAudit.hasCanonical ? 'text-green-600' : 'text-crimson-500 font-bold'}>
                  {seoAudit.hasCanonical ? 'PRESENT' : 'MISSING'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>JSON-LD Schema:</span>
                <span className={seoAudit.hasJSONLD ? 'text-green-600' : 'text-crimson-500 font-bold'}>
                  {seoAudit.hasJSONLD ? 'PRESENT' : 'MISSING'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>OpenGraph Tags:</span>
                <span className={seoAudit.hasOpenGraph ? 'text-green-600' : 'text-crimson-500 font-bold'}>
                  {seoAudit.hasOpenGraph ? 'PRESENT' : 'MISSING'}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <span className="block text-xs font-mono font-bold text-stone-700">Audit Messages &amp; Warnings</span>
            {seoAudit.warnings.length === 0 ? (
              <div className="p-3 bg-green-50 border border-green-200 text-green-700 text-xs rounded-lg font-mono">
                🎉 Perfect Score! No SEO warnings or validation errors detected on this view.
              </div>
            ) : (
              <div className="space-y-1.5">
                {seoAudit.warnings.map((w, idx) => (
                  <div key={idx} className="p-2.5 bg-crimson-50 border border-crimson-100 text-crimson-600 text-xs rounded-lg font-mono flex items-start gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ----------------- MODAL: OPEN & INSPECT CUSTOMER MESSAGE ----------------- */}
      {selectedEnquiryToView && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-3xl border border-stone-200 shadow-2xl max-w-2xl w-full p-6 sm:p-8 space-y-6 text-left relative">
            <div className="flex items-start justify-between border-b border-stone-150 pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs font-bold text-crimson-600 bg-crimson-50 px-2.5 py-0.5 rounded border border-crimson-200">
                    Customer Message
                  </span>
                  <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold uppercase ${
                    selectedEnquiryToView.status === 'NEW'
                      ? 'bg-crimson-600 text-white'
                      : selectedEnquiryToView.status === 'REPLIED'
                      ? 'bg-green-100 text-green-800'
                      : selectedEnquiryToView.status === 'READ'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-stone-200 text-stone-700'
                  }`}>
                    {selectedEnquiryToView.status}
                  </span>
                </div>
                <h3 className="font-serif font-bold text-2xl text-stone-900">
                  {selectedEnquiryToView.subject}
                </h3>
                <p className="text-xs text-stone-500 font-mono mt-0.5">
                  Received on {new Date(selectedEnquiryToView.created_at).toUTCString()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEnquiryToView(null)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sender Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-stone-50 rounded-2xl border border-stone-200 text-xs">
              <div>
                <span className="text-[10px] font-mono text-stone-400 uppercase block font-semibold">Sender Name</span>
                <span className="font-bold text-stone-900 text-sm">{selectedEnquiryToView.name}</span>
              </div>
              <div>
                <span className="text-[10px] font-mono text-stone-400 uppercase block font-semibold">Sender Email</span>
                <a href={`mailto:${selectedEnquiryToView.email}`} className="font-mono text-crimson-700 font-bold hover:underline">
                  {selectedEnquiryToView.email}
                </a>
              </div>
              {selectedEnquiryToView.phone && (
                <div>
                  <span className="text-[10px] font-mono text-stone-400 uppercase block font-semibold">Phone / WhatsApp</span>
                  <a href={`tel:${selectedEnquiryToView.phone}`} className="font-mono text-stone-800 font-bold hover:underline">
                    {selectedEnquiryToView.phone}
                  </a>
                </div>
              )}
              {selectedEnquiryToView.ip_address && (
                <div>
                  <span className="text-[10px] font-mono text-stone-400 uppercase block font-semibold">Client Origin IP</span>
                  <span className="font-mono text-stone-600">{selectedEnquiryToView.ip_address}</span>
                </div>
              )}
            </div>

            {/* Message Full Body */}
            <div className="space-y-1.5">
              <label className="block text-xs font-mono font-bold text-stone-500 uppercase">Customer Message</label>
              <div className="p-4 bg-white rounded-2xl border border-stone-200 text-sm text-stone-800 leading-relaxed whitespace-pre-wrap font-light shadow-xs max-h-60 overflow-y-auto">
                {selectedEnquiryToView.message}
              </div>
            </div>

            {/* Admin Notes Box */}
            {selectedEnquiryToView.admin_notes && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 font-mono space-y-1">
                <span className="font-bold text-[10px] uppercase text-amber-700 block">Owner Notes &amp; Dispatch History:</span>
                <p className="whitespace-pre-wrap">{selectedEnquiryToView.admin_notes}</p>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-stone-150">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const target = selectedEnquiryToView;
                    setSelectedEnquiryToView(null);
                    handleOpenReplyModal(target);
                  }}
                  className="py-2 px-4 bg-crimson-600 hover:bg-crimson-700 text-white rounded-xl text-xs font-semibold font-mono flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                >
                  <Reply className="w-3.5 h-3.5" />
                  Reply via Email (Resend)
                </button>

                {selectedEnquiryToView.status === 'NEW' && (
                  <button
                    type="button"
                    onClick={() => {
                      handleUpdateEnquiryStatus(selectedEnquiryToView.id, 'READ', selectedEnquiryToView.admin_notes);
                      setSelectedEnquiryToView({ ...selectedEnquiryToView, status: 'READ' });
                    }}
                    className="py-2 px-3 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-mono font-medium cursor-pointer transition-colors"
                  >
                    Mark as Read
                  </button>
                )}

                {selectedEnquiryToView.status !== 'REPLIED' && (
                  <button
                    type="button"
                    onClick={() => {
                      handleUpdateEnquiryStatus(selectedEnquiryToView.id, 'REPLIED', selectedEnquiryToView.admin_notes);
                      setSelectedEnquiryToView({ ...selectedEnquiryToView, status: 'REPLIED' });
                    }}
                    className="py-2 px-3 bg-green-50 hover:bg-green-100 text-green-800 rounded-xl text-xs font-mono font-medium cursor-pointer transition-colors border border-green-200"
                  >
                    Mark as Replied
                  </button>
                )}

                {selectedEnquiryToView.status !== 'ARCHIVED' ? (
                  <button
                    type="button"
                    onClick={() => {
                      handleUpdateEnquiryStatus(selectedEnquiryToView.id, 'ARCHIVED', selectedEnquiryToView.admin_notes);
                      setSelectedEnquiryToView(null);
                    }}
                    className="py-2 px-3 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-xl text-xs font-mono font-medium cursor-pointer transition-colors"
                  >
                    Archive
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      handleUpdateEnquiryStatus(selectedEnquiryToView.id, 'READ', selectedEnquiryToView.admin_notes);
                      setSelectedEnquiryToView({ ...selectedEnquiryToView, status: 'READ' });
                    }}
                    className="py-2 px-3 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-xl text-xs font-mono font-medium cursor-pointer transition-colors"
                  >
                    Unarchive
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  handleDeleteEnquiry(selectedEnquiryToView.id);
                  setSelectedEnquiryToView(null);
                }}
                className="text-xs font-mono text-stone-400 hover:text-crimson-600 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Trash className="w-3.5 h-3.5" />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- MODAL: REPLY TO CUSTOMER ENQUIRY ----------------- */}
      {selectedEnquiryForReply && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-3xl border border-stone-200 shadow-2xl max-w-xl w-full p-6 sm:p-7 space-y-5 text-left relative">
            <div className="flex items-start justify-between border-b border-stone-150 pb-4">
              <div>
                <span className="text-xs font-mono font-bold uppercase text-crimson-600 tracking-wider flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" />
                  Direct Email Response (Resend Transactional Delivery)
                </span>
                <h3 className="font-serif font-bold text-xl text-stone-900 mt-1">
                  Reply to {selectedEnquiryForReply.name}
                </h3>
                <p className="text-xs text-stone-500 font-mono">
                  To: {selectedEnquiryForReply.email}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEnquiryForReply(null)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Original Customer Message Quote */}
            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 text-xs space-y-1">
              <span className="text-[10px] font-mono font-bold text-stone-400 uppercase">Original Message:</span>
              <p className="text-stone-700 line-clamp-3 italic">
                &ldquo;{selectedEnquiryForReply.message}&rdquo;
              </p>
            </div>

            <form onSubmit={handleSendEnquiryReply} className="space-y-4 text-xs font-mono">
              <div className="space-y-1">
                <label className="block text-stone-600 font-bold uppercase">Subject</label>
                <input
                  type="text"
                  value={replySubjectOverride}
                  onChange={(e) => setReplySubjectOverride(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 font-sans text-sm focus:bg-white focus:border-crimson-600 outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-stone-600 font-bold uppercase">Email Response Body</label>
                <textarea
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  rows={6}
                  placeholder={`Dear ${selectedEnquiryForReply.name},\n\nThank you for reaching out to NepalDrive. Regarding your expedition to...`}
                  className="w-full p-3.5 bg-stone-50 border border-stone-200 rounded-2xl text-stone-900 font-sans text-sm focus:bg-white focus:border-crimson-600 outline-none leading-relaxed"
                  required
                />
              </div>

              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-[11px] text-amber-900 flex items-center gap-2 font-sans">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  The message will be sent with Reply-To set to your owner address (aditya.shh15@gmail.com). Status will automatically transition to <strong>REPLIED</strong>.
                </span>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedEnquiryForReply(null)}
                  className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-semibold cursor-pointer transition-colors text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={replySending || !replyMessage.trim()}
                  className="flex-1 py-3 bg-crimson-600 hover:bg-crimson-700 text-white rounded-xl font-semibold flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-colors disabled:opacity-50"
                >
                  {replySending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Sending Email...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Send Email Response</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Document Preview & Fullscreen Inspection Modal */}
      <DocumentPreviewModal
        isOpen={!!selectedDocForModal}
        onClose={() => setSelectedDocForModal(null)}
        document={selectedDocForModal}
      />

      {/* Document Custody Handover Record Modal */}
      {showCustodyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full p-6 space-y-5 border border-stone-200 text-left font-sans">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500/10 text-amber-700 rounded-xl">
                  <ShieldCheck className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-lg text-stone-900">
                    Physical Document Custody Record
                  </h3>
                  <p className="text-xs text-stone-500 font-mono">
                    Booking Reference #{custodyBookingId}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCustodyModal(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-100 cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs space-y-1">
              <p className="font-bold">⚠️ Legal Policy Warning:</p>
              <p>
                Renters should retain their original citizenship certificate and identity documents in their personal custody. Do not require customers to surrender original citizenship certificates as collateral by default. If an original document is voluntarily presented for statutory visual verification or temporary station custody, record the handover and return below.
              </p>
            </div>

            <form onSubmit={handleSaveCustodyRecord} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-stone-500 font-bold uppercase mb-1">
                  Document Presented / Inspected
                </label>
                <select
                  value={custodyDocType}
                  onChange={(e) => setCustodyDocType(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-800 outline-none"
                >
                  <option value="citizenship_original">Original Citizenship Certificate</option>
                  <option value="driving_license_original">Original Nepal Driving License</option>
                  <option value="passport_original">Original Passport</option>
                  <option value="national_id_original">Original National Identity Card (Rastriya Parichayapatra)</option>
                </select>
              </div>

              <div>
                <label className="block text-stone-500 font-bold uppercase mb-1">
                  Custody Notes / Inspection Details
                </label>
                <textarea
                  value={custodyNotes}
                  onChange={(e) => setCustodyNotes(e.target.value)}
                  rows={3}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-800 outline-none"
                  placeholder="e.g., Physical citizenship inspected at Kathmandu Hub, hologram verified, returned immediately to renter."
                  required
                />
              </div>

              <div className="space-y-2 pt-2 border-t border-stone-100">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={custodyStaffAck}
                    onChange={(e) => setCustodyStaffAck(e.target.checked)}
                    className="rounded border-stone-300 text-crimson-600 focus:ring-crimson-500"
                  />
                  <span className="text-stone-700">Staff member confirms documented custody and return procedure.</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={custodyRenterAck}
                    onChange={(e) => setCustodyRenterAck(e.target.checked)}
                    className="rounded border-stone-300 text-crimson-600 focus:ring-crimson-500"
                  />
                  <span className="text-stone-700">Renter acknowledged physical document custody &amp; retention terms.</span>
                </label>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCustodyModal(false)}
                  className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCustody}
                  className="flex-1 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl font-semibold cursor-pointer disabled:opacity-50"
                >
                  {submittingCustody ? 'Saving Record...' : 'Save Custody Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
