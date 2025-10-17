import { NextRequest, NextResponse } from 'next/server';
import { n8nService } from '@/lib/services/N8nService';

export async function GET(request: NextRequest) {
    try {
        console.log('🧪 Testing AI Resume n8n service...');

        // Test payload similar to what would be sent
        const testPayload = {
            resume_id: 'test-resume-123',
            client_id: 'test-client-456',
            client_name: 'Test Client',
            sender_email: 'test@example.com',
            worker_id: 'test-worker-789',
            resume: {
                id: 'resume-123',
                file_url: 'https://example.com/resume.pdf',
                name: 'Test Resume.pdf'
            },
            job_id: 'job-123',
            job_title: 'Test Job Title',
            company_name: 'Test Company',
            company_website: 'https://testcompany.com',
            description_snippet: 'This is a test job description for resume generation.'
        };

        console.log('📤 Sending test payload to n8n...');
        const response = await n8nService.sendAiResume(testPayload);

        console.log('📡 n8n response:', response.status, response.statusText);

        return NextResponse.json({
            success: true,
            message: 'Test completed',
            n8n_status: response.status,
            n8n_statusText: response.statusText,
            payload_sent: testPayload
        });

    } catch (error) {
        console.error('❌ Test failed:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        }, { status: 500 });
    }
}
