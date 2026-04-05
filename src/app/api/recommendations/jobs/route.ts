import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { handleError, successResponse } from "@/lib/middleware/errorHandler";
import {
  buildUserTerms,
  scoreTarget,
  type RecommendationSignals,
} from "@/lib/recommendations/scoring";
import { getMarketplaceSearchTerms } from "@/lib/search/normalizeMarketplaceQuery";
import type { Prisma } from "@/generated/prisma/client";

type CandidateJob = {
  id: string;
  title: string;
  description?: string;
  createdAt?: string | Date;
  status?: string;
  budget?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  location?: string | null;
  category?: {
    id?: string;
    name?: string;
    slug?: string;
  } | null;
  _count?: {
    proposals?: number;
  };
};

function toFiniteNumber(value: unknown): number | null {
  const numberValue =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : NaN;
  return Number.isFinite(numberValue) ? numberValue : null;
}

function normalizeCandidateJobs(input: unknown): CandidateJob[] {
  if (!Array.isArray(input)) return [];

  const normalized: CandidateJob[] = [];

  for (const raw of input) {
    if (!raw || typeof raw !== "object") continue;
    const candidate = raw as CandidateJob;
    const id = String(candidate.id || "").trim();
    const title = String(candidate.title || "").trim();
    if (!id || !title) continue;

    normalized.push({
      id,
      title,
      description:
        typeof candidate.description === "string"
          ? candidate.description
          : undefined,
      createdAt: candidate.createdAt,
      status: typeof candidate.status === "string" ? candidate.status : "OPEN",
      budget: toFiniteNumber(candidate.budget),
      latitude: toFiniteNumber(candidate.latitude),
      longitude: toFiniteNumber(candidate.longitude),
      location:
        typeof candidate.location === "string" ? candidate.location : undefined,
      category:
        candidate.category && typeof candidate.category === "object"
          ? {
              id:
                typeof candidate.category.id === "string"
                  ? candidate.category.id
                  : undefined,
              name:
                typeof candidate.category.name === "string"
                  ? candidate.category.name
                  : undefined,
              slug:
                typeof candidate.category.slug === "string"
                  ? candidate.category.slug
                  : undefined,
            }
          : null,
      _count: {
        proposals:
          toFiniteNumber(
            (candidate._count as { proposals?: unknown })?.proposals,
          ) || 0,
      },
    });
  }

  return normalized;
}

