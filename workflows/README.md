AI Apply n8n workflows

Files in this directory are JSON exports/imports for n8n workflows and deployment templates. The n8n service itself is hosted separately and not part of this repo.

Files:
- ai-apply.webhook.json: Webhook-based workflow skeleton for local dev
- railway.n8n.toml: Deployment template for Railway CI/CD for n8n-only service (edit to fit your project)

Local dev steps:
1) Start Docker Desktop on macOS
2) Run: docker run -d --name n8n -p 5678:5678 -v n8n_data:/home/node/.n8n -e N8N_USER_MANAGEMENT_DISABLED=true n8nio/n8n:latest
3) Open http://localhost:5678, import ai-apply.webhook.json, set Webhook path to /webhook/ai-apply
4) Test the app trigger at POST /api/ai-apply/trigger



