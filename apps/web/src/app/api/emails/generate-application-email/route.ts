import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/utils/jwt';
import { emailService } from '@/lib/services/emailService';
import { ApiResponse } from '@interview-me/types';

// Generate application email
export async function POST(request: NextRequest) {
    try {
        // Authentication
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

        const body = await request.json();
        const { clientId, companyName, jobTitle } = body;

        if (!clientId || !companyName || !jobTitle) {
            return NextResponse.json({
                success: false,
                error: 'Client ID, company name, and job title are required'
            }, { status: 400 });
        }

        const proxyEmail = await emailService.generateApplicationEmail(clientId, companyName, jobTitle);

        const response: ApiResponse = {
            success: true,
            data: { proxyEmail }
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Error generating application email:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to generate application email'
        }, { status: 500 });
    }
}
