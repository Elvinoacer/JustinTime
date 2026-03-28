import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { isValidKenyanPhone, normalizeKenyanPhone } from "@/lib/utils/phone";

export const POST = auth(async (req) => {
  try {
    const session = req.auth;

    if (!session?.user?.id && !session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const normalizedPhone = normalizeKenyanPhone(
      String(body?.phone || "").trim(),
    );

    if (!normalizedPhone) {
      return NextResponse.json(
        {
          available: false,
          normalizedPhone,
          error: "Phone number is required",
        },
        { status: 400 },
      );
    }

    if (!isValidKenyanPhone(normalizedPhone)) {
      return NextResponse.json(
        {
          available: false,
          normalizedPhone,
          error:
            "Use a valid Kenyan phone number format, for example 254712345678.",
        },
        { status: 400 },
      );
    }

    const actingUser = await prisma.user.findFirst({
      where: {
        OR: [
          ...(session?.user?.id ? [{ id: session.user.id }] : []),
          ...(session?.user?.email
            ? [{ email: session.user.email.trim().toLowerCase() }]
            : []),
        ],
      },
      select: { id: true },
    });

    if (!actingUser) {
      return NextResponse.json(
        {
          available: false,
          normalizedPhone,
          error:
            "Account not found for current session. Please sign out and sign in again.",
        },
        { status: 404 },
      );
    }

    const phoneOwner = await prisma.user.findFirst({
      where: {
        phone: normalizedPhone,
        NOT: { id: actingUser.id },
      },
      select: { id: true },
    });

    if (phoneOwner) {
      return NextResponse.json(
        {
          available: false,
          normalizedPhone,
          conflictField: "phone",
          error:
            "That phone number is already linked to another account. Use a different number.",
        },
        { status: 409 },
      );
    }

    return NextResponse.json({
      available: true,
      normalizedPhone,
      message: "Phone number is available",
    });
  } catch (error) {
    console.error("[VALIDATE_PHONE_ERROR]", error);
    return NextResponse.json(
      {
        available: false,
        error: "Failed to validate phone number. Please try again.",
      },
      { status: 500 },
    );
  }
});
