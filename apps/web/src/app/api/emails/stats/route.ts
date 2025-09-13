import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/utils/jwt';
import { emailService } from '@/lib/services/emailService';
import { ApiResponse } from '@interview-me/types';

// Get email statistics
export async function GET(request: NextRequest) {
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

        // Only ADMIN and MANAGER can access email stats
        if (decoded.role !== 'ADMIN' && decoded.role !== 'MANAGER') {
            return NextResponse.json({
                success: false,
                error: 'Insufficient permissions'
            }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const period = searchParams.get('period') || '30d';

        const stats = await emailService.getEmailStats(period);

        const response: ApiResponse = {
            success: true,
            data: {
                period,
                ...stats,
                generatedAt: new Date().toISOString()
            }
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Error fetching email stats:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to fetch email statistics'
        }, { status: 500 });
    }
}
