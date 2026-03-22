import { constructMetadata } from "@/lib/metadata";

export const metadata = constructMetadata({
  title: "Blog — Tips & Guides for Hiring Professionals",
  description:
    "Expert tips on hiring reliable professionals, home maintenance guides, and news from the JustInTime team.",
  canonical: "https://justintime.gtss.software/blog",
});

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
