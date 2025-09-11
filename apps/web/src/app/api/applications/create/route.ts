import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/utils/jwt';
import { db } from '@/lib/utils/database';
import { ApiResponse } from '@interview-me/types';

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

        const {
            clientId,
            jobId,
            jobTitle,
            companyName,
            companyWebsite,
            applyUrl,
            applicationType,
            resumeId,
            notes
        } = await request.json();

        if (!clientId || !jobTitle || !companyName) {
            const response: ApiResponse = {
                success: false,
                error: 'Client ID, job title, and company name are required',
            };
            return NextResponse.json(response, { status: 400 });
        }

        // Verify user has access to this client
        const { rows: clientRows } = await db.query(
            'SELECT worker_id FROM clients WHERE id = $1',
            [clientId]
        );

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

        // Check for duplicate application if jobId is provided
        if (jobId) {
            const { rows: existingApps } = await db.query(
                'SELECT id FROM applications WHERE client_id = $1 AND job_id = $2',
                [clientId, jobId]
            );

            if (existingApps.length > 0) {
                const response: ApiResponse = {
                    success: false,
                    error: 'Application already exists for this job',
                    data: { isDuplicate: true, existingApplicationId: existingApps[0].id }
                };
                return NextResponse.json(response, { status: 409 });
            }
        }

        // Create new application
        const result = await db.query(
            `INSERT INTO applications (
        client_id, 
        job_id, 
        company_name, 
        job_title, 
        company_website, 
        apply_url, 
        application_type, 
        resume_id, 
        notes, 
        application_date, 
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
            [
                clientId,
                jobId || null,
                companyName,
                jobTitle,
                companyWebsite || null,
                applyUrl || null,
                applicationType || 'manual',
                resumeId || null,
                notes || null,
                new Date(),
                'applied'
            ]
        );

        const newApplication = result.rows[0];

        const response: ApiResponse = {
            success: true,
            data: newApplication,
            message: 'Application created successfully'
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Error creating application:', error);

        // Handle unique constraint violation
        if (error instanceof Error && error.message.includes('unique_client_job_application')) {
            const response: ApiResponse = {
                success: false,
                error: 'Application already exists for this job',
                data: { isDuplicate: true }
            };
            return NextResponse.json(response, { status: 409 });
        }

        const response: ApiResponse = {
            success: false,
            error: 'Failed to create application',
        };
        return NextResponse.json(response, { status: 500 });
    }
}
