import { Resend } from "resend";
import type { Prisma } from "@/generated/prisma/client";
import {
  NotificationDeliveryChannel,
  NotificationDeliveryStatus,
  NotificationOutboxStatus,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getFromEmail } from "@/lib/email";
import { sendNotificationToUser } from "@/lib/notifications/dispatcher";

const LOCK_STALE_MS = 120_000;
const RETRY_BASE_DELAY_MS = 30_000;
const RETRY_MAX_DELAY_MS = 10 * 60_000;
const MAX_BATCH_LIMIT = 100;

type OutboxPushPayload = {
  title: string;
  body: string;
  imageUrl?: string;
  data?: Record<string, string>;
};

type OutboxEmailPayload = {
  to: string;
  subject: string;
  html: string;
};

type NotificationOutboxPayload = {
  type: string;
  channels: NotificationDeliveryChannel[];
  push?: OutboxPushPayload;
  email?: OutboxEmailPayload;
};

type ChannelOutcome = {
  channel: NotificationDeliveryChannel;
  status: NotificationDeliveryStatus;
  providerMessageId?: string;
  providerMetadata?: Prisma.InputJsonValue;
  errorMessage?: string;
};

export type ProcessNotificationOutboxResult = {
  checked: number;
  claimed: number;
  processed: number;
  delivered: number;
  retried: number;
  failed: number;
  skipped: number;
  errors: Array<{ outboxId: string; error: string }>;
};

