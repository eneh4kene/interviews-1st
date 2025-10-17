import { n8nService, N8nAiResumeInput } from './N8nService';
import { aiResumeService } from './AiResumeService';
import { db } from '../utils/database';

export class AiResumeN8nBridge {
    /**
     * Creates ai_resume_generation record and forwards to n8n
     */
    async startResumeGeneration(params: {
        client_id: string;
        worker_id: string;
        job_id: string;
        job_title: string;
        company_name: string;
        company_website?: string;
        description_snippet: string;
        resume: { id: string; file_url: string; name: string };
    }): Promise<{ resume_id: string }> {
        console.log('🔧 AiResumeN8nBridge.startResumeGeneration called with params:', params);
        // Create resume generation record
        const resumeData = {
            client_id: params.client_id,
            worker_id: params.worker_id,
            job_id: params.job_id,
            job_title: params.job_title,
            company_name: params.company_name,
            company_website: params.company_website,
            description_snippet: params.description_snippet,
            original_resume_id: params.resume.id,
            original_resume_url: params.resume.file_url
        };

        const result = await aiResumeService.submitResumeGeneration(resumeData);
        console.log('📊 Resume generation record created:', result);

        if (!result.success || !result.resume_id) {
            throw new Error(result.error || 'Failed to create ai_resume_generation');
        }

        // Load client name and sender_email for enrichment
        const clientRow = await db.query(
            'SELECT name, sender_email FROM clients WHERE id = $1',
            [params.client_id]
        );
        const client_name: string | undefined = clientRow.rows[0]?.name;
        const sender_email: string | undefined = clientRow.rows[0]?.sender_email;

        // Forward to n8n
        const payload: N8nAiResumeInput = {
            resume_id: result.resume_id,
            client_id: params.client_id,
            client_name,
            sender_email,
            worker_id: params.worker_id,
            resume: params.resume,
            job_id: params.job_id,
            job_title: params.job_title,
            company_name: params.company_name,
            company_website: params.company_website,
            description_snippet: params.description_snippet
        };

        console.log('📤 Sending payload to n8n:', payload);
        const n8nResponse = await n8nService.sendAiResume(payload);
        console.log('📡 n8n response:', n8nResponse.status, n8nResponse.statusText);

        return { resume_id: result.resume_id };
    }
}

export const aiResumeN8nBridge = new AiResumeN8nBridge();
