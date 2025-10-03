E2E Tests (Cypress)
===================

Location
- `tests/e2e/cypress/`

Setup
- Install Cypress: `npm i -D cypress`
- Ensure app runs at `http://localhost:3000`
- Optional env overrides: `CYPRESS_BASE_URL`, `CYPRESS_CLIENT_ID`, `CYPRESS_RESUME_ID`, `CYPRESS_N8N_WEBHOOK_SECRET`

Run
```bash
npx cypress run --config-file tests/e2e/cypress/cypress.config.ts
# or open GUI
npx cypress open --config-file tests/e2e/cypress/cypress.config.ts
```

Included spec
- `e2e/ai-apply-smoke.cy.ts`: logs in (API), submits AI Apply, simulates n8n success and error callbacks to exercise persistence paths.


