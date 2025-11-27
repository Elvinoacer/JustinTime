import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { handleError } from "@/lib/middleware/errorHandler";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Allow both CLIENT and PROVIDER roles to access client analytics
    if (session.user.role !== "CLIENT" && session.user.role !== "PROVIDER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Build date filter
    const dateFilter = startDate && endDate ? {
      createdAt: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    } : {};

    // Fetch spending analytics
    const payments = await prisma.payment.findMany({
      where: {
        booking: {
          clientId: userId,
        },
        ...dateFilter,
      },
      include: {
        booking: {
          include: {
            job: {
              include: {
                category: true,
              },
            },
          },
        },
      },
    });

    const totalSpent = payments
      .filter(p => p.status === "COMPLETED")
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const avgSpent = payments.length > 0 ? totalSpent / payments.length : 0;

    // Group by category
    const spendingByCategory = payments
      .filter(p => p.status === "COMPLETED")
      .reduce((acc, p) => {
        const category = p.booking.job?.category?.name || "Uncategorized";
        if (!acc[category]) {
          acc[category] = 0;
        }
        acc[category] += Number(p.amount);
        return acc;
      }, {} as Record<string, number>);

    const spendingByCategoryArray = Object.entries(spendingByCategory).map(([category, amount]) => ({
      category,
      amount,
    }));

    // Group by status
    const spendingByStatus = payments.reduce((acc, p) => {
      if (!acc[p.status]) {
        acc[p.status] = { amount: 0, count: 0 };
      }
      acc[p.status].amount += Number(p.amount);
      acc[p.status].count += 1;
      return acc;
    }, {} as Record<string, { amount: number; count: number }>);

    const spendingByStatusArray = Object.entries(spendingByStatus).map(([status, data]) => ({
      status,
      ...data,
    }));

    // Fetch job analytics
    const jobs = await prisma.job.findMany({
      where: {
        clientId: userId,
        ...dateFilter,
      },
      include: {
        _count: {
          select: { proposals: true },
        },
        proposals: {
          select: {
            id: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    const totalJobs = jobs.length;

    // Jobs by status
    const jobsByStatus = jobs.reduce((acc, job) => {
      if (!acc[job.status]) {
        acc[job.status] = 0;
      }
      acc[job.status] += 1;
      return acc;
    }, {} as Record<string, number>);

    const jobsByStatusArray = Object.entries(jobsByStatus).map(([status, count]) => ({
      status,
      count,
    }));

    const avgProposals = jobs.length > 0 ? 
      jobs.reduce((sum, job) => sum + job._count.proposals, 0) / jobs.length : 0;

    const completedJobs = jobs.filter(j => j.status === "COMPLETED").length;
    const completionRate = totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0;

    // Calculate avg time to hire (from proposal acceptance to booking confirmation)
    // Fetch jobs that have bookings, including their proposals
    const jobsWithBookings = await prisma.job.findMany({
      where: {
        clientId: userId,
        bookings: {
          some: {} // Has at least one booking
        },
        ...dateFilter,
      },
      select: {
        bookings: {
          select: {
            providerId: true,
            createdAt: true,
          }
        },
        proposals: {
          where: {
            status: "ACCEPTED"
          },
          select: {
            providerId: true,
            createdAt: true,
          }
        }
      }
    });

    const timeToHireValues = jobsWithBookings.flatMap(job => {
      // For each booking, find the corresponding accepted proposal from the same provider
      return job.bookings.map(booking => {
        const proposal = job.proposals.find(p => p.providerId === booking.providerId);
        if (proposal) {
          const proposalDate = new Date(proposal.createdAt);
          const bookingDate = new Date(booking.createdAt);
          const diffInHours = (bookingDate.getTime() - proposalDate.getTime()) / (1000 * 60 * 60);
          return diffInHours;
        }
        return null;
      }).filter((v): v is number => v !== null && v > 0);
    });

    const avgTimeToHire = timeToHireValues.length > 0 ?
      timeToHireValues.reduce((sum, v) => sum + v, 0) / timeToHireValues.length : 0;

    // Fetch provider analytics
    const bookings = await prisma.booking.findMany({
      where: {
        clientId: userId,
        status: { in: ["CONFIRMED", "IN_PROGRESS", "COMPLETED"] },
        ...dateFilter,
      },
      include: {
        provider: true,
        review: true,
      },
    });

    const uniqueProviders = new Set(bookings.map(b => b.providerId)).size;

    // Calculate repeat hire rate
    const providerHireCounts = bookings.reduce((acc, b) => {
      if (!acc[b.providerId]) {
        acc[b.providerId] = 0;
      }
      acc[b.providerId] += 1;
      return acc;
    }, {} as Record<string, number>);

    const repeatHires = Object.values(providerHireCounts).filter(count => count > 1).length;
    const repeatHireRate = uniqueProviders > 0 ? (repeatHires / uniqueProviders) * 100 : 0;

    // Average rating
    const ratings = bookings.map(b => b.review?.rating).filter(r => r !== null && r !== undefined) as number[];
    const avgRating = ratings.length > 0 ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length : 0;

    // Top providers
    const providerStats = await Promise.all(
      Array.from(new Set(bookings.map(b => b.providerId))).map(async (providerId) => {
        const providerBookings = bookings.filter(b => b.providerId === providerId);
        const completedCount = providerBookings.filter(b => b.status === "COMPLETED").length;
        const providerRatings = providerBookings
          .map(b => b.review?.rating)
          .filter(r => r !== null && r !== undefined) as number[];
        const avgProviderRating = providerRatings.length > 0 ?
          providerRatings.reduce((sum, r) => sum + r, 0) / providerRatings.length : 0;

        const provider = providerBookings[0]?.provider;
        
        return {
          id: providerId,
          name: provider?.name || "Unknown",
          jobsCompleted: completedCount,
          avgRating: avgProviderRating,
        };
      })
    );

    const topProviders = providerStats
      .sort((a, b) => b.jobsCompleted - a.jobsCompleted)
      .slice(0, 5);

    // Build response
    const analytics = {
      spending: {
        total: totalSpent,
        average: avgSpent,
        byCategory: spendingByCategoryArray,
        byStatus: spendingByStatusArray,
      },
      jobs: {
        total: totalJobs,
        byStatus: jobsByStatusArray,
        avgProposals: Math.round(avgProposals * 10) / 10,
        completionRate: Math.round(completionRate * 10) / 10,
        avgTimeToHire: Math.round(avgTimeToHire * 10) / 10,
      },
      providers: {
        unique: uniqueProviders,
        repeatHireRate: Math.round(repeatHireRate * 10) / 10,
        avgRating: Math.round(avgRating * 10) / 10,
        topProviders,
      },
    };

    return NextResponse.json(analytics);
  } catch (error) {
    return handleError(error);
  }
}
