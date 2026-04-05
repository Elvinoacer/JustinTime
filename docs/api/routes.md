# JustInTime API Documentation

This document provides a comprehensive list of API routes for the JustInTime platform, categorized by their authentication and authorization requirements.

---

## 🌍 Public Routes (No Authentication Required)

These routes are accessible to anyone visiting the site.

| Endpoint                        | Method | Description                                            |
| :------------------------------ | :----- | :----------------------------------------------------- |
| `/api/categories`               | `GET`  | Fetch all service categories and counts.               |
| `/api/services`                 | `GET`  | List all active services with filtering & geolocation. |
| `/api/services/[id]`            | `GET`  | Get detailed information for a specific service.       |
| `/api/professionals`            | `GET`  | List all service providers with stats and skills.      |
| `/api/professionals/[id]`       | `GET`  | Get public profile details of a professional.          |
| `/api/jobs`                     | `GET`  | List all public job postings.                          |
| `/api/jobs/[id]`                | `GET`  | Get details of a specific job posting.                 |
| `/api/contact`                  | `POST` | Submit a contact form request.                         |
| `/api/newsletter/subscribe`     | `POST` | Subscribe to the platform newsletter.                  |
| `/api/auth/signup`              | `POST` | Register a new user account.                           |
| `/api/auth/verify-email`        | `GET`  | Verify user email via token.                           |
| `/api/auth/resend-verification` | `POST` | Request a new verification email.                      |
| `/api/auth/forgot-password`     | `POST` | Initiate password recovery.                            |
| `/api/auth/reset-password`      | `POST` | Reset password using recovery token.                   |
| `/api/auth/[...nextauth]`       | `ANY`  | Internal NextAuth.js authentication handlers.          |

---

## 🔐 General Authenticated Routes (Any Role)

Accessible to any logged-in user (Client, Provider, or Admin).

| Endpoint                           | Method         | Description                                       |
| :--------------------------------- | :------------- | :------------------------------------------------ |
| `/api/users/me`                    | `GET`          | Get current user session data.                    |
| `/api/users/onboarding`            | `POST`         | Submit/Update onboarding progress.                |
| `/api/settings`                    | `GET/POST`     | Manage user-specific account settings.            |
| `/api/settings/change-password`    | `POST`         | Update user password.                             |
| `/api/notifications`               | `GET`          | List user notifications.                          |
| `/api/notifications/mark-all-read` | `POST`         | Clear all unread notifications.                   |
| `/api/notifications/[id]`          | `PATCH/DELETE` | Update or remove a specific notification.         |
| `/api/notifications/store-token`   | `POST`         | Save FCM/Push notification tokens.                |
| `/api/messages/conversations`      | `GET`          | List all chat conversations.                      |
| `/api/messages/history/[userId]`   | `GET`          | Fetch message history with a specific user.       |
| `/api/messages/send`               | `POST`         | Send a new chat message.                          |
| `/api/messages/contacts`           | `GET`          | List recent chat contacts.                        |
| `/api/upload`                      | `POST/DELETE`  | Upload or delete files (images, docs) to storage. |
| `/api/upload-pdf`                  | `POST`         | Specific handler for PDF document uploads.        |
| `/api/wallet/balance`              | `GET`          | Check current wallet and credits balance.         |
| `/api/wallet/transactions`         | `GET`          | List financial transaction history.               |
| `/api/badges`                      | `GET`          | View user's gamification badges and progress.     |
| `/api/badges/check`                | `POST`         | Trigger background check for new badge awards.    |
| `/api/support/tickets`             | `GET/POST`     | List or create support helpdesk tickets.          |
| `/api/user/location`               | `POST`         | Update user's current GPS coordinates.            |

---

## 👤 Client & Common Dashboard Routes

Typically used by the Client dashboard. Some routes also permit Providers who act as clients.

