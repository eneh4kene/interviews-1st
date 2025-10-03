import { n8nService, N8nAiApplyInput } from './N8nService';
import { aiApplyService } from './AiApplyService';
import { db } from '../utils/database';

export class AiApplyN8nBridge {
    /**
     * Creates ai_application, enqueues, and forwards to n8n
     */
    async startAiApply(params: {
        client_id: string;
        worker_id: string;
        job_id: string;
        job_title: string;
        company_name: string;
        company_website?: string;
        description_snippet: string;
        resume: { id: string; file_url: string; name: string };
        wait_for_approval?: boolean;
        worker_notes?: string;
    }): Promise<{ ai_application_id: string }> {
        // Reuse existing service to create and queue the application record
        const submission = {
            client_id: params.client_id,
            worker_id: params.worker_id,
            job_id: params.job_id,
            job_title: params.job_title,
            company_name: params.company_name,
            company_website: params.company_website,
            // Force approval gate to prevent local processing; n8n will drive it
            wait_for_approval: params.wait_for_approval ?? true,
            worker_notes: params.worker_notes
        } as const;

        const result = await aiApplyService.submitApplication(submission);
        if (!result.success || !result.application_id) {
            throw new Error(result.error || 'Failed to create ai_application');
        }

        // Load client name and sender_email for enrichment
        const clientRow = await db.query(
            'SELECT name, sender_email FROM clients WHERE id = $1',
            [params.client_id]
        );
        const client_name: string | undefined = clientRow.rows[0]?.name;
        const sender_email: string | undefined = clientRow.rows[0]?.sender_email;

        // Forward to n8n
        const payload: N8nAiApplyInput = {
            ai_application_id: result.application_id,
            client_id: params.client_id,
            client_name,
            sender_email,
            worker_id: params.worker_id,
            resume: params.resume,
            job_id: params.job_id,
            job_title: params.job_title,
            company_name: params.company_name,
            company_website: params.company_website,
            description_snippet: params.description_snippet,
            wait_for_approval: !!params.wait_for_approval,
            worker_notes: params.worker_notes || undefined
        };

        await n8nService.sendAiApply(payload);

        return { ai_application_id: result.application_id };
    }
}

export const aiApplyN8nBridge = new AiApplyN8nBridge();


