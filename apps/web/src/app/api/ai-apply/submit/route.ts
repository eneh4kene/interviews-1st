import { verifyToken } from "@/lib/utils/jwt";
// AI Apply Submit API Endpoint
import { NextRequest, NextResponse } from 'next/server';
import { aiApplyN8nBridge } from '@/lib/services/AiApplyN8nBridge';

export async function POST(request: NextRequest) {
    try {
        // Authenticate user
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

        // Only workers and admins can submit AI applications
        if (decoded.role !== 'WORKER' && decoded.role !== 'ADMIN') {
            return NextResponse.json(
                { success: false, error: 'Insufficient permissions' },
                { status: 403 }
            );
        }

        // Parse request body
        const body = await request.json();
        const {
            client_id,
            job_id,
            job_title,
            company_name,
            company_website,
            description_snippet,
            resume,
            wait_for_approval,
            worker_notes
        } = body;

        // Validate required fields
        if (!client_id || !job_id || !job_title || !company_name || !description_snippet || !resume?.id || !resume?.file_url) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields' },
                { status: 400 }
            );
        }

        try {
            // Create application, queue, and forward to n8n
            const result = await aiApplyN8nBridge.startAiApply({
                client_id,
                worker_id: decoded.userId,
                job_id,
                job_title,
                company_name,
                company_website,
                description_snippet,
                resume,
                wait_for_approval: wait_for_approval ?? true,
                worker_notes
            });

            return NextResponse.json({
                success: true,
                data: {
                    application_id: result.ai_application_id,
                    message: 'AI application submitted and forwarded to n8n'
                }
            });
        } catch (e) {
            const message = e instanceof Error ? e.message : 'Unknown error';
            // Duplicate handling
            if (message.toLowerCase().includes('already exists')) {
                return NextResponse.json({ success: false, error: message }, { status: 409 });
            }
            console.error('AI apply submit error:', e);
            return NextResponse.json({ success: false, error: message }, { status: 500 });
        }

    } catch (error) {
        console.error('Error in AI apply submit API:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
