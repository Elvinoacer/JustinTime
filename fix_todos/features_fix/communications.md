Based on the comprehensive audit of the newly provided codebase files for the **Communication & Calls (Section 7)** features, there are several critical architectural gaps, UI/UX disconnects, and data flow breaks.

Here is the comprehensive plan to fix the UI and data flows for the Communication features:

### 7.1 In-App Messaging

**Identified Issues:**

1. **Broken Real-Time Data Flow (The Socket Void):** `POST /api/messages/send` saves the message to PostgreSQL and sends an email notification, but **it never notifies the Socket.io server**. Because Next.js API routes are serverless, they don't hold socket connections. Currently, a user will only see a new message if they refresh the page or if the client polling catches it.
2. **Missing Real-Time Read Receipts:** `GET /api/messages/history/[otherUserId]` marks messages as read asynchronously in the DB/route.ts], but does not emit a "messages_read" socket event, meaning the sender's UI won't update to show the blue double-check (`done_all`) until they refresh.
3. **Ghost Conversations on Delete:** `ChatWindow.tsx` has a UI menu to "Clear Chat", but the API route `/api/messages/clear/[otherUserId]` isn't actively updating the local state or invalidating the React Query cache in `ConversationsList.tsx`, leading to "ghost" conversations that reappear until hard reload.

**Fix Plan:**

1. **Implement Server-to-Socket Pub/Sub:** Update `POST /api/messages/send` to make an internal HTTP POST request to your standalone Socket.IO server (`https://jit-socket.onrender.com/internal/broadcast`) immediately after saving to Prisma. This tells the socket server to emit the `new_message` event to the specific `receiverId` room.
2. **Socket Read Receipts:** Update `/api/messages/history/[otherUserId]/route.ts` to similarly ping the socket server to emit a `messages_read` event to the `otherUserId`, allowing the UI to instantly update the message ticks.
3. **Optimistic UI Updates:** In `ChatWindow.tsx`, wrap the `onClearConversation` handler in an optimistic UI update that instantly filters out the conversation from the sidebar while the API request processes in the background.

### 7.2 Calls (In-App VoIP vs. Secure Proxy)

**Identified Issues:**

1. **UX/System Conflict (VoIP vs PSTN):** There is a massive disconnect in how calls are handled. The `ChatWindow.tsx` has Phone/Video icons that trigger `toggleCall` (which implies an in-app WebRTC overlay). Meanwhile, `SecureCallButton.tsx` generates a Virtual Phone Number and Access Code for a traditional GSM phone call (PSTN). Users will be entirely confused about whether they are calling over data/WiFi or cellular.
2. **Mocked Proxy Logic:** The `initiateSecureCall` server action hardcodes a fake virtual number (`+254 20 255 1289`). If deployed, the "Secure Call" button will generate fake extensions that go nowhere.
3. **Zombie Call States:** The `logCallStatus` action updates calls to `ONGOING`, but if a user closes their browser tab mid-call, the WebRTC connection drops without ever calling `logCallStatus(..., 'ENDED')`. This leaves zombie "Ongoing" calls in the DB history permanently.

**Fix Plan:**

1. **Unified Call UX Labeling:** Explicitly label the buttons in `ChatWindow.tsx` as "In-App Audio" and "In-App Video" (Requires internet). Ensure the `SecureCallButton.tsx` (used in the booking context) is explicitly labeled "Cellular Secure Line (No Internet Required)".
2. **Integrate Africa's Talking / Twilio:** Replace the mock proxy logic in `actions/communication.ts` with a real API call to Africa's Talking Voice API or Twilio to dynamically provision the masked session routing.
3. **Implement Call Heartbeats:** Update `CallOverlay.tsx` to ping a new heartbeat endpoint every 30 seconds during an active call. Create a background cron job (or use a service like Inngest/Trigger.dev) to sweep the `Call` table and automatically mark any `ONGOING` calls as `ENDED` if their last heartbeat was over 2 minutes ago.

