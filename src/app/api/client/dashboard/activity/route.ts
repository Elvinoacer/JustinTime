import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { handleError } from "@/lib/middleware/errorHandler";
import { hasClientAccess } from "@/lib/auth/clientAccess";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasClientAccess(session.user)) {
      return NextResponse.json(
        { error: "Client profile required" },
        { status: 403 },
      );
    }

    const userId = session.user.id;

    // Fetch recent activities
    const [proposals, completedJobs, payments] = await Promise.all([
      // New Proposals
      prisma.proposal.findMany({
        where: {
          job: { clientId: userId },
        },
        include: {
          job: { select: { title: true } },
          provider: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),

      // Completed Jobs
      prisma.job.findMany({
        where: {
          clientId: userId,
          status: "COMPLETED",
        },
        orderBy: { updatedAt: "desc" },
        take: 5,
      }),

      // Payments
      prisma.payment.findMany({
        where: {
          booking: { clientId: userId },
        },
        include: {
          booking: {
            include: {
              provider: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

    // Combine and format activities
    const activities = [
      ...proposals.map((p) => ({
        id: p.id,
        type: "PROPOSAL",
        title: "Proposal Received",
        desc: `${p.provider.name} bid on '${p.job.title}'`,
        time: p.createdAt,
        icon: "description",
        color: "bg-blue-100 text-blue-600",
      })),
      ...completedJobs.map((j) => ({
        id: j.id,
        type: "JOB_COMPLETED",
        title: "Job Completed",
        desc: `${j.title} marked done`,
        time: j.updatedAt,
        icon: "check_circle",
        color: "bg-emerald-100 text-emerald-600",
      })),
      ...payments.map((p) => ({
        id: p.id,
        type: "PAYMENT",
        title:
          p.status === "COMPLETED"
            ? "Payment Completed"
            : p.status === "PENDING"
              ? "Payment Pending"
              : p.status === "REFUNDED"
                ? "Payment Refunded"
                : "Payment Update",
        desc:
          p.status === "COMPLETED"
            ? `Paid KES ${Number(p.amount).toLocaleString()} to ${p.booking.provider.name}`
            : p.status === "PENDING"
              ? `Payment of KES ${Number(p.amount).toLocaleString()} is pending for ${p.booking.provider.name}`
              : p.status === "REFUNDED"
                ? `Refunded KES ${Number(p.amount).toLocaleString()} for ${p.booking.provider.name}`
                : `Payment status updated for ${p.booking.provider.name}`,
        time: p.createdAt,
        icon: "payments",
        color:
          p.status === "COMPLETED"
            ? "bg-amber-100 text-amber-600"
            : p.status === "PENDING"
              ? "bg-blue-100 text-blue-600"
              : p.status === "REFUNDED"
                ? "bg-emerald-100 text-emerald-600"
                : "bg-gray-100 text-gray-600",
      })),
    ]
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 10); // Return top 10 recent activities

    return NextResponse.json({ activities });
  } catch (error) {
    return handleError(error);
  }
}
