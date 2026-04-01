import React, { Dispatch, SetStateAction } from "react";
import { Home, MapPin, MessageSquare, Phone, User } from "lucide-react";
import type { ProfessionalDetail } from "@/lib/api/hooks/useProfessional";

type BookingService = ProfessionalDetail["services"][number];

interface BookingLocationDetailsProps {
  selectedServiceData?: BookingService;
  location: string;
  setLocation: Dispatch<SetStateAction<string>>;
  clientPhone: string;
  setClientPhone: Dispatch<SetStateAction<string>>;
  clientAddress: string;
  setClientAddress: Dispatch<SetStateAction<string>>;
  notes: string;
  setNotes: Dispatch<SetStateAction<string>>;
}

function getLocationCopy(locationType?: string | null) {
  switch (locationType) {
    case "CLIENT_LOCATION":
      return {
        title: "Service happens at your location",
        hint: "Share the area or exact site so the provider can plan travel.",
      };
    case "PROVIDER_LOCATION":
      return {
        title: "Service happens at the provider's location",
        hint: "Your address is still useful for contact and billing details.",
      };
    case "REMOTE":
      return {
        title: "This service can be delivered remotely",
        hint: "You can still add notes if there are tools or links to prepare.",
      };
    default:
      return {
        title: "Location can be confirmed after request",
        hint: "Add your preferred meeting point or leave it blank for negotiation.",
      };
  }
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
  const locationCopy = getLocationCopy(selectedServiceData?.locationType);

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-3.5 sm:p-4">
        <p className="text-sm font-semibold text-slate-900">
          {locationCopy.title}
        </p>
        <p className="mt-1 text-[13px] leading-5 text-slate-600 sm:text-sm sm:leading-6">
          {locationCopy.hint}
        </p>
      </div>

      {selectedServiceData?.locationType !== "PROVIDER_LOCATION" ? (
        <div className="space-y-2">
          <label className="block text-sm font-bold text-slate-950 sm:text-base">
            Service location{" "}
            {selectedServiceData?.locationType === "CLIENT_LOCATION" ? (
              <span className="text-red-600">*</span>
            ) : (
              <span className="text-slate-400">(Optional)</span>
            )}
          </label>
          <div className="relative">
            <MapPin className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 sm:left-4" />
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder={
                selectedServiceData?.locationType === "CLIENT_LOCATION"
                  ? "Estate, building, or nearby landmark"
                  : "Preferred meeting point or leave blank"
              }
              className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-[13px] text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 sm:py-3 sm:pl-11 sm:pr-4 sm:text-sm"
              required={selectedServiceData?.locationType === "CLIENT_LOCATION"}
            />
          </div>
        </div>
      ) : null}

      <div className="space-y-3.5 sm:space-y-4">
        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-950 sm:text-base">
          <User className="h-4 w-4 text-emerald-600" />
          Contact details
        </h3>

        <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <label className="block text-[13px] font-semibold text-slate-900 sm:text-sm">
              Phone number <span className="text-red-600">*</span>
            </label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 sm:left-4" />
              <input
                type="tel"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="+254 7XX XXX XXX"
                className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-[13px] text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 sm:py-3 sm:pl-11 sm:pr-4 sm:text-sm"
                required
              />
            </div>
            <p className="text-xs text-slate-500">
              Used for booking confirmation and schedule updates.
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-[13px] font-semibold text-slate-900 sm:text-sm">
              Address <span className="text-red-600">*</span>
            </label>
            <div className="relative">
              <Home className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 sm:left-4 sm:top-3.5" />
              <textarea
                value={clientAddress}
                onChange={(e) => setClientAddress(e.target.value)}
                rows={3}
                placeholder="Full address, apartment, gate, or any check-in instructions"
                className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-[13px] text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 sm:py-3 sm:pl-11 sm:pr-4 sm:text-sm"
                required
              />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-bold text-slate-950 sm:text-base">
          Notes for the professional
          <span className="ml-1.5 text-xs font-normal text-slate-400 sm:ml-2 sm:text-sm">
            (Optional)
          </span>
        </label>
        <div className="relative">
          <MessageSquare className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 sm:left-4 sm:top-3.5" />
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="Add access notes, special requirements, materials to carry, or anything the provider should know."
            className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-[13px] text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 sm:py-3 sm:pl-11 sm:pr-4 sm:text-sm"
          />
        </div>
      </div>
    </div>
  );
}
