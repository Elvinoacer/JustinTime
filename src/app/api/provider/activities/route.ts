import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { handleError } from "@/lib/middleware/errorHandler";
import { hasRole } from "@/lib/auth/roles";

type ActivityType =
  | "BOOKING"
  | "PROPOSAL"
  | "REVIEW"
  | "SUPPORT"
  | "EXPENSE"
  | "AVAILABILITY"
  | "PROFILE"
  | "BADGE";

type ProviderActivity = {
  id: string;
  type: ActivityType;
  title: string;
  desc: string;
  time: Date;
  icon: string;
  color: string;
};

function parsePositiveInt(value: string | null, fallback: number) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseDate(value: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toStartOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function toEndOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
}

function getRequestedTypes(raw: string | null): Set<ActivityType> | null {
  if (!raw) return null;
  const parsed = raw
    .split(",")
    .map((value) => value.trim().toUpperCase())
    .filter(Boolean);

  if (!parsed.length) return null;

  const validTypes: ActivityType[] = [
    "BOOKING",
    "PROPOSAL",
    "REVIEW",
    "SUPPORT",
    "EXPENSE",
    "AVAILABILITY",
    "PROFILE",
    "BADGE",
  ];

  const result = new Set<ActivityType>();
  for (const type of parsed) {
    if (validTypes.includes(type as ActivityType)) {
      result.add(type as ActivityType);
    }
  }

  return result.size ? result : null;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || !session.user || !hasRole(session.user, "PROVIDER")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);

    const page = parsePositiveInt(searchParams.get("page"), 1);
    const limit = Math.min(parsePositiveInt(searchParams.get("limit"), 15), 50);
    const fromDate = parseDate(searchParams.get("from"));
    const toDate = parseDate(searchParams.get("to"));
    const requestedTypes = getRequestedTypes(searchParams.get("types"));

    if (searchParams.get("from") && !fromDate) {
      return NextResponse.json(
        { error: "Invalid from date format" },
        { status: 400 },
      );
    }

    if (searchParams.get("to") && !toDate) {
      return NextResponse.json(
        { error: "Invalid to date format" },
        { status: 400 },
      );
    }

    if (fromDate && toDate && fromDate > toDate) {
      return NextResponse.json(
        { error: "from date cannot be after to date" },
        { status: 400 },
      );
    }

    const includeType = (type: ActivityType) =>
      !requestedTypes || requestedTypes.has(type);

    const sourceTake = Math.min(Math.max(limit * 3, 20), 100);

    const sources: Array<Promise<ProviderActivity[]>> = [];

    if (includeType("BOOKING")) {
      sources.push(
        prisma.booking
          .findMany({
            where: {
              providerId: userId,
            },
            include: {
              client: { select: { name: true } },
              job: { select: { title: true } },
              service: { select: { title: true } },
            },
            orderBy: { createdAt: "desc" },
            take: sourceTake,
          })
          .then((bookings) =>
            bookings.map((booking) => ({
              id: `booking-${booking.id}`,
              type: "BOOKING" as const,
              title:
                booking.status === "CONFIRMED"
                  ? "New Booking"
                  : "Booking Update",
              desc: `${booking.client.name} for '${booking.job?.title || booking.service?.title || "Service"}'`,
              time: booking.createdAt,
              icon: "event",
              color: "bg-blue-100 text-blue-600",
            })),
          ),
      );
    }

    if (includeType("PROPOSAL")) {
      sources.push(
        prisma.proposal
          .findMany({
            where: {
              providerId: userId,
            },
            include: {
              job: {
                select: {
                  title: true,
                  client: { select: { name: true } },
                },
              },
            },
            orderBy: { createdAt: "desc" },
            take: sourceTake,
          })
          .then((proposals) =>
            proposals.map((proposal) => ({
              id: `proposal-${proposal.id}`,
              type: "PROPOSAL" as const,
              title:
                proposal.status === "ACCEPTED"
                  ? "Proposal Accepted"
                  : "Proposal Submitted",
              desc: `On '${proposal.job.title}'`,
              time: proposal.createdAt,
              icon: "description",
              color:
                proposal.status === "ACCEPTED"
                  ? "bg-emerald-100 text-emerald-600"
                  : "bg-amber-100 text-amber-600",
            })),
          ),
      );
    }

    if (includeType("REVIEW")) {
      sources.push(
        prisma.review
          .findMany({
            where: {
              targetId: userId,
            },
            include: {
              author: { select: { name: true } },
            },
            orderBy: { createdAt: "desc" },
            take: sourceTake,
          })
          .then((reviews) =>
            reviews.map((review) => ({
              id: `review-${review.id}`,
              type: "REVIEW" as const,
              title: "New Review",
              desc: `${review.rating} stars from ${review.author.name}`,
              time: review.createdAt,
              icon: "star",
              color: "bg-purple-100 text-purple-600",
            })),
          ),
      );
    }

    if (includeType("SUPPORT")) {
      sources.push(
        prisma.supportTicket
          .findMany({
            where: {
              userId,
            },
            orderBy: { updatedAt: "desc" },
            take: sourceTake,
          })
          .then((tickets) =>
            tickets.map((ticket) => ({
              id: `support-${ticket.id}`,
              type: "SUPPORT" as const,
              title: "Support Ticket Activity",
              desc: `${ticket.subject} (${ticket.status.replace("_", " ")})`,
              time: ticket.updatedAt,
              icon: "support_agent",
              color: "bg-cyan-100 text-cyan-700",
            })),
          ),
      );
    }

    if (includeType("EXPENSE")) {
      sources.push(
        prisma.expense
          .findMany({
            where: {
              userId,
            },
            include: {
              job: { select: { title: true } },
            },
            orderBy: { updatedAt: "desc" },
            take: sourceTake,
          })
          .then((expenses) =>
            expenses.map((expense) => ({
              id: `expense-${expense.id}`,
              type: "EXPENSE" as const,
              title: "Expense Activity",
              desc: `${expense.category} (${expense.status})${expense.job?.title ? ` for '${expense.job.title}'` : ""}`,
              time: expense.updatedAt,
              icon: "receipt_long",
              color: "bg-orange-100 text-orange-700",
            })),
          ),
      );
    }

    if (includeType("AVAILABILITY")) {
      sources.push(
        Promise.all([
          prisma.availability.findMany({
            where: { providerId: userId },
            orderBy: { updatedAt: "desc" },
            take: sourceTake,
          }),
          prisma.availabilityException.findMany({
            where: { providerId: userId },
            orderBy: { updatedAt: "desc" },
            take: sourceTake,
          }),
        ]).then(([weeklySlots, exceptions]) => {
          const slotActivities: ProviderActivity[] = weeklySlots.map(
            (slot) => ({
              id: `availability-slot-${slot.id}`,
              type: "AVAILABILITY",
              title: "Availability Schedule Updated",
              desc: `Day ${slot.dayOfWeek}: ${slot.startTime} - ${slot.endTime}`,
              time: slot.updatedAt,
              icon: "schedule",
              color: "bg-indigo-100 text-indigo-700",
            }),
          );

          const exceptionActivities: ProviderActivity[] = exceptions.map(
            (exception) => ({
              id: `availability-exception-${exception.id}`,
              type: "AVAILABILITY",
              title: "Availability Exception Updated",
              desc: exception.isAvailable
                ? `Available on ${exception.date.toLocaleDateString()}`
                : `Unavailable on ${exception.date.toLocaleDateString()}`,
              time: exception.updatedAt,
              icon: "event_busy",
              color: "bg-indigo-100 text-indigo-700",
            }),
          );

          return [...slotActivities, ...exceptionActivities];
        }),
      );
    }

    if (includeType("PROFILE")) {
      sources.push(
        prisma.profile
          .findUnique({
            where: { userId },
            select: {
              id: true,
              verificationStatus: true,
              user: {
                select: {
                  updatedAt: true,
                },
              },
            },
          })
          .then((profile) => {
            if (!profile) return [];
            return [
              {
                id: `profile-${profile.id}`,
                type: "PROFILE" as const,
                title: "Profile Updated",
                desc: `Verification: ${profile.verificationStatus || "PENDING"}`,
                time: profile.user.updatedAt,
                icon: "person",
                color: "bg-slate-100 text-slate-700",
              },
            ];
          }),
      );
    }

    if (includeType("BADGE")) {
      sources.push(
        prisma.userBadge
          .findMany({
            where: { userId },
            include: {
              badge: { select: { name: true } },
            },
            orderBy: { awardedAt: "desc" },
            take: sourceTake,
          })
          .then((badges) =>
            badges.map((userBadge) => ({
              id: `badge-${userBadge.id}`,
              type: "BADGE" as const,
              title: "Badge Earned",
              desc: userBadge.badge.name,
              time: userBadge.awardedAt,
              icon: "workspace_premium",
              color: "bg-emerald-100 text-emerald-700",
            })),
          ),
      );
    }

    const activities = (await Promise.all(sources))
      .flat()
      .filter((activity) => {
        if (fromDate && activity.time < toStartOfDay(fromDate)) return false;
        if (toDate && activity.time > toEndOfDay(toDate)) return false;
        return true;
      })
      .sort((a, b) => b.time.getTime() - a.time.getTime());

    const total = activities.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const offset = (page - 1) * limit;
    const pagedActivities = activities.slice(offset, offset + limit);

    return NextResponse.json({
      activities: pagedActivities,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
      filters: {
        from: fromDate?.toISOString() || null,
        to: toDate?.toISOString() || null,
        types: requestedTypes ? Array.from(requestedTypes) : null,
      },
    });
  } catch (error) {
    return handleError(error);
  }
}
