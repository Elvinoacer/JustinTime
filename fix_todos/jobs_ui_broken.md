# Jobs Feature — UI Flow Breakpoints & Fixes

Audit of the `JustInTime` codebase. Seven concrete breakpoints were found where the jobs feature is inaccessible, misdirected, or broken for the relevant party.

---

## 1. Client has no "My Jobs" list page

**Where it breaks:** The `ClientSidebar` nav (`src/components/ClientSidebar.tsx`) only exposes:

- Post a Job → `/client/post-job`
- My Proposals → `/client/proposals`

There is **no nav entry for "My Jobs"**, and crucially, no index page at `/client/jobs`. The directory `src/app/client/jobs/` only contains `[id]/page.tsx` (the detail page). There is nowhere for a client to navigate to see all their posted jobs without going through the dashboard widget.

**Evidence:** `revalidatePath("/client/jobs")` is called in `src/app/actions/proposals.ts` multiple times, confirming this page was architecturally expected.

**Fix:**

1. Create `src/app/client/jobs/page.tsx` — a list page that fetches from `GET /api/client/jobs` (already exists) and renders the client's jobs with links to each detail page.
2. Add a nav entry to `ClientSidebar`:
   ```ts
   { name: "My Jobs", href: "/client/jobs", icon: "work" }
   ```
   Place it between "Post a Job" and "My Proposals".

---

## 2. "Share Job" button copies the wrong URL (auth-gated link shared publicly)

**Where it breaks:** In `src/app/client/jobs/[id]/page.tsx`, the share handler is:

```ts
const handleShareJob = () => {
  const jobUrl = `${window.location.origin}/client/jobs/${jobId}`;
  navigator.clipboard.writeText(jobUrl);
};
```

`/client/jobs/[id]` sits inside the authenticated client dashboard. Anyone who receives this link — a provider, a referral contact — hits a redirect wall or a 404 depending on their session.

The public-facing job detail page already exists at `/jobs/[id]` with proper SEO metadata and an apply flow.

**Fix:**

```ts
const handleShareJob = () => {
  const jobUrl = `${window.location.origin}/jobs/${jobId}`;
  navigator.clipboard.writeText(jobUrl);
};
```

---

## 3. Job alert email links providers to a non-existent page

**Where it breaks:** In `src/app/api/jobs/route.ts` line ~555, when a new job is created, matching providers receive an email with this CTA link:

```
${process.env.NEXTAUTH_URL}/dashboard/jobs/${job.id}
```

The page at `/dashboard/jobs` is the **provider job applications panel** (a flat list with tabs). There is **no** `src/app/dashboard/jobs/[id]` route — no `[id]` subfolder exists under that directory. This link is a dead end (404) for the provider.

**Fix:** Change the email CTA to the public job detail page where the provider can actually read the job and apply:

```ts
href = "${process.env.NEXTAUTH_URL}/jobs/${job.id}";
```

---

## 4. Proposal status notification email ignores URL query param — lands on wrong tab

**Where it breaks:** In `src/lib/proposals/statusNotifications.ts` line ~76, when a provider's proposal status changes, the email CTA is:

```
${process.env.NEXTAUTH_URL}/dashboard/jobs?tab=applied
```

The provider dashboard at `src/app/dashboard/jobs/page.tsx` manages tab state entirely with `useState` — it does **not** read `?tab=` from the URL:

```ts
const [activeTab, setActiveTab] = useState("available");
```

The provider lands on the default `available` tab, not their `applied` tracker. The CTA is technically live but functionally misleading.

**Fix (two options):**

Option A — Read the query param on mount:

```ts
const searchParams = useSearchParams();
const [activeTab, setActiveTab] = useState(
  searchParams.get("tab") ?? "available",
);
```

Option B — Use a direct link to the applied view that doesn't rely on tab state (e.g. a dedicated `/dashboard/applied-jobs` page, which may be cleaner long-term).

---

## 5. Provider "Browse Jobs" button navigates to Services, not the Jobs marketplace

**Where it breaks:** In `src/app/dashboard/jobs/page.tsx` line ~470:

```tsx
<Link href="/services">
  <span>Browse Jobs</span>
</Link>
```

`/services` is the **service browsing page** (find a professional), not the jobs marketplace. A provider clicking "Browse Jobs" ends up on a consumer-facing page intended for clients seeking services — the opposite of what they want.

The jobs marketplace is at `/jobs`.

**Fix:**

```tsx
<Link href="/jobs">
  <span>Browse Jobs</span>
</Link>
```

---

## 6. Admin has no jobs management page

**Where it breaks:** `src/app/admin/` contains pages for: users, verifications, bookings, disputes, support, finance, reconciliation, logs, settings — but **no jobs page**. The `AdminSidebar` has no "Jobs" entry.

Since jobs are the core transaction driver, admins have no way to:

- Search or view all jobs across the platform
- Moderate or remove inappropriate job postings
- Investigate disputes or complaints that reference a specific job
- Audit job creation, closure, or proposal acceptance

**Fix:**

1. Create `src/app/admin/jobs/page.tsx` — a paginated list using `GET /api/jobs` (which is already publicly available and supports filtering by status, category, search).
2. Add a nav entry in `AdminSidebar`:
   ```ts
   { name: "Jobs", href: "/admin/jobs", icon: Briefcase }
   ```
3. The page should support: status filter, category filter, search, and links to `/client/jobs/[id]` (to see proposals) or `/jobs/[id]` (to see the public view).

---

## 7. Team Jobs system is invisible to individual provider members

**Where it breaks:** There are two entirely separate job systems:

| System             | Model              | Accessible via                                  |
| ------------------ | ------------------ | ----------------------------------------------- |
| Marketplace jobs   | `Job` (Prisma)     | `/dashboard/jobs`, `/jobs`, `/client/jobs/[id]` |
| Team dispatch jobs | `TeamJob` (Prisma) | `/dashboard/team/jobs` only                     |

A team member who is assigned a `TeamJob` has no visibility in their main `/dashboard/jobs` page. There is no cross-linking. A provider acting as an individual and as a team member sees two completely separate job lists with no unified view.

**Fix (incremental):**

Short-term — Add a prominent CTA on `/dashboard/jobs` for providers who are on a team:

```tsx
{
  hasTeam && (
    <Link href="/dashboard/team/jobs">View team-dispatched jobs →</Link>
  );
}
```

Long-term — Surface `TeamJob` assignments in the `active` tab of `/dashboard/jobs` alongside regular accepted proposals, or add a `team` tab to the provider jobs page.

---

## Summary Table

| #   | Affected Party                 | Breakpoint                                       | Severity   |
| --- | ------------------------------ | ------------------------------------------------ | ---------- |
| 1   | Client                         | No "My Jobs" list page or sidebar nav entry      | High       |
| 2   | Anyone receiving a shared link | Share button copies auth-gated URL               | High       |
| 3   | Provider                       | Job alert email links to a 404                   | High       |
| 4   | Provider                       | Proposal status email tab link does nothing      | Medium     |
| 5   | Provider                       | "Browse Jobs" button goes to wrong page          | Medium     |
| 6   | Admin                          | No admin interface to manage jobs                | Medium     |
| 7   | Team member / Provider         | Team jobs not visible in provider jobs dashboard | Low–Medium |
