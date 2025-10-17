import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/utils/jwt';
import { db } from '@/lib/utils/database';
import { ApiResponse } from '@interview-me/types';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
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

        const applicationId = params.id;

        // Get application details and verify access
        const { rows } = await db.query(`
            SELECT 
                a.id,
                a.client_id as "clientId",
                a.job_preference_id as "jobPreferenceId",
                a.resume_id as "resumeId",
                a.job_title as "jobTitle",
                a.company_name as "companyName",
                a.application_date as "applicationDate",
                a.status,
                a.interview_date as "interviewDate",
                a.notes,
                a.created_at as "createdAt",
                a.updated_at as "updatedAt",
                c.worker_id
            FROM applications a
            JOIN clients c ON a.client_id = c.id
            WHERE a.id = $1
        `, [applicationId]);

        if (rows.length === 0) {
            const response: ApiResponse = {
                success: false,
                error: 'Application not found',
            };
            return NextResponse.json(response, { status: 404 });
        }

        // Non-admin users can only access their own clients' applications
        if (decoded.role !== 'ADMIN' && rows[0].worker_id !== decoded.userId) {
            const response: ApiResponse = {
                success: false,
                error: 'Insufficient permissions',
            };
            return NextResponse.json(response, { status: 403 });
        }

        const response: ApiResponse = {
            success: true,
            data: rows[0],
            message: 'Application retrieved successfully',
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Get application error:', error);
        const response: ApiResponse = {
            success: false,
            error: 'Failed to retrieve application',
        };
        return NextResponse.json(response, { status: 500 });
    }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
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

        const applicationId = params.id;
        const body = await request.json();
        console.log('🔧 PUT /applications/[id] - Application ID:', applicationId);
        console.log('🔧 PUT /applications/[id] - Request body:', body);

        const { jobTitle, companyName, applicationDate, status, interviewDate, notes, jobPreferenceId, resumeId, applyUrl } = body;

        // Get application details and verify access
        const { rows: applicationRows } = await db.query(`
            SELECT 
                a.id,
                a.client_id,
                c.worker_id
            FROM applications a
            JOIN clients c ON a.client_id = c.id
            WHERE a.id = $1
        `, [applicationId]);

        if (applicationRows.length === 0) {
            const response: ApiResponse = {
                success: false,
                error: 'Application not found',
            };
            return NextResponse.json(response, { status: 404 });
        }

        // Non-admin users can only update their own clients' applications
        if (decoded.role !== 'ADMIN' && applicationRows[0].worker_id !== decoded.userId) {
            const response: ApiResponse = {
                success: false,
                error: 'Insufficient permissions',
            };
            return NextResponse.json(response, { status: 403 });
        }

        // Update application
        console.log('🔧 Updating application with values:', {
            jobPreferenceId: jobPreferenceId || null,
            resumeId: resumeId || null,
            jobTitle,
            companyName,
            applicationDate,
            status,
            interviewDate,
            notes,
            applyUrl: applyUrl || null,
            applicationId
        });

        const { rows } = await db.query(`
            UPDATE applications 
            SET 
                job_preference_id = $1,
                resume_id = $2,
                job_title = $3,
                company_name = $4,
                application_date = $5,
                status = $6,
                interview_date = $7,
                notes = $8,
                apply_url = $9,
                updated_at = NOW()
            WHERE id = $10
            RETURNING 
                id,
                client_id as "clientId",
                job_preference_id as "jobPreferenceId",
                resume_id as "resumeId",
                job_title as "jobTitle",
                company_name as "companyName",
                application_date as "applicationDate",
                status,
                interview_date as "interviewDate",
                notes,
                apply_url as "applyUrl",
                created_at as "createdAt",
                updated_at as "updatedAt"
        `, [
            jobPreferenceId || null,
            resumeId || null,
            jobTitle,
            companyName,
            applicationDate,
            status,
            interviewDate,
            notes,
            applyUrl || null,
            applicationId
        ]);

        console.log('🔧 Update query result:', rows);

        const response: ApiResponse = {
            success: true,
            data: rows[0],
            message: 'Application updated successfully',
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('❌ Update application error:', error);
        console.error('❌ Error details:', {
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        });
        const response: ApiResponse = {
            success: false,
            error: 'Failed to update application',
        };
        return NextResponse.json(response, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
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

        const applicationId = params.id;

        // Get application details and verify access
        const { rows: applicationRows } = await db.query(`
            SELECT 
                a.id,
                a.client_id,
                c.worker_id
            FROM applications a
            JOIN clients c ON a.client_id = c.id
            WHERE a.id = $1
        `, [applicationId]);

        if (applicationRows.length === 0) {
            const response: ApiResponse = {
                success: false,
                error: 'Application not found',
            };
            return NextResponse.json(response, { status: 404 });
        }

        // Non-admin users can only delete their own clients' applications
        if (decoded.role !== 'ADMIN' && applicationRows[0].worker_id !== decoded.userId) {
            const response: ApiResponse = {
                success: false,
                error: 'Insufficient permissions',
            };
            return NextResponse.json(response, { status: 403 });
        }

        // Delete application
        await db.query(`
            DELETE FROM applications WHERE id = $1
        `, [applicationId]);

        const response: ApiResponse = {
            success: true,
            message: 'Application deleted successfully',
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Delete application error:', error);
        const response: ApiResponse = {
            success: false,
            error: 'Failed to delete application',
        };
        return NextResponse.json(response, { status: 500 });
    }
}
