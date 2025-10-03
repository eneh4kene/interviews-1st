import { defineConfig } from 'cypress';

export default defineConfig({
    e2e: {
        baseUrl: process.env.CYPRESS_BASE_URL || 'http://localhost:3000',
        specPattern: 'e2e/**/*.cy.{js,jsx,ts,tsx}',
        supportFile: 'support/e2e.js',
        viewportWidth: 1280,
        viewportHeight: 800,
        video: false,
        retries: 1,
        env: {
            WORKER_EMAIL: process.env.CYPRESS_WORKER_EMAIL || 'worker1@interview-me.com',
            WORKER_PASSWORD: process.env.CYPRESS_WORKER_PASSWORD || 'password@worker1',
            CLIENT_ID: process.env.CYPRESS_CLIENT_ID || '00000000-0000-0000-0000-000000000001',
            RESUME_ID: process.env.CYPRESS_RESUME_ID || '00000000-0000-0000-0000-000000000002',
            RESUME_URL: process.env.CYPRESS_RESUME_URL || 'https://example.com/resume.pdf',
            N8N_WEBHOOK_SECRET: process.env.CYPRESS_N8N_WEBHOOK_SECRET || 'change-me'
        }
    }
});


