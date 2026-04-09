# Daraja Reconciliation Cron Runbook

This runbook documents the two internal Daraja maintenance endpoints:

1. Webhook receipt worker (queue consumer)
2. Stale pending reconciler (provider recheck fallback)

## Required Environment Variables

```env
# Required to enable queue + cron authentication
DARAJA_RECONCILE_CRON_SECRET=your_long_random_secret

# Required if callback token validation is enabled
DARAJA_CALLBACK_TOKEN=your_callback_token
DARAJA_ENFORCE_CALLBACK_TOKEN=true

# Optional callback hardening
DARAJA_CALLBACK_PATH_SECRET=optional_secret_path_segment
DARAJA_ENFORCE_CALLBACK_IP=false
DARAJA_CALLBACK_IP_WHITELIST=
```

## 1) Webhook Receipt Worker

Endpoint:

- GET /api/internal/cron/process-daraja-webhook-receipts
- POST /api/internal/cron/process-daraja-webhook-receipts

Query parameters:

- batchSize: integer, min 1, max 200, default 25

Auth:

- x-cron-secret: DARAJA_RECONCILE_CRON_SECRET
- or Authorization: Bearer <DARAJA_RECONCILE_CRON_SECRET>
- or authenticated ADMIN session

What it does:

1. Reads queued Daraja webhook receipts.
2. Claims each receipt atomically.
3. Replays payload into the appropriate internal webhook handler (wallet/onboarding/subscription).
4. Marks retryable failures back to queue.

Success response shape:

```json
{
  "success": true,
  "batchSize": 25,
  "scanned": 25,
  "claimed": 23,
  "processed": 21,
  "retryQueued": 1,
  "failedNonRetryable": 1,
  "remainingPending": 9,
  "failures": [
    {
      "id": "pwr_xxx",
      "kind": "WALLET_TOPUP",
      "status": 500,
      "retryable": true,
      "detail": "..."
    }
  ]
}
```

Error cases:

- 400 when DARAJA_RECONCILE_CRON_SECRET is missing.
- 401 when request is not secret-authorized and no ADMIN session is present.
- 500 for unexpected server errors.

Recommended schedule:

- Dedicated scheduler: every 30 seconds (high reliability) or every 60 seconds (lower load)
- GitHub Actions scheduler: every 5 minutes (GitHub scheduled workflows are not suitable for sub-minute cadence)

## 2) Stale Pending Reconciler

Endpoint:

- GET /api/internal/cron/reconcile-daraja-payments
- POST /api/internal/cron/reconcile-daraja-payments

Query parameters:

- staleMinutes: integer, min 2, max 240, default 5

Auth:

- x-cron-secret: DARAJA_RECONCILE_CRON_SECRET
- or Authorization: Bearer <DARAJA_RECONCILE_CRON_SECRET>
- or authenticated ADMIN session

What it does:

1. Scans stale pending/processing records in wallet topups, onboarding fees, and subscriptions.
2. Calls Daraja STK query by checkoutRequestId.
3. For terminal/settled states, sends synthetic internal webhook payloads for normal business handling.

Success response shape:

```json
{
  "success": true,
  "staleMinutes": 5,
  "staleBefore": "2026-04-09T10:00:00.000Z",
  "results": {
    "wallet": { "scanned": 4, "forwarded": 2, "errors": 0 },
    "onboarding": { "scanned": 1, "forwarded": 1, "errors": 0 },
    "subscription": { "scanned": 2, "forwarded": 0, "errors": 1 }
  },
  "summary": {
    "scanned": 7,
    "forwarded": 3,
    "errors": 1
  }
}
```

Recommended schedule:

- Dedicated scheduler: every 2 to 5 minutes
- GitHub Actions scheduler: every 5 minutes

## Suggested Production Cadence

1. process-daraja-webhook-receipts every 30 to 60 seconds on a dedicated scheduler (or every 5 minutes with GitHub Actions)
2. reconcile-daraja-payments every 3 minutes on a dedicated scheduler (or every 5 minutes with GitHub Actions)

This combination gives near-real-time processing plus self-healing for missed callbacks.

## GitHub Actions Automation (Included)

This repository includes two scheduled workflows:

1. .github/workflows/daraja-webhook-receipts-cron.yml
2. .github/workflows/daraja-stale-reconciliation-cron.yml

Required repository secrets:

- DARAJA_WEBHOOK_RECEIPTS_PROCESS_URL
  - Example: https://your-domain/api/internal/cron/process-daraja-webhook-receipts
- DARAJA_RECONCILE_PAYMENTS_URL
  - Example: https://your-domain/api/internal/cron/reconcile-daraja-payments
- DARAJA_RECONCILE_CRON_SECRET
  - Must match the app runtime value used by the cron endpoints

The workflows support manual runs via workflow_dispatch with these optional inputs:

- batchSize for webhook receipt processing
- staleMinutes for stale pending reconciliation

## cURL Examples

Webhook receipt worker:

```bash
curl -sS "https://your-domain/api/internal/cron/process-daraja-webhook-receipts?batchSize=25" \
  -H "x-cron-secret: $DARAJA_RECONCILE_CRON_SECRET"
```

Stale pending reconciler:

```bash
curl -sS "https://your-domain/api/internal/cron/reconcile-daraja-payments?staleMinutes=5" \
  -H "x-cron-secret: $DARAJA_RECONCILE_CRON_SECRET"
```
