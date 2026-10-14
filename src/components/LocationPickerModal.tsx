import React, { useState } from 'react';
import InteractiveMap, { HubLocation } from './InteractiveMap';
import { MapPin, Check, X, Navigation } from 'lucide-react';

interface LocationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (locationName: string, lat?: number, lng?: number) => void;
  initialLocationName?: string;
  title?: string;
}

export default function LocationPickerModal({
  isOpen,
  onClose,
  onConfirm,
  initialLocationName = 'Kathmandu Lazimpat',
  title = 'Select Pickup / Drop-off Station on Nepal Map',
}: LocationPickerModalProps) {
  const [selectedLocation, setSelectedLocation] = useState<HubLocation | null>(null);
  const [customPosition, setCustomPosition] = useState<[number, number] | null>(null);
  const [locationLabel, setLocationLabel] = useState<string>(initialLocationName);

  if (!isOpen) return null;

  const handleSelectHub = (hub: HubLocation) => {
    setSelectedLocation(hub);
    const lat = typeof hub.latitude === 'string' ? parseFloat(hub.latitude) : hub.latitude;
    const lng = typeof hub.longitude === 'string' ? parseFloat(hub.longitude) : hub.longitude;
    setCustomPosition([lat, lng]);
    setLocationLabel(`${hub.city} - ${hub.name}`);
  };

  const handlePickCustom = (lat: number, lng: number, addressHint?: string) => {
    setCustomPosition([lat, lng]);
    setSelectedLocation(null);
    setLocationLabel(addressHint || `Custom Point (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
  };

  const handleApply = () => {
    if (customPosition) {
      onConfirm(locationLabel, customPosition[0], customPosition[1]);
    } else {
      onConfirm(locationLabel);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-stone-950/70 backdrop-blur-xs animate-fade-in text-left">
      <div className="bg-white w-full max-w-4xl rounded-3xl border border-stone-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-stone-900 text-white flex items-center justify-between border-b border-stone-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-crimson-600 rounded-xl">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-sm sm:text-base">{title}</h3>
              <p className="text-xs text-stone-400 font-mono">
                Click any official station marker or pinpoint anywhere in Nepal
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Map Container */}
        <div className="flex-1 min-h-[380px] p-2 sm:p-4 bg-stone-100 overflow-y-auto">
          <InteractiveMap
            height="400px"
            pickerMode={true}
            pickedPosition={customPosition}
            onPickPosition={handlePickCustom}
            selectedLocation={selectedLocation}
            onSelectLocation={handleSelectHub}
            showHubCards={false}
            allowFullscreen={false}
          />
        </div>

        {/* Footer with Selected Location and Confirm button */}
        <div className="p-4 bg-white border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-3 font-mono text-xs">
          <div className="w-full sm:w-auto flex items-center gap-2">
            <span className="text-stone-400 uppercase">Selected:</span>
            <span className="font-bold text-stone-900 bg-stone-100 px-3 py-1.5 rounded-xl border border-stone-200">
              {locationLabel}
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-stone-200 text-stone-600 hover:bg-stone-50 rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="px-5 py-2 bg-crimson-600 hover:bg-crimson-700 text-white font-bold rounded-xl shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              Confirm Station
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
