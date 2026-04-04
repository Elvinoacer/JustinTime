import { NextRequest, NextResponse } from "next/server";
import { checkAdmin } from "@/app/actions/admin";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import { sendNotificationToUser } from "@/lib/notifications/dispatcher";
import { getFromEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

const DEBUG_SEND_RATE_LIMIT_MS = 60_000;
const adminDebugRequestMap = new Map<string, number>();

type DebugRequestBody = {
  confirm?: boolean;
  sendEmail?: boolean;
  sendPush?: boolean;
  dryRun?: boolean;
};

async function getDiagnostics(adminId: string) {
  const [tokenCount, adminUser] = await Promise.all([
    prisma.userToken.count({
      where: {
        userId: adminId,
        revokedAt: null,
      },
    }),
    prisma.user.findUnique({
      where: { id: adminId },
      select: { email: true, name: true },
    }),
  ]);

  return {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    config: {
      appUrl: process.env.NEXTAUTH_URL,
      email: {
        hasApiKey: Boolean(process.env.RESEND_API_KEY),
        apiKeyLength: process.env.RESEND_API_KEY?.length || 0,
        from: process.env.ADMIN_EMAIL || process.env.EMAIL_FROM,
      },
      firebase: {
        hasServiceAccount: Boolean(process.env.FIREBASE_PRIVATE_KEY),
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      },
    },
    admin: {
      id: adminId,
      email: adminUser?.email || null,
      name: adminUser?.name || null,
    },
    checks: {
      activePushTokens: tokenCount,
    },
  };
}

export async function GET() {
  try {
    const admin = await checkAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const diagnostics = await getDiagnostics(admin.id);
    return NextResponse.json({
      ...diagnostics,
      note: "Diagnostics only. Use POST with confirm=true to execute test sends.",
    });
  } catch (error) {
    console.error("Error collecting debug diagnostics:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await checkAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as DebugRequestBody;
    if (!body.confirm) {
      return NextResponse.json(
        {
          error:
            'Confirmation required. Send { "confirm": true } to execute debug notification sends.',
        },
        { status: 400 },
      );
    }

    const now = Date.now();
    const lastAttemptAt = adminDebugRequestMap.get(admin.id) || 0;
    if (now - lastAttemptAt < DEBUG_SEND_RATE_LIMIT_MS) {
      return NextResponse.json(
        {
          error:
            "Rate limit reached. Please wait before sending another debug notification.",
        },
        { status: 429 },
      );
    }
    adminDebugRequestMap.set(admin.id, now);

    const sendEmail = body.sendEmail !== false;
    const sendPush = body.sendPush !== false;
    const diagnostics = await getDiagnostics(admin.id);

    if (body.dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        requested: {
          sendEmail,
          sendPush,
        },
        diagnostics,
      });
    }

    const tests: Record<string, unknown> = {};

    if (sendEmail) {
      if (!process.env.RESEND_API_KEY) {
        tests.email = { success: false, error: "RESEND_API_KEY is missing" };
      } else if (!diagnostics.admin.email) {
        tests.email = {
          success: false,
          error: "Admin user has no email address",
        };
      } else {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const emailResult = await resend.emails.send({
          from: `Debug Tool <${getFromEmail()}>`,
          to: diagnostics.admin.email,
          subject: "Production Debug Test Email",
          text: "If you received this, debug email delivery is functioning correctly.",
        });

        tests.email = {
          success: true,
          recipient: diagnostics.admin.email,
          id: emailResult.data?.id,
        };
      }
    } else {
      tests.email = { skipped: true };
    }

    if (sendPush) {
      if (diagnostics.checks.activePushTokens < 1) {
        tests.push = {
          success: false,
          error: "No active push tokens found for admin user",
        };
      } else {
        const pushResult = await sendNotificationToUser(admin.id, {
          title: "Debug Test",
          body: "If you see this, push notifications are working.",
          data: {
            type: "DEBUG",
            url: "/admin/dashboard",
          },
        });

        tests.push = pushResult;
      }
    } else {
      tests.push = { skipped: true };
    }

    await prisma.adminLog.create({
      data: {
        adminId: admin.id,
        action: "DEBUG_NOTIFICATIONS_TRIGGERED",
        details: {
          sendEmail,
          sendPush,
          dryRun: false,
          timestamp: new Date().toISOString(),
        },
      },
    });

    return NextResponse.json({
      success: true,
      diagnostics,
      tests,
    });
  } catch (error) {
    console.error("Error executing debug notifications test:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
