import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/utils/jwt';
import { clientDomainService } from '@/lib/services/ClientDomainService';
import { ApiResponse } from '@interview-me/types';

// Get client email address
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        // Authentication
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({
                success: false,
                error: 'No valid authorization token'
            }, { status: 401 });
        }

        const token = authHeader.substring(7);
        const decoded = verifyToken(token);

        // Only ADMIN, MANAGER, and WORKER can access client emails
        if (decoded.role !== 'ADMIN' && decoded.role !== 'MANAGER' && decoded.role !== 'WORKER') {
            return NextResponse.json({
                success: false,
                error: 'Insufficient permissions'
            }, { status: 403 });
        }

        const clientId = params.id;
        const senderEmail = await clientDomainService.getSenderEmail(clientId);

        const response: ApiResponse = {
            success: true,
            data: { senderEmail }
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Error getting client email:', error);
        return NextResponse.json({
            success: false,
            error: `Failed to get client email: ${error instanceof Error ? error.message : 'Unknown error'}`
        }, { status: 500 });
    }
}

// Set custom client email address
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        // Authentication
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({
                success: false,
                error: 'No valid authorization token'
            }, { status: 401 });
        }

        const token = authHeader.substring(7);
        const decoded = verifyToken(token);

        // Only ADMIN and MANAGER can set custom emails
        if (decoded.role !== 'ADMIN' && decoded.role !== 'MANAGER') {
            return NextResponse.json({
                success: false,
                error: 'Insufficient permissions'
            }, { status: 403 });
        }

        const clientId = params.id;
        const body = await request.json();
        const { customEmail } = body;

        if (!customEmail || !customEmail.includes('@')) {
            return NextResponse.json({
                success: false,
                error: 'Valid email address is required'
            }, { status: 400 });
        }

        // Update client with custom email
        const { db } = await import('@/lib/utils/database');
        await db.query(`
      UPDATE clients 
      SET sender_email = $1, updated_at = NOW()
      WHERE id = $2
    `, [customEmail, clientId]);

        const response: ApiResponse = {
            success: true,
            data: {
                message: 'Client email address updated successfully',
                senderEmail: customEmail
            }
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Error setting client email:', error);
        return NextResponse.json({
            success: false,
            error: `Failed to set client email: ${error instanceof Error ? error.message : 'Unknown error'}`
        }, { status: 500 });
    }
}

// Reset to auto-generated email
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        // Authentication
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({
                success: false,
                error: 'No valid authorization token'
            }, { status: 401 });
        }

        const token = authHeader.substring(7);
        const decoded = verifyToken(token);

        // Only ADMIN and MANAGER can reset emails
        if (decoded.role !== 'ADMIN' && decoded.role !== 'MANAGER') {
            return NextResponse.json({
                success: false,
                error: 'Insufficient permissions'
            }, { status: 403 });
        }

        const clientId = params.id;

        // Clear custom email to trigger auto-generation
        const { db } = await import('@/lib/utils/database');
        await db.query(`
      UPDATE clients 
      SET sender_email = NULL, updated_at = NOW()
      WHERE id = $1
    `, [clientId]);

        // Get the auto-generated email
        const senderEmail = await clientDomainService.getSenderEmail(clientId);

        const response: ApiResponse = {
            success: true,
            data: {
                message: 'Client email address reset to auto-generated',
                senderEmail
            }
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Error resetting client email:', error);
        return NextResponse.json({
            success: false,
            error: `Failed to reset client email: ${error instanceof Error ? error.message : 'Unknown error'}`
        }, { status: 500 });
    }
}
