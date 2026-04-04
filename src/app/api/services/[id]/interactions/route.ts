import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleError, successResponse } from "@/lib/middleware/errorHandler";
import { sendComprehensiveNotification } from "@/lib/notifications/adminNotifications";

type InteractionRateState = { count: number; resetAt: number };

const globalForInteractions = globalThis as typeof globalThis & {
  __serviceInteractionCooldown?: Map<string, number>;
  __serviceInteractionRateLimit?: Map<string, InteractionRateState>;
};

const interactionCooldownStore =
  globalForInteractions.__serviceInteractionCooldown ??
  new Map<string, number>();
const interactionRateLimitStore =
  globalForInteractions.__serviceInteractionRateLimit ??
  new Map<string, InteractionRateState>();

globalForInteractions.__serviceInteractionCooldown = interactionCooldownStore;
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

function getInteractionIdentity(request: NextRequest): string | null {
  return (
    getClientIp(request) ||
    request.headers.get("x-anonymous-id")?.trim() ||
    null
  );
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
    const identity = getInteractionIdentity(request);

    if (!identity) {
      return NextResponse.json(
        { error: "Unable to validate request origin" },
        { status: 400 },
      );
    }

    if (isRateLimited(identity)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    const { type } = await request.json(); // 'view' or 'favorite'

    if (!["view", "favorite"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid interaction type" },
        { status: 400 },
      );
    }

    const dedupeKey = `${type}:${id}:${identity}`;
    const now = Date.now();
    const lastSeen = interactionCooldownStore.get(dedupeKey);
    if (lastSeen && now - lastSeen < INTERACTION_COOLDOWN_MS) {
      const snapshot = await prisma.service.findUnique({
        where: { id },
        select: { views: true, favorites: true },
      });
      return successResponse({
        views: snapshot?.views ?? 0,
        favorites: snapshot?.favorites ?? 0,
      });
    }

    const service = await prisma.service.findUnique({
      where: { id },
      include: { provider: true },
    });

    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    // Update stats
    const updatedService = await prisma.service.update({
      where: { id },
      data: {
        [type === "view" ? "views" : "favorites"]: {
          increment: 1,
        },
      },
    });
    interactionCooldownStore.set(dedupeKey, now);

    // Send notification
    if (type === "view") {
      await sendComprehensiveNotification({
        userId: service.providerId,
        title: "New Service View",
        message: `Someone just viewed your service: ${service.title}`,
        type: "VIEW_ALERT",
        emailSubject: `New Service View: ${service.title}`,
        emailHtml: `
              <div style="font-family: sans-serif; padding: 20px;">
                <h2>New Service View</h2>
                <p>Someone just viewed your service <strong>${service.title}</strong> on JustInTime.</p>
                <a href="${process.env.NEXTAUTH_URL}/dashboard/services" style="display: inline-block; padding: 10px 20px; background-color: #000; color: #fff; text-decoration: none; border-radius: 5px;">View Service Stats</a>
              </div>
            `,
      });
    } else if (type === "favorite") {
      await sendComprehensiveNotification({
        userId: service.providerId,
        title: "New Service Favorite",
        message: `Someone just favorited your service: ${service.title}`,
        type: "FAVORITE_ALERT",
        emailSubject: `New Service Favorite: ${service.title}`,
        emailHtml: `
              <div style="font-family: sans-serif; padding: 20px;">
                <h2>New Service Favorite</h2>
                <p>Someone just favorited your service <strong>${service.title}</strong> on JustInTime!</p>
                <a href="${process.env.NEXTAUTH_URL}/dashboard/services" style="display: inline-block; padding: 10px 20px; background-color: #000; color: #fff; text-decoration: none; border-radius: 5px;">View Service Stats</a>
              </div>
            `,
      });
    }

    return successResponse({
      views: updatedService.views,
      favorites: updatedService.favorites,
    });
  } catch (error) {
    return handleError(error);
  }
}
