I checked the churn/retention feature across the schema, server actions, predictor logic, re-engagement logic, and the admin workspace.

Overall verdict: **the feature exists, but the flow is only partially real.**
The biggest problems are:

1. **scores are stored as history, but the admin workspace reads raw rows, not latest-per-user rows**
2. **“manual intervention” writes misleading success data without actually performing an intervention**
3. **re-engagement is mostly manual and not operationalized**
4. **the feature is effectively provider-only, even though the requirement says per user**
5. **the admin workspace is missing the operator flows needed to actually manage churn**

---

## What is currently present

You do have the core pieces:

- `ChurnScore` and `ChurnIntervention` models in `prisma/schema.prisma`
- churn actions in `src/app/actions/churn.ts`
- churn prediction logic in `src/lib/churn/churn-predictor.ts`
- re-engagement execution in `src/lib/churn/re-engagement.ts`
- admin page at `src/app/admin/churn-analysis/page.tsx`

So this is **not missing infrastructure**. It is mostly a **broken data flow / incomplete UI flow** problem.

---

# Broken flows and fixes

## 17.1 Churn score model per user backed by `ChurnScore`

### Broken flow 1: the data model is historical, but the workspace treats it like current state

`ChurnScore` stores many rows per user over time, but `getAtRiskUsers()` does this:

- `findMany()` on `churnScore`
- filters non-LOW
- sorts by score/date
- returns rows directly

File:

- `src/app/actions/churn.ts:17-54`

That means the admin page can show:

- the **same user multiple times**
- inflated “at-risk users” counts
- inconsistent intervention history per row
- actions applied to the same user repeatedly from different score snapshots

### Fix

You need one of these two patterns:

#### Better option

Add a **current score snapshot** concept.

Either:

- add `isCurrent Boolean @default(true)` on `ChurnScore` and flip previous scores to false when writing a new one, or
- create a separate `UserChurnState` table for the latest score and keep `ChurnScore` as history

#### Minimum-change option

Keep current schema, but change retrieval to **latest score per user only**.

Example approach:

1. get latest `calculatedAt` per `userId`
2. join back to `ChurnScore`
3. only return those rows

Also add:

- `@@index([userId, calculatedAt])`

Right now you only have separate indexes on `userId` and `calculatedAt`, not the compound index most useful for latest-per-user queries.

---

### Broken flow 2: “per user” is not really per user

`analyzeAllUsers()` only analyzes users where `role = 'PROVIDER'`.

File:

- `src/lib/churn/churn-predictor.ts:248-290`

If the requirement truly means **all users**, then clients are excluded from scoring entirely.

### Fix

Decide the product rule explicitly:

- If churn applies to **all users**, analyze both client and provider populations.
- If churn applies to **providers only**, rename the feature everywhere to provider churn, including UI copy and action names.

Right now the implementation and the feature statement do not match.

---

### Broken flow 3: no automatic refresh path

The churn score is not really “automatic.”
It is refreshed only when admin manually clicks **Run Full Analysis** or calls the server action.

Files:

- `src/app/actions/churn.ts:99-141`
- `src/app/admin/churn-analysis/page.tsx:199-213`

I found no real scheduler or event-driven refresh wired into the app for churn recomputation.

### Fix

Add one of these:

- a cron job / scheduled route that runs nightly
- event-driven recomputation after important signals:
  - booking completion
  - inactivity threshold crossing
  - review submission
  - onboarding/profile completion changes
  - message inactivity windows

Best structure:

- **history write** to `ChurnScore`
- **current snapshot update** to latest state
- optional enqueue of intervention candidates

---

## 17.2 Intervention model for targeted re-engagement: `ChurnIntervention`

### Broken flow 4: manual interventions are marked executed and successful immediately, even though nothing is executed

`createManualIntervention()` creates a row with:

- `executed: true`
- `executedAt: now`
- `successful: true`

File:

- `src/app/actions/churn.ts:147-189`

That is a bad data flow. It records a successful intervention even when the admin has only typed a note or created a plan.

### Why this matters

It corrupts:

- intervention stats
- success rate
- audit history
- downstream analysis

### Fix

Split intervention lifecycle into states.

Recommended fields:

- `status: DRAFT | SCHEDULED | EXECUTING | SENT | FAILED | RESPONDED | CONVERTED`
- `channel: EMAIL | PUSH | CALL | DISCOUNT | MANUAL_OUTREACH`
- `outcome: NO_RESPONSE | REOPENED | BOOKED | RETAINED`

