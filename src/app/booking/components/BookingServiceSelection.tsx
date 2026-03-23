import React, { Dispatch, SetStateAction } from "react";
import { CheckCircle, AlertCircle } from "lucide-react";
import { formatCurrency } from "@/lib/financials";

interface BookingServiceSelectionProps {
  professional: any;
  selectedService: string;
  setSelectedService: Dispatch<SetStateAction<string>>;
}

export default function BookingServiceSelection({
  professional,
  selectedService,
  setSelectedService,
}: BookingServiceSelectionProps) {
  return (
    <div className="space-y-3">
      <label className="block text-base sm:text-lg font-bold text-gray-900">
        Select Service <span className="text-red-600">*</span>
      </label>
      <div className="space-y-3">
        {professional.services.length === 0 ? (
          <p className="text-gray-500 text-sm">No services available</p>
        ) : (
          professional.services.map((service: any) => (
            <div
              key={service.id}
              onClick={() => setSelectedService(service.id)}
              className={`p-3 sm:p-4 border-2 rounded-lg sm:rounded-xl cursor-pointer transition-all ${
                selectedService === service.id
                  ? "border-emerald-500 bg-emerald-50"
                  : "border-gray-200 hover:border-emerald-300"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 pr-2">
                  <h3 className="font-bold text-gray-900 text-sm sm:text-base mb-1">
                    {service.title}
                  </h3>
                  <p className="text-gray-600 text-xs sm:text-sm mb-2 line-clamp-2">
                    {service.description}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                    <span className="text-emerald-600 font-bold">
                      {formatCurrency(service.price)}
                    </span>
                    <span className="text-gray-500">{service.pricingUnit}</span>
                    {service.defaultDuration && (
                      <span className="text-gray-500">
                        · {service.defaultDuration} min
                      </span>
                    )}
                  </div>
                </div>
                {selectedService === service.id && (
                  <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 flex-shrink-0" />
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
