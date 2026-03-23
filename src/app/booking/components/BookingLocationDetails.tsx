import React, { Dispatch, SetStateAction } from "react";
import { User, MapPin, Phone, Home, MessageSquare } from "lucide-react";

interface BookingLocationDetailsProps {
  selectedServiceData: any;
  location: string;
  setLocation: Dispatch<SetStateAction<string>>;
  clientPhone: string;
  setClientPhone: Dispatch<SetStateAction<string>>;
  clientAddress: string;
  setClientAddress: Dispatch<SetStateAction<string>>;
  notes: string;
  setNotes: Dispatch<SetStateAction<string>>;
}

export default function BookingLocationDetails({
  selectedServiceData,
  location,
  setLocation,
  clientPhone,
  setClientPhone,
  clientAddress,
  setClientAddress,
  notes,
  setNotes,
}: BookingLocationDetailsProps) {
  return (
    <>
      {/* Location */}
      {selectedServiceData?.locationType !== "PROVIDER_LOCATION" && (
        <div className="space-y-2 sm:space-y-3">
          <label className="block text-base sm:text-lg font-bold text-gray-900">
            Location{" "}
            {selectedServiceData?.locationType === "CLIENT_LOCATION"
              ? "*"
              : "(Optional)"}
          </label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder={
                selectedServiceData?.locationType === "CLIENT_LOCATION"
                  ? "Enter your location"
                  : "Specify preferred location or leave blank to negotiate"
              }
              className="w-full pl-10 sm:pl-12 pr-4 py-2.5 sm:py-3 border border-gray-200 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-gray-900 text-sm sm:text-base"
              required={selectedServiceData?.locationType === "CLIENT_LOCATION"}
            />
          </div>
        </div>
      )}

      {/* Contact Information */}
      <div className="space-y-3 sm:space-y-4">
        <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2 sm:mb-4 flex items-center gap-1.5 sm:gap-2">
          <User className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
          Contact Information
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          {/* Phone Number */}
          <div className="space-y-1.5 sm:space-y-2">
            <label className="block text-sm font-semibold text-gray-900">
              Phone Number <span className="text-red-600">*</span>
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="tel"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="+254 712 345 678"
                className="w-full pl-10 pr-4 py-2.5 sm:py-3 border border-gray-200 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-gray-900 text-sm sm:text-base"
                required
              />
            </div>
            <p className="text-xs text-gray-500">
              We'll use this to confirm your booking
            </p>
          </div>

          {/* Address */}
          <div className="space-y-1.5 sm:space-y-2">
            <label className="block text-sm font-semibold text-gray-900">
              Address <span className="text-red-600">*</span>
            </label>
            <div className="relative">
              <Home className="absolute left-3 top-3 text-gray-400 w-4 h-4" />
              <textarea
                value={clientAddress}
                onChange={(e) => setClientAddress(e.target.value)}
                rows={2}
                placeholder="Enter your full address..."
                className="w-full pl-10 pr-4 py-2.5 sm:py-3 border border-gray-200 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-gray-900 text-sm sm:text-base resize-none"
                required
              />
            </div>
          </div>
        </div>
      </div>

      {/* Additional Notes */}
      <div className="space-y-2 sm:space-y-3">
        <label className="block text-base sm:text-lg font-bold text-gray-900">
          Additional Notes (Optional)
        </label>
        <div className="relative">
          <MessageSquare className="absolute left-3 top-3 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Any special requirements or notes for the professional..."
            className="w-full pl-10 sm:pl-12 pr-4 py-2.5 sm:py-3 border border-gray-200 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-gray-900 text-sm sm:text-base resize-none"
          />
        </div>
      </div>
    </>
  );
}