At minimum:

- manual creation should default to `executed: false`
- only the actual delivery/execution path should set `executed: true`
- `successful` should not mean “message send succeeded”; it should mean “retention outcome succeeded”

---

### Broken flow 5: intervention stats are semantically wrong

`getInterventionStats()` computes success rate as:

`successful / executed`

File:

- `src/app/actions/churn.ts:232-259`

But in current code:

- manual interventions are always successful on creation
- automated interventions mark successful when delivery succeeds
- there is no measurement of reactivation, booking return, login return, or retention over time

So the workspace says “Success Rate,” but it is actually closer to **delivery success / bad manual defaults**, not retention success.

### Fix

Rename current metric to:

- “Delivery success rate”

Then add real retention outcome tracking:

- reactivated within 7 days
- booked within 14 days
- active again within 30 days

Store those outcomes separately and compute:

- intervention delivery rate
- response rate
- reactivation rate
- conversion rate

---

## 17.3 At-risk user identification and retrieval via `churn.ts`

### Broken flow 6: at-risk retrieval is duplicate-prone and stale

Because `getAtRiskUsers()` returns raw rows, not latest-per-user rows, the admin list is not reliable.

File:

- `src/app/actions/churn.ts:17-54`

Also, interventions are included via the relation on that **specific score row**, not “latest intervention for the user.”
So if a user had an intervention tied to an older score, the new row may show **None** even though the user was already contacted.

### Fix

In the admin retrieval query, fetch:

- latest churn state per user
- latest intervention per user
- maybe intervention count per user
- last contacted date
- last score date

This should be a user-centric DTO, not raw `ChurnScore` rows.

Example shape:

```ts
type AtRiskUserRow = {
  userId: string;
  user: { name; email; image };
  latestScore: { id; score; riskLevel; calculatedAt; lastActivityDays };
  lastIntervention?: { id; type; status; createdAt; outcome };
  interventionCount: number;
};
```

---

### Broken flow 7: risk model inputs are narrow and partly misleading

The predictor uses:

- inactivity
- booking decline
- profile completeness
- average rating

File:

- `src/lib/churn/churn-predictor.ts`

That is okay as a first version, but there are implementation issues:

#### 7a. Wrong relation include

In `calculateChurnScore()`, it includes:

- `bookings` with `where: { providerId: userId }`

But `user.bookings` is the **client bookings** relation, not provider bookings.

Schema:

- `User.bookings` = `Booking[] @relation("ClientBookings")`
- `User.providerBookings` = `Booking[] @relation("ProviderBookings")`

Files:

- `prisma/schema.prisma` user relations
- `src/lib/churn/churn-predictor.ts:37-50`

This include is logically wrong and likely useless. It suggests the model was written with the wrong relation in mind.

#### Fix

Use `providerBookings` if you want provider booking history, or remove the include entirely since the current code does not even use `user.bookings` afterward.

---

#### 7b. “last activity” misses important activity types

`getLastActivity()` only checks:

- bookings
- messages
- proposals

File:

- `src/lib/churn/churn-predictor.ts:124-163`

It ignores:

- service edits
- availability updates
- earnings/wallet activity
- login/session activity
- profile updates
- job actions
- support interactions

So users may be marked inactive while actually still engaged in meaningful ways.

#### Fix

Broaden activity sources or create a normalized user activity ledger.

At minimum add:

- service updatedAt
- profile updatedAt
- availability updatedAt
- last session activity if available
- jobs/proposals/bookings across both client and provider roles

---

#### 7c. booking decline treats “no previous bookings” as no decline

`previousCount === 0` returns `decline: 0`.

File:

- `src/lib/churn/churn-predictor.ts:169-199`

That avoids division by zero, but it also means:

- new users
- low-volume users
- dormant users without historical baseline

can be mis-scored as stable.

### Fix

Add cohort-aware logic:

- new users
- low-volume users
- established users

Use different baselines per cohort instead of treating no baseline as zero decline.

---

## 17.4 Intervention creation and user re-engagement trigger actions

### Broken flow 8: no UI for manual intervention creation

I found the action:

- `createManualIntervention()`

But I found no UI using it.

Search result shows no component/page wiring beyond the backend action.

So this requirement is only partially implemented.

### Fix

Add to `/admin/churn-analysis`:

