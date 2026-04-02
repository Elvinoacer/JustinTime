import prisma from "@/lib/prisma";
import { sendComprehensiveNotification } from "@/lib/notifications/adminNotifications";
import {
  JOB_LIFECYCLE_EVENT_TYPES,
  recordJobLifecycleEvent,
} from "@/lib/jobs/lifecycleTimeline";

type SlaMonitorOptions = {
  dryRun?: boolean;
  now?: Date;
  actorUserId?: string | null;
  actorName?: string | null;
  actorRole?: string | null;
};

type SlaBookingCandidate = {
  id: string;
  jobId: string;
  status: string;
  date: Date;
  updatedAt: Date;
  clientId: string;
  providerId: string;
  job: {
    title: string;
  } | null;
  client: {
    name: string | null;
  };
  provider: {
    name: string | null;
  };
};

function normalizeCandidatesWithJobId(
  candidates: Array<
    Omit<SlaBookingCandidate, "jobId"> & {
      jobId: string | null;
    }
  >,
): SlaBookingCandidate[] {
  return candidates
    .filter(
      (
        candidate,
      ): candidate is Omit<SlaBookingCandidate, "jobId"> & { jobId: string } =>
        typeof candidate.jobId === "string" && candidate.jobId.length > 0,
    )
    .map((candidate) => ({
      ...candidate,
      jobId: candidate.jobId,
    }));
}

export type SlaMonitorResult = {
  dryRun: boolean;
  checkedAt: string;
  stalledThresholdHours: number;
  delayedThresholdHours: number;
  stalledCandidates: number;
  delayedCandidates: number;
  createdEvents: number;
  duplicateEvents: number;
  notificationAttempts: number;
  notificationsSucceeded: number;
};

function parseThresholdHours(envKey: string, fallback: number) {
  const parsed = Number(process.env[envKey]);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.floor(parsed);
}

function getCycleKey(now: Date) {
  return now.toISOString().slice(0, 10);
}

