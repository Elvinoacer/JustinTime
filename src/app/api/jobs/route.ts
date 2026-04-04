import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { JobStatus, type Prisma } from "@/generated/prisma/client";
import {
  createJobSchema,
  quickCreateJobSchema,
} from "@/lib/validations/schemas";
import {
  JOB_LIFECYCLE_EVENT_TYPES,
  recordJobLifecycleEvent,
} from "@/lib/jobs/lifecycleTimeline";
import { sendComprehensiveNotification } from "@/lib/notifications/adminNotifications";
import { handleError, successResponse } from "@/lib/middleware/errorHandler";
import { growthFeatureFlags } from "@/lib/growth/featureFlags";
import { hasRole } from "@/lib/auth/roles";
import type { JobListClient } from "@/lib/api/contracts/public-listings";
import { isPubliclyVerified } from "@/lib/trust/publicTrust";

// Haversine formula to calculate distance between two coordinates in kilometers
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Simple geocoding cache to avoid repeated API calls
const geocodeCache = new Map<string, { lat: number; lon: number } | null>();

async function geocodeLocation(
  location: string,
): Promise<{ lat: number; lon: number } | null> {
  if (geocodeCache.has(location)) {
    return geocodeCache.get(location)!;
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}&limit=1`,
      {
        headers: {
          "User-Agent": "JustInTime-Job-Platform",
        },
      },
    );
    const data = await response.json();

    if (data && data.length > 0) {
      const coords = {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
      };
      geocodeCache.set(location, coords);
      return coords;
    }
  } catch (error) {
    console.error("Geocoding error:", error);
  }

  geocodeCache.set(location, null);
  return null;
}

function parseCoord(raw: string | null): number | null {
  if (raw === null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function serializeJobForList(
  job: {
    id: string;
    title: string;
    description: string;
    budget: { toString(): string } | null;
    location: string | null;
    latitude: number | null;
    longitude: number | null;
    deadline: Date | null;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    images: string[];
    category: { id: string; name: string; slug: string } | null;
    client: {
      id: string;
      name: string | null;
      image: string | null;
      profile: {
        verificationStatus: string | null;
      } | null;
      trustScore: {
        tier: string;
        overallScore: number;
      } | null;
    };
    _count: { proposals: number };
  },
  distanceKm: number | null,
  options?: { exposePreciseLocation?: boolean },
): JobListClient {
  const isVerified = isPubliclyVerified({
    verificationStatus: job.client.profile?.verificationStatus,
    trustTier: job.client.trustScore?.tier,
    overallScore: job.client.trustScore?.overallScore,
  });

  let budget: number | null = null;
  if (job.budget != null) {
    const n = Number(job.budget.toString());
    budget = Number.isFinite(n) ? n : null;
  }

  return {
    id: job.id,
    title: job.title,
    description: job.description,
    budget,
    location: job.location,
    latitude: options?.exposePreciseLocation ? job.latitude : null,
    longitude: options?.exposePreciseLocation ? job.longitude : null,
    deadline: job.deadline ? job.deadline.toISOString() : null,
    status: job.status,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
    images: job.images ?? [],
    category: job.category
      ? {
          id: job.category.id,
          name: job.category.name,
          slug: job.category.slug,
        }
      : null,
    client: {
      id: job.client.id,
      name: job.client.name,
      image: job.client.image,
      isVerified,
    },
    proposalCount: job._count.proposals,
    distanceKm,
  };
}

export async function GET(request: Request) {
  try {
    const session = await auth();
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");
    const skip = (page - 1) * pageSize;

    // User location: support dashboard (userLat/userLon) and marketplace (latitude/longitude)
    const userLat =
      parseCoord(searchParams.get("userLat")) ??
      parseCoord(searchParams.get("latitude"));
    const userLon =
      parseCoord(searchParams.get("userLon")) ??
      parseCoord(searchParams.get("longitude"));

    // Build where clause
    const where: Prisma.JobWhereInput = {};
    const statusParam = searchParams.get("status");
    const categoryParam = searchParams.get("category");
    const locationParam = searchParams.get("location");

    // Status filter
    if (
      statusParam &&
      (Object.values(JobStatus) as string[]).includes(statusParam)
    ) {
      where.status = statusParam as JobStatus;
    }

    // Category filter
    if (categoryParam) {
      where.categoryId = categoryParam;
    }

    // Location filter (partial match)
    if (locationParam) {
      where.location = {
        contains: locationParam,
        mode: "insensitive",
      };
    }

    // Budget range filter
    if (searchParams.get("budgetMin") || searchParams.get("budgetMax")) {
      where.budget = {};
      if (searchParams.get("budgetMin")) {
        where.budget.gte = parseFloat(searchParams.get("budgetMin")!);
      }
      if (searchParams.get("budgetMax")) {
        where.budget.lte = parseFloat(searchParams.get("budgetMax")!);
      }
    }

    // Search filter (title and description)
    if (searchParams.get("search")) {
      const searchTerm = searchParams.get("search")!;
      where.OR = [
        { title: { contains: searchTerm, mode: "insensitive" } },
        { description: { contains: searchTerm, mode: "insensitive" } },
      ];
    }

    // Verified clients only filter
    if (searchParams.get("verifiedOnly") === "true") {
      where.client = {
        OR: [
          {
            profile: {
              verificationStatus: "VERIFIED",
            },
          },
          {
            trustScore: {
              tier: {
                in: ["VERIFIED", "PREMIUM", "ELITE"],
              },
            },
          },
        ],
      };
    }

    // Sorting
    const requestedSortBy = searchParams.get("sortBy") || "createdAt";
    const allowedSortFields = new Set([
      "createdAt",
      "updatedAt",
      "deadline",
      "budget",
      "title",
      "status",
      "distance",
      "proposals",
    ]);
    const sortBy = allowedSortFields.has(requestedSortBy)
      ? requestedSortBy
      : "createdAt";
    const sortOrder: Prisma.SortOrder =
      searchParams.get("sortOrder") === "asc" ? "asc" : "desc";
    const isDistanceSort =
      sortBy === "distance" && userLat !== null && userLon !== null;
    const distanceCandidateTake = Math.min(Math.max(pageSize * 20, 200), 1000);

    let orderBy: Prisma.JobOrderByWithRelationInput = { createdAt: "desc" };
    if (sortBy === "proposals") {
      orderBy = { proposals: { _count: sortOrder } };
    } else if (sortBy === "distance") {
      orderBy = { createdAt: "desc" };
    } else {
      orderBy = {
        [sortBy]: sortOrder,
      } as Prisma.JobOrderByWithRelationInput;
    }

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        // For distance sorting, fetch a bounded candidate set then sort in-memory.
        skip: isDistanceSort ? 0 : skip,
        take: isDistanceSort ? distanceCandidateTake : pageSize,
        include: {
          client: {
            select: {
              id: true,
              name: true,
              image: true,
              profile: {
                select: { verificationStatus: true },
              },
              trustScore: {
                select: {
                  tier: true,
                  overallScore: true,
                },
              },
            },
          },
          category: { select: { id: true, name: true, slug: true } },
          _count: { select: { proposals: true } },
        },
        orderBy: sortBy === "distance" ? { createdAt: "desc" } : orderBy,
      }),
      prisma.job.count({ where }),
    ]);

    type Row = { job: (typeof jobs)[0]; distanceKm: number | null };
    let processedJobs: Row[];
    if (userLat !== null && userLon !== null) {
      // Calculate distance for each job
      const jobsWithDistance = await Promise.all(
        jobs.map(async (job) => {
          let distance = null;
          let jobLat = job.latitude;
          let jobLon = job.longitude;

          // Fallback for legacy jobs without stored coordinates
          if ((jobLat === null || jobLon === null) && job.location) {
            try {
              const jobCoords = await geocodeLocation(job.location);
              if (jobCoords) {
                jobLat = jobCoords.lat;
                jobLon = jobCoords.lon;

                // Persist derived coordinates so future cold starts avoid repeated geocoding.
                void prisma.job
                  .update({
                    where: { id: job.id },
                    data: { latitude: jobLat, longitude: jobLon },
                  })
                  .catch(() => {
                    // Best-effort persistence only; listing should continue even if this fails.
                  });
              }
            } catch {
              // Ignore geocoding errors for legacy jobs to prevent API failure
            }
          }

          if (jobLat !== null && jobLon !== null) {
            distance = calculateDistance(userLat, userLon, jobLat, jobLon);
          }

          const distanceKm =
            distance !== null ? Math.round(distance * 10) / 10 : null;

          return {
            job,
            distanceKm,
          };
        }),
      );

      // Sort by distance if requested
      if (sortBy === "distance") {
        jobsWithDistance.sort((a, b) => {
          if (a.distanceKm === null && b.distanceKm === null) return 0;
          if (a.distanceKm === null) return 1;
          if (b.distanceKm === null) return -1;
          return a.distanceKm - b.distanceKm;
        });

        processedJobs = jobsWithDistance.slice(skip, skip + pageSize);
      } else {
        processedJobs = jobsWithDistance.slice(skip, skip + pageSize);
      }
    } else {
      processedJobs = jobs.map((job) => ({
        job,
        distanceKm: null as number | null,
      }));
    }

    const items: JobListClient[] = processedJobs.map(({ job, distanceKm }) =>
      serializeJobForList(job, distanceKm, {
        exposePreciseLocation: Boolean(session?.user?.id),
      }),
    );

    const totalPages =
      total === 0 ? 0 : Math.max(1, Math.ceil(total / pageSize));
    const hasMore = page * pageSize < total;

    return successResponse({
      items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasMore,
      },
    });
  } catch (error) {
    console.error("[JOBS_GET]", error);
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!hasRole(session.user, "CLIENT")) {
      return new NextResponse("Only clients can post jobs", { status: 403 });
    }

    const body = await request.json();
    const mode =
      typeof body?.mode === "string" && body.mode.toLowerCase() === "quick"
        ? "quick"
        : "full";

    if (mode === "quick" && !growthFeatureFlags.quickPost) {
      return NextResponse.json(
        { error: "Quick post is currently disabled" },
        { status: 403 },
      );
    }

    let category: { id: string; name: string; slug: string } | null = null;
    let normalizedData: {
      title: string;
      description: string;
      budget: number;
      location: string;
      latitude?: number | null;
      longitude?: number | null;
      deadline?: Date;
      images: string[];
      maxApplicants?: number;
      maxAcceptedProviders?: number;
    };

    if (mode === "quick") {
      const quickData = quickCreateJobSchema.parse(body);

      // Quick posts use a fallback category so clients can publish in one step.
      category = await prisma.category.findFirst({
        where: { slug: "general" },
        select: { id: true, name: true, slug: true },
      });

      if (!category) {
        category = await prisma.category.findFirst({
          orderBy: { name: "asc" },
          select: { id: true, name: true, slug: true },
        });
      }

      if (!category) {
        return NextResponse.json(
          { error: "No category available for quick post" },
          { status: 400 },
        );
      }

      normalizedData = {
        title: quickData.title,
        description:
          "Quick post created. Add full details to improve proposal quality.",
        budget: quickData.budget,
        location: quickData.location,
        latitude: quickData.latitude ?? null,
        longitude: quickData.longitude ?? null,
        images: [],
      };
    } else {
      const validatedData = createJobSchema.parse(body);

      if (
        typeof validatedData.maxApplicants === "number" &&
        typeof validatedData.maxAcceptedProviders === "number" &&
        validatedData.maxAcceptedProviders > validatedData.maxApplicants
      ) {
        return new NextResponse(
          "Accepted providers limit cannot exceed max applicants",
          { status: 400 },
        );
      }

      const deadlineDate = validatedData.deadline
        ? new Date(validatedData.deadline)
        : undefined;

      if (deadlineDate && Number.isNaN(deadlineDate.getTime())) {
        return new NextResponse("Invalid deadline", { status: 400 });
      }

      category = await prisma.category.findUnique({
        where: { id: validatedData.category },
        select: { id: true, name: true, slug: true },
      });

      if (!category) {
        return new NextResponse("Invalid category", { status: 400 });
      }

      normalizedData = {
        title: validatedData.title,
        description: validatedData.description,
        budget: validatedData.budget,
        location: validatedData.location,
        latitude: validatedData.latitude ?? null,
        longitude: validatedData.longitude ?? null,
        deadline: deadlineDate,
        images: validatedData.images || [],
        maxApplicants: validatedData.maxApplicants,
        maxAcceptedProviders: validatedData.maxAcceptedProviders,
      };
    }

    // Use client-captured coordinates when present; geocode only as fallback.
    let latitude = normalizedData.latitude ?? null;
    let longitude = normalizedData.longitude ?? null;
    if ((latitude == null || longitude == null) && normalizedData.location) {
      try {
        const coords = await geocodeLocation(normalizedData.location);
        if (coords) {
          latitude = coords.lat;
          longitude = coords.lon;
        }
      } catch (error) {
        console.error("Failed to geocode new job location:", error);
        // Continue without coordinates if geocoding fails
      }
    }

    const job = await prisma.$transaction(async (tx) => {
      const createdJob = await tx.job.create({
        data: {
          title: normalizedData.title,
          description: normalizedData.description,
          budget: normalizedData.budget,
          location: normalizedData.location,
          latitude,
          longitude,
          categoryId: category.id,
          clientId: session.user.id,
          images: normalizedData.images,
          deadline: normalizedData.deadline,
          maxApplicants: normalizedData.maxApplicants,
          maxAcceptedProviders: normalizedData.maxAcceptedProviders,
        },
      });

      await recordJobLifecycleEvent(
        {
          jobId: createdJob.id,
          eventType: JOB_LIFECYCLE_EVENT_TYPES.JOB_CREATED,
          fromState: null,
          toState: createdJob.status,
          reason:
            mode === "quick"
              ? "Client created a quick post job."
              : "Client created a job posting.",
          actorUserId: session.user.id,
          actorName: session.user.name,
          actorRole: "CLIENT",
          metadata: {
            mode,
            categoryId: category.id,
            budget: normalizedData.budget,
          },
          idempotencyKey: `job:${createdJob.id}:created`,
        },
        tx,
      );

      return createdJob;
    });

    // Send job alerts to matching providers
    // Run in background (don't await) to avoid blocking response
    (async () => {
      try {
        // Find providers interested in this category
        const matchingProviders = await prisma.user.findMany({
          where: {
            OR: [{ role: "PROVIDER" }, { roles: { has: "PROVIDER" } }],
            profile: {
              skills: {
                has: category.id,
              },
            },
          },
          select: { id: true },
        });

        console.log(
          `[JobAlert] Found ${matchingProviders.length} matching providers for category ${category.name}`,
        );

        // Send notifications
        for (const provider of matchingProviders) {
          await sendComprehensiveNotification({
            userId: provider.id,
            title: `New Job: ${normalizedData.title}`,
            message: `A new job matching your skills has been posted: ${normalizedData.title} - Budget: Kes ${normalizedData.budget || "Negotiable"}`,
            type: "JOB_ALERT",
            emailSubject: `New Job Alert: ${normalizedData.title} - JustInTime`,
            emailHtml: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #10b981;">New Job Opportunity!</h2>
                <p>A new job matching your skills has been posted.</p>
                
                <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="margin-top: 0;">${normalizedData.title}</h3>
                  <p><strong>Category:</strong> ${category.name}</p>
                  <p><strong>Budget:</strong> Kes ${normalizedData.budget || "Negotiable"}</p>
                  <p><strong>Location:</strong> ${normalizedData.location || "Remote/Not specified"}</p>
                  <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 15px 0;" />
                  <p style="color: #4b5563;">${normalizedData.description ? (normalizedData.description.length > 150 ? normalizedData.description.substring(0, 150) + "..." : normalizedData.description) : "No description"}</p>
                </div>
                
                <a href="${process.env.NEXTAUTH_URL}/jobs/${job.id}" style="background-color: #10b981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Job Details</a>
              </div>
            `,
          });
        }
      } catch (error) {
        console.error("Failed to send job alerts:", error);
      }
    })();

    return NextResponse.json({
      ...job,
      postMode: mode,
      needsDetails: mode === "quick",
    });
  } catch (error) {
    console.error("[JOBS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
