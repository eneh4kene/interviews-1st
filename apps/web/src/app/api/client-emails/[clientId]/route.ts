import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/utils/jwt';
import { clientDomainService } from '@/lib/services/ClientDomainService';

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

        // Only workers and admins can access client emails
        if (decoded.role !== 'WORKER' && decoded.role !== 'ADMIN') {
            return NextResponse.json(
                { success: false, error: 'Insufficient permissions' },
                { status: 403 }
            );
        }

        const { clientId } = params;

        // Get client's sender email
        const senderEmail = await clientDomainService.getSenderEmail(clientId);

        return NextResponse.json({
            success: true,
            data: {
                from_email: senderEmail
            }
        });

    } catch (error) {
        console.error('Error getting client sender email:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to get client sender email' },
            { status: 500 }
        );
    }
}