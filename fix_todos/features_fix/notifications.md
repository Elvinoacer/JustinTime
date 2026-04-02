Based on the audit of the **Notifications & Alerts (Section 8)** files, the core CRUD infrastructure (fetching, marking as read, deleting) and the Firebase Cloud Messaging (FCM) backend integration are present.

However, there are critical data flow breaks regarding real-time synchronization, a major missing piece in the FCM foreground lifecycle, and a complete absence of user consent management (preferences).

Here is the comprehensive analysis and fix plan for the Notifications system:

### 8.1 Foreground Notification Void (FCM Architecture Gap)

**Identified Issue:**

- **Swallowed Foreground Notifications:** The `sendNotificationToUser` dispatcher successfully sends push notifications via Firebase Admin. However, standard FCM behavior dictates that if the web app is currently open and in focus (foreground), the browser _will not_ display a native system push notification. Instead, it expects the app to intercept it via `onMessage`.
- There is no `onMessage` listener implemented anywhere in the frontend. Consequently, if a user is actively looking at the app, incoming real-time notifications are completely swallowed and hidden.

**Fix Plan:**

1. **Create a Foreground Listener:** Implement a global `<ForegroundNotificationListener />` component that mounts at the root `layout.tsx`.
2. **Handle `onMessage`:** Inside this component, initialize the Firebase messaging instance and listen to `onMessage`.
3. **Trigger UI Updates:** When a message is received in the foreground, it should:
   - Trigger a `toast.info()` with the notification title and body.
   - Dispatch a custom window event or React context update to force `useNotificationCounts.ts` to re-fetch immediately, rather than waiting for its 45-second polling interval.

### 8.2 Notifications Page State Stagnation

**Identified Issue:**

- **Dead Data on Mount:** In `dashboard/notifications/page.tsx` (which is also used by the Client workspace), notifications are fetched exactly once when the component mounts using a basic `useEffect`.
- If a user leaves this tab open, the page will never update. Even if the global polling hook (`useNotificationCounts.ts`) detects a new notification and updates the red counter badge in the navbar, the actual list on the page will remain entirely stale until the user manually hard-refreshes the browser.

**Fix Plan:**

1. **Migrate to React Query:** Replace the raw `useEffect` fetch in `dashboard/notifications/page.tsx` with `@tanstack/react-query` (which is already used in the project, e.g., in `useBookings.ts`).
2. **Enable Refetch-on-Focus:** React Query will automatically refetch the notification list whenever the user switches back to the tab.
3. **Sync with Foreground Listener:** Invalidate the `['notifications']` query cache whenever the new `ForegroundNotificationListener` intercepts a push notification.

### 8.3 The Missing Feature: User Preferences & Consent

**Identified Issue:**

- **All-or-Nothing Notification Blasting:** The `sendNotificationToUser` function loops through all stored tokens and blasts the notification. There is no system to check if the user actually _wants_ to receive that specific type of notification.
- Sending promotional/marketing pushes without a granular opt-out mechanism is a violation of typical app store policies and user trust. Users currently cannot mute specific noisy channels (like "System" updates) while keeping critical ones (like "Messages" or "Bookings") active.

**Fix Plan:**

1. **Data Model Update:** Add a `NotificationPreferences` JSON column to the `User` Prisma model (or a related table) storing booleans for `allowMarketing`, `allowMessages`, `allowBookingUpdates`.
2. **Preference Settings UI:** Create a `/dashboard/settings/notifications` page with toggle switches for these categories.
3. **Dispatcher Guard Check:** Update `dispatcher.ts` to fetch the user's preferences before sending. If the `payload.type` (e.g., PROMO) maps to a disabled preference, exit early and do not execute `admin.messaging().sendEach()`.

### 8.4 Token Lifecycle & Security Flaw

**Identified Issue:**

- **Token Accumulation:** `POST /api/notifications/store-token` correctly upserts the FCM token. The `dispatcher.ts` script cleans up tokens that Google reports as "unregistered".
- However, there is no endpoint to actively delete a token when a user **logs out**. If a user logs out of their account on a shared computer, the `UserToken` remains tied to their ID in the database. The system will continue sending their private push notifications to that shared browser session.

**Fix Plan:**

1. **Create Revocation Endpoint:** Add a `DELETE /api/notifications/store-token` endpoint that accepts the current FCM token and deletes it from the database.
2. **Hook into Logout:** Intercept the NextAuth `signOut()` flow in the frontend. Before clearing the session, retrieve the current FCM token from the browser and send it to the new `DELETE` endpoint to sever the push notification connection.

