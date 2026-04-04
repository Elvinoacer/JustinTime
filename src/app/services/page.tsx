import { constructMetadata } from "@/lib/metadata";
import ServicesClient from "./ServicesClient";

export const metadata = constructMetadata({
  title: "Services - Find Professionals",
  description: "Browse our wide range of professional services. From home cleaning to electrical repairs, find the right expert for your needs.",
  canonical: "https://justintime.gtss.software/services",
});

export default function ServicesPage() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "JustInTime Services Catalog",
    url: "https://justintime.gtss.software/services",
    description:
      "Compare public service listings, pricing signals, reviews, and trusted professionals across Kenya.",
    mainEntity: {
      "@type": "ItemList",
      name: "Services",
    },
    potentialAction: {
      "@type": "SearchAction",
      target:
        "https://justintime.gtss.software/services?search={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <ServicesClient />
    </>
  );
}
