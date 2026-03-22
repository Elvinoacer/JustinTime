import { Metadata } from "next";
import { constructMetadata } from "@/lib/metadata";
import prisma from "@/lib/prisma";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  try {
    const job = await prisma.job.findUnique({
      where: { id },
      include: {
        category: true,
      },
    });

    if (!job) {
      return constructMetadata({
        title: "Job Not Found | JustInTime",
        description: "The job you are looking for could not be found.",
        noIndex: true,
      });
    }

    const title = `${job.title} | JustInTime Jobs`;
    const description = job.description.length > 160
      ? job.description.slice(0, 157) + "..."
      : job.description;

    return constructMetadata({
      title,
      description,
      canonical: `https://justintime.gtss.software/jobs/${id}`,
    });
  } catch (error) {
    console.error("Error generating metadata:", error);
    return constructMetadata({
      title: "Job | JustInTime",
      noIndex: true,
    });
  }
}

export default function JobLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