- “Create intervention” button per user
- modal/form with:
  - channel/type
  - message template
  - custom message
  - optional offer
  - scheduled time
  - assignee

- intervention history drawer/table
- status badges

That is the missing operator flow for 17.4.

---

### Broken flow 9: no feedback on action results in the admin UI

The page uses server action forms for:

- `triggerUserReEngagement(item.userId)`
- `triggerChurnAnalysis()`

Files:

- `src/app/admin/churn-analysis/page.tsx:177-205`

But the result is ignored. So if:

- no churn score exists
- email send fails
- promo code creation fails
- notification creation fails

the admin gets no visible feedback.

### Fix

Move the action buttons into client components and show:

- pending state
- success toast
- error toast
- optimistic refresh or router refresh

Also disable duplicate submits while pending.

---

### Broken flow 10: repeated re-engagement can be spammy

`triggerUserReEngagement()` grabs the latest score and calls `triggerReEngagement()` with no cooldown rule.

Files:

- `src/app/actions/churn.ts:196-226`
- `src/lib/churn/re-engagement.ts:39-124`

So admins can repeatedly click **Re-engage**, creating multiple promo codes and sending multiple emails/notifications.

### Fix

Before sending, check for recent interventions for the same user:

- no re-engagement within last 7 or 14 days unless forced
- no duplicate intervention for the same score/channel
- optionally lock while one is in progress

Add a uniqueness guard like:

- userId + churnScoreId + type
  or better, a status-based cooldown check.

---

### Broken flow 11: `autoTriggerReEngagement()` exists but is not wired into the system

There is an auto-trigger helper:

- `autoTriggerReEngagement()`

File:

- `src/lib/churn/re-engagement.ts:257-295`

But I found no job, route, or scheduler invoking it.

So automatic re-engagement is effectively dead code.

### Fix

Wire it to:

- nightly cron after churn analysis
- admin batch action
- queue worker

And record batch execution results for observability.

---

### Broken flow 12: hardcoded campaign destination

Email CTA uses:

- `https://justintime.app/dashboard`

File:

- `src/lib/churn/re-engagement.ts:206`

That will break in staging, preview, or alternative production domains.

### Fix

Use your existing app URL builder instead of hardcoding the domain.

---

## 17.5 Admin churn analysis workspace at `/admin/churn-analysis`

### Broken flow 13: the workspace is read-only plus one button, not an analysis workspace

Current workspace has:

- summary cards
- a table
- per-user re-engage button
- run full analysis button

File:

- `src/app/admin/churn-analysis/page.tsx`

Missing core analysis/workflow capabilities:

- filter by risk level
- search by user
- latest score date
- intervention status filter
- per-user detail drilldown
- factor breakdown
- score history
- manual intervention composer
- retry failed intervention
- mark outcome after follow-up
- pagination

So as an “analysis workspace,” it is underbuilt.

### Fix

Add these sections:

#### Top filters

- risk level tabs
- search box
- “only not contacted”
- “contacted in last 7 days”
- score age filter

#### User detail panel

- factor breakdown from `factors`
- score trend/history
- last interventions
- recommended next action

#### Intervention controls

- trigger automated re-engagement
- create manual intervention
- mark outcome
- retry failure

---

### Broken flow 14: the dashboard count is misleading

The “At-Risk Users” card currently shows `atRiskUsers.length`.

File:

- `src/app/admin/churn-analysis/page.tsx:41-47`

Since that array is row-based and duplicate-prone, the metric is wrong.

### Fix

Count unique users from latest snapshots only.

---

### Broken flow 15: no empty-state distinction between “not analyzed yet” and “no at-risk users”

The table empty state says:

- “No at-risk users found”

But that could also mean:

- churn analysis has never been run
- retrieval failed earlier
- only LOW scores exist
- latest-per-user logic is absent and filtering is off

### Fix

Show stateful empty messages:

- “No analysis has been run yet”
- “No at-risk users in latest snapshot”
- “No users match current filters”

---

# Best-priority fixes in order

## Priority 1 — fix the broken data truth

1. change `getAtRiskUsers()` to return **latest score per user only**
2. add compound index on `ChurnScore(userId, calculatedAt)`
3. stop using raw score history as the admin list source

## Priority 2 — fix intervention semantics

4. stop setting manual interventions to `executed: true, successful: true` on creation
5. introduce proper status/outcome fields
6. separate delivery success from retention success