### 7.3 WhatsApp Integration

**Identified Issues:**

1. **Webhook Timeout Risk:** In `POST /api/webhooks/whatsapp/route.ts`, the code awaits `parseIncomingMessage({ from, body: msgBody })` _before_ returning the 200 OK response to Meta. If `parseIncomingMessage` involves fetching user DB records, calling the n8n language switch API, or making an OpenAI call to figure out intent, it can easily take more than 3 seconds. Meta will assume the webhook failed, timeout, and aggressively retry, causing the user to receive duplicate automated replies.
2. **Missing File Support:** The webhook parser only extracts `message.text?.body`. If a user replies to the WhatsApp bot with an image of a broken pipe for a plumbing job, the system silently drops it because it doesn't check `message.image` or `message.document`.

**Fix Plan:**

1. **Decouple Webhook Processing:** Meta requires a 200 OK almost instantly. Since Vercel Serverless functions freeze background promises when a response is returned, use Vercel's `waitUntil()` wrapper (or a queue like Upstash Redis/QStash) to offload `parseIncomingMessage` into the background, allowing the API to return the 200 OK to Meta within 500ms.
2. **Support WhatsApp Media:** Update the webhook payload extraction to check for `message.type === 'image'` and extract the `imageId`. Then, ping the WhatsApp Graph API to download the media, upload it to your Cloudinary/S3 bucket, and pipe that resulting URL into your internal messaging engine so it appears natively in the in-app `ChatWindow.tsx`.

Now this is more than serious, address this complete and careful

I audited the uploaded codebase for the full **Communication & Calls** surface. The feature exists, but it is fragmented. The main problem is not one isolated bug. It is that the system mixes:

- optimistic client-side chat state,
- partially persisted backend state,
- socket-only ephemeral state,
- two duplicated message pages,
- two different call paradigms,
- and partially wired safety/WhatsApp flows.

That combination is what creates the broken UI flow and broken data flow.

## Overall diagnosis

The communication stack is currently split into **four different layers that are not fully aligned**:

1. **REST-backed chat persistence**
   - `/api/messages/conversations`
   - `/api/messages/history/[otherUserId]`
   - `/api/messages/send`
   - `/api/messages/contacts`
   - `/api/messages/[messageId]`
   - `/api/messages/clear/[otherUserId]`

2. **Socket.IO real-time layer**
   - `server.js`
   - `src/lib/socket.ts`
   - message events, typing, online status, call signaling

3. **UI surfaces**
   - `src/app/dashboard/messages/page.tsx`
   - `src/app/client/messages/page.tsx`
   - `src/components/client/messages/*`

4. **Calls / proxy / reporting / omnichannel**
   - `src/components/communication/*`
   - `src/app/actions/calls.ts`
   - `src/app/actions/communication.ts`
   - `src/app/actions/reporting.ts`
   - WhatsApp + n8n routes

The broken flow comes from those four layers behaving like separate products instead of one communication system.

---

# 1) In-App Messaging: confirmed broken flows

## 1.1 Deep-link entry into messages is inconsistent and broken

### Confirmed issue

Different parts of the app use different query params for the same action:

- `partnerId` is what the messages pages actually read
- some pages use `recipient`
- email notification uses `conversation`

Examples:

- `src/app/client/messages/page.tsx` reads `partnerId`
- `src/app/services/[id]/ServiceDetailClient.tsx` links to `/client/messages?recipient=...`
- `src/app/api/messages/send/route.ts` email button links to `/dashboard/messages?conversation=...`

### Result

A user clicks “Message” or “Reply now” and lands on the messages page without the intended conversation selected. That is a direct UI-flow break.

### Fix

Standardize all deep links to one contract:

- `?partnerId=<id>&partnerName=<name>&partnerImage=<url>`

Then update all entry points across jobs, services, proposals, notifications, and email templates.

---

## 1.2 New conversation modal has a dead API dependency

### Confirmed issue