type ProcessOptions = {
  limit?: number;
  notificationId?: string;
  processorId?: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function parseChannels(value: unknown): NotificationDeliveryChannel[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const channels: NotificationDeliveryChannel[] = [];
  for (const item of value) {
    if (
      item === NotificationDeliveryChannel.PUSH ||
      item === NotificationDeliveryChannel.EMAIL
    ) {
      channels.push(item);
    }
  }

  return channels;
}

function parsePushPayload(value: unknown): OutboxPushPayload | undefined {
  const record = asRecord(value);
  if (!record) {
    return undefined;
  }

  const title =
    typeof record.title === "string" && record.title.trim().length > 0
      ? record.title
      : null;
  const body =
    typeof record.body === "string" && record.body.trim().length > 0
      ? record.body
      : null;

  if (!title || !body) {
    return undefined;
  }

  const dataRecord = asRecord(record.data);
  const data: Record<string, string> | undefined = dataRecord
    ? Object.entries(dataRecord).reduce<Record<string, string>>(
        (acc, [key, entryValue]) => {
          if (typeof entryValue === "string") {
            acc[key] = entryValue;
          }
          return acc;
        },
        {},
      )
    : undefined;

  return {
    title,
    body,
    imageUrl: typeof record.imageUrl === "string" ? record.imageUrl : undefined,
    data,
  };
}

function parseEmailPayload(value: unknown): OutboxEmailPayload | undefined {
  const record = asRecord(value);
  if (!record) {
    return undefined;
  }

  if (
    typeof record.to !== "string" ||
    typeof record.subject !== "string" ||
    typeof record.html !== "string"
  ) {
    return undefined;
  }

  return {
    to: record.to,
    subject: record.subject,
    html: record.html,
  };
}

function parseOutboxPayload(
  payload: Prisma.JsonValue | null,
): NotificationOutboxPayload {
  const record = asRecord(payload);
  if (!record) {
    return {
      type: "UNKNOWN",
      channels: [],
    };
  }

  return {
    type: typeof record.type === "string" ? record.type : "UNKNOWN",
    channels: parseChannels(record.channels),
    push: parsePushPayload(record.push),
    email: parseEmailPayload(record.email),
  };
}

function getRetryDelayMs(attempt: number): number {
  const exponential = RETRY_BASE_DELAY_MS * 2 ** Math.max(attempt - 1, 0);
  return Math.min(exponential, RETRY_MAX_DELAY_MS);
}

async function claimOutboxEvent(params: {
  outboxId: string;
  now: Date;
  processorId: string;
}): Promise<boolean> {
  const staleCutoff = new Date(params.now.getTime() - LOCK_STALE_MS);

  const claimResult = await prisma.notificationOutbox.updateMany({
    where: {
      id: params.outboxId,
      status: {
        in: [NotificationOutboxStatus.PENDING, NotificationOutboxStatus.RETRY],
      },
      nextAttemptAt: {
        lte: params.now,
      },
      OR: [{ lockedAt: null }, { lockedAt: { lt: staleCutoff } }],
    },
    data: {
      status: NotificationOutboxStatus.PROCESSING,
      lockedAt: params.now,
      lockedBy: params.processorId,
      lastAttemptAt: params.now,
    },
  });

  return claimResult.count > 0;
}

async function sendPushChannel(params: {
  userId: string;
  pushPayload?: OutboxPushPayload;
}): Promise<ChannelOutcome> {
  if (!params.pushPayload) {
    return {
      channel: NotificationDeliveryChannel.PUSH,
      status: NotificationDeliveryStatus.FAILED,
      errorMessage: "Push payload is missing",
    };
  }

  const pushResult = await sendNotificationToUser(params.userId, {
    notification: {
      title: params.pushPayload.title,
      body: params.pushPayload.body,
      imageUrl: params.pushPayload.imageUrl,
    },
    data: params.pushPayload.data,
  });

  const resultRecord = asRecord(pushResult);
  const reason =
    resultRecord && typeof resultRecord.reason === "string"
      ? resultRecord.reason
      : undefined;
  const sentCount =
    resultRecord && typeof resultRecord.sentCount === "number"
      ? resultRecord.sentCount
      : 0;

  if (resultRecord?.success === true && sentCount > 0) {
    return {
      channel: NotificationDeliveryChannel.PUSH,
      status: NotificationDeliveryStatus.SENT,
      providerMetadata: resultRecord as Prisma.InputJsonValue,
    };
  }

  if (reason === "disabled_by_preferences" || reason === "no_tokens") {
    return {
      channel: NotificationDeliveryChannel.PUSH,
      status: NotificationDeliveryStatus.SKIPPED,
      providerMetadata: resultRecord as Prisma.InputJsonValue,
      errorMessage: reason,
    };
  }

  return {
    channel: NotificationDeliveryChannel.PUSH,
    status: NotificationDeliveryStatus.FAILED,
    providerMetadata: resultRecord as Prisma.InputJsonValue,
    errorMessage:
      reason ||
      (resultRecord && typeof resultRecord.error === "string"
        ? resultRecord.error
        : "Push delivery failed"),
  };
}

async function sendEmailChannel(params: {
  emailPayload?: OutboxEmailPayload;
}): Promise<ChannelOutcome> {
  if (!params.emailPayload) {
    return {
      channel: NotificationDeliveryChannel.EMAIL,
      status: NotificationDeliveryStatus.FAILED,
      errorMessage: "Email payload is missing",
    };
  }

  if (!process.env.RESEND_API_KEY) {
    return {
      channel: NotificationDeliveryChannel.EMAIL,
      status: NotificationDeliveryStatus.FAILED,
      errorMessage: "RESEND_API_KEY is missing",
    };
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const emailResult = await resend.emails.send({
      from: `JustInTime <${getFromEmail()}>`,
      to: params.emailPayload.to,
      subject: params.emailPayload.subject,
      html: params.emailPayload.html,
    });

    const emailResultRecord = asRecord(emailResult);
    const dataRecord = emailResultRecord
      ? asRecord(emailResultRecord.data)
      : null;

    return {
      channel: NotificationDeliveryChannel.EMAIL,
      status: NotificationDeliveryStatus.SENT,
      providerMessageId:
        dataRecord && typeof dataRecord.id === "string"
          ? dataRecord.id
          : undefined,
      providerMetadata: (emailResultRecord || {
        success: true,
      }) as Prisma.InputJsonValue,
    };
  } catch (error) {
    return {
      channel: NotificationDeliveryChannel.EMAIL,
      status: NotificationDeliveryStatus.FAILED,
      errorMessage:
        error instanceof Error ? error.message : "Email delivery failed",
    };
  }
}

async function recordChannelOutcomes(params: {
  notificationId: string;
  attempt: number;
  outcomes: ChannelOutcome[];
  now: Date;
}) {
  for (const outcome of params.outcomes) {
    await prisma.notificationDelivery.create({
      data: {
        notificationId: params.notificationId,
        channel: outcome.channel,
        status: outcome.status,
        attempt: params.attempt,
        attemptedAt: params.now,
        sentAt:
          outcome.status === NotificationDeliveryStatus.SENT
            ? params.now
            : null,
        failedAt:
          outcome.status === NotificationDeliveryStatus.FAILED
            ? params.now
            : null,
        providerMessageId: outcome.providerMessageId,
        providerMetadata: outcome.providerMetadata,
        errorMessage: outcome.errorMessage,
      },
    });
  }
}

async function processOutboxEvent(params: {
  outboxId: string;
  now: Date;
}): Promise<{
  delivered: boolean;
  retried: boolean;
  failed: boolean;
  skipped: number;
  error?: string;
}> {
  const outbox = await prisma.notificationOutbox.findUnique({
    where: { id: params.outboxId },
  });

  if (!outbox) {
    return {
      delivered: false,
      retried: false,
      failed: true,
      skipped: 0,
      error: "Outbox event not found",
    };
  }

  const payload = parseOutboxPayload(outbox.payload);
  const attempt = outbox.attempts + 1;
  const outcomes: ChannelOutcome[] = [];

  for (const channel of payload.channels) {
    if (channel === NotificationDeliveryChannel.PUSH) {
      outcomes.push(
        await sendPushChannel({
          userId: outbox.userId,
          pushPayload: payload.push,
        }),
      );
      continue;
    }

    if (channel === NotificationDeliveryChannel.EMAIL) {
      outcomes.push(
        await sendEmailChannel({
          emailPayload: payload.email,
        }),
      );
    }
  }

  await recordChannelOutcomes({
    notificationId: outbox.notificationId,
    attempt,
    outcomes,
    now: params.now,
  });

  const failedOutcomes = outcomes.filter(
    (outcome) => outcome.status === NotificationDeliveryStatus.FAILED,
  );
  const skipped = outcomes.filter(
    (outcome) => outcome.status === NotificationDeliveryStatus.SKIPPED,
  ).length;

  if (failedOutcomes.length === 0) {
    await prisma.$transaction([
      prisma.notificationOutbox.update({
        where: { id: outbox.id },
        data: {
          status: NotificationOutboxStatus.DELIVERED,
          attempts: attempt,
          lastAttemptAt: params.now,
          lockedAt: null,
          lockedBy: null,
          lastError: null,
          payload: {
            ...payload,
            channels: [],
          } as Prisma.InputJsonValue,
        },
      }),
      prisma.notification.update({
        where: { id: outbox.notificationId },
        data: {
          deliveryStatus: NotificationOutboxStatus.DELIVERED,
          deliveryAttempts: attempt,
          deliveredAt: params.now,
          lastDeliveryAttemptAt: params.now,
        },
      }),
    ]);

    return {
      delivered: true,
      retried: false,
      failed: false,
      skipped,
    };
  }

  const hasMoreAttempts = attempt < outbox.maxAttempts;
  const nextStatus = hasMoreAttempts
    ? NotificationOutboxStatus.RETRY
    : NotificationOutboxStatus.FAILED;
  const nextAttemptAt = hasMoreAttempts
    ? new Date(params.now.getTime() + getRetryDelayMs(attempt))
    : params.now;

  const failedChannels = failedOutcomes.map((outcome) => outcome.channel);
  const errorMessage = failedOutcomes
    .map((outcome) => outcome.errorMessage)
    .filter((message): message is string => Boolean(message))
    .join(" | ");

  await prisma.$transaction([
    prisma.notificationOutbox.update({
      where: { id: outbox.id },
      data: {
        status: nextStatus,
        attempts: attempt,
        nextAttemptAt,
        lastAttemptAt: params.now,
        lockedAt: null,
        lockedBy: null,
        lastError: errorMessage || "Channel delivery failed",
        payload: {
          ...payload,
          channels: failedChannels,
        } as Prisma.InputJsonValue,
      },
    }),
    prisma.notification.update({
      where: { id: outbox.notificationId },
      data: {
        deliveryStatus: nextStatus,
        deliveryAttempts: attempt,
        lastDeliveryAttemptAt: params.now,
      },
    }),
  ]);

  return {
    delivered: false,
    retried: hasMoreAttempts,
    failed: !hasMoreAttempts,
    skipped,
    error: errorMessage || undefined,
  };
}

export async function processNotificationOutboxBatch(
  options: ProcessOptions = {},
): Promise<ProcessNotificationOutboxResult> {
  const now = new Date();
  const staleCutoff = new Date(now.getTime() - LOCK_STALE_MS);
  const limit = Math.max(1, Math.min(options.limit ?? 25, MAX_BATCH_LIMIT));
  const processorId = options.processorId || "notification-outbox-processor";

  const candidates = await prisma.notificationOutbox.findMany({
    where: {
      ...(options.notificationId
        ? {
            notificationId: options.notificationId,
          }
        : {}),
      status: {
        in: [NotificationOutboxStatus.PENDING, NotificationOutboxStatus.RETRY],
      },
      nextAttemptAt: {
        lte: now,
      },
      OR: [{ lockedAt: null }, { lockedAt: { lt: staleCutoff } }],
    },
    orderBy: [{ nextAttemptAt: "asc" }, { createdAt: "asc" }],
    take: limit,
  });

  const result: ProcessNotificationOutboxResult = {
    checked: candidates.length,
    claimed: 0,
    processed: 0,
    delivered: 0,
    retried: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  };

  for (const candidate of candidates) {
    const claimed = await claimOutboxEvent({
      outboxId: candidate.id,
      now,
      processorId,
    });

    if (!claimed) {
      continue;
    }

    result.claimed += 1;

    try {
      const eventResult = await processOutboxEvent({
        outboxId: candidate.id,
        now: new Date(),
      });

      result.processed += 1;
      result.skipped += eventResult.skipped;

      if (eventResult.delivered) {
        result.delivered += 1;
      }

      if (eventResult.retried) {
        result.retried += 1;
      }

      if (eventResult.failed) {
        result.failed += 1;
      }

      if (eventResult.error) {
        result.errors.push({
          outboxId: candidate.id,
          error: eventResult.error,
        });
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unexpected outbox error";

      result.failed += 1;
      result.errors.push({
        outboxId: candidate.id,
        error: message,
      });

      const attempt = candidate.attempts + 1;
      const hasMoreAttempts = attempt < candidate.maxAttempts;
      const nextStatus = hasMoreAttempts
        ? NotificationOutboxStatus.RETRY
        : NotificationOutboxStatus.FAILED;

      await prisma.$transaction([
        prisma.notificationOutbox.update({
          where: { id: candidate.id },
          data: {
            status: nextStatus,
            attempts: attempt,
            nextAttemptAt: hasMoreAttempts
              ? new Date(Date.now() + getRetryDelayMs(attempt))
              : new Date(),
            lockedAt: null,
            lockedBy: null,
            lastAttemptAt: new Date(),
            lastError: message,
          },
        }),
        prisma.notification.update({
          where: { id: candidate.notificationId },
          data: {
            deliveryStatus: nextStatus,
            deliveryAttempts: attempt,
            lastDeliveryAttemptAt: new Date(),
          },
        }),
      ]);
    }
  }

  return result;
}
