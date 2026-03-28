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
    <div className="space-y-6">
      <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-4">
        <p className="text-sm font-semibold text-slate-900">
          {locationCopy.title}
        </p>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          {locationCopy.hint}
        </p>
      </div>

      {selectedServiceData?.locationType !== "PROVIDER_LOCATION" ? (
        <div className="space-y-2.5">
          <label className="block text-base font-bold text-slate-950">
            Service location{" "}
            {selectedServiceData?.locationType === "CLIENT_LOCATION"
              ? <span className="text-red-600">*</span>
              : <span className="text-slate-400">(Optional)</span>}
          </label>
          <div className="relative">
            <MapPin className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder={
                selectedServiceData?.locationType === "CLIENT_LOCATION"
                  ? "Estate, building, or nearby landmark"
                  : "Preferred meeting point or leave blank"
              }
              className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
              required={selectedServiceData?.locationType === "CLIENT_LOCATION"}
            />
          </div>
        </div>
      ) : null}

      <div className="space-y-4">
        <h3 className="flex items-center gap-2 text-base font-bold text-slate-950">
          <User className="h-4 w-4 text-emerald-600" />
          Contact details
        </h3>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-900">
              Phone number <span className="text-red-600">*</span>
            </label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="tel"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="+254 7XX XXX XXX"
                className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                required
              />
            </div>
            <p className="text-xs text-slate-500">
              Used for booking confirmation and schedule updates.
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-900">
              Address <span className="text-red-600">*</span>
            </label>
            <div className="relative">
              <Home className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
              <textarea
                value={clientAddress}
                onChange={(e) => setClientAddress(e.target.value)}
                rows={3}
                placeholder="Full address, apartment, gate, or any check-in instructions"
                className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                required
              />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2.5">
        <label className="block text-base font-bold text-slate-950">
          Notes for the professional
          <span className="ml-2 text-sm font-normal text-slate-400">(Optional)</span>
        </label>
        <div className="relative">
          <MessageSquare className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="Add access notes, special requirements, materials to carry, or anything the provider should know."
            className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
          />
        </div>
      </div>
    </div>
  );
}