`src/components/client/messages/NewConversationModal.tsx` calls:

- `/messages/recent-contacts`

There is no matching route in `src/app/api/messages/...`.

### Result

The modal opens, tries to show recent contacts, and fails silently except for console noise. That weakens the “start new conversation” flow.

### Fix

Implement:

- `GET /api/messages/recent-contacts`

Recommended behavior:

- return the last 5–10 distinct conversation partners,
- ordered by latest message timestamp,
- scoped to authenticated user,
- include `id`, `name`, `image`, `role`, `phone`.

---

## 1.3 Client and provider message pages are duplicated and drifted

### Confirmed issue

These two pages are almost the same but not actually equivalent:

- `src/app/client/messages/page.tsx`
- `src/app/dashboard/messages/page.tsx`

The provider dashboard page has more socket lifecycle handling and delivery/read receipt logic.
The client page is missing some of that.

### Result

The same feature behaves differently depending on whether the user is on provider or client side. That creates hard-to-debug state drift.

### Fix

Replace both page implementations with:

- one shared hook, for example `useMessagingController`
- one shared screen component, for example `MessagesWorkspace`
- thin route wrappers only for layout and role-specific nav

This is a top-priority refactor because right now every future bug fix will be duplicated.

---

## 1.4 Message send flow uses optimistic socket IDs that do not match DB IDs

### Confirmed issue

On send, the UI creates a temporary ID from `Date.now()` and immediately emits a socket event before the database creates the real message ID.

- client page does not fully reconcile temp IDs with real DB IDs
- dashboard page tries harder, but still depends on dedupe heuristics

### Result

You can get:

- duplicate messages,
- inconsistent read/delivered indicators,
- different IDs between sender and receiver views,
- race conditions when message deletion or receipts happen.

### Fix

The send flow should become:

1. create message in backend first
2. backend returns canonical message object with real ID
3. backend emits or triggers socket event with that canonical payload
4. clients reconcile by real `message.id`

Do not use client-generated fake IDs as the primary event identity.

Best pattern:

- REST write is source of truth
- socket is distribution channel, not identity generator

---

## 1.5 Delivery and read receipts are not persisted

### Confirmed issue

The schema has:

- `isRead`
- `isDelivered`

But:

- `isDelivered` is not updated in Prisma anywhere
- `message_read` and `message_delivered` are socket-only
- read status is updated in history fetch, but no matching read event is consistently persisted and fanned out
- client page lacks the richer receipt listeners present in dashboard page

### Result

Receipt state is unreliable and session-local. Refreshing can lose truth, and the two sides can disagree.

### Fix

Add proper receipt endpoints or server-side socket handlers that persist status:

- `markDelivered(messageIds[])`
- `markRead(conversationPartnerId or messageIds[])`

Recommended schema improvement:

- replace booleans with timestamps:
  - `deliveredAt`
  - `readAt`

That gives better auditability and cleaner UI logic.

---

## 1.6 Conversation listing is computed inefficiently and unreliably

### Confirmed issue

`/api/messages/conversations` fetches all messages for the user, sorts them descending, then groups in memory with a `Map`.

### Result

Problems:

- poor scalability,
- conversation list becomes expensive over time,
- no pagination,
- harder to guarantee correctness,
- unread count logic depends on raw message scan every time.

### Fix

Move to an explicit conversation model.

Recommended schema:

- `Conversation`
- `ConversationParticipant`
- `Message`

Store on conversation:

- `lastMessageId`
- `lastMessageAt`
- `lastMessagePreview`
- unread counters per participant

Without a real conversation entity, chat will remain fragile.

---

## 1.7 “Clear chat” is dangerously wrong

### Confirmed issue

`/api/messages/clear/[otherUserId]` deletes **all messages between two users** from the database and deletes attached files from storage too.

### Result

This is not “clear my view”.
This is a global destructive delete for both parties.

That is a major data-flow bug and a serious product bug.

### Fix

Replace with one of these models:

Option A:

- `ConversationParticipantState.clearedBeforeAt`

Option B:

- per-user soft-hide flags on messages/conversation

Do **not** globally delete shared conversation history when one side clicks “clear chat”.

Only admins or retention jobs should permanently purge data.

---

## 1.8 Per-message management is incomplete

### Confirmed issue

The feature list says per-message edit/delete exists, but route `src/app/api/messages/[messageId]/route.ts` only supports delete.

There is no edit implementation.
Schema also lacks edit metadata such as:

- `updatedAt`
- `editedAt`
- `deletedAt`

### Result

The documented feature and actual implementation do not match.

### Fix

Add:

- `PATCH /api/messages/[messageId]`
- edit window rules
- `editedAt`
- maybe `originalContent` only if moderation/legal needs it
- soft delete instead of hard delete

---

## 1.9 Message deletion is hard-delete and not evented

### Confirmed issue

Deleting a message:

- removes it from DB
- may remove uploaded file from storage
- does not broadcast deletion consistently to the peer via socket
- does not preserve tombstone state

### Result

One user can still temporarily see the message until reload, or the conversation can lose structural integrity.

### Fix

Use soft delete:

- `deletedAt`
- `deletedBy`
- maybe replace content with “This message was deleted”

Then emit canonical deletion event to both participants.

---

## 1.10 Typing indicators are only partially wired

### Confirmed issue

Socket server supports:

- `typing`
- `stop_typing`

Pages listen for typing events, but the `ChatWindow` input does not appear to emit typing events.

### Result

Typing UX is inconsistent or dead.

### Fix

Emit debounced typing events from composer:

- on first keystroke: `typing`
- after idle 1.5–2s: `stop_typing`
- on send/blur: `stop_typing`

---

## 1.11 Safety / blocking exists in backend but is not enforced in messaging flow

### Confirmed issue

`src/app/actions/reporting.ts` has:

- `blockUser`
- `unblockUser`
- `isUserBlocked`

But message send/history/contact search routes do not enforce block rules.

### Result

A blocked user may still be able to:

- appear in contact search
- message
- call
- remain in active conversation UI

### Fix

Enforce block checks in:

- `/api/messages/send`
- `/api/messages/history/[otherUserId]`
- `/api/messages/contacts`
- call initiation
- WhatsApp bridging where applicable

Also add block/unblock controls to UI.

---

## 1.12 “End-to-end protected” banner is misleading

### Confirmed issue

`MessageSecurityBanner` says messages and calls are protected and nobody outside chat can read/listen.

But the implementation is:

- Prisma-stored messages in plain app backend flow
- Socket signaling through a separate server
- no actual end-to-end messaging encryption model shown
- no verified key exchange architecture for chat
- calls are WebRTC peer media, but signaling and trust model are not presented as audited E2EE

### Result

This is a trust and product copy problem.

### Fix

Change copy immediately to something truthful, such as:

- “Messages are protected by your account security and platform safeguards”
- “Calls use peer-to-peer media when supported”

Do not claim E2EE unless you truly implemented and audited it.

---

# 2) Calls: confirmed broken flows

## 2.1 There are two separate call systems that conflict

### Confirmed issue

You currently have:

1. **Direct real-time audio/video calls from chat**
   - `toggleCall(...)`
   - `CallOverlay`
   - WebRTC + Socket.IO signaling

2. **Secure masked call initiation**
   - `initiateSecureCall(bookingId)`
   - `ProxySession`
   - `SecureCallButton`

### Result

The product concept is split:

- chat page allows direct person-to-person calling
- bookings page exposes masked proxy calling

That creates a policy contradiction:
if privacy/masked communication matters, direct chat calls bypass that model.

### Fix

You need one call policy.

Recommended:

- **Pre-booking / general chat:** in-app WebRTC only, no phone numbers exposed
- **Booking-linked voice fallback:** masked proxy session only
- never expose real phone numbers in chat header or call flow unless explicitly intended

