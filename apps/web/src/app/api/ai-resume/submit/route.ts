import { verifyToken } from "@/lib/utils/jwt";
import { NextRequest, NextResponse } from 'next/server';
import { aiResumeN8nBridge } from '@/lib/services/AiResumeN8nBridge';

export async function POST(request: NextRequest) {
    try {
        console.log('🔍 AI Resume Submit API called');

        // Authenticate user
        const authHeader = request.headers.get("authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json(
                { success: false, error: "No valid authorization token" },
                { status: 401 }
            );
        }
        const token = authHeader.substring(7);
        const decoded = verifyToken(token);

        // Only workers and admins can submit AI resume generation
        if (decoded.role !== 'WORKER' && decoded.role !== 'ADMIN') {
            return NextResponse.json(
                { success: false, error: 'Insufficient permissions' },
                { status: 403 }
            );
        }

        // Parse request body
        const body = await request.json();
        console.log('📋 Request body:', body);

        const {
            client_id,
            job_id,
            job_title,
            company_name,
            company_website,
            description_snippet,
            resume
        } = body;

        // Validate required fields
        if (!client_id || !job_id || !job_title || !company_name || !description_snippet || !resume?.id || !resume?.file_url) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields' },
                { status: 400 }
            );
        }

        try {
            console.log('🚀 Starting resume generation via n8n bridge...');

            // Create resume generation record and forward to n8n
            const result = await aiResumeN8nBridge.startResumeGeneration({
                client_id,
                worker_id: decoded.userId,
                job_id,
                job_title,
                company_name,
                company_website,
                description_snippet,
                resume
            });

            console.log('✅ Resume generation started successfully:', result);

            return NextResponse.json({
                success: true,
                data: {
                    resume_id: result.resume_id,
                    message: 'AI resume generation submitted and forwarded to n8n'
                }
            });
        } catch (e) {
            const message = e instanceof Error ? e.message : 'Unknown error';
            // Duplicate handling
            if (message.toLowerCase().includes('already exists')) {
                return NextResponse.json({ success: false, error: message }, { status: 409 });
            }
            console.error('AI resume submit error:', e);
            return NextResponse.json({ success: false, error: message }, { status: 500 });
        }

    } catch (error) {
        console.error('Error in AI resume submit API:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
