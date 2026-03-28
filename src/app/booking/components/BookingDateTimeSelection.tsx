import React, { Dispatch, SetStateAction } from "react";
import { format, isBefore, startOfDay } from "date-fns";
import {
  AlertCircle,
  Calendar as CalendarIcon,
  CalendarClock,
  CheckCircle,
  Clock,
} from "lucide-react";
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
  fetchMonthlyAvailability,
  totalSlots,
}: BookingDateTimeSelectionProps) {
  type CalendarDayButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
    day: { date: Date };
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <label className="block text-lg font-bold text-slate-950">
              Choose date
            </label>
            <p className="mt-1 text-sm text-slate-600">
              Select one or more available dates for this service.
            </p>
          </div>
          {selectedDates.length > 0 ? (
            <span className="inline-flex items-center gap-2 self-start rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-800">
              <CalendarIcon className="h-3.5 w-3.5" />
              {selectedDates.length} date{selectedDates.length > 1 ? "s" : ""} selected
            </span>
          ) : null}
        </div>

        {!selectedService ? (
          <div className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
            <AlertCircle className="h-4 w-4 shrink-0" />
            Select a service first to unlock availability.
          </div>
        ) : null}

        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-3 shadow-sm sm:p-5">
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
                      description: "Please choose another date",
                    });
                    return false;
                  }

                  return true;
                });

                setSelectedDates(validDates);
              } else {
                setSelectedDates([]);
              }
            }}
            disabled={[
              { before: new Date() },
              (date) => disabledDates.includes(format(date, "yyyy-MM-dd")),
            ]}
            onMonthChange={(month) => {
              fetchMonthlyAvailability(format(month, "yyyy-MM"));
            }}
            className="w-full"
            classNames={{
              months: "w-full",
              month: "w-full space-y-4",
              month_caption:
                "flex justify-center pt-1 relative items-center h-9 mb-4",
              caption_label: "text-lg font-bold text-slate-950",
              button_previous:
                "absolute left-0 h-9 w-9 rounded-full border border-slate-200 bg-white",
              button_next:
                "absolute right-0 h-9 w-9 rounded-full border border-slate-200 bg-white",
              weekdays: "grid grid-cols-7 gap-1 sm:gap-2",
              weekday:
                "text-slate-500 font-semibold text-[11px] sm:text-xs uppercase tracking-wide text-center",
              week: "grid grid-cols-7 gap-1 sm:gap-2 mt-2",
              day: "w-full",
            }}
            components={{
              DayButton: ({ day, ...props }: CalendarDayButtonProps) => {
                const dateStr = format(day.date, "yyyy-MM-dd");
                const isPast = isBefore(day.date, startOfDay(new Date()));
                const isInDisabledList = disabledDates.includes(dateStr);
                const isDisabled = isPast || isInDisabledList;
                const isSelected =
                  !isDisabled &&
                  selectedDates.some(
                    (selectedDate) =>
                      format(selectedDate, "yyyy-MM-dd") === dateStr,
                  );
                const isToday =
                  day.date.toDateString() === new Date().toDateString();

                return (
                  <button
                    {...props}
                    disabled={isDisabled}
                    className={`relative h-11 w-full rounded-2xl text-sm font-semibold transition-all sm:h-12 ${
                      isDisabled
                        ? "cursor-not-allowed bg-slate-100 text-slate-300 line-through"
                        : isSelected
                          ? "bg-emerald-600 text-white shadow-[0_0_0_4px_rgba(16,185,129,0.18)]"
                          : isToday
                            ? "border-2 border-emerald-300 bg-emerald-50 text-emerald-700"
                            : "bg-slate-50 text-slate-800 hover:bg-slate-100"
                    }`}
                  >
                    {day.date.getDate()}
                    {isSelected && !isDisabled ? (
                      <CheckCircle className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-white text-emerald-600" />
                    ) : null}
                  </button>
                );
              },
            }}
          />
        </div>

        {selectedDates.length > 0 ? (
          <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50/80 p-4">
            <p className="text-sm font-bold text-emerald-900">
              Selected dates
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedDates.map((date, idx) => (
                <span
                  key={`${format(date, "yyyy-MM-dd")}-${idx}`}
                  className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs font-medium text-emerald-800"
                >
                  {format(date, "EEE, MMM d")}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDates((prev) =>
                        prev.filter((_, i) => i !== idx),
                      );
                    }}
                    className="text-emerald-700 hover:text-emerald-900"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {selectedDates.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="overflow-hidden space-y-4 pt-2"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <label className="block text-lg font-bold text-slate-950">
                Pick time slots
              </label>
              <p className="mt-1 text-sm text-slate-600">
                Choose one or more available times for each selected day.
              </p>
            </div>
            {totalSlots > 0 ? (
              <span className="inline-flex items-center gap-2 self-start rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-800">
                <Clock className="h-3.5 w-3.5" />
                {totalSlots} slot{totalSlots > 1 ? "s" : ""} selected
              </span>
            ) : null}
          </div>

          {selectedDates.map((date) => {
            const dateStr = format(date, "yyyy-MM-dd");
            const slots = availableSlotsPerDate[dateStr] || [];
            const selectedSlots = selectedTimeSlots[dateStr] || [];

            return (
              <div
                key={dateStr}
                className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-950">
                      {format(date, "EEEE, MMM d")}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {slots.length > 0
                        ? `${slots.length} available slot${slots.length > 1 ? "s" : ""}`
                        : "No currently available slots"}
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    {selectedSlots.length} chosen
                  </span>
                </div>

                {slots.length > 0 ? (
                  <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
                    {slots.map((time) => {
                      const isSelected = selectedSlots.includes(time);

                      return (
                        <button
                          key={time}
                          type="button"
                          onClick={() => {
                            setSelectedTimeSlots((prev) => {
                              const currentSlots = prev[dateStr] || [];
                              const newSlots = isSelected
                                ? currentSlots.filter((slot) => slot !== time)
                                : [...currentSlots, time];

                              return {
                                ...prev,
                                [dateStr]: newSlots,
                              };
                            });
                          }}
                          className={`rounded-xl px-2 py-2.5 text-sm font-semibold transition-all ${
                            isSelected
                              ? "bg-emerald-600 text-white shadow-sm"
                              : "border border-slate-200 bg-slate-50 text-slate-700 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800"
                          }`}
                        >
                          {time}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-5 text-center">
                    <Clock className="mx-auto h-5 w-5 text-slate-400" />
                    <p className="mt-2 text-sm text-slate-600">
                      No available slots for this date.
                    </p>
                  </div>
                )}
              </div>
            );
          })}

          {totalSlots > 0 ? (
            <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50/80 p-4">
              <h4 className="flex items-center gap-2 text-sm font-bold text-emerald-900">
                <CalendarClock className="h-4 w-4" />
                Selected appointments
              </h4>
              <div className="mt-3 space-y-2.5">
                {Object.entries(selectedTimeSlots).map(([dateStr, slots]) => {
                  if (slots.length === 0) return null;
                  const date = selectedDates.find(
                    (selectedDate) =>
                      format(selectedDate, "yyyy-MM-dd") === dateStr,
                  );

                  return (
                    <div key={dateStr} className="rounded-2xl bg-white p-3">
                      <p className="text-sm font-semibold text-slate-900">
                        {date ? format(date, "EEE, MMM d") : dateStr}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {slots.map((time) => (
                          <span
                            key={time}
                            className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800"
                          >
                            {time}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedTimeSlots((prev) => ({
                                  ...prev,
                                  [dateStr]: prev[dateStr].filter(
                                    (slot) => slot !== time,
                                  ),
                                }));
                              }}
                              className="hover:text-emerald-950"
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
          ) : null}
        </motion.div>
      ) : null}
    </>
  );
}
