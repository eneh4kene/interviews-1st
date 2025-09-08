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

        // Get job preferences for the client
        const { rows } = await db.query(`
      SELECT 
        id,
        client_id as "clientId",
        title as "jobTitle",
        company as "companyName",
        location,
        salary_min as "salaryMin",
        salary_max as "salaryMax",
        work_type as "jobType",
        visa_sponsorship as "visaSponsorship",
        salary_currency as "salaryCurrency",
        status,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM job_preferences 
      WHERE client_id = $1
      ORDER BY created_at DESC
    `, [clientId]);

        const response: ApiResponse = {
            success: true,
            data: rows,
            message: 'Job preferences retrieved successfully',
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Get job preferences error:', error);
        const response: ApiResponse = {
            success: false,
            error: 'Failed to retrieve job preferences',
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
        const { clientId, jobTitle, companyName, location, salaryMin, salaryMax, jobType, visaSponsorship, salaryCurrency } = body;

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

        // Non-admin users can only create preferences for their own clients
        if (decoded.role !== 'ADMIN' && clientRows[0].worker_id !== decoded.userId) {
            const response: ApiResponse = {
                success: false,
                error: 'Insufficient permissions',
            };
            return NextResponse.json(response, { status: 403 });
        }

        // Create job preference
        const { rows } = await db.query(`
      INSERT INTO job_preferences (
        client_id,
        title,
        company,
        location,
        salary_min,
        salary_max,
        work_type,
        visa_sponsorship,
        salary_currency
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING 
        id,
        client_id as "clientId",
        title as "jobTitle",
        company as "companyName",
        location,
        salary_min as "salaryMin",
        salary_max as "salaryMax",
        work_type as "jobType",
        visa_sponsorship as "visaSponsorship",
        salary_currency as "salaryCurrency",
        status,
        created_at as "createdAt",
        updated_at as "updatedAt"
    `, [
            clientId,
            jobTitle,
            companyName,
            location,
            salaryMin,
            salaryMax,
            jobType,
            visaSponsorship || false,
            salaryCurrency || 'GBP'
        ]);

        const response: ApiResponse = {
            success: true,
            data: rows[0],
            message: 'Job preference created successfully',
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Create job preference error:', error);
        const response: ApiResponse = {
            success: false,
            error: 'Failed to create job preference',
        };
        return NextResponse.json(response, { status: 500 });
    }
}
