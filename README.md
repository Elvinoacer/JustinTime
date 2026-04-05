This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Rate Limit Configuration

Auth/API rate limits now support environment-based tuning.

Auth limiter (route and server-action limiter in `src/lib/auth/rate-limit.ts`):

- `AUTH_RATE_LIMIT_LIMIT_MULTIPLIER` (default: `1`)
- `AUTH_RATE_LIMIT_WINDOW_MULTIPLIER` (default: `1`)
- `AUTH_RATE_LIMIT_LOG_BLOCKED` (default: `true`)

Proxy API limiter (in `src/proxy.ts`):

- `PROXY_RATE_LIMIT_LOG_BLOCKED` (default: `true`)
- `PROXY_RATE_LIMIT_LIMIT_MULTIPLIER` (default: `1`)
- `PROXY_RATE_LIMIT_WINDOW_MULTIPLIER` (default: `1`)
- `PROXY_RATE_LIMIT_API_GLOBAL_LIMIT` (default: `300`)
- `PROXY_RATE_LIMIT_API_GLOBAL_WINDOW_MS` (default: `300000`)
- `PROXY_RATE_LIMIT_AUTH_VERIFY_CREDENTIALS_LIMIT` (default: `25`)
- `PROXY_RATE_LIMIT_AUTH_VERIFY_CREDENTIALS_WINDOW_MS` (default: `900000`)
- `PROXY_RATE_LIMIT_AUTH_SIGNUP_LIMIT` (default: `12`)
- `PROXY_RATE_LIMIT_AUTH_SIGNUP_WINDOW_MS` (default: `3600000`)
- `PROXY_RATE_LIMIT_AUTH_RECOVERY_LIMIT` (default: `20`)
- `PROXY_RATE_LIMIT_AUTH_RECOVERY_WINDOW_MS` (default: `900000`)
- `PROXY_RATE_LIMIT_AUTH_GENERIC_LIMIT` (default: `80`)
- `PROXY_RATE_LIMIT_AUTH_GENERIC_WINDOW_MS` (default: `900000`)

## Notification Outbox Processor

Use this endpoint to process pending notification deliveries from an external scheduler:

- Endpoint: `POST /api/internal/notifications/outbox/process`
- Auth header options:
  - `Authorization: Bearer <NOTIFICATION_OUTBOX_SECRET>`
  - `x-notification-outbox-secret: <NOTIFICATION_OUTBOX_SECRET>`
- Optional params (query string or JSON body):
  - `limit` (1-100, default 25)
  - `notificationId` (process one notification)
  - `processorId` (custom processor label for logs)

Required environment variable:

- `NOTIFICATION_OUTBOX_SECRET`: shared secret used by external schedulers and internal processor calls.

GitHub Actions scheduler:

- Workflow file: `.github/workflows/notifications-outbox-cron.yml`
- Schedule: `0 0,12 * * *` (twice daily, UTC)
- Required GitHub repository secrets:
  - `NOTIFICATION_OUTBOX_PROCESS_URL`: full endpoint URL (for example, `https://your-domain/api/internal/notifications/outbox/process`)
  - `NOTIFICATION_OUTBOX_SECRET`: same secret value configured in the app runtime environment

Example:

```bash
curl -X POST "https://<your-domain>/api/internal/notifications/outbox/process?limit=50" \
  -H "Authorization: Bearer ${NOTIFICATION_OUTBOX_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{"processorId":"external-cron"}'
```

## Churn Analysis Cron Processor

Use this endpoint to run churn scoring and automatic re-engagement from an external scheduler:

- Endpoint: `POST /api/internal/cron/churn`
- Auth header options:
  - `Authorization: Bearer <CHURN_CRON_SECRET>`
  - `x-cron-secret: <CHURN_CRON_SECRET>`

Required environment variable:

- `CHURN_CRON_SECRET`: shared secret used by external schedulers and internal cron calls.

GitHub Actions scheduler:

- Workflow file: `.github/workflows/churn-analysis-cron.yml`
- Schedule: `30 1 * * *` (daily, UTC)
- Required GitHub repository secrets:
  - `CHURN_CRON_URL`: full endpoint URL (for example, `https://your-domain/api/internal/cron/churn`)
  - `CHURN_CRON_SECRET`: same secret value configured in the app runtime environment

Example:

```bash
curl -X POST "https://<your-domain>/api/internal/cron/churn" \
  -H "Authorization: Bearer ${CHURN_CRON_SECRET}" \
  -H "x-cron-secret: ${CHURN_CRON_SECRET}"
```