Also hide partner phone numbers from messaging UI if masked communication is the product goal.

---

## 2.2 Secure proxy call initiation lacks authorization checks

### Confirmed issue

`src/app/actions/communication.ts` takes only `bookingId`, then looks up/creates a `ProxySession`.

I did not see membership validation proving the current user belongs to that booking.

### Result

A user could potentially request a proxy session for a booking they should not access.

### Fix

Before creating/fetching proxy session:

- load booking
- verify session user is client or assigned provider for that booking
- verify booking status allows communication
- verify communication window is open

This should be mandatory.

---

## 2.3 Call lifecycle logging is incomplete

### Confirmed issue

Schema supports:

- `INITIATED`
- `ONGOING`
- `MISSED`
- `ACCEPTED`
- `REJECTED`
- `ENDED`

But `src/app/actions/calls.ts` only handles a narrower set and does not persist full lifecycle well.
`CallOverlay` logs start and later `ONGOING` or `ENDED`, but:

- no proper `ACCEPTED`
- no true missed-call record
- no duration persistence on end
- rejected/incoming rejection handling is partial

### Result

Call history is not trustworthy enough for support, analytics, or safety review.

### Fix

Define a strict state machine:

- INITIATED
- RINGING
- ACCEPTED
- ONGOING
- ENDED
- REJECTED
- MISSED
- FAILED

Persist:

- `initiatedAt`
- `answeredAt`
- `endedAt`
- `endedReason`
- `durationSeconds`

And update states on both caller and callee actions.

---

## 2.4 Call history UI depends on incomplete data

### Confirmed issue

`CallHistoryDrawer` derives meaning from imperfect call records and even computes duration client-side if missing.

### Result

History can mislabel incoming/outgoing state or duration.

### Fix

Return a fully shaped DTO from backend:

- direction
- display status
- durationSeconds
- partner summary
- startedAt / endedAt
- endedReason

The UI should render a stable API contract, not reconstruct call semantics.

---

## 2.5 Socket signaling is unauthenticated and weak for multi-tab/multi-device

### Confirmed issue

In `server.js`:

- `join(userId)` trusts the client-supplied userId
- no socket auth middleware tying socket to real session
- `onlineUsers` is a `Map<userId, socketId>` so only one socket per user is tracked

### Result

Problems:

- spoofable presence room join
- multi-tab sessions overwrite each other
- online/offline status becomes wrong
- messages/calls may route unpredictably across devices

### Fix

Upgrade socket server:

- authenticate sockets with signed token/session validation
- map `userId -> Set<socketId>`
- on disconnect, only mark offline when the user has no more active sockets
- use per-user room plus per-socket tracking

This is a top-tier infrastructure fix.

---

## 2.6 Calls are not policy-scoped to allowed relationships

### Confirmed issue

The chat window can trigger direct calls to any selected partner. I did not find a server-side authorization rule that restricts calling based on booking/job/accepted proposal/etc.

### Result

Users may be able to call any discoverable contact without business-context validation.

### Fix

Introduce communication permissions:

- allowed if there is a booking,
- or accepted proposal,
- or intentional open messaging rule,
- and block state must be checked.

---

# 3) WhatsApp integration: confirmed broken flows

## 3.1 The webhook is very narrow and not production-complete

### Confirmed issue

`/api/webhooks/whatsapp`:

- validates signature
- parses only a very narrow event shape
- only handles the first message in first entry/change
- only handles text body
- does not visibly process statuses, delivery receipts, interactive replies, media, template events

### Result

Real WhatsApp traffic will quickly outrun this parser.

### Fix

Refactor webhook into:

- payload validator
- event normalizer
- event processor

Support:

- multiple entries/changes/messages
- message statuses
- interactive/button replies
- media payloads
- retries/idempotency

Store inbound webhook events for replay/debugging.

---

## 3.2 WhatsApp service is mostly a mock, not a real communication subsystem

### Confirmed issue

