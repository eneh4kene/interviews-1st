## n8n integration (AI Apply)

### Environment variables

Add these to your root `.env` (preferred) or `apps/web/.env.local`:

- N8N_BASE_URL=http://localhost:5678
- N8N_AI_APPLY_WEBHOOK_PATH=/webhook/ai-apply
- N8N_WEBHOOK_SECRET=change-me

### App endpoints

- Trigger AI Apply (UI/backend calls): `POST /api/ai-apply/trigger`
- n8n callback (set this as n8n node webhook): `POST /api/n8n/ai-apply`

### Payloads

Request body to trigger:
{
  "client_id": "<uuid>",
  "worker_id": "<uuid>",
  "job_id": "<string>",
  "job_title": "<string>",
  "company_name": "<string>",
  "company_website": "<string>",
  "description_snippet": "<string>",
  "resume": { "id": "<uuid>", "file_url": "<blob-url>", "name": "<filename>" },
  "wait_for_approval": true,
  "worker_notes": "<string>"
}

### Local run (self-hosted n8n)

1. Start n8n docker: `docker run -it --rm -p 5678:5678 n8nio/n8n:latest`
2. Create a Webhook node listening on `POST /webhook/ai-apply`
3. Set Header `X-Webhook-Secret` to `N8N_WEBHOOK_SECRET`
4. Return payload matching success or error schema.

### Behavior: empty recruiter email

If `discovery.primary_email` is empty/missing, the app will still persist generated content and leave `ai_applications.target_email` null for manual completion in the UI.


