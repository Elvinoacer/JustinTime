import { auth } from "@/auth";
import { NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { hasRole } from "@/lib/auth/roles";
import { buildAppUrl } from "@/lib/app-url";

const DEFAULT_INVITE_EXPIRY_DAYS = 7;
const MAX_INVITE_EXPIRY_DAYS = 30;

function normalizeEmail(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export const POST = auth(async (req) => {
  try {
    const actor = req.auth?.user;

    if (!actor?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasRole(actor, "ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await req.json().catch(() => ({}))) as {
      email?: unknown;
      expiryDays?: unknown;
    };

    const email = normalizeEmail(body.email);
    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: "A valid email is required" },
        { status: 400 },
      );
    }

    const requestedExpiryDays = Number(body.expiryDays);
    const expiryDays = Number.isFinite(requestedExpiryDays)
      ? Math.min(
          Math.max(Math.floor(requestedExpiryDays), 1),
          MAX_INVITE_EXPIRY_DAYS,
        )
      : DEFAULT_INVITE_EXPIRY_DAYS;

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

    const invite = await prisma.adminInvite.create({
      data: {
        token,
        email,
        createdById: actor.id,
        expiresAt,
      },
      select: {
        id: true,
        token: true,
        email: true,
        createdAt: true,
        expiresAt: true,
      },
    });

    return NextResponse.json({
      ...invite,
      inviteUrl: buildAppUrl(`/auth/admin-invite?token=${invite.token}`),
    });
  } catch (error) {
    console.error("[ADMIN_INVITE_CREATE_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to create admin invite" },
      { status: 500 },
    );
  }
});
