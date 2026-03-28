# n8n Language Switch Integration

## Import Template

1. Open n8n and create a new workflow.
2. Import `docs/integrations/n8n-language-switch-workflow.json`.
3. Activate the workflow after configuring credentials.

## Configure JustInTime

Set these environment variables in your app deployment:

- `N8N_LANGUAGE_SWITCH_WEBHOOK_URL`: The n8n production webhook URL (e.g. `https://n8n.example.com/webhook/language-switch`).
- `N8N_LANGUAGE_SWITCH_WEBHOOK_TOKEN`: Optional bearer token checked by your workflow.
- `N8N_LANGUAGE_SWITCH_DEBUG=true`: Optional, enables debug endpoint in production.

## Debug Endpoint

Use:

- `GET /api/integrations/n8n/language-switch/debug`

This endpoint returns:

- n8n webhook configuration status
- total successful/failed forwarding attempts
- recent forwarding attempts

In production, this endpoint is disabled unless `N8N_LANGUAGE_SWITCH_DEBUG=true`.
