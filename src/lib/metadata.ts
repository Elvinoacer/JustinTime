import { Metadata } from "next";

export function constructMetadata({
  title = "JustInTime - Find Trusted Professionals Near You",
  description = "Connect with verified local service providers across Kenya. Find trusted professionals for cleaning, plumbing, electrical work, repairs, painting, and more.",
  image = "/images/og-image.png",
  icons = "/images/JustinTimeLogo.png",
  noIndex = false,
}: {
  title?: string;
  description?: string;
  image?: string;
  icons?: string;
  noIndex?: boolean;
} = {}): Metadata {
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [
        {
          url: image,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
      creator: "@JustInTime",
    },
    icons,
    metadataBase: new URL(process.env.NEXTAUTH_URL || 'https://justintime.com'),
    ...(noIndex && {
      robots: {
        index: false,
        follow: false,
      },
    }),
  };
}
