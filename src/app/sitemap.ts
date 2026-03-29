import { MetadataRoute } from "next";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl =
    process.env.NEXTAUTH_URL || "https://justintime.gtss.software";

  const staticRoutes = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 1,
    },
    {
      url: `${baseUrl}/services`,
      lastModified: new Date(),
      changeFrequency: "hourly" as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/professionals`,
      lastModified: new Date(),
      changeFrequency: "hourly" as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/jobs`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.5,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.5,
    },
    {
      url: `${baseUrl}/faq`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    },
  ];

  try {
    const pros = await prisma.user.findMany({
      where: {
        role: "PROVIDER",
        profile: { isVerified: true },
      },
      select: { id: true, updatedAt: true },
      take: 500,
    });

    const proRoutes = pros.map((p: { id: string; updatedAt: Date }) => ({
      url: `${baseUrl}/professionals/${p.id}`,
      lastModified: p.updatedAt,
      priority: 0.7,
    }));

    const jobs = await prisma.job.findMany({
      where: { status: "OPEN" },
      select: { id: true, updatedAt: true },
      take: 500,
    });

    const jobRoutes = jobs.map((j: { id: string; updatedAt: Date }) => ({
      url: `${baseUrl}/jobs/${j.id}`,
      lastModified: j.updatedAt,
      priority: 0.6,
    }));

    return [...staticRoutes, ...proRoutes, ...jobRoutes];
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("Failed to generate dynamic sitemap entries:", error);
    }
    return staticRoutes;
  }
}
