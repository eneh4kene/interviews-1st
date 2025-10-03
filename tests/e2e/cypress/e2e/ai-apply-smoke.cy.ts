/// <reference types="cypress" />

describe('AI Apply Smoke (UI-assisted API flow)', () => {
    it('logs in, submits AI apply via API, and simulates n8n callbacks', () => {
        const clientId = Cypress.env('CLIENT_ID');
        const resumeId = Cypress.env('RESUME_ID');
        const resumeUrl = Cypress.env('RESUME_URL');
        const n8nSecret = Cypress.env('N8N_WEBHOOK_SECRET');

        // 1) Login as worker and get JWT
        cy.loginAsWorker().then((token) => {
            // 2) Submit AI Apply
            cy.request({
                method: 'POST',
                url: '/api/ai-apply/submit',
                headers: { Authorization: `Bearer ${token}` },
                body: {
                    client_id: clientId,
                    job_id: 'job-123',
                    job_title: 'Software Engineer',
                    company_name: 'Test Corp',
                    company_website: 'https://test.corp',
                    description_snippet: 'Great opportunity',
                    resume: { id: resumeId, file_url: resumeUrl, name: 'resume.pdf' },
                    wait_for_approval: true
                }
            }).then((res) => {
                expect(res.status).to.eq(200);
                expect(res.body.success).to.be.true;
                const applicationId = res.body.data.application_id as string;

                // 3) Simulate n8n success callback
                cy.request({
                    method: 'POST',
                    url: '/api/n8n/ai-apply',
                    headers: { 'x-webhook-secret': n8nSecret },
                    body: {
                        status: 'success',
                        ai_application_id: applicationId,
                        client_id: clientId,
                        job_id: 'job-123',
                        ai_generated_content: {
                            email_subject: 'Application for Software Engineer',
                            email_body: 'Dear Hiring Manager...',
                            resume_content: { summary: '...' }
                        },
                        discovery: {
                            primary_email: 'hr@testcorp.com',
                            confidence_score: 0.95,
                            alternative_emails: ['talent@testcorp.com']
                        }
                    }
                }).then((cbRes) => {
                    expect(cbRes.status).to.eq(200);
                    expect(cbRes.body.ok).to.be.true;
                });

                // 4) Simulate n8n error callback (to exercise error path)
                cy.request({
                    method: 'POST',
                    url: '/api/n8n/ai-apply',
                    headers: { 'x-webhook-secret': n8nSecret },
                    body: {
                        status: 'error',
                        ai_application_id: applicationId,
                        error: { code: 'AI_GENERATION_FAILED', message: 'Failed to generate content' }
                    }
                }).then((errRes) => {
                    expect(errRes.status).to.eq(200);
                    expect(errRes.body.ok).to.be.true;
                });
            });
        });
    });
});