`src/lib/whatsapp-service.ts` is effectively mock logic:

- console logging send
- simplistic text matching
- no conversation state machine
- no persisted conversation context
- no booking confirmation orchestration
- no structured error handling

### Result

This is a prototype, not a production integration.

### Fix

Create actual WhatsApp orchestration components:

- `WhatsAppConversation`
- `WhatsAppMessage`
- `WhatsAppSessionState`
- intent/state handling
- provider/client lookup strategy
- fallback escalation to in-app chat or support

---

## 3.3 WhatsApp and in-app messaging are not unified

### Confirmed issue

WhatsApp messages are handled in isolation. They do not appear to flow into the same conversation model as in-app messages.

### Result

You will end up with channel silos:

- app messages in one place
- WhatsApp contacts in another
- no unified thread history
- no omnichannel continuity

### Fix

Design a channel-aware conversation model:

- `Conversation`
- `ConversationParticipant`
- `Message`
- `channel` = IN_APP | WHATSAPP | SYSTEM
- `externalMessageId` for Meta mapping

That gives you one conversation system with multiple transports.

---

# 4) Reporting and moderation: partially built, partially broken

## 4.1 Report model exists, modal exists, but moderation flow is incomplete

### Confirmed issue

You have:

- `MessageReport` model
- `reportUser(...)` action
- `ReportUserModal`

But I did not see a full moderation workflow tied to communication review:

- no admin queue surfaced here,
- no message-level evidence pipeline,
- no auto-link to conversation snapshot,
- no enforcement cascade.

### Result

Reporting exists, but it is not fully operational as a safety system.

### Fix

Build full moderation loop:

- admin review queue
- evidence snapshot
- linked participant profiles
- action outcomes: warn, restrict, block, suspend
- audit trail

---

## 4.2 Reporting is user-level, not strongly message-level

### Confirmed issue

`messageId` is optional and not obviously passed from chat UI.

### Result

Trust & safety review may lack precise evidence.

### Fix

Add “Report message” from message bubble menu, not only “Report user” from chat header.

---

# 5) Architecture problems behind the broken flow

## 5.1 No real conversation domain model

This is the biggest structural issue.

Everything is being inferred from raw messages. That works early, then collapses under:

- unread counts,
- clear chat,
- mute/archive,
- channel unification,
- moderation,
- pinning,
- search,
- recent contacts,
- last message previews.

### Fix

Add:

- `Conversation`
- `ConversationParticipant`
- `ConversationParticipantState`
- `Message`

This one move will simplify most current bugs.

---

## 5.2 No canonical messaging service layer

Routes and pages are doing too much assembly themselves.

### Fix

Create:

- `src/lib/messaging/service.ts`
- `src/lib/messaging/realtime.ts`
- `src/lib/messaging/policies.ts`
- `src/lib/messaging/dto.ts`

All routes and UI should consume the same contracts.

---

## 5.3 Real-time events are treated as truth instead of synchronization

This is causing race conditions.

### Fix

Adopt rule:

- database state is truth
- socket events are notifications of state change
- clients refetch or reconcile against canonical payloads

---

# Full fix plan

## Phase 1 — Stop the obvious broken UX

Do these first.

1. Unify deep-link params to `partnerId`
2. Fix all links from services, jobs, proposals, notifications, email templates
3. Implement `/api/messages/recent-contacts`
4. Make client and dashboard messages use the same shared controller
5. Remove misleading “end-to-end protected” wording
6. Hide raw partner phone numbers in chat header if masked communication is intended

## Phase 2 — Stabilize message persistence

1. Change send flow so backend creates canonical message before realtime fanout
2. Add real receipt persistence:
   - `deliveredAt`
   - `readAt`

3. Add `PATCH /api/messages/[messageId]` for edit
4. Replace hard delete with soft delete:
   - `deletedAt`
   - `deletedBy`

5. Replace “clear chat” global delete with per-user clear state

## Phase 3 — Introduce real conversation architecture

