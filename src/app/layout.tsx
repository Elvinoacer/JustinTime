import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL || 'https://justintime.gtss.software'),
  title: {
    default: "JustInTime - Find Trusted Professionals Near You",
    template: "%s | JustInTime"
  },
  description: "Connect with verified local service providers across Kenya. Find trusted professionals for cleaning, plumbing, electrical work, repairs, painting, and more. Get instant quotes and book quality services.",
  keywords: [
    "hire professionals Kenya",
    "local service providers Nairobi",
    "plumber near me Kenya",
    "electrician Nairobi",
    "home cleaning services Kenya",
    "handyman Nairobi",
    "verified professionals Kenya",
    "book services online Kenya",
    "M-Pesa service booking",
    "JustInTime Kenya",
  ],
  applicationName: "JustInTime",
  authors: [{ name: "JustInTime Team", url: "https://justintime.gtss.software" }],
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
    url: "https://justintime.gtss.software",
    siteName: "JustInTime",
    title: "JustInTime - Find Trusted Professionals Near You",
    description: "Connect with verified local service providers for all your needs across Kenya. Quality services, trusted pros, M-Pesa payments.",
    images: [
      {
        url: "/images/og-image.png",
        width: 1200,
        height: 630,
        alt: "JustInTime - Professional Services Marketplace in Kenya",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "JustInTime - Find Trusted Professionals",
    description: "Connect with verified service providers across Kenya. Book now, pay with M-Pesa.",
    images: ["/images/og-image.png"],
    site: "@JustInTimeKE",
    creator: "@JustInTimeKE",
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
  manifest: "/manifest.json",
  alternates: {
    canonical: "https://justintime.gtss.software",
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
