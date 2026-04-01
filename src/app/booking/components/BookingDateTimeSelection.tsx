import React, { Dispatch, SetStateAction } from "react";
import {
  addYears,
  format,
  isAfter,
  isBefore,
  startOfDay,
  startOfMonth,
} from "date-fns";
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
  type CalendarDayButtonProps =
    React.ButtonHTMLAttributes<HTMLButtonElement> & {
      day: { date: Date };
    };

  const today = React.useMemo(() => startOfDay(new Date()), []);
  const minMonth = React.useMemo(() => startOfMonth(today), [today]);
  const maxMonth = React.useMemo(() => addYears(minMonth, 3), [minMonth]);
  const [visibleMonth, setVisibleMonth] = React.useState<Date>(() =>
    selectedDates[0] ? startOfMonth(selectedDates[0]) : minMonth,
  );

  const clampMonth = (month: Date) => {
    const normalized = startOfMonth(month);

    if (isBefore(normalized, minMonth)) return minMonth;
    if (isAfter(normalized, maxMonth)) return maxMonth;

    return normalized;
  };

  React.useEffect(() => {
    if (selectedDates.length === 0) return;
    const normalized = startOfMonth(selectedDates[0]);

    if (isBefore(normalized, minMonth)) {
      setVisibleMonth(minMonth);
      return;
    }

    if (isAfter(normalized, maxMonth)) {
      setVisibleMonth(maxMonth);
      return;
    }

    setVisibleMonth(normalized);
  }, [selectedDates, minMonth, maxMonth]);

  return (
    <>
      <div className="space-y-3.5 sm:space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <label className="block text-base font-bold text-slate-950 sm:text-lg">
              Choose date
            </label>
            <p className="mt-1 text-[13px] leading-5 text-slate-600 sm:text-sm sm:leading-6">
              Select one or more available dates for this service.
            </p>
          </div>
          {selectedDates.length > 0 ? (
            <span className="inline-flex items-center gap-2 self-start rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-800 sm:px-3 sm:text-xs">
              <CalendarIcon className="h-3.5 w-3.5" />
              {selectedDates.length} date{selectedDates.length > 1 ? "s" : ""}{" "}
              selected
            </span>
          ) : null}
        </div>

        {!selectedService ? (
          <div className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[13px] font-medium text-amber-800 sm:px-4 sm:py-3 sm:text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            Select a service first to unlock availability.
          </div>
        ) : null}

        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-2.5 shadow-sm sm:p-5">
          <Calendar
            mode="multiple"
            captionLayout="dropdown"
            hideNavigation
            showOutsideDays={false}
            month={visibleMonth}
            startMonth={minMonth}
            endMonth={maxMonth}
            selected={selectedDates}
            onSelect={(dates) => {
              if (dates) {
                const validDates = dates.filter((date) => {
                  const dateStr = format(date, "yyyy-MM-dd");
                  const isPast = isBefore(date, today);
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
              { before: today },
              (date) => disabledDates.includes(format(date, "yyyy-MM-dd")),
            ]}
            onMonthChange={(month) => {
              const clampedMonth = clampMonth(month);
              setVisibleMonth(clampedMonth);
              fetchMonthlyAvailability(format(clampedMonth, "yyyy-MM"));
            }}
            className="!w-full max-w-none p-0 [&_.rdp-month]:!w-full [&_.rdp-month_grid]:!w-full [&_.rdp-month_grid]:table-fixed [&_.rdp-weeks]:!w-full"
            classNames={{
              root: "!w-full max-w-none",
              months: "!w-full",
              month: "!w-full space-y-2.5 sm:space-y-3",
              month_caption:
                "relative mb-2.5 flex h-9 w-full items-center justify-center sm:mb-3 sm:h-10",
              caption_label: "text-[15px] font-bold text-slate-950 sm:text-lg",
              dropdowns:
                "flex h-9 w-full items-center justify-center gap-2 sm:h-10",
              dropdown_root:
                "relative h-8 rounded-md border border-slate-200 bg-white px-1 text-[12px] font-semibold text-slate-700 sm:h-9 sm:text-sm",
              dropdown:
                "absolute inset-0 cursor-pointer rounded-md border-0 bg-transparent px-2 pr-6 text-[12px] font-semibold text-slate-800 outline-none sm:text-sm",
              button_previous:
                "absolute left-0 h-8 w-8 rounded-full border border-slate-200 bg-white sm:h-9 sm:w-9",
              button_next:
                "absolute right-0 h-8 w-8 rounded-full border border-slate-200 bg-white sm:h-9 sm:w-9",
              month_grid:
                "w-full table-fixed border-separate border-spacing-y-1",
              weekdays: "w-full",
              weekday:
                "text-center text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:text-xs",
              weeks: "w-full",
              week: "mt-1.5",
              day: "w-full p-0",
            }}
            components={{
              DayButton: ({ day, ...props }: CalendarDayButtonProps) => {
                const dateStr = format(day.date, "yyyy-MM-dd");
                const isPast = isBefore(day.date, today);
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
                    className={`relative h-10 w-full rounded-2xl text-[12px] font-semibold transition-all sm:h-12 sm:text-sm ${
                      isDisabled
                        ? "cursor-not-allowed bg-slate-100/90 text-slate-400"
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
          <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50/80 p-3.5 sm:p-4">
            <p className="text-[13px] font-bold text-emerald-900 sm:text-sm">
              Selected dates
            </p>
            <div className="mt-2.5 flex flex-wrap gap-1.5 sm:mt-3 sm:gap-2">
              {selectedDates.map((date, idx) => (
                <span
                  key={`${format(date, "yyyy-MM-dd")}-${idx}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-[11px] font-medium text-emerald-800 sm:gap-2 sm:px-3 sm:py-1.5 sm:text-xs"
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
          className="overflow-hidden space-y-3.5 pt-2 sm:space-y-4"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <label className="block text-base font-bold text-slate-950 sm:text-lg">
                Pick time slots
              </label>
              <p className="mt-1 text-[13px] leading-5 text-slate-600 sm:text-sm sm:leading-6">
                Choose one or more available times for each selected day.
              </p>
            </div>
            {totalSlots > 0 ? (
              <span className="inline-flex items-center gap-2 self-start rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-800 sm:px-3 sm:text-xs">
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
                className="rounded-[1.5rem] border border-slate-200 bg-white p-3.5 shadow-sm sm:p-5"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-950 sm:text-base">
                      {format(date, "EEEE, MMM d")}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {slots.length > 0
                        ? `${slots.length} available slot${slots.length > 1 ? "s" : ""}`
                        : "No currently available slots"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700 sm:px-3 sm:text-xs">
                      {selectedSlots.length} chosen
                    </span>
                    {selectedSlots.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTimeSlots((prev) => ({
                            ...prev,
                            [dateStr]: [],
                          }));
                        }}
                        className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:border-slate-300 hover:text-slate-900"
                      >
                        Clear
                      </button>
                    ) : null}
                  </div>
                </div>

                {slots.length > 0 ? (
                  <div className="mt-3 grid grid-cols-2 gap-2 min-[420px]:grid-cols-3 sm:mt-4 sm:grid-cols-4 lg:grid-cols-5">
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
                          className={`rounded-xl px-2.5 py-2.5 text-[12px] font-semibold transition-all sm:py-3 sm:text-[13px] ${
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
                  <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-center sm:p-5">
                    <Clock className="mx-auto h-5 w-5 text-slate-400" />
                    <p className="mt-2 text-[13px] text-slate-600 sm:text-sm">
                      No available slots for this date.
                    </p>
                  </div>
                )}
              </div>
            );
          })}

          {totalSlots > 0 ? (
            <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50/80 p-3.5 sm:p-4">
              <h4 className="flex items-center gap-2 text-[13px] font-bold text-emerald-900 sm:text-sm">
                <CalendarClock className="h-4 w-4" />
                Selected appointments
              </h4>
              <div className="mt-2.5 space-y-2 sm:mt-3 sm:space-y-2.5">
                {Object.entries(selectedTimeSlots).map(([dateStr, slots]) => {
                  if (slots.length === 0) return null;
                  const date = selectedDates.find(
                    (selectedDate) =>
                      format(selectedDate, "yyyy-MM-dd") === dateStr,
                  );

                  return (
                    <div
                      key={dateStr}
                      className="rounded-2xl bg-white p-2.5 sm:p-3"
                    >
                      <p className="text-[13px] font-semibold text-slate-900 sm:text-sm">
                        {date ? format(date, "EEE, MMM d") : dateStr}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {slots.map((time) => (
                          <span
                            key={time}
                            className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-800 sm:px-2.5 sm:text-xs"
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
