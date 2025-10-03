AI Apply + n8n Regression Suite
================================

Contents
- `ai-apply.postman_collection.json` — Postman regression tests (auth → submit → n8n callbacks)
- `env.local.postman_environment.json` — Example environment variables

Prereqs
- App running locally on `http://localhost:3000`
- Valid seed data for `client_id` and `resume_id` (update env accordingly)
- `N8N_WEBHOOK_SECRET` set in app and environment file

Run with Postman
1) Import the collection and environment
2) Set `base_url`, `client_id`, `resume_id`, `n8n_webhook_secret`
3) Run collection in Postman Runner

Run in CI with Newman
```bash
npx newman run tests/regression/ai-apply.postman_collection.json \
  -e tests/regression/env.local.postman_environment.json \
  --reporters cli,junit --reporter-junit-export reports/ai-apply-junit.xml
```

Notes
- The login step uses worker test creds: worker1@interview-me.com / password@worker1
- The n8n callback requests simulate n8n responses to exercise persistence paths


