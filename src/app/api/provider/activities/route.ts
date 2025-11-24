import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { handleError } from "@/lib/middleware/errorHandler";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session || !session.user || session.user.role !== "PROVIDER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Fetch recent activities
    const [bookings, proposals, reviews] = await Promise.all([
      // Recent Bookings
      prisma.booking.findMany({
        where: {
          providerId: userId,
        },
        include: {
          client: { select: { name: true } },
          job: { select: { title: true } },
          service: { select: { title: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),

      // New Proposals
      prisma.proposal.findMany({
        where: {
          providerId: userId,
        },
        include: {
          job: { 
            select: { 
              title: true,
              client: { select: { name: true } }
            } 
          },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),

      // Reviews
      prisma.review.findMany({
        where: {
          targetId: userId,
        },
        include: {
          author: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

    // Combine and format activities
    const activities = [
      ...bookings.map(b => ({
        id: b.id,
        type: "BOOKING",
        title: b.status === "CONFIRMED" ? "New Booking" : "Booking Update",
        desc: `${b.client.name} for '${b.job?.title || b.service?.title || "Service"}'`,
        time: b.createdAt,
        icon: "event",
        color: "bg-blue-100 text-blue-600",
      })),
      ...proposals.map(p => ({
        id: p.id,
        type: "PROPOSAL",
        title: p.status === "ACCEPTED" ? "Proposal Accepted" : "Proposal Submitted",
        desc: `On '${p.job.title}'`,
        time: p.createdAt,
        icon: "description",
        color: p.status === "ACCEPTED" ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600",
      })),
      ...reviews.map(r => ({
        id: r.id,
        type: "REVIEW",
        title: "New Review",
        desc: `${r.rating} stars from ${r.author.name}`,
        time: r.createdAt,
        icon: "star",
        color: "bg-purple-100 text-purple-600",
      })),
    ]
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 10);

    return NextResponse.json({ activities });
  } catch (error) {
    return handleError(error);
  }
}
