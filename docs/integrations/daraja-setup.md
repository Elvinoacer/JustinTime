# Daraja STK Push Configuration

Use these environment variables for Safaricom Daraja integration.

```env
# Daraja environment: sandbox | live
DARAJA_ENV=sandbox

# OAuth credentials from Safaricom developer portal
DARAJA_CONSUMER_KEY=your_consumer_key
DARAJA_CONSUMER_SECRET=your_consumer_secret

# PayBill/Till credentials
DARAJA_SHORTCODE=174379
DARAJA_PASSKEY=your_daraja_passkey

# Optional, defaults to CustomerPayBillOnline
DARAJA_TRANSACTION_TYPE=CustomerPayBillOnline

# Optional callback hardening
DARAJA_CALLBACK_TOKEN=your_callback_token
DARAJA_ENFORCE_CALLBACK_TOKEN=false

# Optional challenge probe support
DARAJA_WEBHOOK_CHALLENGE=your_webhook_challenge_token

# Base app URL for callback/redirect generation
NEXTAUTH_URL=https://your-domain.example
```

## Callback Endpoints

- `/api/wallet/webhook`
- `/api/onboarding-fee/webhook`
- `/api/subscription/webhook`

## Verification Contract

1. Initiate STK push and persist `apiRef`, expected amount, currency, and source context.
2. Accept webhook and optionally validate callback token/challenge.
3. Verify settlement or terminal state using Daraja STK query API.
4. Compare provider result against expected `apiRef`, amount, and currency.
5. Apply business-side state changes only after verification passes.

## Notes

- Redirect/complete pages are UX only and never authoritative payment proof.
- Keep webhook handlers idempotent with dedupe keys.
- Persist raw provider payload and normalized internal state for audits.