Based on a deeper architectural review of the Notification system files provided, I have identified several more critical flaws that go beyond real-time updates and FCM integration. These flaws affect performance at scale, user experience, and data integrity.

Here are the additional broken flows and missing features for **Notifications & Alerts (Section 8)**:

### 8.5 The "Data Tsunami" (Missing Pagination)

**Identified Issue:**

- **Crash Risk at Scale:** In `GET /api/notifications`, the Prisma query fetches notifications using `findMany({ where: { userId: session.user.id }, orderBy: { createdAt: "desc" } })`. **There is no `take` or `skip` parameter.** \* If an active provider accumulates 5,000 notifications over a year, the API will attempt to load all 5,000 records into memory, serialize them, and send a massive JSON payload to the client on every page load, which will eventually crash the server or the user's browser.

**Fix Plan:**

1. **API Pagination:** Update `GET /api/notifications` to accept `cursor` or `page` and `limit` query parameters. Default the limit to 50.
2. **Infinite Scroll UI:** In `dashboard/notifications/page.tsx`, implement an Infinite Scroll mechanism (using `react-intersection-observer` or React Query's `useInfiniteQuery`) to load older notifications only when the user scrolls to the bottom of the list.

### 8.6 Dead-End Notifications (Missing Deep Linking)

**Identified Issue:**

- **Un-actionable Alerts:** In the UI (`dashboard/notifications/page.tsx`), notifications are rendered beautifully with icons and colors, but **they are not clickable**.
- If a user receives a notification saying "New Job Request from John", clicking the notification does absolutely nothing. They have to manually navigate to the Jobs tab and hunt for John's request. This completely defeats the purpose of an operational alert system.

**Fix Plan:**

1. **Expand Data Model:** Ensure the `Notification` model includes an `actionUrl` or `entityReference` string field.
2. **Update Dispatchers:** When creating a notification (e.g., in `adminNotifications.ts`), include the relevant URL (e.g., `/dashboard/jobs/[id]`).
3. **Wrap UI in Link:** In `dashboard/notifications/page.tsx`, wrap the notification card content in a `<Link href={notification.actionUrl}>` component so users are routed directly to the context of the alert.

### 8.7 Network Storm Risk (Multi-Tab Polling Inefficiency)

**Identified Issue:**

- **DDoS-ing Your Own Server:** The `useNotificationCounts.ts` hook initiates a `setInterval` that performs a raw `fetch` to `/api/notifications?counts=true` every 45 seconds.
- If a provider keeps 5 browser tabs open (e.g., Dashboard, Messages, Jobs, Settings, Calendar), that single browser will hit the database 5 times every 45 seconds just for counts. Scale this to 1,000 active users, and you have unnecessary database thrashing.

**Fix Plan:**

1. **Switch to SWR or React Query:** These libraries automatically deduplicate requests occurring in the same tick.
2. **Cross-Tab Synchronization:** Use the browser's `BroadcastChannel` API or React Query's `syncStoragePersister` so that only one "Leader" tab performs the polling, and it broadcasts the updated unread count to all other open tabs locally.
3. **Socket Integration (Best):** Completely remove the 45-second polling interval and rely entirely on the Socket.io server (identified in Section 7) to push count increments to the client.

### 8.8 Destructive Deletion (Loss of Audit Trails)

**Identified Issue:**

- **Hard Deletes on Financial/Dispute Alerts:** The `DELETE /api/notifications` and `DELETE /api/notifications/[id]` routes use `prisma.notification.deleteMany` and `delete`/route.ts]. This permanently wipes the records from the database.
- Notifications are often tied to financial events ("Escrow Released", "Dispute Opened"). If a bad actor deletes their notifications, customer support loses the audit trail of whether the user was actually notified about a critical account event.

**Fix Plan:**

1. **Implement Soft Deletes:** Add a `deletedAt` `DateTime?` column to the `Notification` Prisma model.
2. **Modify API:** Change the `DELETE` routes to execute `PATCH` requests under the hood, setting `deletedAt: new Date()`.
3. **Modify Queries:** Update the `GET /api/notifications` route to only fetch where `deletedAt: null`. This hides them from the user but preserves them for admin/system audits.

### 8.9 Fragmented Dual-Write Failure State

