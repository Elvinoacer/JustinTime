import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { handleError, successResponse } from "@/lib/middleware/errorHandler";
import { sendComprehensiveNotification } from "@/lib/notifications/adminNotifications";
import { Prisma } from "@/generated/prisma/client";

type InteractionRateState = { count: number; resetAt: number };

const globalForInteractions = globalThis as typeof globalThis & {
  __serviceInteractionRateLimit?: Map<string, InteractionRateState>;
};

const interactionRateLimitStore =
  globalForInteractions.__serviceInteractionRateLimit ??
  new Map<string, InteractionRateState>();

globalForInteractions.__serviceInteractionRateLimit = interactionRateLimitStore;

const INTERACTION_COOLDOWN_MS = 12 * 60 * 60 * 1000;
const INTERACTION_RATE_LIMIT = 60;
const INTERACTION_RATE_WINDOW_MS = 60 * 1000;

function getClientIp(request: NextRequest): string | null {
  const value =
    request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip");
  if (!value) return null;
  return value.split(",")[0].trim() || null;
}

function buildFallbackIdentity(request: NextRequest): string {
  const userAgent =
    request.headers.get("user-agent")?.trim() || "unknown-agent";
  const acceptLanguage =
    request.headers.get("accept-language")?.trim() || "unknown-language";
  return `fingerprint:${`${userAgent}|${acceptLanguage}`.slice(0, 180)}`;
}

function toIdentityKey(identity: string): string {
  // Hash visitor identity so we can dedupe across instances without storing raw IP/fingerprint data.
  return createHash("sha256").update(identity).digest("hex");
}

async function getInteractionIdentity(request: NextRequest): Promise<string> {
  const session = await auth();
  if (session?.user?.id) {
    return `user:${session.user.id}`;
  }

  const identity =
    getClientIp(request) || request.headers.get("x-anonymous-id")?.trim();

  if (identity) {
    return identity;
  }

  return buildFallbackIdentity(request);
}

function isRateLimited(identity: string): boolean {
  const now = Date.now();
  const state = interactionRateLimitStore.get(identity);

  if (!state || state.resetAt <= now) {
    interactionRateLimitStore.set(identity, {
      count: 1,
      resetAt: now + INTERACTION_RATE_WINDOW_MS,
    });
    return false;
  }

  if (state.count >= INTERACTION_RATE_LIMIT) {
    return true;
  }

  state.count += 1;
  interactionRateLimitStore.set(identity, state);
  return false;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const identity = await getInteractionIdentity(request);
    const identityKey = toIdentityKey(identity);

    if (isRateLimited(identityKey)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    const payload = await request.json();
    const type = payload?.type;

    if (!["view", "favorite"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid interaction type" },
        { status: 400 },
      );
    }

    const interactionType = type === "view" ? "VIEW" : "FAVORITE";
    const now = new Date();
    const cooldownCutoff = new Date(now.getTime() - INTERACTION_COOLDOWN_MS);

    const interactionResult = await prisma.$transaction(async (tx) => {
      const service = await tx.service.findUnique({
        where: { id },
        select: {
          id: true,
          providerId: true,
          title: true,
        },
      });

      if (!service) {
        return {
          missing: true as const,
        };
      }

      const cooldownApplied = await tx.$executeRaw(Prisma.sql`
        INSERT INTO service_interaction_dedup (
          "serviceId",
          "identityKey",
          "interactionType",
          "lastInteractedAt",
          "createdAt",
          "updatedAt"
        )
        VALUES (
          ${id},
          ${identityKey},
          CAST(${interactionType} AS "ServiceInteractionType"),
          ${now},
          ${now},
          ${now}
        )
        ON CONFLICT ("serviceId", "identityKey", "interactionType")
        DO UPDATE
        SET
          "lastInteractedAt" = EXCLUDED."lastInteractedAt",
          "updatedAt" = EXCLUDED."updatedAt"
        WHERE service_interaction_dedup."lastInteractedAt" < ${cooldownCutoff}
      `);

      if (Number(cooldownApplied) === 0) {
        const snapshot = await tx.service.findUnique({
          where: { id },
          select: { views: true, favorites: true },
        });

        return {
          missing: false as const,
          service,
          shouldNotify: false,
          views: snapshot?.views ?? 0,
          favorites: snapshot?.favorites ?? 0,
        };
      }

      const updatedService = await tx.service.update({
        where: { id },
        data: {
          [type === "view" ? "views" : "favorites"]: {
            increment: 1,
          },
        },
        select: { views: true, favorites: true },
      });

      return {
        missing: false as const,
        service,
        shouldNotify: true,
        views: updatedService.views,
        favorites: updatedService.favorites,
      };
    });

    if (interactionResult.missing) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    // Send notification only when the dedupe gate allows a new interaction.
    if (interactionResult.shouldNotify && type === "view") {
      await sendComprehensiveNotification({
        userId: interactionResult.service.providerId,
        title: "New Service View",
        message: `Someone just viewed your service: ${interactionResult.service.title}`,
        type: "VIEW_ALERT",
        emailSubject: `New Service View: ${interactionResult.service.title}`,
        emailHtml: `
              <div style="font-family: sans-serif; padding: 20px;">
                <h2>New Service View</h2>
                <p>Someone just viewed your service <strong>${interactionResult.service.title}</strong> on JustInTime.</p>
                <a href="${process.env.NEXTAUTH_URL}/dashboard/services" style="display: inline-block; padding: 10px 20px; background-color: #000; color: #fff; text-decoration: none; border-radius: 5px;">View Service Stats</a>
              </div>
            `,
      });
    } else if (interactionResult.shouldNotify && type === "favorite") {
      await sendComprehensiveNotification({
        userId: interactionResult.service.providerId,
        title: "New Service Favorite",
        message: `Someone just favorited your service: ${interactionResult.service.title}`,
        type: "FAVORITE_ALERT",
        emailSubject: `New Service Favorite: ${interactionResult.service.title}`,
        emailHtml: `
              <div style="font-family: sans-serif; padding: 20px;">
                <h2>New Service Favorite</h2>
                <p>Someone just favorited your service <strong>${interactionResult.service.title}</strong> on JustInTime!</p>
                <a href="${process.env.NEXTAUTH_URL}/dashboard/services" style="display: inline-block; padding: 10px 20px; background-color: #000; color: #fff; text-decoration: none; border-radius: 5px;">View Service Stats</a>
              </div>
            `,
      });
    }

    return successResponse({
      views: interactionResult.views,
      favorites: interactionResult.favorites,
    });
  } catch (error) {
    return handleError(error);
  }
}
