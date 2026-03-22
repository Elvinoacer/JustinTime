# JustInTime — SEO & Favicon Implementation Plan

## Audit Summary

The codebase already has a solid SEO foundation — `constructMetadata()`, a `robots.txt`, OG image, and a manifest. But there are real gaps that are hurting discoverability and browser presentation. This plan addresses every one of them in priority order.

---

## 1. Favicon — Fix First (Highest Impact, Most Visible)

### The Problem
The current setup points all favicon slots at `/images/JustinTimeLogo.png` — a single large PNG used at 16×16, 32×32, and apple sizes simultaneously. Browsers don't rescale gracefully at small sizes, so the tab icon is likely a blurry mess. There's also no `favicon.ico`, no SVG favicon, and the manifest icons are ~5MB each (unacceptable).

### What You Need to Create

#### Files to add to `public/`
```
public/
├── favicon.ico           ← 32×32 ICO (for legacy browsers)
├── favicon-16x16.png
├── favicon-32x32.png
├── apple-touch-icon.png  ← 180×180 PNG
├── safari-pinned-tab.svg ← Monochrome SVG (Safari)
```

#### Files to add to `src/app/` (Next.js App Router auto-detection)
```
src/app/
├── icon.png              ← 512×512 PNG (Next.js serves as /icon)
├── icon.svg              ← SVG version (preferred by modern browsers)
├── apple-icon.png        ← 180×180 PNG
```

> When Next.js finds `icon.png`/`icon.svg` in `src/app/`, it auto-generates the `<link rel="icon">` tags. **You don't need to declare them manually in `layout.tsx` anymore.**