1. Add Prisma models:
   - `Conversation`
   - `ConversationParticipant`
   - `ConversationParticipantState`

2. Migrate raw message pairing to conversation IDs
3. Store unread counts and last message summary per participant
4. Update contacts, recent contacts, and conversation listing to use this model
5. Add archive/mute/pin capability cleanly

## Phase 4 — Fix calls end to end

1. Decide single communication policy:
   - in-app call
   - masked proxy call
   - when each is allowed

2. Add booking/job/relationship authorization on call initiation
3. Upgrade call state machine and persist full lifecycle
4. Secure socket auth
5. Support multi-tab presence using `Map<userId, Set<socketId>>`
6. Make call history read from canonical backend DTO

## Phase 5 — Safety and moderation enforcement

1. Enforce blocked-user checks in all messaging/calling routes
2. Add block/unblock UI
3. Add report-message action on individual messages
4. Build moderation queue and admin actions
5. Add evidence snapshotting

## Phase 6 — WhatsApp and omnichannel

1. Replace mock WhatsApp service with real service abstraction
2. Normalize webhook processing
3. Store inbound/outbound channel events
4. Unify WhatsApp and in-app messages into conversation model
5. Add idempotency and replay-safe processing
6. Add observability and delivery tracing

---

# Recommended schema changes

For messaging:

- `Conversation`
- `ConversationParticipant`
- `ConversationParticipantState`
- `Message.conversationId`
- `Message.editedAt`
- `Message.deletedAt`
- `Message.deletedBy`
- `Message.deliveredAt`
- `Message.readAt`
- `Message.replyToMessageId` optionally
- `Message.channel`
- `Message.externalMessageId` optionally

For calls:

- `Call.initiatedAt`
- `Call.answeredAt`
- `Call.endedAt`
- `Call.endedReason`
- `Call.durationSeconds`
- `Call.relatedConversationId` or `relatedBookingId`
- `Call.proxySessionId` optionally

For WhatsApp:

- `WhatsAppEventLog`
- `Conversation.channel`
- `Message.externalProvider`

---

# Concrete file-level refactor targets

## Messaging

- `src/app/client/messages/page.tsx`
- `src/app/dashboard/messages/page.tsx`
- `src/components/client/messages/ChatWindow.tsx`
- `src/components/client/messages/ConversationsList.tsx`
- `src/components/client/messages/NewConversationModal.tsx`
- `src/app/api/messages/*`
- `server.js`

## Calls

- `src/components/communication/CallOverlay.tsx`
- `src/components/communication/VideoCallInterface.tsx`
- `src/components/communication/SecureCallButton.tsx`
- `src/components/communication/CallHistoryDrawer.tsx`
- `src/app/actions/calls.ts`
- `src/app/actions/communication.ts`

## Safety

- `src/app/actions/reporting.ts`
- `src/components/communication/ReportUserModal.tsx`
- message and call authorization routes/actions

## WhatsApp / n8n

- `src/app/api/webhooks/whatsapp/route.ts`
- `src/lib/whatsapp-service.ts`
- `src/app/api/integrations/n8n/language-switch/route.ts`

---

# Priority order I would use

1. **Fix deep-link params + recent contacts route + shared messages controller**
2. **Fix send/reconcile/read/delivered flow**
3. **Replace destructive clear-chat and hard delete behavior**
4. **Add conversation model**
5. **Secure and normalize call system**
6. **Enforce block/report/moderation**
7. **Rebuild WhatsApp into true omnichannel integration**

---

# Bottom line

The biggest root causes are these:

- no canonical conversation model,
- duplicated message pages,
- socket events not aligned with persisted state,
- destructive chat clearing,
- inconsistent deep-link contract,
- split call policy,
- safety and WhatsApp flows only partially wired.

If you fix only the UI, the bugs will come back.
If you fix only the backend, the UX will still feel broken.

This feature needs a **full communication-domain refactor**, not small patches.
