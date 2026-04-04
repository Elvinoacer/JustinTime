import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { blogPosts, getBlogPostBySlug } from "@/content/blog";
import { constructMetadata } from "@/lib/metadata";

export async function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPostBySlug(slug);

  if (!post) {
    return constructMetadata({
      title: "Article Not Found | JustInTime",
      noIndex: true,
    });
  }

  return constructMetadata({
    title: `${post.title} | JustInTime Blog`,
    description: post.excerpt,
    canonical: `https://justintime.gtss.software/blog/${post.slug}`,
    image: post.image,
  });
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getBlogPostBySlug(slug);

  if (!post) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50">
        <Header />
        <main className="flex-1 px-4 pt-28 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <h1 className="text-2xl font-bold text-slate-950">
              Article not found
            </h1>
            <p className="mt-3 text-sm text-slate-600">
              The article you requested does not exist or is no longer
              available.
            </p>
            <Link
              href="/blog"
              className="mt-6 inline-flex rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white"
            >
              Back to blog
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const publishedLabel = new Date(post.publishedAt).toLocaleDateString(
    "en-US",
    {
      month: "long",
      day: "numeric",
      year: "numeric",
    },
  );

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Header />
      <main className="flex-1 pt-[var(--public-header-h)]">
        <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
          <Link
            href="/blog"
            className="text-sm font-medium text-emerald-700 transition-colors hover:text-emerald-800"
          >
            ← Back to blog
          </Link>

          <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
              {post.category}
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              {post.title}
            </h1>
            <p className="mt-4 text-base leading-relaxed text-slate-600">
              {post.excerpt}
            </p>

            <div className="mt-5 flex flex-wrap gap-4 text-sm text-slate-500">
              <span>{post.author}</span>
              <span>{publishedLabel}</span>
              <span>{post.readTime}</span>
            </div>

            <div className="mt-8 space-y-5 text-[15px] leading-7 text-slate-700">
              {post.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </div>
        </article>
      </main>
      <Footer />
    </div>
  );
}
