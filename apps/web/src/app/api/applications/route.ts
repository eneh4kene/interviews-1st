import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/utils/jwt';
import { db } from '@/lib/utils/database';
import { ApiResponse } from '@interview-me/types';

export async function GET(request: NextRequest) {
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

        const { searchParams } = new URL(request.url);
        const clientId = searchParams.get('clientId');

        if (!clientId) {
            const response: ApiResponse = {
                success: false,
                error: 'Client ID is required',
            };
            return NextResponse.json(response, { status: 400 });
        }

        // Verify user has access to this client
        const { rows: clientRows } = await db.query(`
      SELECT worker_id FROM clients WHERE id = $1
    `, [clientId]);

        if (clientRows.length === 0) {
            const response: ApiResponse = {
                success: false,
                error: 'Client not found',
            };
            return NextResponse.json(response, { status: 404 });
        }

        // Non-admin users can only access their own clients
        if (decoded.role !== 'ADMIN' && clientRows[0].worker_id !== decoded.userId) {
            const response: ApiResponse = {
                success: false,
                error: 'Insufficient permissions',
            };
            return NextResponse.json(response, { status: 403 });
        }

        // Get applications for the client
        const { rows } = await db.query(`
      SELECT 
        id,
        client_id as "clientId",
        job_title as "jobTitle",
        company_name as "companyName",
        application_date as "applicationDate",
        status,
        interview_date as "interviewDate",
        notes,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM applications 
      WHERE client_id = $1
      ORDER BY created_at DESC
    `, [clientId]);

        const response: ApiResponse = {
            success: true,
            data: rows,
            message: 'Applications retrieved successfully',
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Get applications error:', error);
        const response: ApiResponse = {
            success: false,
            error: 'Failed to retrieve applications',
        };
        return NextResponse.json(response, { status: 500 });
    }
}

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

        const body = await request.json();
        const { clientId, jobTitle, companyName, applicationDate, status, interviewDate, notes } = body;

        if (!clientId) {
            const response: ApiResponse = {
                success: false,
                error: 'Client ID is required',
            };
            return NextResponse.json(response, { status: 400 });
        }

        // Verify user has access to this client
        const { rows: clientRows } = await db.query(`
      SELECT worker_id FROM clients WHERE id = $1
    `, [clientId]);

        if (clientRows.length === 0) {
            const response: ApiResponse = {
                success: false,
                error: 'Client not found',
            };
            return NextResponse.json(response, { status: 404 });
        }

        // Non-admin users can only create applications for their own clients
        if (decoded.role !== 'ADMIN' && clientRows[0].worker_id !== decoded.userId) {
            const response: ApiResponse = {
                success: false,
                error: 'Insufficient permissions',
            };
            return NextResponse.json(response, { status: 403 });
        }

        // Create application
        const { rows } = await db.query(`
      INSERT INTO applications (
        client_id,
        job_title,
        company_name,
        application_date,
        status,
        interview_date,
        notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING 
        id,
        client_id as "clientId",
        job_title as "jobTitle",
        company_name as "companyName",
        application_date as "applicationDate",
        status,
        interview_date as "interviewDate",
        notes,
        created_at as "createdAt",
        updated_at as "updatedAt"
    `, [
            clientId,
            jobTitle,
            companyName,
            applicationDate,
            status || 'applied',
            interviewDate,
            notes
        ]);

        const response: ApiResponse = {
            success: true,
            data: rows[0],
            message: 'Application created successfully',
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Create application error:', error);
        const response: ApiResponse = {
            success: false,
            error: 'Failed to create application',
        };
        return NextResponse.json(response, { status: 500 });
    }
}