#### Tool to generate all sizes at once
Use **[RealFaviconGenerator](https://realfavicongenerator.net)** — upload your logo, it exports the full set including ICO, all PNGs, and the SVG. Use the JustInTime green (`#059669`) as the theme color.

### Fix `layout.tsx` Icons Block

Replace the current icons declaration with:

```ts
icons: {
  icon: [
    { url: "/favicon.ico" },
    { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    { url: "/icon.svg", type: "image/svg+xml" },
  ],
  apple: [
    { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
  ],
  other: [
    { rel: "mask-icon", url: "/safari-pinned-tab.svg", color: "#059669" },
  ],
},
```

### Fix `manifest.json`

The current manifest icons are ~5MB each — way too large for a PWA manifest. They need to be compressed, and `maskable` purpose needs to be added:

```json
{
  "name": "JustInTime",
  "short_name": "JIT",
  "description": "Find Trusted Professionals Near You in Kenya",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#059669",
  "orientation": "portrait-primary",
  "categories": ["business", "productivity"],
  "icons": [
    {
      "src": "/favicon-32x32.png",
      "sizes": "32x32",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

> Also compress the `icon-192x192.png` and `icon-512x512.png` files. 5MB icons are unacceptable — target under 50KB each. Use [Squoosh](https://squoosh.app) or `sharp` in a build script.

---

## 2. Root Layout Metadata — Tighten Up `layout.tsx`

### Current Gaps
- `openGraph.url` is set to `"/"` — should be the full canonical URL
- `twitter.creator` is `"@JustInTime"` — confirm this is your actual Twitter/X handle
- No `themeColor` field (controls mobile browser tab bar)
- No `applicationName`

### Updated `layout.tsx` Metadata

```ts
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL || 'https://justintime.co.ke'),
  title: {
    default: "JustInTime — Find Trusted Professionals Near You",
    template: "%s | JustInTime",
  },
  description:
    "Connect with verified local service providers across Kenya. Find trusted professionals for cleaning, plumbing, electrical, repairs, painting, and more. Instant quotes. Trusted pros.",
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
  authors: [{ name: "JustInTime Team", url: "https://justintime.co.ke" }],
  creator: "JustInTime",
  publisher: "JustInTime",
  formatDetection: { email: false, address: false, telephone: false },
  openGraph: {
    type: "website",
    locale: "en_KE",
    url: "https://justintime.co.ke",
    siteName: "JustInTime",
    title: "JustInTime — Find Trusted Professionals Near You",
    description:
      "Connect with verified local service providers for all your needs across Kenya. Quality services, trusted pros, M-Pesa payments.",
    images: [
      {
        url: "/images/og-image.png",
        width: 1200,
        height: 630,
        alt: "JustInTime — Professional Services Marketplace in Kenya",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@JustInTimeKE",      // update to your actual handle
    creator: "@JustInTimeKE",
    title: "JustInTime — Find Trusted Professionals",
    description:
      "Connect with verified service providers across Kenya. Book now, pay with M-Pesa.",
    images: ["/images/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  // icons removed — handled by src/app/icon.png and src/app/apple-icon.png
  manifest: "/manifest.json",
  alternates: {
    canonical: "https://justintime.co.ke",
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
  },
  category: "marketplace",
};
```

---

## 3. Fix `constructMetadata()` — `src/lib/metadata.ts`

The current utility is missing OG image dimensions, siteName, and locale. The `icons` parameter is a plain string — too blunt. Fix:

```ts
import { Metadata } from "next";

const BASE_URL = process.env.NEXTAUTH_URL || "https://justintime.co.ke";

export function constructMetadata({
  title = "JustInTime — Find Trusted Professionals Near You",
  description = "Connect with verified local service providers across Kenya. Find trusted professionals for cleaning, plumbing, electrical, repairs, and more.",
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
      images: [{ url: image, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      site: "@JustInTimeKE",
      title,
      description,
      images: [image],
    },
    ...(canonical && {
      alternates: { canonical },
    }),
    ...(noIndex && {
      robots: { index: false, follow: false },
    }),
  };
}
```

> Note: `icons` removed from the utility — individual pages should never override the favicon. The root `layout.tsx` handles icons globally.

---

## 4. Page-Level Metadata Gaps

### Pages with NO metadata export (fall back to layout defaults)

These pages need their own `export const metadata` or `generateMetadata`:

| Page | File | Priority | Action |
|------|------|----------|--------|
| Home | `src/app/page.tsx` | High | Add `export const metadata` |
| Blog | `src/app/blog/page.tsx` | High | Add `constructMetadata()` |
| Jobs listing | `src/app/jobs/page.tsx` | High | Add `constructMetadata()` |
| Contact | `src/app/contact/page.tsx` | Medium | Add `constructMetadata()` |
| FAQ | `src/app/faq/page.tsx` | Medium | Add `constructMetadata()` |
| Privacy | `src/app/privacy/page.tsx` | Low | Add with `noIndex: false` |
| Cookie Policy | `src/app/cookie-policy/page.tsx` | Low | Add metadata |

### Static Page Snippets

**Home `src/app/page.tsx`:**
```ts
export const metadata = constructMetadata({
  title: "JustInTime — Find Trusted Professionals Near You in Kenya",
  description:
    "Book verified local professionals for cleaning, plumbing, electrical, repairs & more. Pay with M-Pesa. Trusted by thousands across Kenya.",
  canonical: "https://justintime.co.ke",
});
```

**Blog `src/app/blog/page.tsx`:**
```ts
export const metadata = constructMetadata({
  title: "Blog — Tips & Guides for Hiring Professionals",
  description:
    "Expert tips on hiring reliable professionals, home maintenance guides, and news from the JustInTime team.",
  canonical: "https://justintime.co.ke/blog",
});
```

**Jobs listing `src/app/jobs/page.tsx`:**
```ts
export const metadata = constructMetadata({
  title: "Browse Jobs — Find Work as a Professional",
  description:
    "Discover job opportunities across Kenya. Apply for cleaning, plumbing, electrical, and dozens of other service categories.",
  canonical: "https://justintime.co.ke/jobs",
});
```

---

## 5. Dynamic Page Metadata — `generateMetadata`

Dynamic routes (`/professionals/[id]`, `/jobs/[id]`, `/services/[id]`) need `generateMetadata` so each page gets unique, crawlable titles and descriptions. This is critical for SEO — these pages are your most linkable, discoverable content.

### `src/app/professionals/[id]/page.tsx`

```ts
import type { Metadata } from "next";
import { db } from "@/lib/db"; // your Prisma client

export async function generateMetadata(
  { params }: { params: { id: string } }
): Promise<Metadata> {
  const pro = await db.user.findUnique({
    where: { id: params.id },
    select: { name: true, bio: true, location: true, category: true },
  });

  if (!pro) return { title: "Professional Not Found" };

  return {
    title: `${pro.name} — ${pro.category ?? "Professional"} in ${pro.location ?? "Kenya"}`,
    description:
      pro.bio ??
      `Hire ${pro.name}, a verified ${pro.category} professional on JustInTime. View ratings, reviews, and book instantly.`,
    openGraph: {
      title: `${pro.name} | JustInTime`,
      description: pro.bio ?? `Verified ${pro.category} in ${pro.location}`,
      images: [{ url: "/images/og-image.png", width: 1200, height: 630 }],
    },
    alternates: {
      canonical: `https://justintime.co.ke/professionals/${params.id}`,
    },
  };
}
```

### `src/app/jobs/[id]/page.tsx`

```ts
export async function generateMetadata(
  { params }: { params: { id: string } }
): Promise<Metadata> {
  const job = await db.job.findUnique({
    where: { id: params.id },
    select: { title: true, description: true, location: true, category: true },
  });

  if (!job) return { title: "Job Not Found" };

  return {
    title: `${job.title} — ${job.category} Job in ${job.location ?? "Kenya"}`,
    description:
      job.description?.slice(0, 155) ??
      `View this ${job.category} job listing on JustInTime and submit a proposal.`,
    alternates: {
      canonical: `https://justintime.co.ke/jobs/${params.id}`,
    },
    robots: { index: true, follow: true },
  };
}
```

> Apply the same pattern to `services/[id]/page.tsx`.

---

## 6. Add a Sitemap — `src/app/sitemap.ts`

The `robots.txt` references `/sitemap.xml` but it doesn't exist. Next.js can auto-generate it:

```ts
// src/app/sitemap.ts
import { MetadataRoute } from "next";
import { db } from "@/lib/db";

const BASE = "https://justintime.co.ke";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages
  const staticRoutes = [
    { url: BASE, lastModified: new Date(), priority: 1.0 },
    { url: `${BASE}/about`, lastModified: new Date(), priority: 0.8 },
    { url: `${BASE}/professionals`, lastModified: new Date(), priority: 0.9 },
    { url: `${BASE}/jobs`, lastModified: new Date(), priority: 0.9 },
    { url: `${BASE}/blog`, lastModified: new Date(), priority: 0.7 },
    { url: `${BASE}/contact`, lastModified: new Date(), priority: 0.6 },
    { url: `${BASE}/faq`, lastModified: new Date(), priority: 0.6 },
  ];

  // Dynamic pages — professionals
  const pros = await db.user.findMany({
    where: { role: "PROVIDER", isVerified: true },
    select: { id: true, updatedAt: true },
    take: 500, // cap to avoid massive sitemaps
  });

  const proRoutes = pros.map((p) => ({
    url: `${BASE}/professionals/${p.id}`,
    lastModified: p.updatedAt,
    priority: 0.7,
  }));

  // Dynamic pages — jobs
  const jobs = await db.job.findMany({
    where: { status: "OPEN" },
    select: { id: true, updatedAt: true },
    take: 500,
  });

  const jobRoutes = jobs.map((j) => ({
    url: `${BASE}/jobs/${j.id}`,
    lastModified: j.updatedAt,
    priority: 0.6,
  }));

  return [...staticRoutes, ...proRoutes, ...jobRoutes];
}
```

---

## 7. OG Image — Verify & Improve

The OG image at `/images/og-image.png` exists (505KB). Check that it is:
- **Exactly 1200×630px** — verify with an image editor
- **Readable at thumbnail size** — the text/logo should be visible when shrunk to ~300px wide (how Twitter/LinkedIn renders it)
- **Under 1MB** — 505KB is fine; under 300KB is ideal

Test your OG tags at: [opengraph.xyz](https://www.opengraph.xyz) and [cards-dev.twitter.com/validator](https://cards-dev.twitter.com/validator)

---

## 8. `robots.txt` — One Fix

The `robots.txt` currently allows `/` globally, then adds specific `Allow` lines — redundant since `Allow: /` covers everything. The real issue: `/provider/` routes are not disallowed. Add:

```
Disallow: /provider/
Disallow: /bookings/
Disallow: /onboarding/
```

---

## 9. Structured Data (JSON-LD) — Optional but Valuable

For the home page and professional profile pages, add JSON-LD to help Google understand the business type. Add this to `src/app/page.tsx`:

```tsx
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "JustInTime",
      url: "https://justintime.co.ke",
      description: "Kenya's marketplace for verified local professionals",
      potentialAction: {
        "@type": "SearchAction",
        target: "https://justintime.co.ke/professionals?q={search_term_string}",
        "query-input": "required name=search_term_string",
      },
    }),
  }}
