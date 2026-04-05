import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

interface Job {
  id: string;
  title: string;
  description: string;
  category?: {
    name: string;
  };
  [key: string]: unknown;
}

interface UserProfile {
  interests: string[];
  skills?: string[];
  bio?: string;
}

export const useRecommendations = (jobs: Job[], userProfile: UserProfile) => {
  const candidateJobs = useMemo(
    () =>
      jobs.map((job) => ({
        id: job.id,
        title: job.title,
        description: job.description,
        category: job.category,
        createdAt: (job as { createdAt?: string }).createdAt,
        status: (job as { status?: string }).status,
        budget: (job as { budget?: number }).budget,
        location: (job as { location?: string }).location,
        latitude: (job as { latitude?: number }).latitude,
        longitude: (job as { longitude?: number }).longitude,
        _count: (job as { _count?: { proposals?: number } })._count,
      })),
    [jobs],
  );

  const profileSignals = useMemo(
    () => ({
      interests: userProfile.interests || [],
      skills: userProfile.skills || [],
      bio: userProfile.bio || "",
    }),
    [userProfile.bio, userProfile.interests, userProfile.skills],
  );

  const profileKey = useMemo(
    () =>
      JSON.stringify({
        interests: profileSignals.interests,
        skills: profileSignals.skills,
        bio: profileSignals.bio,
      }),
    [profileSignals.bio, profileSignals.interests, profileSignals.skills],
  );

  const jobsKey = useMemo(
    () =>
      candidateJobs
        .map((job) => `${job.id}:${job.title}:${job.description}`)
        .join("|"),
    [candidateJobs],
  );

  const hasSignals =
    profileSignals.interests.length > 0 ||
    profileSignals.skills.length > 0 ||
    profileSignals.bio.trim().length > 0;

  const query = useQuery({
    queryKey: ["recommendations", "jobs", jobsKey, profileKey],
    enabled: candidateJobs.length > 0 && hasSignals,
    queryFn: async () => {
      const response = await fetch("/api/recommendations/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jobs: candidateJobs,
          userProfile: profileSignals,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch job recommendations");
      }

      const body = (await response.json()) as {
        data?: {
          items?: Array<Job & { recommendation?: { score?: number } }>;
          scores?: Record<string, number>;
        };
      };

      return {
        items: Array.isArray(body?.data?.items) ? body.data.items : [],
        scores: body?.data?.scores || {},
      };
    },
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const recommendations = hasSignals ? query.data?.items || [] : [];
  const recommendationScores = hasSignals ? query.data?.scores || {} : {};

  return {
    recommendations,
    recommendationScores,
    isModelLoading: query.isFetching,
  };
};