## Priority 3 — fix admin workflow

7. add manual intervention UI
8. add action feedback/toasts/pending states
9. add cooldown checks to prevent repeated spammy re-engagement

## Priority 4 — make the feature operational

10. schedule churn analysis automatically
11. wire `autoTriggerReEngagement()` or remove it
12. broaden activity signals and clarify whether churn is provider-only or all-user

---

# Concrete code changes I would make

## In `prisma/schema.prisma`

Add better lifecycle fields to `ChurnIntervention`, for example:

```prisma
model ChurnIntervention {
  id             String   @id @default(cuid())
  churnScoreId   String
  userId         String
  type           String
  channel        String?
  status         String   @default("DRAFT")
  message        String   @db.Text
  executed       Boolean  @default(false)
  executedAt     DateTime?
  deliveryOk     Boolean?
  successful     Boolean? // keep temporarily if needed for compatibility
  outcome        String?
  respondedAt    DateTime?
  convertedAt    DateTime?
  response       String?  @db.Text
  createdAt      DateTime @default(now())
}
```

And for `ChurnScore`:

- add `@@index([userId, calculatedAt])`

Optionally add:

- `isCurrent Boolean @default(true)`

---

## In `src/app/actions/churn.ts`

Replace `getAtRiskUsers()` with latest-per-user retrieval.

Also:

- make `createManualIntervention()` create a non-executed intervention
- add a `getUserInterventionHistory(userId)` helper
- add cooldown logic in `triggerUserReEngagement()`

---

## In `src/lib/churn/churn-predictor.ts`

Fix:

- wrong bookings relation include
- provider-only/all-user ambiguity
- limited last-activity sources
- cohort-aware booking decline logic

---

## In `src/lib/churn/re-engagement.ts`

Fix:

- hardcoded app URL
- cooldown check before send
- delivery status/outcome distinction
- duplicate intervention prevention

---

## In `src/app/admin/churn-analysis/page.tsx`

Refactor into:

- server page for initial data
- client table/actions component for mutations and feedback

Add:

- filters
- history/details drawer
- manual intervention modal
- factor display
- retry/mark-outcome controls

---

# Bottom line

The feature is **not fully reliable yet**.

The most important broken flows are:

- **duplicate/stale at-risk user listing**
- **fake-success manual interventions**
- **misleading intervention success metrics**
- **missing manual intervention UI**
- **manual-only analysis/re-engagement pipeline**
- **provider-only scoring despite “per user” requirement**
- **admin workspace too thin to operate retention properly**

Here is an analysis of the data and UI flow issues for the **Churn Prediction & Retention** feature, along with suggested fixes.

### 1. Data Flow & Logic Issues

**A. Duplicate Users in the Dashboard (17.3)**

- **The Issue:** `getAtRiskUsers` in `src/app/actions/churn.ts` queries the `ChurnScore` table directly. Since `calculateChurnScore` creates a _new_ score record every time it runs, a single user will appear multiple times in the dashboard with their historical scores.
- **The Fix:** You need to fetch only the _latest_ score per user. Since Prisma's `distinct` clause requires the distinct field to be the first `orderBy` field (which breaks ordering by score), query from the `User` model instead.

**B. "Personal Call" Interventions Auto-Executing (17.2 & 17.4)**

- **The Issue:** In `src/lib/churn/re-engagement.ts`, `RE_ENGAGEMENT_STRATEGIES.CRITICAL` maps to `type: 'PERSONAL_CALL'`. However, `triggerReEngagement` automatically marks the intervention as `executed: true` and `successful: true` at the end of the function. A personal call requires manual admin action and shouldn't be auto-completed.
- **The Fix:** Prevent auto-execution for manual intervention types so admins can track them in a "Pending Interventions" queue.

**C. Massive Scalability Bottleneck in `analyzeAllUsers` (17.1)**

- **The Issue:** In `src/lib/churn/churn-predictor.ts`, `analyzeAllUsers()` fetches all providers and loops through them sequentially with `await calculateChurnScore(provider.id)`. In production, this will hit Vercel's Serverless timeout (15-60s) very quickly.
- **The Fix:** Process users in concurrent batches, or ideally, offload this to a background job using a queue system (like Inngest or Upstash QStash).

### 2. UI & Interaction Flow Issues

**A. UI Freezing on Server Actions (17.4 & 17.5)**