**Identified Issue:**

- **Desynchronized DB and FCM:** In `dispatcher.ts`, a comment notes: `// NOTE: We don't create notification in database here anymore since adminNotifications.ts already creates it`.
- Because writing to the database and sending the FCM push are decoupled and not part of a transactional Outbox pattern, one can easily fail while the other succeeds. If the DB write succeeds but the network call to Google FCM fails (timeout, rate limit), the user gets a phantom unread badge in the app but no push notification on their lock screen.

**Fix Plan:**

1. **Implement the Transactional Outbox Pattern:** When an event happens, write the Notification to the DB with a status of `DELIVERY_PENDING`.
2. **Background Processor:** Use a background queue (like BullMQ or Inngest) that watches for `DELIVERY_PENDING` notifications, attempts to send them via `dispatcher.ts`, and updates the status to `DELIVERED_TO_FCM` upon success. This ensures guaranteed delivery with automatic retries if Google's FCM servers are down.

## BEST OVERALL TO LOOK AND FIX

I audited the **Notifications & Alerts** feature across the uploaded codebase. The feature exists, but it has several broken UI/data flows and a few critical missing parts that matter a lot for a production marketplace.

## Overall diagnosis

The notification system is currently split across:

- persisted DB notifications,
- FCM push delivery,
- optional email delivery,
- polling-based unread counts,
- two notification pages,
- and an admin debug endpoint.

That is fine in principle, but the current implementation has a few important mismatches:

- **notification data is too shallow** for meaningful navigation,
- **push delivery and notification center are not synchronized in real time**,
- **workspace routing is hardcoded incorrectly for some users**,
- **unread badges do not stay in sync**,
- **token lifecycle is incomplete**,
- and **the admin debug endpoint is too dangerous for a GET route**.

So the feature is partially implemented, but not complete enough for a critical core system.

---

# 1) Confirmed broken UI and data flows

## 1.1 Push notification click target is wrong for client users

### Confirmed issue

In the main notification sender, push payloads always include:

- `url: "/dashboard/notifications"`

That is the provider workspace route.

### Result

If the recipient is a **client**, the push notification can open the **wrong workspace path**. That is a direct broken flow.

### Fix

Notification delivery must be role-aware.

Use something like:

- provider → `/dashboard/notifications`
- client → `/client/notifications`

Better still, do not hardcode the notification-center route at all. Build the final target from the actual notification context:

- message → messages thread
- booking → booking detail
- proposal → proposal/job detail
- review → review-related surface
- fallback → role-correct notification center

---

## 1.2 Notifications have no action target, so users cannot continue the flow

### Confirmed issue

The `Notification` model only stores:

- `id`
- `userId`
- `title`
- `message`
- `type`
- `isRead`
- `createdAt`

There is no:

- action URL,
- related entity ID,
- booking ID,
- job ID,
- proposal ID,
- message thread reference,
- actor info,
- image/icon payload,
- CTA metadata.

### Result

The notification page can only show a text card. It cannot deep-link the user to the thing that triggered the alert.

That is a major UX gap. Notifications are supposed to be entry points into action, not just logs.

### Fix

Extend the notification domain model with fields like:

- `actionUrl`
- `entityType`
- `entityId`
- `actorId`
- `actorName`
- `actorImage`
- `metadata` JSON
- optionally `priority`

Then make each card clickable.

This is one of the most critical missing implementations in the whole feature.

---

## 1.3 Notification pages do not update in real time

### Confirmed issue

The notification pages fetch once on mount with `/api/notifications`.
There is no:

- socket subscription,
- SSE,
- polling loop on the page itself,
- invalidation strategy,
- foreground insertion of new notifications into the list.

The unread-count hook polls every 45 seconds, but the full notification page does not.

### Result

A user can receive a push or trigger an in-app action, but the notification center itself will stay stale until refresh or remount.

That feels broken.

### Fix

Choose one of these:

- realtime via Socket.IO/SSE,
- short polling on the notifications page,
- or centralized client cache invalidation with React Query/SWR.

At minimum:

- notification pages should refresh periodically,
- counts and lists should share the same data source and invalidation events.

---

## 1.4 Badge state and notification page state are not synchronized immediately

### Confirmed issue

The notification pages update local state when:

- marking one as read,
- marking all as read,
- deleting,
- clearing all.

But sidebar/header unread indicators are sourced separately through `useNotificationCounts()`, which refreshes:

- on mount,
- on `refreshSignal` changes,
- every 45 seconds.

The page actions do not explicitly trigger that shared count refresh.

### Result

A user can mark all read in the notifications page and still see stale unread badges elsewhere for a while.

That is a broken cross-surface state flow.

### Fix

Centralize notifications state.

Best approach:

- use a shared store or query cache,
- mutate both list and counts from the same source,
- invalidate counts immediately after any read/delete action.

---

## 1.5 Header notification indicator is misleading

### Confirmed issue

The header bell shows a green dot for authenticated users, but it is not tied to actual unread notification count.

### Result

The header suggests unread notifications even when there may be none.

That is a UI correctness bug.

### Fix

Drive the header bell from real unread count.
If count is zero, show no dot.
If count > 0, show the real badge.

---

## 1.6 Sidebar notification badge only reflects “application updates,” not all unread notifications

### Confirmed issue

The sidebars use `unreadApplicationUpdatesCount`, not total unread notifications.

### Result

A user may have unread booking, payment, message, or system notifications, but the notifications nav badge can still appear empty.

That is confusing and creates a mismatch between:

- badge state,
- notifications page unread filter,
- and user expectation.

### Fix

Decide the product intent:

If the nav badge means **all unread notifications**, use `unreadCount`.

If you intentionally want a separate application-updates badge, label it explicitly and do not use it as the general notifications indicator.

For most apps, the notifications nav should show **all unread**.

---

## 1.7 Notification cards are not actionable

### Confirmed issue

The notifications page supports:

- mark as read
- delete
- clear all

But clicking the card does not navigate anywhere.
There is no primary action button like:

- View booking
- Open chat
- Review proposal
- See payment

### Result

The flow stops inside the notification page.

### Fix

Make each card actionable:

- clicking the card opens the relevant resource,
- mark-as-read can happen automatically on open,
- secondary actions remain available in an overflow/menu.

---

## 1.8 Notification read semantics are weak

### Confirmed issue

The per-notification PATCH route only marks a notification as read.
There is no:

- unread toggle,
- read timestamp,
- opened timestamp,
- clicked timestamp,
- archived state.

### Result

You cannot distinguish:

- user opened it,
- user explicitly marked it read,
- user clicked through to destination,
- user dismissed it.

That limits future UX and analytics.

### Fix

Add:

- `readAt`
- optionally `clickedAt`
- optionally `archivedAt`

Use timestamps rather than a single boolean.

---

## 1.9 “Clear all notifications” is permanent hard delete

### Confirmed issue

`DELETE /api/notifications` deletes all user notifications.

### Result

The user loses all notification history instantly.
For a critical product area, this can be too destructive, especially for booking/job/payment context.

### Fix

Replace “clear all” with one of:

- archive all,
- hide all,
- soft delete,
- keep only recent X days visible in inbox but retain audit history.

At minimum, reserve hard delete for:

- old low-value notifications,
- or an explicit settings-level purge flow.

---

## 1.10 Provider and client pages reuse the exact same page component, but notification routing is not role-aware

### Confirmed issue

`/client/notifications` simply imports the provider notifications page component.
That reuse is fine by itself.

The real problem is the system around it:

- push URLs are provider-oriented,
- general notification routing is not workspace-aware,
- there is no role-aware destination handling.

### Result

The two surfaces are visually reused, but the surrounding flow is not fully consistent.

### Fix

Keep the shared UI component, but introduce role-aware route generation and notification action resolution.

---

# 2) FCM token and push delivery problems

## 2.1 No token unregister flow on logout

### Confirmed issue

Tokens are stored through `/api/notifications/store-token`, and invalid tokens are cleaned up only when Firebase rejects them.

But there is no clear token removal flow on:

- logout,
- switching accounts on same device/browser,
- permission revoked,
- token refresh replacement.

### Result

Tokens can remain associated longer than they should.
That can lead to:

- noisy stale-token attempts,
- wrong-user delivery risk in shared-device/account-switch scenarios,
- inconsistent device inventory.

### Fix

Add:

- `DELETE /api/notifications/store-token`
- unregister on logout
- unregister on permission revoke
- replace token when refreshed

This is a critical missing lifecycle feature.

---

## 2.2 Token ownership can silently move between accounts

### Confirmed issue

The store-token route upserts by unique token and overwrites `userId` with the current session user.

### Result

