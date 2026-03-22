import { Metadata } from "next";
import { constructMetadata } from "@/lib/metadata";
import { getProfessionalById } from "@/lib/api/server/professionals";
import ProfessionalDetailClient from "./ProfessionalDetailClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  try {
    const professional = await getProfessionalById(id);

    if (!professional || professional.role !== "PROVIDER") {
      return constructMetadata({
        title: "Professional Not Found | JustInTime",
        description: "The professional you are looking for could not be found.",
        noIndex: true,
      });
    }

    const title = `${professional.name} - Professional | JustInTime`;
    const description = professional.profile?.bio
      ? professional.profile.bio.length > 160
        ? professional.profile.bio.slice(0, 157) + "..."
        : professional.profile.bio
      : `Find and book ${professional.name} on JustInTime. Verified professional offering quality services in Kenya.`;
    const image = professional.image || "/images/og-image.png";

    return constructMetadata({
      title,
      description,
      image,
      canonical: `https://justintime.gtss.software/professionals/${id}`,
    });
  } catch (error) {
    console.error("Error generating metadata:", error);
    return constructMetadata({
      title: "Professional | JustInTime",
      noIndex: true,
    });
  }
}

export default function ProfessionalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <ProfessionalDetailClient params={params} />;
}
