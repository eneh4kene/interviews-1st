import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/utils/jwt';
import { ClientAssignmentService } from '@/lib/services/clientAssignment';
import { ApiResponse } from '@interview-me/types';

export async function POST(request: NextRequest) {
    try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            const response: ApiResponse = {
                success: false,
                error: 'No valid authorization token',
            };
            return NextResponse.json(response, { status: 401 });
        }

        const token = authHeader.substring(7);
        const decoded = verifyToken(token);

        // Allow both ADMIN and WORKER roles to auto-assign clients
        if (decoded.role !== 'ADMIN' && decoded.role !== 'WORKER') {
            const response: ApiResponse = {
                success: false,
                error: 'Insufficient permissions',
            };
            return NextResponse.json(response, { status: 403 });
        }

        const body = await request.json();
        const { name, email, phone, location, linkedinUrl, company, position } = body;

        if (!name || !email) {
            const response: ApiResponse = {
                success: false,
                error: 'Name and email are required',
            };
            return NextResponse.json(response, { status: 400 });
        }

        // Use the ClientAssignmentService to auto-assign the client
        const assignmentService = new ClientAssignmentService();
        const result = await assignmentService.autoAssignClient({
            name,
            email,
            phone: phone || null,
            linkedinUrl: linkedinUrl || null,
            status: 'active',
            paymentStatus: 'pending',
            totalInterviews: 0,
            totalPaid: 0
        });

        if (!result.success) {
            const response: ApiResponse = {
                success: false,
                error: result.error || 'Failed to auto-assign client',
            };
            return NextResponse.json(response, { status: 400 });
        }

        const response: ApiResponse = {
            success: true,
            data: { clientId: result.clientId },
            message: 'Client auto-assigned successfully',
        };

        return NextResponse.json(response, { status: 201 });
    } catch (error) {
        console.error('Auto-assign client error:', error);
        const response: ApiResponse = {
            success: false,
            error: 'Failed to auto-assign client',
        };
        return NextResponse.json(response, { status: 500 });
    }
}
