import React, { useState } from 'react';
import { ShieldCheck, FileText, AlertCircle, ChevronDown, ChevronUp, Lock, CheckSquare, Square } from 'lucide-react';

interface RentalAgreementSectionProps {
  confirmIdentity: boolean;
  onConfirmIdentityChange: (val: boolean) => void;
  confirmOriginalRetention: boolean;
  onConfirmOriginalRetentionChange: (val: boolean) => void;
  confirmRentalTerms: boolean;
  onConfirmRentalTermsChange: (val: boolean) => void;
}

export default function RentalAgreementSection({
  confirmIdentity,
  onConfirmIdentityChange,
  confirmOriginalRetention,
  onConfirmOriginalRetentionChange,
  confirmRentalTerms,
  onConfirmRentalTermsChange,
}: RentalAgreementSectionProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-4 space-y-3.5 text-left text-xs">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-amber-500/10 text-amber-700 rounded-lg">
            <ShieldCheck className="w-4 h-4 text-amber-600" />
          </div>
          <span className="font-serif font-bold text-stone-900 text-sm">
            Original ID Document Responsibility &amp; Rental Policy
          </span>
        </div>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-stone-500 hover:text-stone-800 text-[11px] font-mono flex items-center gap-1 cursor-pointer"
        >
          {expanded ? 'Hide Terms' : 'Read Full Terms'}
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      <p className="text-[11px] text-stone-600 leading-relaxed">
        Under Nepal transport law and NepalDrive safety standards, digital copies are authenticated online. <b>You must retain your original citizenship certificate in your personal custody.</b>
      </p>

      {expanded && (
        <div className="bg-white p-3.5 rounded-xl border border-stone-200 space-y-2.5 text-[11px] text-stone-600 leading-relaxed animate-fade-in font-sans">
          <h4 className="font-bold text-stone-900 font-mono text-xs uppercase text-amber-700">
            Mandatory Identity Document Custody &amp; Return Procedure:
          </h4>
          <ul className="list-disc pl-4 space-y-1.5 text-stone-600">
            <li>
              <b>Retain Original Documents:</b> Renters must keep their original citizenship certificate, driving license, and passport in their own possession.
            </li>
            <li>
              <b>No Default Surrender of Original ID:</b> NepalDrive strictly prohibits demanding the surrender of original citizenship certificates as rental collateral by default.
            </li>
            <li>
              <b>Physical Verification:</b> If an authorized station agent requires in-person inspection of the physical document at vehicle handover, present it for verification and take it back immediately.
            </li>
            <li>
              <b>Documented Handover (If Applicable):</b> If an original document is voluntarily handed to an authorized staff member for an agreed statutory purpose, both parties must sign a timestamped Document Custody Record.
            </li>
            <li>
              <b>Staff Custody Responsibility:</b> Staff members receiving physical documents are legally bound to documented safekeeping and prompt return procedures.
            </li>
            <li>
              <b>Fair Liability &amp; Dispute Resolution:</b> The business does not unilaterally declare renters solely liable for lost documents; responsibility is determined by factual evidence, station logs, and applicable Nepalese law.
            </li>
            <li>
              <b>Lost Document &amp; Grievance Hotline:</b> Any document custody issue may be escalated immediately to <code>support@nepaldrive.com</code> or our 24/7 Kathmandu operations desk.
            </li>
          </ul>
        </div>
      )}

      {/* 3 Mandatory Checkboxes */}
      <div className="space-y-2.5 pt-2 border-t border-stone-200/80">
        <label className="flex items-start gap-2.5 cursor-pointer group">
          <input
            type="checkbox"
            checked={confirmIdentity}
            onChange={(e) => onConfirmIdentityChange(e.target.checked)}
            className="mt-0.5 rounded border-stone-300 text-crimson-600 focus:ring-crimson-500 cursor-pointer h-4 w-4 shrink-0"
            required
          />
          <span className="text-[11px] text-stone-700 leading-snug group-hover:text-stone-950 transition-colors">
            1. I confirm that the uploaded identity documents belong to me and that the information provided is accurate. *
          </span>
        </label>

        <label className="flex items-start gap-2.5 cursor-pointer group">
          <input
            type="checkbox"
            checked={confirmOriginalRetention}
            onChange={(e) => onConfirmOriginalRetentionChange(e.target.checked)}
            className="mt-0.5 rounded border-stone-300 text-crimson-600 focus:ring-crimson-500 cursor-pointer h-4 w-4 shrink-0"
            required
          />
          <span className="text-[11px] text-stone-700 leading-snug group-hover:text-stone-950 transition-colors">
            2. I understand that I must keep my original citizenship and identity documents safe and should not leave them as collateral. *
          </span>
        </label>

        <label className="flex items-start gap-2.5 cursor-pointer group">
          <input
            type="checkbox"
            checked={confirmRentalTerms}
            onChange={(e) => onConfirmRentalTermsChange(e.target.checked)}
            className="mt-0.5 rounded border-stone-300 text-crimson-600 focus:ring-crimson-500 cursor-pointer h-4 w-4 shrink-0"
            required
          />
          <span className="text-[11px] text-stone-700 leading-snug group-hover:text-stone-950 transition-colors">
            3. I have read and agree to the rental terms and identity verification policy. *
          </span>
        </label>
      </div>
    </div>
  );
}
