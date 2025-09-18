import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/utils/jwt';
import { clientDomainService } from '@/lib/services/ClientDomainService';
import { ApiResponse } from '@interview-me/types';

// Get client domain configuration
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

        // Only ADMIN, MANAGER, and WORKER can access client domains
        if (decoded.role !== 'ADMIN' && decoded.role !== 'MANAGER' && decoded.role !== 'WORKER') {
            return NextResponse.json({
                success: false,
                error: 'Insufficient permissions'
            }, { status: 403 });
        }

        const clientId = params.id;
        const domainConfig = await clientDomainService.getClientDomainConfig(clientId);

        const response: ApiResponse = {
            success: true,
            data: domainConfig
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Error getting client domain config:', error);
        return NextResponse.json({
            success: false,
            error: `Failed to get client domain config: ${error instanceof Error ? error.message : 'Unknown error'}`
        }, { status: 500 });
    }
}

// Set client domain configuration
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

        // Only ADMIN and MANAGER can set client domains
        if (decoded.role !== 'ADMIN' && decoded.role !== 'MANAGER') {
            return NextResponse.json({
                success: false,
                error: 'Insufficient permissions'
            }, { status: 403 });
        }

        const clientId = params.id;
        const body = await request.json();
        const { customDomain, senderEmail } = body;

        if (!customDomain) {
            return NextResponse.json({
                success: false,
                error: 'Custom domain is required'
            }, { status: 400 });
        }

        await clientDomainService.setClientDomain(clientId, customDomain, senderEmail);

        const response: ApiResponse = {
            success: true,
            data: { message: 'Client domain configuration updated successfully' }
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Error setting client domain:', error);
        return NextResponse.json({
            success: false,
            error: `Failed to set client domain: ${error instanceof Error ? error.message : 'Unknown error'}`
        }, { status: 500 });
    }
}

// Verify client domain
export async function PUT(
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

        // Only ADMIN and MANAGER can verify domains
        if (decoded.role !== 'ADMIN' && decoded.role !== 'MANAGER') {
            return NextResponse.json({
                success: false,
                error: 'Insufficient permissions'
            }, { status: 403 });
        }

        const clientId = params.id;
        const isVerified = await clientDomainService.verifyClientDomain(clientId);

        const response: ApiResponse = {
            success: true,
            data: {
                verified: isVerified,
                message: isVerified ? 'Domain verified successfully' : 'Domain verification failed'
            }
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Error verifying client domain:', error);
        return NextResponse.json({
            success: false,
            error: `Failed to verify client domain: ${error instanceof Error ? error.message : 'Unknown error'}`
        }, { status: 500 });
    }
}

// Delete client domain configuration
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

        // Only ADMIN and MANAGER can delete domains
        if (decoded.role !== 'ADMIN' && decoded.role !== 'MANAGER') {
            return NextResponse.json({
                success: false,
                error: 'Insufficient permissions'
            }, { status: 403 });
        }

        const clientId = params.id;
        await clientDomainService.deleteClientDomain(clientId);

        const response: ApiResponse = {
            success: true,
            data: { message: 'Client domain configuration deleted successfully' }
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Error deleting client domain:', error);
        return NextResponse.json({
            success: false,
            error: `Failed to delete client domain: ${error instanceof Error ? error.message : 'Unknown error'}`
        }, { status: 500 });
    }
}
