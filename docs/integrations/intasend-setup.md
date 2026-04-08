# IntaSend Configuration

# Get your API keys from https://intasend.com/ dashboard

# Publishable Key (starts with ISPubKey*test* for sandbox or ISPubKey*live* for production)

INTASEND_PUBLISHABLE_KEY=ISPubKey_test_xxxxxxxx

# Secret Key (starts with ISSecretKey*test* for sandbox or ISSecretKey*live* for production)

INTASEND_SECRET_KEY=ISSecretKey_test_xxxxxxxx

# Test Mode (true for sandbox, false for production)

INTASEND_TEST_MODE=true

# Optional: enforce webhook signature header validation as hard failure.

# Recommended default is false unless IntaSend support explicitly confirms

# x-intasend-signature behavior for your tenant/account version.

INTASEND_ENFORCE_SIGNATURE=false

# Webhook challenge configured in IntaSend dashboard.

INTASEND_WEBHOOK_CHALLENGE=your_webhook_challenge_token

# Email Configuration (Resend)

# Get your API key from https://resend.com/api-keys

RESEND_API_KEY=re_xxxxxxxx

# Verified sender email in Resend

EMAIL_FROM=support@gtss.software
ADMIN_EMAIL=support@gtss.software # The email address to send from (must be verified in Resend)

## Verification Contract (Server-Side)

1. Create checkout and persist api_ref, expected amount, currency, and business target.
2. Accept webhook and validate challenge.
3. Optionally enforce signature depending on INTASEND_ENFORCE_SIGNATURE.
4. For settlement events, verify with IntaSend invoice status API using invoice_id.
5. Compare provider result against expected api_ref, amount, and currency.
6. Only after successful verification, apply business-side unlock/credit activation.

## Important Notes

- Redirect pages are UX-only and must not grant access by themselves.
- Pending records do not mean paid; only verified terminal provider status should unlock value.
- Persist both raw provider state and normalized internal status for auditability.

## Payment Intent Layer

- `PaymentIntent` is the source-of-truth payment record keyed by `gateway + api_ref`.
- `PaymentWebhookReceipt` stores webhook receipts with a unique `dedupeKey` to prevent replay mutations.
- Wallet top-up flow is wired to this layer (initiate + webhook + verification path).
- Onboarding fee flow is wired to this layer (initiate + webhook + verification path).
- Subscription flow is wired to this layer (initiate + webhook + verification path).

## Applying Database Changes

Run migrations after pulling latest code:

```bash
npx prisma migrate deploy
```

For local development:

```bash
npx prisma migrate dev
```