- **The Issue:** In `src/app/admin/churn-analysis/page.tsx`, the "Re-engage" and "Run Full Analysis" buttons use inline server actions inside `<form>` tags without `useTransition` or `useActionState`. When clicked, the UI will completely freeze without showing a loading spinner until the request finishes.
- **The Fix:** Extract these buttons into dedicated Client Components and use React's `useTransition` hook to show loading states.

---

### Suggested Code Fixes

#### 1. Fix `getAtRiskUsers` to Prevent Duplicates (`src/app/actions/churn.ts`)

Update the query to group or fetch users with their single latest score:

```typescript
export async function getAtRiskUsers(riskLevel?: ChurnRiskLevel) {
  // ... auth checks ...
  try {
    const usersWithScores = await prisma.user.findMany({
      where: {
        churnScores: { some: {} }, // Has at least one score
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        churnScores: {
          orderBy: { calculatedAt: "desc" },
          take: 1, // Only get the latest score
          include: {
            interventions: { orderBy: { createdAt: "desc" }, take: 1 },
          }
        }
      }
    });

    // Map back to the expected payload shape, filtering by Risk Level in memory
    const latestScores = usersWithScores
      .map(u => ({ ...u.churnScores[0], user: { id: u.id, name: u.name, email: u.email, image: u.image } }))
      .filter(score => riskLevel ? score.riskLevel === riskLevel : score.riskLevel !== 'LOW')
      .sort((a, b) => b.score - a.score); // Re-apply score sorting

    return { success: true, users: latestScores };
  } catch (error) { ... }
}
```

#### 2. Fix Manual Intervention Auto-Execution (`src/lib/churn/re-engagement.ts`)

Modify `triggerReEngagement` to respect manual actions:

```typescript
export async function triggerReEngagement(
  userId: string,
  churnScoreId: string,
  riskLevel: ChurnRiskLevel,
): Promise<{ success: boolean; interventionId?: string }> {
  const strategy = RE_ENGAGEMENT_STRATEGIES[riskLevel];
  // ... (setup user and discount logic)

  const isManualTask = strategy.type === "PERSONAL_CALL";

  const intervention = await prisma.churnIntervention.create({
    data: {
      churnScoreId,
      userId,
      type: strategy.type,
      message,
      executed: false, // Keep false initially
    },
  });

  try {
    if (strategy.type.includes("EMAIL")) {
      await sendReEngagementEmail(
        user.email,
        user.name || "Professional",
        riskLevel,
        message,
        discountCode,
      );
    }
    if (strategy.type.includes("NOTIFICATION")) {
      await sendReEngagementNotification(userId, riskLevel, message);
    }

    // Only auto-mark as executed if it's an automated digital task
    if (!isManualTask) {
      await prisma.churnIntervention.update({
        where: { id: intervention.id },
        data: { executed: true, executedAt: new Date(), successful: true },
      });
    }

    return { success: true, interventionId: intervention.id };
  } catch (error) {
    // ... error handling
  }
}
```

#### 3. Fix UI Freezing with Client Components

Create a new file `src/components/churn/ReEngageButton.tsx`:

```tsx
"use client";
import { useTransition } from "react";
import { triggerUserReEngagement } from "@/app/actions/churn";

export default function ReEngageButton({ userId }: { userId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      onClick={() => startTransition(() => triggerUserReEngagement(userId))}
      disabled={isPending}
      className={`text-emerald-600 hover:text-emerald-900 font-medium ${isPending ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      {isPending ? "Sending..." : "Re-engage"}
    </button>
  );
}
```

Then in `src/app/admin/churn-analysis/page.tsx`, replace the `<form>` wrapping the Re-engage button with:

```tsx
<ReEngageButton userId={item.userId} />
```

_(Do the same for the "Run Full Analysis" button to provide loading feedback)._
Here are more critical, deep-level architectural and flow bugs identified in the Churn Prediction & Retention feature, along with the necessary fixes to make the system production-ready.

### 3. Critical Idempotency & Workflow Issues

**A. The "Spam Loop" Bug (17.2 & 17.4)**

- **The Issue:** `autoTriggerReEngagement` in `src/lib/churn/re-engagement.ts` filters for high-risk scores that don't have interventions attached to _that specific score_ (`interventions: { none: {} }`). However, since new scores are generated periodically (e.g., daily), a user will get a new `ChurnScore` tomorrow. Because that new score has no interventions, the system will spam the user with "We miss you" emails and discount codes **every single day** they remain at high risk.
- **The Fix:** You must check if the _User_ has received an intervention recently, not just the specific score.

**B. "Ghost" Manual Interventions (17.4)**

- **The Issue:** In `src/app/actions/churn.ts`, `createManualIntervention` just creates a database record and hardcodes `executed: true` and `successful: true`. It never actually sends an email, notification, or calls the user. Admins will think they are sending a custom message, but it goes nowhere.
- **The Fix:** The action needs to actually fire the `sendEmail` or `sendReEngagementNotification` utilities using the provided `message` payload.

**C. Orphaned Automation Trigger (17.2 & 17.3)**

- **The Issue:** `autoTriggerReEngagement()` is perfectly written in `re-engagement.ts`, but it is **never called anywhere** in your application. The automated re-engagement system is completely disconnected from the event loop.
- **The Fix:** You need to either expose a cron API route to run this daily, or chain it to the end of the `analyzeAllUsers` function so it fires immediately after batch analysis.

---

### Suggested Code Fixes

#### 1. Fix the Spam Loop in `autoTriggerReEngagement` (`src/lib/churn/re-engagement.ts`)

Modify the query to ensure the user hasn't received _any_ churn intervention in the last X days (e.g., a 14-day cooldown).

```typescript
export async function autoTriggerReEngagement(): Promise<{
  triggered: number;
  successful: number;
  failed: number;
}> {
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  // Find recent high-risk scores
  const highRiskScores = await prisma.churnScore.findMany({
    where: {
      riskLevel: { in: ["HIGH", "CRITICAL"] },
      calculatedAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
      },
      // Ensure the USER hasn't had an intervention recently, not just this score
      user: {
        churnInterventions: {
          none: {
            createdAt: { gte: fourteenDaysAgo },
          },
        },
      },
    },
    include: { user: { select: { id: true, email: true } } },
  });

  // ... rest of the function remains the same
}
```

#### 2. Fix "Ghost" Manual Interventions (`src/app/actions/churn.ts`)

Update `createManualIntervention` to actually dispatch the communication so the user receives it.

```typescript
// Import your communication utilities at the top
import { sendEmail } from "@/lib/email";

export async function createManualIntervention(userId: string, type: string, message: string) {
  // ... auth checks ...

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const latestScore = await prisma.churnScore.findFirst({
      where: { userId }, orderBy: { calculatedAt: "desc" },
    });

    if (!latestScore || !user) return { success: false, error: "Data missing" };

    // Actually SEND the communication based on type
    if (type === 'EMAIL' && user.email) {
      await sendEmail({
        to: user.email,
        subject: "Checking in from JustInTime",
        html: `<p>${message.replace(/\n/g, '<br/>')}</p>`
      });
    } else if (type === 'NOTIFICATION') {
      await prisma.notification.create({
        data: {
          userId,
          title: "A message from our team",
          message: message,
          type: "SYSTEM"
        }
      });
    }

    // Now log it as successful
    const intervention = await prisma.churnIntervention.create({
      data: {
        churnScoreId: latestScore.id,
        userId,
        type,
        message,
        executed: true,
        executedAt: new Date(),
        successful: true, // Only true because we actually sent it above
      },
    });

    revalidatePath("/admin/churn-analysis");
    return { success: true, intervention };
  } catch (error) { ... }
}
```

#### 3. Connect the Orphaned Automation (`src/app/api/internal/cron/churn/route.ts`)

Create a new API route specifically for your cron job scheduler (like Vercel Cron or GitHub Actions) to hit daily. This bridges 17.1 (Scoring) and 17.2 (Intervention).

```typescript
// File: src/app/api/internal/cron/churn/route.ts
import { NextResponse } from "next/server";
import { analyzeAllUsers } from "@/lib/churn/churn-predictor";
import { autoTriggerReEngagement } from "@/lib/churn/re-engagement";

export async function GET(request: Request) {
  // Add a security check here (e.g., matching an authorization header to your cron secret)
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    // 1. Calculate scores for everyone
    const analysisResults = await analyzeAllUsers();

    // 2. Trigger interventions for those newly at risk (respecting the 14-day cooldown)
    const engagementResults = await autoTriggerReEngagement();

    return NextResponse.json({
      success: true,
      analysis: analysisResults,
      engagements: engagementResults,
    });
  } catch (error: any) {
    console.error("[Cron Churn Analyzer Failed]", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
```
