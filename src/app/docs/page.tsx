import type { Metadata } from "next";
import Link from "next/link";
import { promises as fs } from "node:fs";
import path from "node:path";
import React, { isValidElement, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { constructMetadata } from "@/lib/metadata";

type TocItem = {
  id: string;
  title: string;
  level: 2 | 3;
};

export const metadata: Metadata = constructMetadata({
  title: "JustInTime Documentation",
  description:
    "Public platform documentation for JustInTime, rendered directly from the maintained markdown source.",
  canonical: "https://justintime.gtss.software/docs",
});

export const dynamic = "force-dynamic";

function normalizeHeadingText(value: string): string {
  return value
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .trim();
}

function slugBase(value: string): string {
  const normalized = normalizeHeadingText(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

  return normalized || "section";
}

function createSlugger() {
  const slugCounts = new Map<string, number>();

  return {
    slug(value: string) {
      const base = slugBase(value);
      const currentCount = slugCounts.get(base) || 0;
      const nextCount = currentCount + 1;
      slugCounts.set(base, nextCount);
      return currentCount === 0 ? base : `${base}-${nextCount}`;
    },
  };
}

function extractTextFromNode(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map((child) => extractTextFromNode(child)).join("");
  }

  if (isValidElement(node)) {
    const props = node.props as { children?: ReactNode };
    return extractTextFromNode(props.children);
  }

  return "";
}

function buildTableOfContents(markdownContent: string): TocItem[] {
  const slugger = createSlugger();
  const items: TocItem[] = [];

  for (const line of markdownContent.split("\n")) {
    const match = /^(#{2,3})\s+(.+)$/.exec(line);
    if (!match) {
      continue;
    }

    const level = match[1].length as 2 | 3;
    const title = normalizeHeadingText(match[2]);

    if (!title) {
      continue;
    }

    items.push({
      id: slugger.slug(title),
      title,
      level,
    });
  }

  return items;
}

async function loadDocumentationContent(): Promise<string> {
  const markdownPath = path.join(
    process.cwd(),
    "docs",
    "features",
    "overview2.md",
  );

  return fs.readFile(markdownPath, "utf8");
}

export default async function DocumentationPage() {
  let markdownContent = "";
  let hasLoadError = false;

  try {
    markdownContent = await loadDocumentationContent();
  } catch {
    hasLoadError = true;
  }

  const tableOfContents = hasLoadError
    ? []
    : buildTableOfContents(markdownContent);
  const headingSlugger = createSlugger();

  const markdownComponents: Components = {
    h1({ children, ...props }) {
      return (
        <h1
          className="scroll-mt-28 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl"
          {...props}
        >
          {children}
        </h1>
      );
    },
    h2({ children, ...props }) {
      const id = headingSlugger.slug(extractTextFromNode(children));
      return (
        <h2
          id={id}
          className="mt-10 scroll-mt-28 border-b border-slate-200 pb-2 text-2xl font-semibold text-slate-900"
          {...props}
        >
          {children}
        </h2>
      );
    },
    h3({ children, ...props }) {
      const id = headingSlugger.slug(extractTextFromNode(children));
      return (
        <h3
          id={id}
          className="mt-7 scroll-mt-28 text-xl font-semibold text-slate-900"
          {...props}
        >
          {children}
        </h3>
      );
    },
    p({ children, ...props }) {
      return (
        <p className="mt-4 leading-7 text-slate-700" {...props}>
          {children}
        </p>
      );
    },
    ul({ children, ...props }) {
      return (
        <ul className="mt-4 list-disc space-y-2 pl-6 text-slate-700" {...props}>
          {children}
        </ul>
      );
    },
    ol({ children, ...props }) {
      return (
        <ol
          className="mt-4 list-decimal space-y-2 pl-6 text-slate-700"
          {...props}
        >
          {children}
        </ol>
      );
    },
    li({ children, ...props }) {
      return (
        <li className="leading-7" {...props}>
          {children}
        </li>
      );
    },
    blockquote({ children, ...props }) {
      return (
        <blockquote
          className="mt-4 border-l-4 border-emerald-500 bg-emerald-50/60 px-4 py-3 italic text-slate-700"
          {...props}
        >
          {children}
        </blockquote>
      );
    },
    table({ children, ...props }) {
      return (
        <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[720px] border-collapse text-sm" {...props}>
            {children}
          </table>
        </div>
      );
    },
    thead({ children, ...props }) {
      return (
        <thead className="bg-slate-100" {...props}>
          {children}
        </thead>
      );
    },
    th({ children, ...props }) {
      return (
        <th
          className="border-b border-slate-200 px-3 py-2 text-left font-semibold text-slate-800"
          {...props}
        >
          {children}
        </th>
      );
    },
    td({ children, ...props }) {
      return (
        <td className="border-b border-slate-100 px-3 py-2 align-top" {...props}>
          {children}
        </td>
      );
    },
    pre({ children, ...props }) {
      return (
        <pre
          className="mt-4 overflow-x-auto rounded-xl bg-slate-900 p-4 text-sm leading-6 text-slate-100"
          {...props}
        >
          {children}
        </pre>
      );
    },
    code({ children, className, ...props }) {
      const isInlineCode = !className;

      if (isInlineCode) {
        return (
          <code
            className="rounded-md bg-slate-200 px-1.5 py-0.5 text-[0.9em] text-slate-900"
            {...props}
          >
            {children}
          </code>
        );
      }

      return (
        <code className={className} {...props}>
          {children}
        </code>
      );
    },
    a({ children, href = "", ...props }) {
      const isExternal = href.startsWith("http://") || href.startsWith("https://");

      return (
        <a
          href={href}
          className="font-medium text-emerald-700 underline decoration-emerald-300 underline-offset-4 hover:text-emerald-800"
          target={isExternal ? "_blank" : undefined}
          rel={isExternal ? "noreferrer noopener" : undefined}
          {...props}
        >
          {children}
        </a>
      );
    },
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Header />
      <main className="flex-1 pt-[var(--public-header-h)]">
        <section className="mx-auto w-full max-w-7xl px-3 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
              Public documentation
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              JustInTime Platform Docs
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
              This page renders the live documentation source directly from
              docs/features/overview2.md so product and engineering updates stay
              in one place.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <a
                href="#doc-content"
                className="inline-flex items-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Jump to content
              </a>
              <Link
                href="/services"
                className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Explore services
              </Link>
            </div>
          </div>

          {tableOfContents.length > 0 ? (
            <details className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm lg:hidden">
              <summary className="cursor-pointer text-sm font-semibold text-slate-900">
                Jump to section
              </summary>
              <nav aria-label="Table of contents" className="mt-3 max-h-72 overflow-y-auto">
                <ul className="space-y-1">
                  {tableOfContents.map((item) => (
                    <li key={item.id}>
                      <a
                        href={`#${item.id}`}
                        className={`block rounded-md px-2 py-1 text-sm hover:bg-emerald-50 hover:text-emerald-700 ${
                          item.level === 3
                            ? "ml-3 text-slate-600"
                            : "font-medium text-slate-800"
                        }`}
                      >
                        {item.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            </details>
          ) : null}

          <div className="mt-4 grid items-start gap-5 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-7">
            <aside className="hidden lg:block">
              <nav
                aria-label="Table of contents"
                className="sticky top-[calc(var(--public-header-h)+1rem)] max-h-[calc(100vh-var(--public-header-h)-2rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  On this page
                </p>
                {tableOfContents.length > 0 ? (
                  <ul className="mt-3 space-y-1">
                    {tableOfContents.map((item) => (
                      <li key={item.id}>
                        <a
                          href={`#${item.id}`}
                          className={`block rounded-md px-2 py-1 text-sm hover:bg-emerald-50 hover:text-emerald-700 ${
                            item.level === 3
                              ? "ml-3 text-slate-600"
                              : "font-medium text-slate-800"
                          }`}
                        >
                          {item.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-slate-500">
                    Unable to load documentation navigation.
                  </p>
                )}
              </nav>
            </aside>

            <article
              id="doc-content"
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 lg:p-8"
            >
              {hasLoadError ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                  Documentation content is currently unavailable. Please try
                  again shortly.
                </div>
              ) : (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={markdownComponents}
                >
                  {markdownContent}
                </ReactMarkdown>
              )}
            </article>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