async function buildSignals(
  userId: string | undefined,
  payload: {
    interests?: string[];
    skills?: string[];
    bio?: string;
    latitude?: number | null;
    longitude?: number | null;
  },
): Promise<RecommendationSignals> {
  if (!userId) {
    return {
      interests: payload.interests || [],
      skills: payload.skills || [],
      bio: payload.bio || "",
      latitude: payload.latitude,
      longitude: payload.longitude,
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      clientInterests: true,
      profile: {
        select: {
          latitude: true,
          longitude: true,
        },
      },
      bookings: {
        orderBy: {
          createdAt: "desc",
        },
        take: 30,
        select: {
          location: true,
          service: {
            select: {
              title: true,
              category: {
                select: {
                  name: true,
                },
              },
            },
          },
          job: {
            select: {
              title: true,
              category: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const historyTerms =
    user?.bookings.flatMap((booking) => [
      booking.location || "",
      booking.service?.title || "",
      booking.service?.category?.name || "",
      booking.job?.title || "",
      booking.job?.category?.name || "",
    ]) || [];

  return {
    interests: [...(user?.clientInterests || []), ...(payload.interests || [])],
    skills: payload.skills || [],
    bio: payload.bio || "",
    historyTerms,
    latitude: payload.latitude ?? user?.profile?.latitude ?? null,
    longitude: payload.longitude ?? user?.profile?.longitude ?? null,
  };
}

function scoreJobs(jobs: CandidateJob[], signals: RecommendationSignals) {
  const userTerms = buildUserTerms(signals);

  return jobs
    .map((job) => {
      const base = scoreTarget(signals, {
        title: job.title,
        description: job.description,
        category: job.category?.name || job.category?.slug || null,
        latitude: job.latitude,
        longitude: job.longitude,
        createdAt: job.createdAt,
        availableNow: (job.status || "OPEN") === "OPEN",
      });

      let score = base.score;
      const reasons = [...base.reasons];

      const proposals = Number(job._count?.proposals || 0);
      const competitionScore = Math.max(0, 12 - proposals * 2);
      score += competitionScore;
      if (proposals <= 2) {
        reasons.push("low-competition");
      }

      const budget = Number(job.budget || 0);
      if (Number.isFinite(budget) && budget > 0) {
        const budgetScore = Math.min(10, budget / 1500);
        score += budgetScore;
        if (budget >= 5000) {
          reasons.push("good-budget");
        }
      }

      if (userTerms.length > 0) {
        const jobTerms = getMarketplaceSearchTerms(
          `${job.title} ${job.description || ""} ${job.category?.name || ""}`,
          20,
        );
        const directOverlap = userTerms.filter((term) =>
          jobTerms.includes(term),
        ).length;
        if (directOverlap >= 2) {
          reasons.push("strong-text-match");
        }
      }

      return {
        ...job,
        recommendation: {
          score: Number(score.toFixed(3)),
          reasons: Array.from(new Set(reasons)),
        },
      };
    })
    .sort((a, b) => {
      const scoreDelta =
        (b.recommendation?.score || 0) - (a.recommendation?.score || 0);
      if (scoreDelta !== 0) return scoreDelta;

      const bCreated = new Date(b.createdAt || 0).getTime();
      const aCreated = new Date(a.createdAt || 0).getTime();
      return bCreated - aCreated;
    });
}

async function fetchOpenJobs(request: NextRequest): Promise<{
  jobs: CandidateJob[];
  page: number;
  pageSize: number;
  total: number;
}> {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const pageSize = Math.min(
    40,
    Math.max(5, Number(searchParams.get("pageSize") || "12")),
  );
  const skip = (page - 1) * pageSize;
  const category = searchParams.get("category");
  const search = searchParams.get("search") || "";

  const where: Prisma.JobWhereInput = {
    status: "OPEN",
  };

  if (category) {
    where.category = {
      OR: [
        { id: category },
        { slug: { equals: category, mode: "insensitive" } },
        { name: { equals: category, mode: "insensitive" } },
      ],
    };
  }

  const searchTerms = getMarketplaceSearchTerms(search, 10);
  if (searchTerms.length > 0) {
    where.OR = searchTerms.flatMap((term) => [
      { title: { contains: term, mode: "insensitive" } },
      { description: { contains: term, mode: "insensitive" } },
      { category: { name: { contains: term, mode: "insensitive" } } },
    ]);
  }

  const [jobs, total] = await Promise.all([
    prisma.job.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        _count: {
          select: {
            proposals: true,
          },
        },
      },
    }),
    prisma.job.count({ where }),
  ]);

  return {
    jobs: jobs.map((job) => ({
      id: job.id,
      title: job.title,
      description: job.description,
      createdAt: job.createdAt,
      status: job.status,
      budget: Number(job.budget || 0),
      latitude: job.latitude,
      longitude: job.longitude,
      location: job.location,
      category: job.category,
      _count: {
        proposals: job._count.proposals,
      },
    })),
    page,
    pageSize,
    total,
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const bodySignals = {
      interests: [] as string[],
      skills: [] as string[],
      bio: "",
      latitude: toFiniteNumber(
        new URL(request.url).searchParams.get("latitude"),
      ),
      longitude: toFiniteNumber(
        new URL(request.url).searchParams.get("longitude"),
      ),
    };

    const signals = await buildSignals(session?.user?.id, bodySignals);
    const { jobs, page, pageSize, total } = await fetchOpenJobs(request);
    const ranked = scoreJobs(jobs, signals);

    return successResponse({
      items: ranked,
      scores: Object.fromEntries(
        ranked.map((job) => [job.id, job.recommendation?.score || 0]),
      ),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
        hasMore: page * pageSize < total,
      },
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const body = (await request.json()) as {
      jobs?: unknown;
      userProfile?: {
        interests?: string[];
        skills?: string[];
        bio?: string;
      };
      userLocation?: {
        latitude?: number;
        longitude?: number;
      };
    };

    const jobs = normalizeCandidateJobs(body?.jobs);
    const signals = await buildSignals(session?.user?.id, {
      interests: body?.userProfile?.interests || [],
      skills: body?.userProfile?.skills || [],
      bio: body?.userProfile?.bio || "",
      latitude: toFiniteNumber(body?.userLocation?.latitude),
      longitude: toFiniteNumber(body?.userLocation?.longitude),
    });

    const ranked = scoreJobs(jobs, signals);

    return successResponse({
      items: ranked,
      scores: Object.fromEntries(
        ranked.map((job) => [job.id, job.recommendation?.score || 0]),
      ),
    });
  } catch (error) {
    return handleError(error);
  }
}