| Endpoint                         | Method      | Description                                 |
| :------------------------------- | :---------- | :------------------------------------------ |
| `/api/client/dashboard/stats`    | `GET`       | Get spending and job aggregate stats.       |
| `/api/client/dashboard/activity` | `GET`       | Recent activity feed for the client.        |
| `/api/client/profile`            | `GET/PATCH` | Manage client-specific profile data.        |
| `/api/client/jobs`               | `GET/POST`  | Manage job postings created by the user.    |
| `/api/client/referral`           | `GET`       | Referral system stats and codes.            |
| `/api/client/analytics/overview` | `GET`       | Client spending and usage analytics.        |
| `/api/bookings`                  | `POST`      | Create a new service booking request.       |
| `/api/bookings/route`            | `GET`       | List bookings associated with the user.     |
| `/api/reviews`                   | `POST`      | Leave a review for a completed service.     |
| `/api/jobs/[id]/proposals`       | `GET`       | View proposals received for a specific job. |

---

## 🛠️ Provider Specific Routes

Restricted to users with the `PROVIDER` role.

| Endpoint                           | Method      | Description                                       |
| :--------------------------------- | :---------- | :------------------------------------------------ |
| `/api/provider/stats`              | `GET`       | Provider earnings and job performance stats.      |
| `/api/provider/profile`            | `GET/PATCH` | Manage professional/business profile.             |
| `/api/provider/services`           | `GET/POST`  | Manage services offered by the provider.          |
| `/api/provider/availability`       | `GET/POST`  | Manage working hours and weekly schedule.         |
| `/api/provider/availability/check` | `POST`      | Validate availability for specific time slots.    |
| `/api/provider/availability/month` | `GET`       | Get availability heatmap for a calendar month.    |
| `/api/provider/bookings`           | `GET`       | List incoming service requests.                   |
| `/api/bookings/[id]/accept`        | `POST`      | Confirm a pending booking.                        |
| `/api/bookings/[id]/reject`        | `POST`      | Decline a booking request.                        |
| `/api/proposals`                   | `POST`      | Submit a bid/proposal for a listed job.           |
| `/api/provider/earnings`           | `GET`       | Detailed financial breakdown of earnings.         |
| `/api/provider/earnings/chart`     | `GET`       | Visualization data for earnings growth.           |
| `/api/onboarding-fee/initiate`     | `POST`      | Start payment flow for provider registration fee. |
| `/api/subscription/initiate`       | `POST`      | Upgrade to PRO or BUSINESS plans.                 |

---

## 👑 Admin Routes

Restricted strictly to users with the `ADMIN` role.

| Endpoint                          | Method | Description                                 |
| :-------------------------------- | :----- | :------------------------------------------ |
| `/api/admin/users/[id]/waive-fee` | `POST` | Manually waive the provider onboarding fee. |
| `/api/admin/debug-notifications`  | `POST` | System-wide test for notification delivery. |

---

## ⚓ Webhooks & Systems

Secured via secret tokens or IP whitelisting.

| Endpoint                                     | Method     | Source                 | Description                                                                                                                                                                                                                                                                                                        |
| :------------------------------------------- | :--------- | :--------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/api/wallet/webhook`                        | `POST`     | IntaSend               | Handle automated wallet top-up confirmations.                                                                                                                                                                                                                                                                      |
| `/api/onboarding-fee/webhook`                | `POST`     | IntaSend               | Sync status of provider fee payments.                                                                                                                                                                                                                                                                              |
| `/api/subscription/webhook`                  | `POST`     | IntaSend               | Process recurring subscription renewals.                                                                                                                                                                                                                                                                           |
| `/api/webhooks/whatsapp`                     | `POST`     | WhatsApp/Meta          | Handle incoming WhatsApp interactions.                                                                                                                                                                                                                                                                             |
| `/api/internal/notifications/outbox/process` | `GET/POST` | GitHub Actions / Admin | Process pending notification outbox events. Auth: `Authorization: Bearer <NOTIFICATION_OUTBOX_SECRET>` or header `x-notification-outbox-secret`. Supports `limit`, `notificationId`, and optional `processorId` (query or JSON body). Scheduled twice daily via `.github/workflows/notifications-outbox-cron.yml`. |
| `/api/internal/cron/churn`                   | `GET/POST` | GitHub Actions / Admin | Run churn analysis for all users and trigger automatic re-engagement with cooldown protection. Auth: `Authorization: Bearer <CHURN_CRON_SECRET>` or header `x-cron-secret`. Scheduled daily via `.github/workflows/churn-analysis-cron.yml`.                                                                       |

---

_Last Updated: April 2026_
