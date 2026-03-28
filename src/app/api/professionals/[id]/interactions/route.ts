import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleError, successResponse } from "@/lib/middleware/errorHandler";
import { sendComprehensiveNotification } from "@/lib/notifications/adminNotifications";

type InteractionRateState = { count: number; resetAt: number };

const globalForInteractions = globalThis as typeof globalThis & {
  __professionalInteractionCooldown?: Map<string, number>;
  __professionalInteractionRateLimit?: Map<string, InteractionRateState>;
};

const interactionCooldownStore =
  globalForInteractions.__professionalInteractionCooldown ??
  new Map<string, number>();
const interactionRateLimitStore =
  globalForInteractions.__professionalInteractionRateLimit ??
  new Map<string, InteractionRateState>();

globalForInteractions.__professionalInteractionCooldown =
  interactionCooldownStore;
globalForInteractions.__professionalInteractionRateLimit =
  interactionRateLimitStore;

const INTERACTION_COOLDOWN_MS = 12 * 60 * 60 * 1000;
const INTERACTION_RATE_LIMIT = 60;
const INTERACTION_RATE_WINDOW_MS = 60 * 1000;

function getClientIp(request: NextRequest): string | null {
  const value =
    request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip");
  if (!value) return null;
  return value.split(",")[0].trim() || null;
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const state = interactionRateLimitStore.get(ip);

  if (!state || state.resetAt <= now) {
    interactionRateLimitStore.set(ip, {
      count: 1,
      resetAt: now + INTERACTION_RATE_WINDOW_MS,
    });
    return false;
  }

  if (state.count >= INTERACTION_RATE_LIMIT) {
    return true;
  }

  state.count += 1;
  interactionRateLimitStore.set(ip, state);
  return false;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const clientIp = getClientIp(request);

    if (!clientIp) {
      return NextResponse.json(
        { error: "Unable to validate request origin" },
        { status: 400 },
      );
    }

    if (isRateLimited(clientIp)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { type } = await request.json(); // 'view' or 'favorite'

    if (!["view", "favorite"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid interaction type" },
        { status: 400 },
      );
    }

    const dedupeKey = `${type}:${id}:${clientIp}`;
    const now = Date.now();
    const lastSeen = interactionCooldownStore.get(dedupeKey);
    if (lastSeen && now - lastSeen < INTERACTION_COOLDOWN_MS) {
      const snapshot = await prisma.profile.findUnique({
        where: { userId: id },
        select: { views: true, favorites: true },
      });
      return successResponse({
        views: snapshot?.views ?? 0,
        favorites: snapshot?.favorites ?? 0,
      });
    }

    const provider = await prisma.user.findUnique({
      where: { id, role: "PROVIDER" },
      include: { profile: true },
    });

    if (!provider || !provider.profile) {
      return NextResponse.json(
        { error: "Professional not found" },
        { status: 404 },
      );
    }

    // Update stats
    const updatedProfile = await prisma.profile.update({
      where: { userId: id },
      data: {
        [type === "view" ? "views" : "favorites"]: {
          increment: 1,
        },
      },
    });
    interactionCooldownStore.set(dedupeKey, now);

    // Send notification
    if (type === "view") {
      // Optional: Don't notify for every view to avoid spam, or implement throttling
      // For now, we'll notify as requested
      await sendComprehensiveNotification({
        userId: provider.id,
        title: "New Profile View",
        message: "Someone just viewed your profile!",
        type: "VIEW_ALERT",
        emailSubject: "New Profile View - JustInTime",
        emailHtml: `
              <div style="font-family: sans-serif; padding: 20px;">
                <h2>New Profile View</h2>
                <p>Someone just viewed your profile on JustInTime.</p>
                <a href="${process.env.NEXTAUTH_URL}/dashboard/profile" style="display: inline-block; padding: 10px 20px; background-color: #000; color: #fff; text-decoration: none; border-radius: 5px;">View Profile Stats</a>
              </div>
            `,
      });
    } else if (type === "favorite") {
      await sendComprehensiveNotification({
        userId: provider.id,
        title: "New Profile Favorite",
        message: "Someone just favorited your profile!",
        type: "FAVORITE_ALERT",
        emailSubject: "New Profile Favorite - JustInTime",
        emailHtml: `
              <div style="font-family: sans-serif; padding: 20px;">
                <h2>New Profile Favorite</h2>
                <p>Someone just favorited your profile on JustInTime!</p>
                <a href="${process.env.NEXTAUTH_URL}/dashboard/profile" style="display: inline-block; padding: 10px 20px; background-color: #000; color: #fff; text-decoration: none; border-radius: 5px;">View Profile Stats</a>
              </div>
            `,
      });
    }

    return successResponse({
      views: updatedProfile.views,
      favorites: updatedProfile.favorites,
    });
  } catch (error) {
    return handleError(error);
  }
}
