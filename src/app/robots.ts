import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXTAUTH_URL || "https://justintime.gtss.software";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/provider/", "/bookings/", "/onboarding/"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
