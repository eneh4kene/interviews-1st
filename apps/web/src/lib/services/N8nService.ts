import { db } from '../utils/database';
import dotenv from 'dotenv';
dotenv.config();

type UUID = string;

export interface N8nAiApplyInput {
    ai_application_id: UUID;
    client_id: UUID;
    client_name?: string;
    sender_email?: string;
    worker_id?: UUID;
    resume: {
        id: UUID;
        file_url: string;
        name: string;
    };
    job_id: string;
    job_title: string;
    company_name: string;
    company_website?: string;
    description_snippet: string;
    wait_for_approval?: boolean;
    worker_notes?: string;
}

export interface N8nAiApplySuccessOutput {
    status: 'success';
    ai_application_id: UUID;
    client_id: UUID;
    job_id: string;
    company_name?: string;
    company_website?: string;
    ai_generated_content: {
        email_subject: string;
        email_body: string;
        resume_content: any;
    };
    discovery?: {
        primary_email?: string | null;
        confidence_score?: number;
        alternative_emails?: string[];
    };
    metadata?: Record<string, any>;
}

export interface N8nErrorOutput {
    status: 'error';
    ai_application_id?: UUID;
    client_id?: UUID;
    job_id?: string;
    error: {
        code: string;
        message: string;
        details?: Record<string, any>;
    };
}

// AI Resume Generation Types
export interface N8nAiResumeInput {
    resume_id: UUID;
    client_id: UUID;
    client_name?: string;
    sender_email?: string;
    worker_id?: UUID;
    resume: {
        id: UUID;
        file_url: string;
        name: string;
    };
    job_id: string;
    job_title: string;
    company_name: string;
    company_website?: string;
    description_snippet: string;
}

export interface N8nAiResumeSuccessOutput {
    status: 'success';
    resume_id: UUID;
    client_id: UUID;
    job_id: string;
    generated_resume: {
        resume_url: string;
        filename: string;
        file_size?: number;
    };
    metadata?: Record<string, any>;
}

export interface N8nAiResumeErrorOutput {
    status: 'error';
    resume_id?: UUID;
    client_id?: UUID;
    job_id?: string;
    error: {
        code: string;
        message: string;
        details?: Record<string, any>;
    };
}

export class N8nService {
    private baseUrl: string;
    private applyWebhookPath: string;
    private resumeWebhookPath: string;
    private webhookSecret?: string;

    constructor() {
        this.baseUrl = process.env.N8N_BASE_URL || 'http://localhost:5678';
        // Point to test webhook by default to simplify local dev
        this.applyWebhookPath = process.env.N8N_AI_APPLY_WEBHOOK_PATH || '/webhook-test/ai-apply';
        this.resumeWebhookPath = process.env.N8N_AI_RESUME_WEBHOOK_PATH || '/webhook-test/ai-resume';
        this.webhookSecret = process.env.N8N_WEBHOOK_SECRET;
    }

    private buildUrl(path: string): string {
        const trimmedBase = this.baseUrl.replace(/\/$/, '');
        const ensuredPath = path.startsWith('/') ? path : `/${path}`;
        return `${trimmedBase}${ensuredPath}`;
    }

    async sendAiApply(payload: N8nAiApplyInput): Promise<Response> {
        const url = this.buildUrl(this.applyWebhookPath);

        const headers: Record<string, string> = {
            'Content-Type': 'application/json'
        };

        if (this.webhookSecret) {
            headers['X-Webhook-Secret'] = this.webhookSecret;
        }

        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload)
        });
        if (!response.ok) {
            const text = await response.text().catch(() => '');
            console.warn('n8n sendAiApply non-OK response', { status: response.status, statusText: response.statusText, body: text, url });
        }
        return response;
    }

    async sendAiResume(payload: N8nAiResumeInput): Promise<Response> {
        const url = this.buildUrl(this.resumeWebhookPath);
        console.log('🔗 n8n sendAiResume URL:', url);
        console.log('🔗 n8n sendAiResume payload:', JSON.stringify(payload, null, 2));

        const headers: Record<string, string> = {
            'Content-Type': 'application/json'
        };

        if (this.webhookSecret) {
            headers['X-Webhook-Secret'] = this.webhookSecret;
        }

        console.log('🔗 n8n sendAiResume headers:', headers);

        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload)
        });

        console.log('🔗 n8n sendAiResume response status:', response.status);
        console.log('🔗 n8n sendAiResume response headers:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
            const text = await response.text().catch(() => '');
            console.warn('n8n sendAiResume non-OK response', { status: response.status, statusText: response.statusText, body: text, url });
        }
        return response;
    }

    // Persist results from n8n into ai_applications
    async persistAiApplyResult(body: N8nAiApplySuccessOutput | N8nErrorOutput): Promise<void> {
        if (body.status === 'error') {
            if (body.ai_application_id) {
                await db.query(
                    `UPDATE ai_applications SET status = $1, error_message = $2, updated_at = NOW() WHERE id = $3`,
                    ['failed', `${body.error.code}: ${body.error.message}`, body.ai_application_id]
                );
            }
            return;
        }

        const appId = body.ai_application_id;

        // Update ai_generated_content
        await db.query(
            `UPDATE ai_applications 
             SET ai_generated_content = $1, updated_at = NOW()
             WHERE id = $2`,
            [JSON.stringify(body.ai_generated_content), appId]
        );

        // Map discovery to application fields; allow empty/missing email
        const targetEmail = body.discovery?.primary_email && body.discovery.primary_email.trim() !== ''
            ? body.discovery.primary_email
            : null;
        const confidence = body.discovery?.confidence_score ?? null;
        const alternatives = body.discovery?.alternative_emails ?? null;

        await db.query(
            `UPDATE ai_applications 
             SET target_email = COALESCE($1, target_email), 
                 email_confidence_score = COALESCE($2, email_confidence_score), 
                 alternative_emails = COALESCE($3, alternative_emails),
                 status = 'awaiting_approval',
                 progress = 80,
                 updated_at = NOW()
             WHERE id = $4`,
            [targetEmail, confidence, alternatives, appId]
        );
    }

    // Persist results from n8n into applications table
    async persistAiResumeResult(body: N8nAiResumeSuccessOutput | N8nAiResumeErrorOutput): Promise<void> {
        if (body.status === 'error') {
            if (body.resume_id) {
                await db.query(
                    `UPDATE applications SET resume_generation_status = $1, resume_generation_error = $2, updated_at = NOW() WHERE id = $3`,
                    ['failed', `${body.error.code}: ${body.error.message}`, body.resume_id]
                );
            }
            return;
        }

        const resumeId = body.resume_id;

        // Update with generated resume URL
        await db.query(
            `UPDATE applications 
             SET generated_resume_url = $1, generated_resume_filename = $2, 
                 resume_generation_status = 'completed', resume_generation_progress = 100, updated_at = NOW()
             WHERE id = $3`,
            [body.generated_resume.resume_url, body.generated_resume.filename, resumeId]
        );
    }
}

export const n8nService = new N8nService();


