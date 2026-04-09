import React, { Dispatch, SetStateAction } from "react";
import Image from "next/image";
import { CheckCircle, Clock3, MapPin } from "lucide-react";
import { formatCurrency } from "@/lib/financials";
import type { ProfessionalDetail } from "@/lib/api/hooks/useProfessional";

interface BookingServiceSelectionProps {
  professional: ProfessionalDetail;
  selectedService: string;
  setSelectedService: Dispatch<SetStateAction<string>>;
}

function getLocationLabel(locationType?: string | null) {
  switch (locationType) {
    case "CLIENT_LOCATION":
      return "At your location";
    case "PROVIDER_LOCATION":
      return "At provider location";
    case "REMOTE":
      return "Remote";
    case "NEGOTIABLE":
      return "Location negotiable";
    default:
      return "Flexible location";
  }
}

export default function BookingServiceSelection({
  professional,
  selectedService,
  setSelectedService,
}: BookingServiceSelectionProps) {
  return (
    <div className="space-y-3.5 sm:space-y-4">
      <div>
        <label className="block text-base font-bold text-slate-950 sm:text-lg">
          Choose a service
        </label>
        <p className="mt-1 text-[13px] leading-5 text-slate-600 sm:text-sm sm:leading-6">
          Pick the exact service you want to schedule so pricing and timing stay
          accurate.
        </p>
      </div>

      <div className="space-y-2.5 sm:space-y-3">
        {professional.services.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-[13px] text-slate-600 sm:text-sm">
            No services available right now.
          </div>
        ) : (
          professional.services.map((service) => {
            const isSelected = selectedService === service.id;

            return (
              <button
                key={service.id}
                type="button"
                onClick={() => setSelectedService(service.id)}
                aria-pressed={isSelected}
                className={`w-full overflow-hidden rounded-[1.5rem] border text-left transition-all ${
                  isSelected
                    ? "border-emerald-400 bg-emerald-50/70 shadow-[0_0_0_4px_rgba(16,185,129,0.12)]"
                    : "border-slate-200 bg-white hover:border-emerald-200 hover:shadow-sm"
                }`}
              >
                <div className="flex flex-col sm:flex-row">
                  <div className="relative h-28 shrink-0 overflow-hidden sm:h-auto sm:w-44">
                    {service.images?.[0] ? (
                      <Image
                        src={service.images[0]}
                        alt={service.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, 176px"
                        unoptimized
                      />
                    ) : (
                      <div className="absolute inset-0 bg-linear-to-br from-emerald-700 via-teal-700 to-slate-900" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 to-transparent" />
                    <div className="absolute bottom-2.5 left-2.5 rounded-full bg-white/92 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-900 sm:bottom-3 sm:left-3 sm:px-3 sm:text-xs">
                      {service.pricingUnit}
                    </div>
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col justify-between p-3 sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-slate-950 sm:text-lg">
                          {service.title}
                        </h3>
                        <p className="mt-1 line-clamp-2 text-[13px] leading-5 text-slate-600 sm:mt-1.5 sm:text-sm sm:leading-6">
                          {service.description}
                        </p>
                      </div>
                      {isSelected ? (
                        <CheckCircle className="h-5 w-5 shrink-0 text-emerald-600 sm:h-6 sm:w-6" />
                      ) : null}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] sm:mt-4 sm:gap-2.5 sm:text-sm">
                      <span className="rounded-full bg-emerald-100 px-2.5 py-1 font-semibold text-emerald-800 sm:px-3">
                        {formatCurrency(service.price)}
                      </span>
                      {service.defaultDuration ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 font-medium text-slate-700 sm:px-3">
                          <Clock3 className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" />
                          {service.defaultDuration} min
                        </span>
                      ) : null}
                      <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 font-medium text-slate-700 sm:px-3">
                        <MapPin className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" />
                        {getLocationLabel(service.locationType)}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
