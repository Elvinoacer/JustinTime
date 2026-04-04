import { constructMetadata } from "@/lib/metadata";
import JobsClient from "./JobsClient";

export const metadata = constructMetadata({
  title: "Jobs - Find Work & Projects",
  description: "Browse available jobs and projects. Find new opportunities to grow your business and connect with clients looking for your skills.",
  canonical: "https://justintime.gtss.software/jobs",
});

export default function JobsPage() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "JustInTime Jobs Marketplace",
    url: "https://justintime.gtss.software/jobs",
    description:
      "Browse open client job postings and send proposals for projects that match your skills.",
    mainEntity: {
      "@type": "ItemList",
      name: "Open jobs",
    },
    potentialAction: {
      "@type": "SearchAction",
      target: "https://justintime.gtss.software/jobs?search={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <JobsClient />
    </>
  );
}
