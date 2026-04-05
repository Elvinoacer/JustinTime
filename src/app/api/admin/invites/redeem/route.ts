import { auth } from "@/auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { mergeRoles } from "@/lib/auth/roles";

function normalizeToken(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim();
}

export const POST = auth(async (req) => {
  try {
    const actor = req.auth?.user;
    if (!actor?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const actorEmail = actor.email?.trim().toLowerCase();
    if (!actorEmail) {
      return NextResponse.json(
        { error: "Your account must have a valid email to redeem this invite" },
        { status: 400 },
      );
    }

    const body = (await req.json().catch(() => ({}))) as { token?: unknown };
    const token = normalizeToken(body.token);

    if (!token) {
      return NextResponse.json(
        { error: "Invite token is required" },
        { status: 400 },
      );
    }

    const invite = await prisma.adminInvite.findUnique({
      where: { token },
      select: {
        id: true,
        email: true,
        usedAt: true,
        expiresAt: true,
      },
    });

    if (!invite) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }

    if (invite.usedAt) {
      return NextResponse.json(
        { error: "This invite has already been used" },
        { status: 409 },
      );
    }

    if (invite.expiresAt.getTime() < Date.now()) {
      return NextResponse.json(
        { error: "This invite has expired" },
        { status: 410 },
      );
    }

    if (invite.email.trim().toLowerCase() !== actorEmail) {
      return NextResponse.json(
        { error: "This invite is assigned to a different email address" },
        { status: 403 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: actor.id },
      select: {
        id: true,
        role: true,
        roles: true,
        onboardingCompleted: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.onboardingCompleted) {
      return NextResponse.json(
        {
          error:
            "Complete standard onboarding before redeeming an admin invite",
        },
        { status: 400 },
      );
    }

    const mergedRoles = mergeRoles(user.roles, user.role, ["ADMIN"]);

    const updatedUser = await prisma.$transaction(async (tx) => {
      const consumeResult = await tx.adminInvite.updateMany({
        where: {
          id: invite.id,
          usedAt: null,
        },
        data: {
          usedAt: new Date(),
          usedById: actor.id,
        },
      });

      if (consumeResult.count !== 1) {
        throw new Error("INVITE_ALREADY_CONSUMED");
      }

      return tx.user.update({
        where: { id: actor.id },
        data: {
          role: "ADMIN",
          roles: mergedRoles,
          preferredWorkspace: "ADMIN",
        },
        select: {
          id: true,
          role: true,
          roles: true,
          preferredWorkspace: true,
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Admin access granted",
      role: updatedUser.role,
      roles: updatedUser.roles,
      preferredWorkspace: updatedUser.preferredWorkspace,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "INVITE_ALREADY_CONSUMED") {
      return NextResponse.json(
        { error: "This invite has already been used" },
        { status: 409 },
      );
    }

    console.error("[ADMIN_INVITE_REDEEM_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to redeem admin invite" },
      { status: 500 },
    );
  }
});