/>
```

And for professional profile pages, use `"@type": "LocalBusiness"` or `"Person"` with `jobTitle`, `address`, and `aggregateRating`.

---

## Implementation Order

| # | Task | Effort | Impact |
|---|------|--------|--------|
| 1 | Generate proper favicon set (RealFaviconGenerator) and drop files | 30 min | 🔥 High |
| 2 | Compress manifest icons (5MB → <50KB) | 15 min | 🔥 High |
| 3 | Update `layout.tsx` icons block | 10 min | 🔥 High |
| 4 | Fix `constructMetadata()` utility | 15 min | High |
| 5 | Add `generateMetadata` to `/professionals/[id]` and `/jobs/[id]` | 45 min | High |
| 6 | Add metadata to home, blog, jobs listing, contact, faq pages | 30 min | Medium |
| 7 | Create `src/app/sitemap.ts` | 20 min | Medium |
| 8 | Fix `robots.txt` | 5 min | Low |
| 9 | Add JSON-LD to home page | 20 min | Low |
| 10 | Verify OG image dimensions and test in validators | 15 min | Medium |

---

## Quick Checklist Before Going Live

- [ ] `favicon.ico` in `public/`
- [ ] `src/app/icon.png` (512×512) and `src/app/icon.svg`
- [ ] `src/app/apple-icon.png` (180×180)
- [ ] Manifest icons compressed to under 50KB
- [ ] `constructMetadata()` updated (no `icons` param)
- [ ] Home page has exported `metadata`
- [ ] `/professionals/[id]` has `generateMetadata`
- [ ] `/jobs/[id]` has `generateMetadata`
- [ ] `sitemap.ts` created and returning valid URLs
- [ ] `robots.txt` updated with missing disallow paths
- [ ] OG image tested at opengraph.xyz
- [ ] `NEXTAUTH_URL` env var set to production domain in deployment
- [ ] `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` set after GSC verification