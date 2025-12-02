import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL || 'https://justintime.com'),
  title: {
    default: "JustInTime - Find Trusted Professionals Near You",
    template: "%s | JustInTime"
  },
  description: "Connect with verified local service providers across Kenya. Find trusted professionals for cleaning, plumbing, electrical work, repairs, painting, and more. Get instant quotes and book quality services.",
  keywords: [
    "professional services kenya",
    "hire professionals",
    "local service providers",
    "plumbing services",
    "electrical services",
    "cleaning services",
    "home repairs",
    "handyman services",
    "verified professionals",
    "kenya marketplace",
    "nairobi services",
    "service booking platform"
  ],
  authors: [{ name: "JustInTime Team" }],
  creator: "JustInTime",
  publisher: "JustInTime",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_KE",
    url: "/",
    siteName: "JustInTime",
    title: "JustInTime - Find Trusted Professionals Near You",
    description: "Connect with verified local service providers for all your needs. Quality services, trusted professionals.",
    images: [
      {
        url: "/images/og-image.png",
        width: 1200,
        height: 630,
        alt: "JustInTime - Professional Services Marketplace",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "JustInTime - Find Trusted Professionals",
    description: "Connect with verified service providers across Kenya",
    images: ["/images/og-image.png"],
    creator: "@JustInTime",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: "/images/JustinTimeLogo.png" },
      { url: "/images/JustinTimeLogo.png", sizes: "16x16", type: "image/png" },
      { url: "/images/JustinTimeLogo.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/images/JustinTimeLogo.png" },
    ],
  },
  manifest: "/manifest.json",
  alternates: {
    canonical: "/",
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
  },
  category: 'marketplace',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined"
          rel="stylesheet"
        />
      </head>
      <body className={`font-sans`}>
        <Providers>{children}</Providers>
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
