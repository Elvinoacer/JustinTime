import { Metadata } from "next";

const BASE_URL = process.env.NEXTAUTH_URL || "https://justintime.gtss.software";

export function constructMetadata({
  title = "JustInTime - Find Trusted Professionals Near You",
  description = "Connect with verified local service providers across Kenya. Find trusted professionals for cleaning, plumbing, electrical work, repairs, painting, and more.",
  image = "/images/og-image.png",
  noIndex = false,
  canonical,
}: {
  title?: string;
  description?: string;
  image?: string;
  noIndex?: boolean;
  canonical?: string;
} = {}): Metadata {
  return {
    title,
    description,
    metadataBase: new URL(BASE_URL),
    openGraph: {
      title,
      description,
      siteName: "JustInTime",
      locale: "en_KE",
      type: "website",
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
      site: "@JustInTimeKE",
      creator: "@JustInTimeKE",
    },
    ...(canonical && {
      alternates: { canonical },
    }),
    ...(noIndex && {
      robots: {
        index: false,
        follow: false,
      },
    }),
  };
}
