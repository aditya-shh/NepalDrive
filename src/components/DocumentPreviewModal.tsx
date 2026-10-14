import React from 'react';
import { X, Download, ShieldCheck, Clock, AlertTriangle, FileText, ExternalLink, Calendar, HardDrive } from 'lucide-react';

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: {
    id: number;
    document_type: string;
    original_filename: string;
    mime_type: string;
    file_size?: number;
    verification_status: string;
    uploaded_at?: string;
    rejection_reason?: string | null;
    preview_url?: string;
    download_url?: string;
    history?: any[];
  } | null;
}

export default function DocumentPreviewModal({ isOpen, onClose, document }: DocumentPreviewModalProps) {
  if (!isOpen || !document) return null;

  const isPdf = document.mime_type === 'application/pdf' || document.original_filename?.toLowerCase().endsWith('.pdf');

  const formatDocTypeName = (type: string) => {
    switch (type) {
      case 'citizenship_front':
        return 'Citizenship Certificate (Front)';
      case 'citizenship_back':
        return 'Citizenship Certificate (Back)';
      case 'driving_license':
        return 'Government Driving License';
      case 'passport':
        return 'Passport & Tourist Visa';
      default:
        return 'Identity Document';
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div
        className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-stone-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-stone-100 flex items-center justify-between gap-4 bg-stone-50/70">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 bg-stone-900 text-white rounded-2xl shrink-0 shadow-sm">
              <FileText className="w-5 h-5 text-amber-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-serif font-bold text-stone-900 text-base sm:text-lg truncate">
                  {formatDocTypeName(document.document_type)}
                </h3>
                <span
                  className={`text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-full ${
                    document.verification_status === 'Approved'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : document.verification_status === 'Rejected'
                      ? 'bg-red-100 text-red-800 border border-red-200'
                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                  }`}
                >
                  {document.verification_status === 'Approved' && '✓ Approved'}
                  {document.verification_status === 'Rejected' && '✕ Rejected'}
                  {document.verification_status === 'Pending' && '⏳ Pending Review'}
                </span>
              </div>
              <p className="text-xs text-stone-500 font-mono truncate mt-0.5">
                {document.original_filename} &middot; {formatFileSize(document.file_size)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {document.download_url && (
              <a
                href={document.download_url}
                download={document.original_filename}
                className="px-3 py-1.5 bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs font-mono font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Download Document"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Download</span>
              </a>
            )}
            <button
              onClick={onClose}
              className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
              aria-label="Close Preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Rejection Alert Banner if Rejected */}
        {document.verification_status === 'Rejected' && document.rejection_reason && (
          <div className="bg-red-50 border-b border-red-100 p-4 text-xs text-red-900 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold block">Owner Review Rejection Reason:</strong>
              <p className="mt-0.5 text-red-800 leading-relaxed">{document.rejection_reason}</p>
              <p className="mt-1 text-[11px] text-red-600">
                Please re-upload a clear, un-cropped, high-resolution photo or PDF scan meeting these criteria.
              </p>
            </div>
          </div>
        )}

        {/* Modal Body / Viewer */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 bg-stone-900/5 flex items-center justify-center min-h-[320px]">
          {isPdf ? (
            <div className="w-full h-[550px] bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-inner flex flex-col items-center justify-center p-6 text-center">
              <iframe
                src={document.preview_url}
                className="w-full h-full rounded-xl border-0"
                title={document.original_filename}
              />
            </div>
          ) : document.preview_url ? (
            <div className="relative max-h-[600px] flex items-center justify-center">
              <img
                src={document.preview_url}
                alt={document.original_filename}
                className="max-h-[580px] max-w-full object-contain rounded-2xl border border-stone-200/60 shadow-lg bg-stone-950/5"
              />
            </div>
          ) : (
            <div className="text-center p-8 text-stone-400 font-mono text-xs">
              No preview available for this file type.
            </div>
          )}
        </div>

        {/* Footer / Meta & History */}
        <div className="p-4 sm:p-5 bg-white border-t border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-stone-500 font-mono">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {document.uploaded_at && (
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-stone-400" />
                Uploaded: {new Date(document.uploaded_at).toLocaleDateString()} at{' '}
                {new Date(document.uploaded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-stone-400" />
              Format: {document.mime_type}
            </span>
          </div>

          <div className="text-[11px] text-stone-400 text-right">
            <span>Encrypted at rest &middot; Private short-lived signed access</span>
          </div>
        </div>
      </div>
    </div>
  );
}
