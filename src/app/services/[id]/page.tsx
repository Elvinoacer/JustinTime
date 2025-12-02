import { Metadata } from "next";
import { constructMetadata } from "@/lib/metadata";
import { getServiceById } from "@/lib/api/server/services";
import ServiceDetailClient from "./ServiceDetailClient";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const { id } = params;

  try {
    const service = await getServiceById(id);

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
    });
  } catch (error) {
    console.error("Error generating metadata:", error);
    return constructMetadata({
      title: "Service | JustInTime",
      noIndex: true,
    });
  }
}

export default function ServicePage({ params }: { params: { id: string } }) {
  return <ServiceDetailClient params={Promise.resolve(params)} />;
}
