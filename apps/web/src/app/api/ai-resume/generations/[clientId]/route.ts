import { verifyToken } from "@/lib/utils/jwt";
import { NextRequest, NextResponse } from 'next/server';
import { aiResumeService } from '@/lib/services/AiResumeService';

export async function GET(
    request: NextRequest,
    { params }: { params: { clientId: string } }
) {
    try {
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
        const { clientId } = params;

        // Get query parameters
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');

        // Check permissions
        if (decoded.role === 'CLIENT' && decoded.userId !== clientId) {
            return NextResponse.json(
                { success: false, error: 'Access denied' },
                { status: 403 }
            );
        }

        // Get resume generations for client
        const resumeGenerations = await aiResumeService.getClientResumeGenerations(
            clientId,
            status || undefined
        );

        return NextResponse.json({
            success: true,
            data: {
                resume_generations: resumeGenerations,
                count: resumeGenerations.length
            }
        });

    } catch (error) {
        console.error('Error getting client resume generations:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
