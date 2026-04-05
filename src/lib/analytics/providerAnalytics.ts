import { calculateBookingBreakdown } from "@/lib/financials";
import { Prisma } from "@/generated/prisma/client";

export const PROVIDER_ANALYTICS_TIMEZONE = "Africa/Nairobi";

type EarningBooking = {
  createdAt: Date | string;
  basePrice?: number | string | Prisma.Decimal | null;
  discountAmount?: number | string | Prisma.Decimal | null;
  totalAmount?: number | string | Prisma.Decimal | null;
  netAmount?: number | string | Prisma.Decimal | null;
  service?:
    | ({
        price?: number | string | Prisma.Decimal | null;
      } & Record<string, unknown>)
    | null;
  job?:
    | ({
        budget?: number | string | Prisma.Decimal | null;
      } & Record<string, unknown>)
    | null;
};

function toNumber(value: unknown): number {
  if (value instanceof Prisma.Decimal) {
    return value.toNumber();
  }

  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : value && typeof value === "object" && "toString" in value
          ? Number(String(value))
          : NaN;
  return Number.isFinite(numeric) ? numeric : 0;
}

function normalizeDate(value: Date | string): Date {
  if (value instanceof Date) return value;
  return new Date(value);
}

export function resolveProviderNetAmount(booking: EarningBooking): number {
  const baseAmount = toNumber(
    booking.basePrice ||
      booking.service?.price ||
      booking.job?.budget ||
      booking.totalAmount ||
      0,
  );
  const discountAmount = toNumber(booking.discountAmount || 0);
  const computed = calculateBookingBreakdown(baseAmount, discountAmount);
  const netAmount = toNumber(booking.netAmount || computed.netAmount || 0);
  return Math.round(netAmount * 100) / 100;
}

function formatDayKey(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatMonthKey(date: Date, timeZone: string): string {
  const formatted = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
  }).format(date);
  return formatted.slice(0, 7);
}

export function buildDailyEarningsSeries(
  bookings: EarningBooking[],
  options?: { days?: number; timeZone?: string },
) {
  const days = options?.days ?? 7;
  const timeZone = options?.timeZone ?? PROVIDER_ANALYTICS_TIMEZONE;

  const weekdayFormatter = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone,
  });

  const dayRows = Array.from({ length: days }, (_, index) => {
    const offset = days - 1 - index;
    const date = new Date(Date.now() - offset * 24 * 60 * 60 * 1000);
    const dayKey = formatDayKey(date, timeZone);
    return {
      dayKey,
      name: weekdayFormatter.format(date),
      earnings: 0,
    };
  });

  const dayMap = new Map(dayRows.map((row) => [row.dayKey, 0]));

  for (const booking of bookings) {
    const key = formatDayKey(normalizeDate(booking.createdAt), timeZone);
    if (!dayMap.has(key)) continue;
    const current = dayMap.get(key) || 0;
    dayMap.set(key, current + resolveProviderNetAmount(booking));
  }

  return dayRows.map((row) => ({
    name: row.name,
    dayKey: row.dayKey,
    earnings: Math.round(dayMap.get(row.dayKey) || 0),
  }));
}

export function buildMonthlySeries<T extends { createdAt: Date | string }>(
  rows: T[],
  getAmount: (row: T) => number,
  getCount?: (row: T) => number,
  options?: { months?: number; timeZone?: string },
) {
  const months = options?.months ?? 12;
  const timeZone = options?.timeZone ?? PROVIDER_ANALYTICS_TIMEZONE;

  const monthLabelFormatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    timeZone,
  });

  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth();

  const monthRows = Array.from({ length: months }, (_, index) => {
    const offset = months - 1 - index;
    const reference = new Date(
      Date.UTC(currentYear, currentMonth - offset, 15, 12, 0, 0),
    );
    const monthKey = formatMonthKey(reference, timeZone);

    return {
      monthKey,
      month: monthLabelFormatter.format(reference),
      amount: 0,
      count: 0,
    };
  });

  const monthMap = new Map(
    monthRows.map((row) => [row.monthKey, { amount: 0, count: 0 }]),
  );

  for (const row of rows) {
    const monthKey = formatMonthKey(normalizeDate(row.createdAt), timeZone);
    if (!monthMap.has(monthKey)) continue;

    const current = monthMap.get(monthKey)!;
    current.amount += getAmount(row);
    current.count += getCount ? getCount(row) : 1;
    monthMap.set(monthKey, current);
  }

  return monthRows.map((row) => {
    const totals = monthMap.get(row.monthKey) || { amount: 0, count: 0 };
    return {
      monthKey: row.monthKey,
      month: row.month,
      earnings: Math.round(totals.amount),
      bookings: totals.count,
    };
  });
}

export function calculateGrowthRate(current: number, previous: number): number {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return 0;
  if (previous === 0 && current > 0) return 100;
  if (previous === 0) return 0;
  return ((current - previous) / Math.abs(previous)) * 100;
}
