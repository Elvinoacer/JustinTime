import { Metadata } from "next";
import { notFound } from "next/navigation";
import { constructMetadata } from "@/lib/metadata";
import { getPublicServiceDetail } from "@/lib/api/server/service-detail";
import ServiceDetailClient from "./ServiceDetailClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  try {
    const service = await getPublicServiceDetail(id);

    if (!service) {
      return constructMetadata({
        title: "Service Not Found | JustInTime",
        description: "The service you are looking for could not be found.",
        noIndex: true,
      });
    }

    const title = `${service.title} - ${service.provider.name} | JustInTime`;
    const description =
      service.description.length > 160
        ? service.description.slice(0, 157) + "..."
        : service.description;
    const image = service.images?.[0] || "/images/og-image.png";

    return constructMetadata({
      title,
      description,
      image,
      canonical: `https://justintime.gtss.software/services/${id}`,
    });
  } catch (error) {
    console.error("Error generating metadata:", error);
    return constructMetadata({
      title: "Service | JustInTime",
      noIndex: true,
    });
  }
}

export default async function ServicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const initialService = await getPublicServiceDetail(id);
  if (!initialService) notFound();

  return (
    <ServiceDetailClient params={params} initialService={initialService} />
  );
}
