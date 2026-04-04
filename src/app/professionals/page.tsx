import { constructMetadata } from "@/lib/metadata";
import ProfessionalsClient from "./ProfessionalsClient";

export const metadata = constructMetadata({
  title: "Find Professionals - Verified Experts",
  description:
    "Connect with top-rated professionals in your area. View profiles, ratings, and reviews to hire the best talent for your project.",
  canonical: "https://justintime.gtss.software/professionals",
});

export default function ProfessionalsPage() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "JustInTime Professionals Directory",
    url: "https://justintime.gtss.software/professionals",
    description:
      "Browse verified, background-checked, and certified professionals across Kenya.",
    mainEntity: {
      "@type": "ItemList",
      name: "Professionals",
    },
    potentialAction: {
      "@type": "SearchAction",
      target:
        "https://justintime.gtss.software/professionals?search={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <ProfessionalsClient />
    </>
  );
}
