import { auth } from "@/auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (session.user.role !== "PROVIDER") {
      return new NextResponse("Only providers can access this endpoint", { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const tab = searchParams.get("tab") || "available";
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");
    const categoryId = searchParams.get("category");
    const skip = (page - 1) * pageSize;

    let jobs;
    let total;

    switch (tab) {
      case "available": {
        // Jobs provider can apply to (OPEN status, no existing proposal from this provider)
        const where: any = { status: "OPEN" };
        if (categoryId) where.categoryId = categoryId;

        const [allJobs, count] = await Promise.all([
          prisma.job.findMany({
            where,
            skip,
            take: pageSize,
            include: {
              client: { select: { id: true, name: true, image: true } },
              category: { select: { id: true, name: true, slug: true } },
              proposals: {
                where: { providerId: session.user.id },
                select: { id: true, status: true, price: true },
              },
              _count: { select: { proposals: true } },
            },
            orderBy: { createdAt: "desc" },
          }),
          prisma.job.count({ where }),
        ]);

        // Filter out jobs where provider already has a proposal
        jobs = allJobs.filter((job) => job.proposals.length === 0);
        total = count; // Note: This is approximate, actual available count needs adjustment

        break;
      }

      case "applied": {
        // Jobs where provider has submitted a proposal
        const [proposals, count] = await Promise.all([
          prisma.proposal.findMany({
            where: { providerId: session.user.id },
            skip,
            take: pageSize,
            include: {
              job: {
                include: {
                  client: { select: { id: true, name: true, image: true } },
                  category: { select: { id: true, name: true, slug: true } },
                  _count: { select: { proposals: true } },
                },
              },
            },
            orderBy: { createdAt: "desc" },
          }),
          prisma.proposal.count({ where: { providerId: session.user.id } }),
        ]);

        jobs = proposals.map((p) => ({
          ...p.job,
          proposal: { id: p.id, status: p.status, price: p.price, createdAt: p.createdAt },
        }));
        total = count;

        break;
      }

      case "active": {
        // Jobs with accepted proposals (active work)
        const [proposals, count] = await Promise.all([
          prisma.proposal.findMany({
            where: {
              providerId: session.user.id,
              status: "ACCEPTED",
            },
            skip,
            take: pageSize,
            include: {
              job: {
                include: {
                  client: { select: { id: true, name: true, image: true } },
                  category: { select: { id: true, name: true, slug: true } },
                  bookings: {
                    where: { providerId: session.user.id },
                    select: { id: true, status: true, date: true },
                  },
                },
              },
            },
            orderBy: { createdAt: "desc" },
          }),
          prisma.proposal.count({
            where: {
              providerId: session.user.id,
              status: "ACCEPTED",
            },
          }),
        ]);

        jobs = proposals.map((p) => ({
          ...p.job,
          proposal: { id: p.id, status: p.status, price: p.price },
          bookings: p.job.bookings,
        }));
        total = count;

        break;
      }

      case "completed": {
        // Completed jobs (COMPLETED status with accepted proposals)
        const [proposals, count] = await Promise.all([
          prisma.proposal.findMany({
            where: {
              providerId: session.user.id,
              status: "ACCEPTED",
              job: { 
                is: { 
                  status: "COMPLETED" 
                } 
              },
            },
            skip,
            take: pageSize,
            include: {
              job: {
                include: {
                  client: { select: { id: true, name: true, image: true } },
                  category: { select: { id: true, name: true, slug: true } },
                },
              },
            },
            orderBy: { updatedAt: "desc" },
          }),
          prisma.proposal.count({
            where: {
              providerId: session.user.id,
              status: "ACCEPTED",
              job: { 
                is: { 
                  status: "COMPLETED" 
                } 
              },
            },
          }),
        ]);

        jobs = proposals.map((p) => ({
          ...p.job,
          proposal: { id: p.id, status: p.status, price: p.price },
        }));
        total = count;

        break;
      }

      default:
        return new NextResponse("Invalid tab parameter", { status: 400 });
    }

    return NextResponse.json({
      items: jobs,
      total,
      page,
      pageSize,
      hasMore: skip + jobs.length < total,
    });
  } catch (error) {
    console.error("[PROVIDER_JOBS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