async function sendSlaNotification(params: {
  userId: string;
  recipientName: string | null;
  title: string;
  message: string;
  jobTitle: string;
  bookingId: string;
}) {
  const name = params.recipientName || "there";

  await sendComprehensiveNotification({
    userId: params.userId,
    title: params.title,
    message: params.message,
    type: "SLA_ALERT",
    emailSubject: `${params.title} - JustInTime`,
    emailHtml: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626; margin-bottom: 8px;">${params.title}</h2>
        <p>Hello ${name},</p>
        <p>${params.message}</p>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin: 16px 0;">
          <p style="margin: 0;"><strong>Job:</strong> ${params.jobTitle}</p>
          <p style="margin: 6px 0 0;"><strong>Booking:</strong> ${params.bookingId}</p>
        </div>
        <p>Please review this booking and update status as soon as possible.</p>
      </div>
    `,
  });
}

async function processCandidates(
  candidates: SlaBookingCandidate[],
  options: {
    eventType: string;
    reasonBuilder: (booking: SlaBookingCandidate) => string;
    title: string;
    messageBuilder: (booking: SlaBookingCandidate) => string;
    idempotencyPrefix: string;
    now: Date;
    dryRun: boolean;
    actorUserId: string | null;
    actorName: string;
    actorRole: string;
  },
) {
  let createdEvents = 0;
  let duplicateEvents = 0;
  let notificationAttempts = 0;
  let notificationsSucceeded = 0;

  const cycleKey = getCycleKey(options.now);

  for (const booking of candidates) {
    const reason = options.reasonBuilder(booking);

    if (options.dryRun) {
      continue;
    }

    const createdEvent = await recordJobLifecycleEvent({
      jobId: booking.jobId,
      bookingId: booking.id,
      eventType: options.eventType as
        | "SLA_EXECUTION_STALLED"
        | "SLA_COMPLETION_DELAYED",
      fromState: booking.status,
      toState: booking.status,
      reason,
      actorUserId: options.actorUserId,
      actorName: options.actorName,
      actorRole: options.actorRole,
      metadata: {
        bookingDate: booking.date.toISOString(),
        lastUpdatedAt: booking.updatedAt.toISOString(),
      },
      idempotencyKey: `${options.idempotencyPrefix}:${booking.id}:${cycleKey}`,
    });

    if (!createdEvent) {
      duplicateEvents += 1;
      continue;
    }

    createdEvents += 1;

    const message = options.messageBuilder(booking);
    const jobTitle = booking.job?.title || "your job";

    const recipients = [
      {
        userId: booking.clientId,
        recipientName: booking.client.name,
      },
      {
        userId: booking.providerId,
        recipientName: booking.provider.name,
      },
    ];

    for (const recipient of recipients) {
      notificationAttempts += 1;
      try {
        await sendSlaNotification({
          userId: recipient.userId,
          recipientName: recipient.recipientName,
          title: options.title,
          message,
          jobTitle,
          bookingId: booking.id,
        });
        notificationsSucceeded += 1;
      } catch (error) {
        console.error("[SLA_MONITOR_NOTIFICATION]", error);
      }
    }
  }

  return {
    createdEvents,
    duplicateEvents,
    notificationAttempts,
    notificationsSucceeded,
  };
}

export async function runJobSlaMonitor(
  options: SlaMonitorOptions = {},
): Promise<SlaMonitorResult> {
  const now = options.now ?? new Date();
  const dryRun = options.dryRun === true;
  const stalledThresholdHours = parseThresholdHours(
    "JOB_SLA_STALLED_HOURS",
    36,
  );
  const delayedThresholdHours = parseThresholdHours(
    "JOB_SLA_DELAYED_HOURS",
    48,
  );

  const stalledCutoff = new Date(
    now.getTime() - stalledThresholdHours * 60 * 60 * 1000,
  );
  const delayedCutoff = new Date(
    now.getTime() - delayedThresholdHours * 60 * 60 * 1000,
  );

  const actorUserId = options.actorUserId ?? null;
  const actorName = options.actorName?.trim() || "SLA Monitor";
  const actorRole = options.actorRole?.trim() || "SYSTEM";

  const [stalledCandidates, delayedCandidates] = await Promise.all([
    prisma.booking.findMany({
      where: {
        jobId: {
          not: null,
        },
        status: "IN_PROGRESS",
        updatedAt: {
          lte: stalledCutoff,
        },
      },
      select: {
        id: true,
        jobId: true,
        status: true,
        date: true,
        updatedAt: true,
        clientId: true,
        providerId: true,
        job: {
          select: {
            title: true,
          },
        },
        client: {
          select: {
            name: true,
          },
        },
        provider: {
          select: {
            name: true,
          },
        },
      },
      take: 300,
    }),
    prisma.booking.findMany({
      where: {
        jobId: {
          not: null,
        },
        status: {
          in: ["CONFIRMED", "IN_PROGRESS", "AWAITING_CLIENT_CONFIRMATION"],
        },
        date: {
          lte: delayedCutoff,
        },
        updatedAt: {
          lte: delayedCutoff,
        },
      },
      select: {
        id: true,
        jobId: true,
        status: true,
        date: true,
        updatedAt: true,
        clientId: true,
        providerId: true,
        job: {
          select: {
            title: true,
          },
        },
        client: {
          select: {
            name: true,
          },
        },
        provider: {
          select: {
            name: true,
          },
        },
      },
      take: 300,
    }),
  ]);

  const normalizedStalledCandidates =
    normalizeCandidatesWithJobId(stalledCandidates);
  const normalizedDelayedCandidates =
    normalizeCandidatesWithJobId(delayedCandidates);

  const stalledResult = await processCandidates(normalizedStalledCandidates, {
    eventType: JOB_LIFECYCLE_EVENT_TYPES.SLA_EXECUTION_STALLED,
    reasonBuilder: (booking) =>
      `Execution appears stalled for booking ${booking.id}. No status progress recorded in the last ${stalledThresholdHours} hours.`,
    title: "Execution update required",
    messageBuilder: (booking) =>
      `Booking ${booking.id} appears stalled and needs a progress update.`,
    idempotencyPrefix: "sla:execution-stalled",
    now,
    dryRun,
    actorUserId,
    actorName,
    actorRole,
  });

  const delayedResult = await processCandidates(normalizedDelayedCandidates, {
    eventType: JOB_LIFECYCLE_EVENT_TYPES.SLA_COMPLETION_DELAYED,
    reasonBuilder: (booking) =>
      `Completion may be delayed for booking ${booking.id}. Booking schedule passed ${delayedThresholdHours} hours without closure.`,
    title: "Completion delay detected",
    messageBuilder: (booking) =>
      `Booking ${booking.id} may be delayed beyond expected completion time.`,
    idempotencyPrefix: "sla:completion-delayed",
    now,
    dryRun,
    actorUserId,
    actorName,
    actorRole,
  });

  return {
    dryRun,
    checkedAt: now.toISOString(),
    stalledThresholdHours,
    delayedThresholdHours,
    stalledCandidates: normalizedStalledCandidates.length,
    delayedCandidates: normalizedDelayedCandidates.length,
    createdEvents: stalledResult.createdEvents + delayedResult.createdEvents,
    duplicateEvents:
      stalledResult.duplicateEvents + delayedResult.duplicateEvents,
    notificationAttempts:
      stalledResult.notificationAttempts + delayedResult.notificationAttempts,
    notificationsSucceeded:
      stalledResult.notificationsSucceeded +
      delayedResult.notificationsSucceeded,
  };
}
