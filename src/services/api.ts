const API_BASE_URL = '/api/v1';

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('nepaldrive_token');
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });
  } catch (netErr: any) {
    const netError: any = new Error(`Network connection error: ${netErr.message || 'Unable to reach backend server'}`);
    netError.status = 0;
    throw netError;
  }

  const contentType = response.headers.get('content-type') || '';
  let data: any;

  if (contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      data = { success: false, message: `Invalid JSON response from server (${response.status})` };
    }
  } else {
    // Received non-JSON (e.g. HTML error page or raw text from hosting provider)
    const rawText = await response.text().catch(() => '');
    const cleanSnippet = rawText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120);
    data = {
      success: false,
      message: cleanSnippet ? `Server error (${response.status}): ${cleanSnippet}` : `HTTP ${response.status} ${response.statusText}`,
      raw: rawText,
    };
  }

  if (!response.ok) {
    const errorMsg =
      data?.message ||
      (typeof data?.error === 'string' ? data.error : data?.error?.message) ||
      (response.status === 500
        ? 'Backend service encountered a server error. If this is a new Vercel deployment, please check DATABASE_URL in Vercel Project Settings.'
        : `API request failed with status ${response.status}${response.statusText ? ` (${response.statusText})` : ''}`);

    const error: any = new Error(errorMsg);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  // System & Diagnostics
  getHealth: () => apiFetch('/health'),

  // Authentication
  login: (credentials: any) => apiFetch('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  register: (payload: any) => apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  verifyEmail: (token: string) => apiFetch('/auth/verify-email', { method: 'POST', body: JSON.stringify({ token }) }),
  getMe: () => apiFetch('/auth/me'),
  forgotPassword: (email: string) => apiFetch('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (payload: any) => apiFetch('/auth/reset-password', { method: 'POST', body: JSON.stringify(payload) }),

  // Vehicles
  getVehicles: (params: Record<string, string | boolean> = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== '') {
        query.append(key, val.toString());
      }
    });
    return apiFetch(`/vehicles?${query.toString()}`);
  },
  getVehicleBySlug: (slug: string) => apiFetch(`/vehicles/${slug}`),

  // Bookings
  createBooking: (booking: any) => apiFetch('/bookings', { method: 'POST', body: JSON.stringify(booking) }),
  getBookings: () => apiFetch('/bookings'),
  getAdminBookings: () => apiFetch('/admin/bookings'),
  getBookingDetails: (id: number) => apiFetch(`/bookings/${id}`),
  cancelBooking: (id: number) => apiFetch(`/bookings/${id}/cancel`, { method: 'POST' }),

  // Identity Documents & KYC Verification
  uploadDocument: (payload: {
    document_type: string;
    file_data: string;
    file_name: string;
    mime_type: string;
    booking_id?: number;
  }) => apiFetch('/documents/upload', { method: 'POST', body: JSON.stringify(payload) }),
  getMyDocuments: () => apiFetch('/documents/my'),
  deleteDocument: (id: number) => apiFetch(`/documents/${id}`, { method: 'DELETE' }),

  // Owner/Admin Document Verification
  getAdminDocuments: (status?: string) => {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    return apiFetch(`/admin/documents${query}`);
  },
  verifyDocument: (id: number, action: 'Approved' | 'Rejected', reason?: string) =>
    apiFetch(`/admin/documents/${id}/verify`, { method: 'POST', body: JSON.stringify({ action, reason }) }),

  // Rental Agreement Acceptance & Responsibility Consent
  acceptRentalAgreement: (payload: {
    booking_id?: number;
    confirm_identity_ownership: boolean;
    confirm_original_retention: boolean;
    confirm_rental_terms: boolean;
  }) => apiFetch('/agreements/accept', { method: 'POST', body: JSON.stringify(payload) }),

  // Document Custody Records (Handover & Return Procedure)
  getCustodyRecords: (bookingId: number) => apiFetch(`/bookings/${bookingId}/custody`),
  createCustodyRecord: (bookingId: number, payload: any) =>
    apiFetch(`/admin/bookings/${bookingId}/custody`, { method: 'POST', body: JSON.stringify(payload) }),

  // Favorites
  getFavorites: () => apiFetch('/favorites'),
  addFavorite: (vehicleId: number) => apiFetch('/favorites', { method: 'POST', body: JSON.stringify({ vehicle_id: vehicleId }) }),
  removeFavorite: (vehicleId: number) => apiFetch(`/favorites/${vehicleId}`, { method: 'DELETE' }),

  // Payments & QR Receipts
  verifyPayment: (payload: { booking_id: number; transaction_ref?: string; gateway: string }) =>
    apiFetch('/payments/verify', { method: 'POST', body: JSON.stringify(payload) }),
  submitPaymentReceipt: (payload: { booking_id: number; receipt_image?: string; transaction_id?: string; payment_notes?: string }) =>
    apiFetch('/payments/submit-receipt', { method: 'POST', body: JSON.stringify(payload) }),

  // Reviews System
  submitReview: (payload: { booking_id: number; vehicle_id: number; rating: number; comment: string }) =>
    apiFetch('/reviews', { method: 'POST', body: JSON.stringify(payload) }),
  getMyReviews: () => apiFetch('/reviews/my'),
  getVehicleReviews: (vehicleId: number) => apiFetch(`/vehicles/${vehicleId}/reviews`),

  // User Profile & Avatar
  updateProfile: (payload: any) => apiFetch('/users/profile', { method: 'PATCH', body: JSON.stringify(payload) }),

  // Secured Admin Area
  getAdminStats: () => apiFetch('/admin/stats'),
  getAdminUsers: () => apiFetch('/admin/users'),
  updateUserRole: (id: number, role: string) => apiFetch(`/admin/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }),
  verifyUser: (id: number, is_verified: boolean, notes?: string) =>
    apiFetch(`/admin/users/${id}/verify`, { method: 'PATCH', body: JSON.stringify({ is_verified, notes }) }),
  getAdminAuditLogs: () => apiFetch('/admin/audit-logs'),
  createVehicle: (payload: any) => apiFetch('/admin/vehicles', { method: 'POST', body: JSON.stringify(payload) }),
  deleteVehicle: (id: number) => apiFetch(`/admin/vehicles/${id}`, { method: 'DELETE' }),
  updateBookingStatus: (id: number, status: string, paymentStatus?: string) =>
    apiFetch(`/admin/bookings/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status, payment_status: paymentStatus }) }),
  verifyBooking: (id: number, action: string, notes?: string) =>
    apiFetch(`/admin/bookings/${id}/verify`, { method: 'PATCH', body: JSON.stringify({ action, notes }) }),
  updateVehicleStatus: (id: number, availability_status: string) =>
    apiFetch(`/admin/vehicles/${id}/status`, { method: 'PATCH', body: JSON.stringify({ availability_status }) }),

  // Map & Hub Locations
  getMapConfig: () => apiFetch('/config/map'),
  getLocations: () => apiFetch('/locations'),
  getLocationBySlug: (slug: string) => apiFetch(`/locations/${slug}`),
  createLocation: (payload: any) => apiFetch('/admin/locations', { method: 'POST', body: JSON.stringify(payload) }),
  deleteLocation: (id: number) => apiFetch(`/admin/locations/${id}`, { method: 'DELETE' }),
  geocodeLocation: (query: string) => apiFetch(`/geocode?q=${encodeURIComponent(query)}`),

  // Ride Routes & Destinations
  getRideRoutes: () => apiFetch('/routes'),

  // Contact Form & Enquiries
  submitContactForm: (payload: {
    name: string;
    email: string;
    phone?: string;
    subject: string;
    message: string;
    hp_field?: string;
    form_start_time?: number;
  }) => apiFetch('/contact', { method: 'POST', body: JSON.stringify(payload) }),
  getAdminEnquiries: (status?: string) => {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    return apiFetch(`/admin/enquiries${query}`);
  },
  updateAdminEnquiry: (id: number, payload: { status?: string; admin_notes?: string }) =>
    apiFetch(`/admin/enquiries/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  replyAdminEnquiry: (id: number, payload: { reply_message: string; subject_override?: string }) =>
    apiFetch(`/admin/enquiries/${id}/reply`, { method: 'POST', body: JSON.stringify(payload) }),
  deleteAdminEnquiry: (id: number) =>
    apiFetch(`/admin/enquiries/${id}`, { method: 'DELETE' }),
};
