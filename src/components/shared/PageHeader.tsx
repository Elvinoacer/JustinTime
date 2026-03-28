"use client";

import { forwardRef } from "react";

export type PageHeaderVariant = "brand" | "browse";

interface PageHeaderProps {
  title: string;
  description: string;
  /** `brand`: solid emerald bar (legacy). `browse`: light hero aligned with /services */
  variant?: PageHeaderVariant;
  /** Use unique ids per page for aria-labelledby */
  headingId?: string;
}

const PageHeader = forwardRef<HTMLElement, PageHeaderProps>(
  function PageHeader(
    {
      title,
      description,
      variant = "brand",
      headingId = "browse-page-heading",
    },
    ref,
  ) {
    if (variant === "browse") {
      return (
        <section
          ref={ref}
          className="relative overflow-hidden border-b border-emerald-100/60 bg-gradient-to-b from-white via-emerald-50/35 to-slate-50"
          aria-labelledby={headingId}
        >
          <div className="pointer-events-none absolute inset-0 opacity-[0.55]" aria-hidden>
            <div className="absolute -left-24 top-0 h-56 w-56 rounded-full bg-emerald-300/30 blur-3xl" />
            <div className="absolute -right-16 top-16 h-48 w-48 rounded-full bg-sky-300/25 blur-3xl" />
          </div>
          <div className="relative mx-auto max-w-7xl px-4 pb-6 pt-7 sm:px-6 sm:pb-7 sm:pt-9 lg:px-8">
            <h1
              id={headingId}
              className="text-balance text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl lg:text-[2rem] lg:leading-tight"
            >
              {title}
            </h1>
            <p className="mt-2 max-w-2xl text-pretty text-sm leading-relaxed text-slate-600 sm:mt-3 sm:text-base">
              {description}
            </p>
          </div>
        </section>
      );
    }

    return (
      <div
        ref={ref}
        className="bg-emerald-800 pb-8 pt-20 text-white sm:pb-10 sm:pt-24"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl">
            <h1 className="mb-2 text-2xl font-bold sm:text-3xl">{title}</h1>
            <p className="text-sm text-emerald-100 sm:text-base">{description}</p>
          </div>
        </div>
      </div>
    );
  },
);

export default PageHeader;
