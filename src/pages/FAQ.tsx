import React from 'react';
import SEO from '../components/SEO';

export default function FAQ() {
  const faqs = [
    {
      q: 'What documents are required to rent a self-drive vehicle in Nepal?',
      a: 'Citizens of Nepal must upload their valid Driver License and Citizenship Certificate. Foreign nationals require an international driving permit (IDP) along with a passport and active visa stamp.',
    },
    {
      q: 'Is fuel included in the standard daily hire price?',
      a: 'No, daily rates are quoted exclusive of fuel. You receive the vehicle with a full tank and are expected to return it with a full tank. Alternatively, we can calculate consumption and invoice it upon return.',
    },
    {
      q: 'How does the security deposit refund process work?',
      a: 'We authorize or collect a security deposit upon pickup (varying from Rs. 5,000 for scooters up to Rs. 45,000 for the Toyota Fortuner). The deposit is fully refunded instantly upon physical return of the vehicle without mechanical or body damage.',
    },
    {
      q: 'Are your vehicles insured for high-altitude zones like Muktinath or Mustang?',
      a: 'Yes, our entire fleet is covered by comprehensive commercial rental insurance that includes high-altitude mountain travel. Third-party liability cover is fully integrated.',
    },
  ];

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    'mainEntity': faqs.map(f => ({
      '@type': 'Question',
      'name': f.q,
      'acceptedAnswer': {
        '@type': 'Answer',
        'text': f.a
      }
    }))
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-16 text-left space-y-12">
      <SEO
        title="FAQ | Rental Requirements &amp; Terms | NepalDrive"
        description="Frequently Asked Questions about vehicle hiring in Nepal. Learn about license requirements, security deposits, road insurance, and driver hire."
        schema={faqSchema}
      />

      <div className="space-y-4">
        <span className="font-mono text-xs uppercase tracking-widest text-crimson-500">
          Have Questions?
        </span>
        <h1 className="text-4xl font-serif font-bold text-stone-900 leading-tight">
          Frequently Asked Questions
        </h1>
        <p className="text-sm text-stone-500 font-light">
          Everything you need to know about renting a car, SUV, or bike in Nepal. Transparent, safe, and professional.
        </p>
      </div>

      <div className="space-y-6 pt-6 divide-y divide-stone-200">
        {faqs.map((faq, idx) => (
          <div key={idx} className={`pt-6 ${idx === 0 ? 'pt-0' : ''} space-y-2`}>
            <h3 className="font-serif font-bold text-lg text-stone-900">{faq.q}</h3>
            <p className="text-sm text-stone-600 leading-relaxed font-light">{faq.a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