On shared browsers or account switches, the same token may be reassigned to another user. That may be intended in some cases, but without a clear unregister/login policy it becomes risky and hard to reason about.

### Fix

Keep reassignment explicit and auditable:

- unregister old session’s token on logout,
- log token re-binding,
- optionally store device fingerprint/session info,
- optionally confirm token ownership changes.

---

## 2.3 Foreground push handling is incomplete

### Confirmed issue

Foreground `onMessage()` only logs the payload. It does not:

- show a toast,
- insert into notification center,
- refresh unread counts,
- trigger any UI badge update.

### Result

When the app is open, notifications can “arrive” but appear invisible unless the user manually refreshes or waits for polling.

### Fix

On foreground push:

- show toast/banner,
- update shared notifications cache,
- increment unread counts,
- optionally insert the new notification into the list.

---

## 2.4 Service worker lacks click-handling for meaningful navigation

### Confirmed issue

The service worker shows notifications for background messages, but there is no visible click handler logic routing the user to `payload.data.url`.

### Result

Background notifications may display, but clicking them may not reliably take users to the correct in-app destination.

### Fix

Add service-worker notification click handling:

- inspect `event.notification.data`
- open/focus the correct app URL
- support deep links consistently

This is critical for push UX.

---

# 3) Backend/API issues

## 3.1 Notifications listing has no pagination or cursoring

### Confirmed issue

`GET /api/notifications` returns all notifications for the user, ordered by latest first.

### Result

As notification volume grows:

- page load gets heavier,
- payload size grows,
- rendering slows,
- future mobile UX gets worse.

### Fix

Add cursor pagination:

- `limit`
- `cursor`
- maybe filtered fetching by type/read state

This is not the most urgent bug, but it should be added before scale.

---

## 3.2 Counts endpoint and page filtering are tightly coupled to a small hardcoded type list

### Confirmed issue

The “application updates” concept is driven by a hardcoded array:

- `PROPOSAL_STATUS_UPDATE`
- `NEW_PROPOSAL`
- `PROPOSAL`

Both counts and filtering rely on that.

### Result

If future proposal-related types are introduced and not added in both places, badges and pages will disagree.

### Fix

Move notification categories into a proper shared taxonomy:

- either enum-based classification,
- or category field on the notification itself,
- or one centralized mapper function used by all consumers.

---

## 3.3 No deduplication or idempotency guard for notification creation

### Confirmed issue

Notifications are created directly by `sendComprehensiveNotification()` and by other helper functions.
I did not see a generic dedupe or idempotency strategy.

### Result

Repeated retries or duplicated action triggers can create duplicate notifications.

### Fix

For critical events, add idempotency:

- `eventKey`
- `sourceType`
- `sourceId`
- `recipientId`
- uniqueness window or unique compound index where appropriate

---

## 3.4 No notification preference granularity for in-app notifications

### Confirmed issue

Preferences currently focus on:

- email job alerts
- email messages
- email bookings
- email reviews
- email marketing
- push notifications

But DB notifications are always created.

### Result

Users cannot control:

- in-app notification categories,
- mute certain types,
- mute low-priority system noise.

### Fix

Add preferences for:

- in-app messages
- bookings
- proposals
- marketing/system
- push per category
- email per category

---

# 4) Admin debug endpoint issues

## 4.1 Debug endpoint performs side effects on GET

### Confirmed issue

`GET /api/admin/debug-notifications`:

- checks config,
- sends a real test email,
- sends a real push notification if token exists.

### Result

A GET request is causing delivery side effects. That is not safe operational behavior.

Refreshing the page can trigger repeated sends.

### Fix

Split it into:

- `GET` for diagnostics only
- `POST` for explicit test delivery

---

## 4.2 Debug endpoint is too production-dangerous

### Confirmed issue

The endpoint is admin-protected, which is good, but it still acts like a live delivery tool directly in an API route.

### Result

This can be abused accidentally by admins, or create noisy production behavior.

### Fix

Add:

- explicit confirm payload,
- rate limiting,
- audit logging,
- environment gating for certain debug tests,
- optional “dry run” mode

---

# 5) Critical missing implementations relevant to this feature

These are not just nice-to-haves. They are important missing parts for a production-grade notifications system.

## 5.1 No actionable notification deep-link model

This is the biggest missing piece.

Without entity references and URLs, notifications are passive text only.

### Must add

- `entityType`
- `entityId`
- `actionUrl`
- `metadata`

