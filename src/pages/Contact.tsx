import React, { useState, useEffect } from 'react';
import SEO from '../components/SEO';
import { 
  Mail, 
  Phone, 
  MapPin, 
  CheckCircle2, 
  AlertCircle, 
  Send, 
  Clock, 
  ShieldCheck, 
  MessageSquare, 
  Sparkles,
  ChevronDown,
  ChevronUp,
  Headphones,
  Compass
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../store/AuthContext';

const QUICK_SUBJECTS = [
  'Expedition 4x4 Jeep Planning',
  'Upper Mustang & Manang Permits',
  'Corporate & Delegation Fleet',
  'Luxury SUV with Driver Hire',
  'Self-Drive Terms & Insurance',
  'General Inquiry'
];

const FAQS = [
  {
    q: 'Do foreign tourists need an International Driving Permit (IDP)?',
    a: 'Yes, international travelers need a valid driving license from their home country along with an International Driving Permit (IDP) or certified English translation for self-drive rentals in Nepal.'
  },
  {
    q: 'What is included in the rental price?',
    a: 'All rentals include comprehensive third-party insurance, 24/7 mountain roadside emergency assistance, standard road tax, and pre-trip mechanical inspection. Fuel is calculated based on your selected preference (with fuel or standard return).'
  },
  {
    q: 'Can NepalDrive deliver the vehicle directly to Tribhuvan International Airport (KTM)?',
    a: 'Yes! We offer VIP airport drop-off and pickup across Kathmandu (KTM) and Pokhara (PKR) domestic airport terminals at your requested arrival time.'
  },
  {
    q: 'What happens in case of high-altitude breakdowns or flat tires?',
    a: 'Our vehicles come with heavy-duty all-terrain tires, full-size spares, and high-altitude emergency kits. We maintain emergency vehicle recovery contacts along all major highway corridors across Nepal.'
  }
];

export default function Contact() {
  const { user } = useAuth();

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [hpField, setHpField] = useState('');
  const [formStartTime, setFormStartTime] = useState<number>(Date.now());

  // UI States
  const [submitting, setSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<{
    enquiry_id: number;
    name: string;
    email: string;
    subject: string;
    created_at: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Autofill if user is logged in
  useEffect(() => {
    setFormStartTime(Date.now());
    if (user) {
      if (!name) setName(user.full_name || '');
      if (!email) setEmail(user.email || '');
      if (!phone && user.phone) setPhone(user.phone || '');
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Client side validation
    if (!name.trim() || name.trim().length < 2) {
      setErrorMessage('Please enter your full name (at least 2 characters).');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (!subject.trim() || subject.trim().length < 3) {
      setErrorMessage('Please provide a descriptive subject (at least 3 characters).');
      return;
    }
    if (!message.trim() || message.trim().length < 10) {
      setErrorMessage('Please provide a message with at least 10 characters.');
      return;
    }

    setSubmitting(true);

    try {
      const res = await api.submitContactForm({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        subject: subject.trim(),
        message: message.trim(),
        hp_field: hpField,
        form_start_time: formStartTime,
      });

      if (res.success) {
        setSuccessData(res.data || {
          enquiry_id: Date.now(),
          name: name.trim(),
          email: email.trim(),
          subject: subject.trim(),
          created_at: new Date().toISOString(),
        });
        // Clear fields
        setName(user ? user.full_name : '');
        setEmail(user ? user.email : '');
        setPhone(user?.phone || '');
        setSubject('');
        setMessage('');
      } else {
        setErrorMessage(res.message || 'Failed to submit contact enquiry. Please try again.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Network connection failed. Please check your internet connection or call our support line.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setSuccessData(null);
    setErrorMessage(null);
    setFormStartTime(Date.now());
  };

  return (
    <div className="min-h-screen bg-stone-50 py-12 px-4 sm:px-6 lg:px-8">
      <SEO
        title="Contact NepalDrive | 24/7 Himalayan Travel Concierge & Hotline"
        description="Connect with NepalDrive fleet managers in Kathmandu & Pokhara. 24/7 mountain support, custom 4x4 expedition quotes, and fast email response."
      />

      {/* Header Banner */}
      <div className="max-w-6xl mx-auto mb-10 text-center">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-crimson-50 text-crimson-600 border border-crimson-150 text-xs font-mono font-bold uppercase tracking-wider mb-3">
          <Headphones className="w-3.5 h-3.5" />
          Himalayan Fleet Concierge &amp; Support
        </span>
        <h1 className="text-3xl sm:text-5xl font-serif font-bold text-stone-900 tracking-tight">
          Let&apos;s Plan Your Nepal Journey
        </h1>
        <p className="mt-3 text-stone-600 text-sm sm:text-base max-w-2xl mx-auto font-light">
          Whether you need advice on high-altitude mountain passes, corporate fleet rates, or luxury self-drive reservations, our concierge team is on standby 24/7.
        </p>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Direct Contact Hub & FAQ (5 cols) */}
        <div className="lg:col-span-5 space-y-6 text-left">
          
          {/* Main Info Card */}
          <div className="bg-white p-6 sm:p-7 rounded-3xl border border-stone-200 shadow-sm space-y-6">
            <h2 className="text-lg font-serif font-bold text-stone-900 flex items-center gap-2">
              <Compass className="w-5 h-5 text-crimson-600" />
              Direct Contact Hubs
            </h2>

            <div className="space-y-4 text-sm">
              
              {/* Emergency Hotline */}
              <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-stone-50 border border-stone-150">
                <div className="p-2.5 bg-crimson-100 text-crimson-700 rounded-xl shrink-0">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-[11px] font-mono text-stone-500 uppercase tracking-wider font-semibold">24/7 Roadside Hotline</span>
                  <a href="tel:9703900903" className="text-base font-mono font-bold text-stone-900 hover:text-crimson-600 transition-colors block">
                    9703900903
                  </a>
                  <span className="text-xs text-stone-500 font-mono">Toll-free inside Nepal &bull; WhatsApp active</span>
                </div>
              </div>

              {/* Email Desk */}
              <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-stone-50 border border-stone-150">
                <div className="p-2.5 bg-crimson-100 text-crimson-700 rounded-xl shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-[11px] font-mono text-stone-500 uppercase tracking-wider font-semibold">Concierge Email Desk</span>
                  <a href="mailto:contact@nepaldrive.com" className="text-sm font-semibold text-stone-900 hover:text-crimson-600 transition-colors block">
                    contact@nepaldrive.com
                  </a>
                  <span className="text-xs text-stone-500">Average response time: 2 hours</span>
                </div>
              </div>

              {/* Kathmandu Hub */}
              <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-stone-50 border border-stone-150">
                <div className="p-2.5 bg-crimson-100 text-crimson-700 rounded-xl shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-[11px] font-mono text-stone-500 uppercase tracking-wider font-semibold">Kathmandu Headquarters</span>
                  <p className="text-xs text-stone-800 font-medium">
                    Lazimpat Embassy Corridor, Kathmandu Valley
                  </p>
                  <span className="text-[11px] text-stone-500">Showroom open: 07:00 AM - 08:30 PM NST</span>
                </div>
              </div>

              {/* Pokhara Branch */}
              <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-stone-50 border border-stone-150">
                <div className="p-2.5 bg-stone-150 text-stone-700 rounded-xl shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-[11px] font-mono text-stone-500 uppercase tracking-wider font-semibold">Pokhara Lake City Depot</span>
                  <p className="text-xs text-stone-800 font-medium">
                    Lakeside Center, Baidam, Pokhara (Opposite Phewa Lake)
                  </p>
                  <span className="text-[11px] text-stone-500">Expedition staging &amp; vehicle return center</span>
                </div>
              </div>

            </div>

            {/* Response Guarantee Badge */}
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex items-center gap-3">
              <Clock className="w-5 h-5 text-amber-600 shrink-0" />
              <p className="text-xs text-amber-900 leading-relaxed">
                <strong>Guaranteed Response:</strong> All online inquiries receive a personalized answer from a senior Nepal expedition specialist within 2-4 hours.
              </p>
            </div>
          </div>

          {/* Quick FAQ Accordion */}
          <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm space-y-4">
            <h3 className="text-sm font-mono font-bold text-stone-900 uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-green-600" />
              Frequently Asked Questions
            </h3>
            <div className="space-y-2.5">
              {FAQS.map((faq, idx) => (
                <div 
                  key={idx} 
                  className="border border-stone-150 rounded-xl overflow-hidden transition-all bg-stone-50/50"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                    className="w-full p-3 text-left text-xs font-semibold text-stone-900 flex justify-between items-center gap-2 hover:bg-stone-100/60 transition-colors"
                  >
                    <span>{faq.q}</span>
                    {openFaq === idx ? (
                      <ChevronUp className="w-4 h-4 text-stone-400 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-stone-400 shrink-0" />
                    )}
                  </button>
                  {openFaq === idx && (
                    <div className="px-3 pb-3 text-xs text-stone-600 leading-relaxed border-t border-stone-150/60 pt-2 bg-white">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column: Contact Form & Interactive States (7 cols) */}
        <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 shadow-sm text-left">
          
          {successData ? (
            /* SUCCESS CONFIRMATION STATE */
            <div className="space-y-6 py-4 animate-fade-in">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-3xl flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="text-center space-y-2">
                <span className="inline-block font-mono text-xs font-bold text-green-700 bg-green-50 px-3 py-1 rounded-full border border-green-200">
                  Reference #ND-{successData.enquiry_id}
                </span>
                <h2 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900">
                  Message Dispatched to Fleet Desk
                </h2>
                <p className="text-sm text-stone-600 max-w-md mx-auto leading-relaxed">
                  Thank you, <strong>{successData.name}</strong>. A notification email has been routed to our fleet desk, and a confirmation summary was sent to <strong>{successData.email}</strong>.
                </p>
              </div>

              {/* Summary Card */}
              <div className="p-5 bg-stone-50 rounded-2xl border border-stone-200 text-xs space-y-3 font-mono">
                <div className="flex justify-between border-b border-stone-200 pb-2">
                  <span className="text-stone-500">Subject:</span>
                  <span className="font-bold text-stone-900 text-right">{successData.subject}</span>
                </div>
                <div className="flex justify-between border-b border-stone-200 pb-2">
                  <span className="text-stone-500">Recipient Desk:</span>
                  <span className="font-bold text-crimson-700">NepalDrive Lazimpat Concierge</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Target Reply Time:</span>
                  <span className="font-bold text-green-700">Within 2 Hours</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="flex-1 py-3 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold shadow-sm transition-colors text-center cursor-pointer"
                >
                  Send Another Inquiry
                </button>
                <a
                  href="/#/vehicles"
                  className="flex-1 py-3 px-4 rounded-xl bg-crimson-600 hover:bg-crimson-700 text-white text-xs font-semibold shadow-sm transition-colors text-center cursor-pointer"
                >
                  Browse Available Fleet &rarr;
                </a>
              </div>
            </div>
          ) : (
            /* INTERACTIVE CONTACT FORM */
            <div className="space-y-6">
              
              <div>
                <h2 className="text-2xl font-serif font-bold text-stone-900 flex items-center gap-2">
                  <MessageSquare className="w-6 h-6 text-crimson-600" />
                  Send an Expedition Inquiry
                </h2>
                <p className="text-xs sm:text-sm text-stone-500 mt-1 font-light">
                  Fill in your expedition requirements. Our team will verify vehicle availability, permits, and route logistics.
                </p>
              </div>

              {/* Error Alert */}
              {errorMessage && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-xs text-red-700 animate-fade-in">
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <strong className="font-semibold block">Submission Error</strong>
                    <span>{errorMessage}</span>
                  </div>
                </div>
              )}

              {/* Quick Subject Pills */}
              <div className="space-y-2">
                <label className="block text-xs font-mono font-medium text-stone-500 uppercase">
                  Quick Topics / Expeditions
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_SUBJECTS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSubject(s)}
                      className={`text-xs px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                        subject === s
                          ? 'bg-crimson-600 text-white border-crimson-600 shadow-xs font-semibold'
                          : 'bg-stone-50 text-stone-700 border-stone-200 hover:border-crimson-300 hover:bg-stone-100'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* Honeypot Spam Trap (Hidden from real users) */}
                <div className="hidden" aria-hidden="true">
                  <input
                    type="text"
                    name="hp_field"
                    tabIndex={-1}
                    value={hpField}
                    onChange={(e) => setHpField(e.target.value)}
                    autoComplete="off"
                  />
                </div>

                {/* Name & Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-mono font-semibold text-stone-700 uppercase">
                      Your Full Name <span className="text-crimson-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Aditya Shah / John Doe"
                      className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:border-crimson-600 focus:ring-1 focus:ring-crimson-600 outline-none transition-all"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-mono font-semibold text-stone-700 uppercase">
                      Email Address <span className="text-crimson-600">*</span>
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@domain.com"
                      className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:border-crimson-600 focus:ring-1 focus:ring-crimson-600 outline-none transition-all"
                      required
                    />
                  </div>
                </div>

                {/* Phone & Subject */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-mono font-semibold text-stone-700 uppercase">
                      Phone / WhatsApp <span className="text-stone-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+977-9841234567 or +1 (555)..."
                      className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:border-crimson-600 focus:ring-1 focus:ring-crimson-600 outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-mono font-semibold text-stone-700 uppercase">
                      Subject <span className="text-crimson-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="e.g. Fortuner hire for 5 days in May"
                      className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:border-crimson-600 focus:ring-1 focus:ring-crimson-600 outline-none transition-all"
                      required
                    />
                  </div>
                </div>

                {/* Message */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="block text-xs font-mono font-semibold text-stone-700 uppercase">
                      Expedition Details / Message <span className="text-crimson-600">*</span>
                    </label>
                    <span className="text-[10px] font-mono text-stone-400">
                      {message.length} / 3000 chars
                    </span>
                  </div>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={5}
                    placeholder="Describe your planned travel dates, pickup location (Kathmandu/Pokhara), number of travelers, self-drive or with driver preference, and any specific route questions..."
                    className="w-full p-3.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs sm:text-sm font-normal focus:bg-white focus:border-crimson-600 focus:ring-1 focus:ring-crimson-600 outline-none transition-all leading-relaxed"
                    required
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 bg-crimson-600 hover:bg-crimson-700 text-white font-semibold text-xs uppercase tracking-wider rounded-2xl shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Transmitting to Concierge Desk...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Submit Inquiry to Fleet Desk</span>
                    </>
                  )}
                </button>

                <p className="text-[11px] text-stone-400 text-center font-mono">
                  Protected by anti-spam velocity verification &bull; Zero spam policy
                </p>

              </form>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
