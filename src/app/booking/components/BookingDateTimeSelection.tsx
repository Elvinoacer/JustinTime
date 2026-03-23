import React, { Dispatch, SetStateAction } from "react";
import { format, isBefore, startOfDay } from "date-fns";
import { ChevronRight, Calendar as CalendarIcon, CheckCircle, AlertCircle, Clock, CalendarClock } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface BookingDateTimeSelectionProps {
  selectedService: string;
  selectedDates: Date[];
  setSelectedDates: Dispatch<SetStateAction<Date[]>>;
  selectedTimeSlots: Record<string, string[]>;
  setSelectedTimeSlots: Dispatch<SetStateAction<Record<string, string[]>>>;
  availableSlotsPerDate: Record<string, string[]>;
  disabledDates: string[];
  disabledReasons: Record<string, string>;
  setShowMobileDatePicker: Dispatch<SetStateAction<boolean>>;
  fetchMonthlyAvailability: (monthStr: string) => void;
  totalSlots: number;
}

export default function BookingDateTimeSelection({
  selectedService,
  selectedDates,
  setSelectedDates,
  selectedTimeSlots,
  setSelectedTimeSlots,
  availableSlotsPerDate,
  disabledDates,
  disabledReasons,
  setShowMobileDatePicker,
  fetchMonthlyAvailability,
  totalSlots,
}: BookingDateTimeSelectionProps) {
  return (
    <>
      {/* Date Selection */}
      <div className="space-y-3">
        <label className="block text-base sm:text-lg font-bold text-gray-900">
          Select Date <span className="text-red-600">*</span>
        </label>

        {/* Mobile Date Picker Button */}
        <button
          type="button"
          onClick={() => setShowMobileDatePicker(true)}
          className="lg:hidden w-full p-4 bg-white border-2 border-dashed border-gray-300 rounded-xl hover:border-emerald-400 transition-colors flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <CalendarIcon className="w-5 h-5 text-gray-400" />
            <div className="text-left">
              <div className="text-sm font-medium text-gray-900">
                {selectedDates.length > 0
                  ? `${selectedDates.length} date${
                      selectedDates.length > 1 ? "s" : ""
                    } selected`
                  : "Tap to select dates"}
              </div>
              <div className="text-xs text-gray-500">Select available dates</div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </button>

        {/* Desktop Calendar */}
        <div className="hidden lg:block bg-white border border-gray-300 rounded-2xl shadow-sm p-6">
          <Calendar
            mode="multiple"
            selected={selectedDates}
            onSelect={(dates) => {
              if (dates) {
                const validDates = dates.filter((date) => {
                  const dateStr = format(date, "yyyy-MM-dd");
                  const isPast = isBefore(date, startOfDay(new Date()));
                  const isDisabled = disabledDates.includes(dateStr);

                  if (isPast || isDisabled) {
                    const reason = isDisabled
                      ? disabledReasons[dateStr] || "This date is not available"
                      : "Cannot select past dates";
                    toast.error(reason, {
                      description: "Please select a different date",
                    });
                    return false;
                  }
                  return true;
                });
                setSelectedDates(validDates);
                if (validDates.length > 0) {
                  toast.success(
                    `${validDates.length} date${
                      validDates.length > 1 ? "s" : ""
                    } selected`
                  );
                }
              } else {
                setSelectedDates([]);
              }
            }}
            disabled={[
              { before: new Date() },
              (date) => disabledDates.includes(format(date, "yyyy-MM-dd")),
            ]}
            onMonthChange={(month) => {
              const monthStr = format(month, "yyyy-MM");
              fetchMonthlyAvailability(monthStr);
            }}
            className="w-full"
            classNames={{
              months: "w-full",
              month: "w-full space-y-4",
              month_caption: "flex justify-center pt-1 relative items-center h-9 mb-4",
              caption_label: "text-lg font-bold text-gray-900",
              button_previous: "absolute left-0 h-9 w-9",
              button_next: "absolute right-0 h-9 w-9",
              weekdays: "flex w-full justify-between px-1",
              weekday: "text-gray-900 font-medium text-sm w-14 text-center",
              week: "flex w-full justify-between px-1 mt-2",
              day: "w-14",
            }}
            components={{
              DayButton: ({ day, ...props }: any) => {
                const dateStr = format(day.date, "yyyy-MM-dd");
                const isOutside = props["data-outside"];
                const isPast = isBefore(day.date, startOfDay(new Date()));
                const isInDisabledList = disabledDates.includes(dateStr);
                const isDisabled = isPast || isInDisabledList;
                const isSelected =
                  !isDisabled &&
                  selectedDates.some(
                    (d) => format(d, "yyyy-MM-dd") === dateStr
                  );
                const isToday =
                  day.date.toDateString() === new Date().toDateString();

                return (
                  <button
                    {...props}
                    disabled={isDisabled}
                    className={`relative w-full h-12 text-sm font-medium rounded-full transition-all duration-200 ${
                      isDisabled
                        ? "text-gray-400 line-through opacity-50 cursor-not-allowed bg-gray-100"
                        : isSelected
                        ? "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-[3px] border-emerald-700 shadow-[0_0_0_4px_rgba(16,185,129,0.2)]"
                        : isToday
                        ? "bg-emerald-50 font-bold text-emerald-600 border-2 border-emerald-300"
                        : "text-gray-900 hover:bg-gray-100"
                    } ${isOutside ? "text-gray-400" : ""}`}
                  >
                    {day.date.getDate()}
                    {isSelected && !isDisabled && (
                      <CheckCircle className="absolute -top-1 -right-1 w-4 h-4 bg-white text-emerald-600 rounded-full p-0.5 shadow-md" />
                    )}
                  </button>
                );
              },
            }}
          />
        </div>

        {selectedDates.length > 0 && (
          <div className="p-3 sm:p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
            <p className="text-sm font-bold text-emerald-900 mb-2">
              {selectedDates.length} Date
              {selectedDates.length > 1 ? "s" : ""} Selected
            </p>
            <div className="flex flex-wrap gap-1.5">
              {selectedDates.map((date, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-emerald-300 rounded-full text-xs font-medium text-emerald-700"
                >
                  {format(date, "MMM d")}
                  <button
                    onClick={() => {
                      setSelectedDates((prev) =>
                        prev.filter((_, i) => i !== idx)
                      );
                    }}
                    className="ml-0.5 hover:text-emerald-900"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {!selectedService && (
          <div className="flex items-center gap-2 text-sm text-amber-700 font-medium p-3 bg-amber-50 rounded-lg">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            Please select a service first to view available dates.
          </div>
        )}
      </div>

      {/* Time Selection */}
      {selectedDates.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="overflow-hidden space-y-3 sm:space-y-4 pt-4"
        >
          <label className="block text-base sm:text-lg font-bold text-gray-900">
            Select Time Slots <span className="text-red-600">*</span>
          </label>

          {selectedDates.map((date) => {
            const dateStr = format(date, "yyyy-MM-dd");
            const slots = availableSlotsPerDate[dateStr] || [];
            const selectedSlots = selectedTimeSlots[dateStr] || [];

            return (
              <div
                key={dateStr}
                className="bg-white border border-gray-200 rounded-lg sm:rounded-xl p-3 sm:p-4 space-y-2 sm:space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-gray-900 text-sm sm:text-base">
                    {format(date, "EEE, MMM d")}
                  </h3>
                  <span className="text-xs sm:text-sm font-medium text-emerald-600">
                    {selectedSlots.length} slot
                    {selectedSlots.length !== 1 ? "s" : ""} selected
                  </span>
                </div>

                {slots.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-1.5 sm:gap-2">
                    {slots.map((time: string) => {
                      const isSelected = selectedSlots.includes(time);
                      return (
                        <button
                          key={time}
                          type="button"
                          onClick={() => {
                            setSelectedTimeSlots((prev) => {
                              const currentSlots = prev[dateStr] || [];
                              const newSlots = isSelected
                                ? currentSlots.filter((t) => t !== time)
                                : [...currentSlots, time];
                              return {
                                ...prev,
                                [dateStr]: newSlots,
                              };
                            });
                          }}
                          className={`py-1.5 sm:py-2 px-1.5 sm:px-2 rounded-md sm:rounded-lg font-semibold text-xs sm:text-sm transition-all ${
                            isSelected
                              ? "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-sm"
                              : "bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200"
                          }`}
                        >
                          {time}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-4 bg-gray-50 rounded-lg">
                    <Clock className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600 text-xs sm:text-sm">
                      No available slots for this date
                    </p>
                  </div>
                )}
              </div>
            );
          })}

          {/* Summary of selected slots */}
          {totalSlots > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg sm:rounded-xl p-3 sm:p-4 mt-4">
              <h4 className="font-bold text-emerald-900 text-sm sm:text-base mb-2 flex items-center gap-1.5">
                <CalendarClock className="w-4 h-4 sm:w-5 sm:h-5" />
                Selected Appointments ({totalSlots})
              </h4>
              <div className="space-y-1.5">
                {Object.entries(selectedTimeSlots).map(([dateStr, slots]) => {
                  if (slots.length === 0) return null;
                  const date = selectedDates.find(
                    (d) => format(d, "yyyy-MM-dd") === dateStr
                  );
                  return (
                    <div
                      key={dateStr}
                      className="flex flex-wrap gap-1.5 sm:gap-2 items-center"
                    >
                      <span className="text-xs sm:text-sm font-medium text-emerald-800 min-w-[60px] sm:min-w-[80px]">
                        {date && format(date, "MMM d")}:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {slots.map((time) => (
                          <span
                            key={time}
                            className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-white border border-emerald-300 rounded text-xs font-medium text-emerald-700"
                          >
                            {time}
                            <button
                              onClick={() => {
                                setSelectedTimeSlots((prev) => ({
                                  ...prev,
                                  [dateStr]: prev[dateStr].filter(
                                    (t) => t !== time
                                  ),
                                }));
                              }}
                              className="hover:text-emerald-900 text-xs"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </>
  );
}