---

## 5.2 No realtime sync between push/in-app and notification center

A notification system should update the UI quickly when a new notification is created.

### Must add

- realtime eventing or fast invalidation,
- foreground notification UI handling,
- shared count/list refresh strategy.

---

## 5.3 No notification click/open tracking

You need to know whether notifications are merely read or actually opened.

### Must add

- `readAt`
- `clickedAt`
- optionally `deliveredAt` for push analytics

---

## 5.4 No token unregister / revoke path

This is critical for correctness and privacy.

### Must add

- token deletion endpoint
- logout cleanup
- permission-revoked cleanup
- refresh-token replacement logic

---

## 5.5 No soft archive/history model

Hard-deleting all notifications is too destructive.

### Must add

- archive/hide behavior
- retention policy
- optional purge job for old records

---

## 5.6 No notification grouping / dedupe / batching

As the platform grows, users will get spammed.

### Must add

- grouping by actor/entity/event
- batched summaries
- dedupe on repeated events

Examples:

- “3 new proposals”
- “2 unread booking updates”
- “5 new messages from 2 conversations”

---

## 5.7 No priority/severity model

Not all notifications should look the same.

### Must add

- priority: low / normal / high / urgent
- render important alerts differently
- optionally pin top-priority alerts

---

## 5.8 No delivery analytics / status tracking

The system sends push/email, but there is no robust delivery state model.

### Must add

For push/email observability:

- attemptedAt
- sentAt
- failedAt
- channel
- provider response metadata
- retry strategy where appropriate

---

# Full fix plan

## Phase 1 — Fix the broken experience immediately

1. Make notification URLs role-aware
2. Remove hardcoded `/dashboard/notifications` from generic delivery
3. Replace header static dot with real unread count
4. Make sidebar notifications badge use total unread count, or clearly separate categories
5. Add immediate count invalidation after mark-read / mark-all / delete / clear-all
6. Add service-worker click routing

---

## Phase 2 — Make notifications actionable

1. Extend `Notification` model with:
   - `actionUrl`
   - `entityType`
   - `entityId`
   - `metadata`
   - `actorId` optionally

2. Make cards clickable
3. Auto-mark-as-read when user opens the destination
4. Map each notification type to a proper target page

---

## Phase 3 — Fix push token lifecycle

1. Add token delete endpoint
2. Unregister token on logout
3. Handle permission revoke
4. Handle token refresh rotation
5. Log token reassignments across accounts/devices

---

## Phase 4 — Realtime and state sync

1. Add shared notification store/query cache
2. On foreground push:
   - toast
   - list insertion
   - count increment

3. Add polling/SSE/socket updates to notification pages
4. Unify list state and counts state under one invalidation mechanism

---

## Phase 5 — Data model hardening

1. Replace `isRead` with `readAt`
2. Add `clickedAt`
3. Add `archivedAt`
4. Add pagination
5. Add dedupe/idempotency fields
6. Add category/priority fields

---

## Phase 6 — Admin/debug hardening

1. Change debug endpoint:
   - GET = diagnostics only
   - POST = explicit send test

2. Add rate limiting
3. Add audit logging
4. Add dry-run support
5. Restrict dangerous tests in production unless explicitly allowed

---

# Recommended schema additions

For `Notification`:

- `readAt DateTime?`
- `clickedAt DateTime?`
- `archivedAt DateTime?`
- `actionUrl String?`
- `entityType String?`
- `entityId String?`
- `actorId String?`
- `metadata Json?`
- `priority String?`
- optionally `sourceKey String?` for dedupe

For push tokens:

- `deviceId String?`
- `lastSeenAt DateTime?`
- `revokedAt DateTime?`
- `userAgent String?` optionally

For delivery logs:

- `NotificationDelivery`
  - notificationId
  - channel (IN_APP, PUSH, EMAIL)
  - status
  - attemptedAt
  - sentAt
  - failedAt
  - providerMessageId
  - error

---

# Bottom line

The notifications feature is **implemented, but not complete**.

The biggest problems are:

- wrong push destination for some users,
- notifications are not actionable,
- counts and pages drift out of sync,
- token lifecycle is incomplete,
- foreground/background delivery UX is incomplete,
- and the debug endpoint is too dangerous.

The most important missing feature is this:

**notifications do not carry the context needed to take the user to the actual thing that happened.**

That is the core reason the feature feels shallow even though many routes already exist.
