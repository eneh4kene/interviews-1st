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

        const jobPreferenceId = params.id;

        // Get job preference details and verify access
        const { rows } = await db.query(`
            SELECT 
                jp.id,
                jp.client_id as "clientId",
                jp.title as "jobTitle",
                jp.company as "companyName",
                jp.location,
                jp.salary_min as "salaryMin",
                jp.salary_max as "salaryMax",
                jp.work_type as "jobType",
                jp.visa_sponsorship as "visaSponsorship",
                jp.salary_currency as "salaryCurrency",
                jp.status,
                jp.created_at as "createdAt",
                jp.updated_at as "updatedAt",
                c.worker_id
            FROM job_preferences jp
            JOIN clients c ON jp.client_id = c.id
            WHERE jp.id = $1
        `, [jobPreferenceId]);

        if (rows.length === 0) {
            const response: ApiResponse = {
                success: false,
                error: 'Job preference not found',
            };
            return NextResponse.json(response, { status: 404 });
        }

        // Non-admin users can only access their own clients' preferences
        if (decoded.role !== 'ADMIN' && rows[0].worker_id !== decoded.userId) {
            const response: ApiResponse = {
                success: false,
                error: 'Insufficient permissions',
            };
            return NextResponse.json(response, { status: 403 });
        }

        const response: ApiResponse = {
            success: true,
            data: {
                id: rows[0].id,
                clientId: rows[0].clientId,
                title: rows[0].jobTitle,
                company: rows[0].companyName,
                location: rows[0].location,
                workType: rows[0].jobType,
                visaSponsorship: rows[0].visaSponsorship,
                salaryRange: {
                    min: rows[0].salaryMin,
                    max: rows[0].salaryMax,
                    currency: rows[0].salaryCurrency
                },
                status: rows[0].status,
                createdAt: rows[0].createdAt,
                updatedAt: rows[0].updatedAt
            },
            message: 'Job preference retrieved successfully',
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Get job preference error:', error);
        const response: ApiResponse = {
            success: false,
            error: 'Failed to retrieve job preference',
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

        const jobPreferenceId = params.id;
        const body = await request.json();
        const { title, company, location, salaryMin, salaryMax, workType, visaSponsorship, currency, status } = body;

        // Validate required fields
        if (!title || !location) {
            const response: ApiResponse = {
                success: false,
                error: 'Job title and location are required',
            };
            return NextResponse.json(response, { status: 400 });
        }

        // Get job preference details and verify access
        const { rows: jobPreferenceRows } = await db.query(`
            SELECT 
                jp.id,
                jp.client_id,
                c.worker_id
            FROM job_preferences jp
            JOIN clients c ON jp.client_id = c.id
            WHERE jp.id = $1
        `, [jobPreferenceId]);

        if (jobPreferenceRows.length === 0) {
            const response: ApiResponse = {
                success: false,
                error: 'Job preference not found',
            };
            return NextResponse.json(response, { status: 404 });
        }

        // Non-admin users can only update their own clients' preferences
        if (decoded.role !== 'ADMIN' && jobPreferenceRows[0].worker_id !== decoded.userId) {
            const response: ApiResponse = {
                success: false,
                error: 'Insufficient permissions',
            };
            return NextResponse.json(response, { status: 403 });
        }

        // Update job preference
        const { rows } = await db.query(`
            UPDATE job_preferences 
            SET 
                title = $1,
                company = $2,
                location = $3,
                salary_min = $4,
                salary_max = $5,
                work_type = $6,
                visa_sponsorship = $7,
                salary_currency = $8,
                status = $9,
                updated_at = NOW()
            WHERE id = $10
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
            title,
            company || null,
            location,
            salaryMin,
            salaryMax,
            workType,
            visaSponsorship,
            currency,
            status,
            jobPreferenceId
        ]);

        const response: ApiResponse = {
            success: true,
            data: {
                id: rows[0].id,
                clientId: rows[0].clientId,
                title: rows[0].jobTitle,
                company: rows[0].companyName,
                location: rows[0].location,
                workType: rows[0].jobType,
                visaSponsorship: rows[0].visaSponsorship,
                salaryRange: {
                    min: rows[0].salaryMin,
                    max: rows[0].salaryMax,
                    currency: rows[0].salaryCurrency
                },
                status: rows[0].status,
                createdAt: rows[0].createdAt,
                updatedAt: rows[0].updatedAt
            },
            message: 'Job preference updated successfully',
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Update job preference error:', error);
        const response: ApiResponse = {
            success: false,
            error: 'Failed to update job preference',
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

        const jobPreferenceId = params.id;

        // Get job preference details and verify access
        const { rows: jobPreferenceRows } = await db.query(`
            SELECT 
                jp.id,
                jp.client_id,
                c.worker_id
            FROM job_preferences jp
            JOIN clients c ON jp.client_id = c.id
            WHERE jp.id = $1
        `, [jobPreferenceId]);

        if (jobPreferenceRows.length === 0) {
            const response: ApiResponse = {
                success: false,
                error: 'Job preference not found',
            };
            return NextResponse.json(response, { status: 404 });
        }

        // Non-admin users can only delete their own clients' preferences
        if (decoded.role !== 'ADMIN' && jobPreferenceRows[0].worker_id !== decoded.userId) {
            const response: ApiResponse = {
                success: false,
                error: 'Insufficient permissions',
            };
            return NextResponse.json(response, { status: 403 });
        }

        // Delete job preference
        await db.query(`
            DELETE FROM job_preferences WHERE id = $1
        `, [jobPreferenceId]);

        const response: ApiResponse = {
            success: true,
            message: 'Job preference deleted successfully',
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Delete job preference error:', error);
        const response: ApiResponse = {
            success: false,
            error: 'Failed to delete job preference',
        };
        return NextResponse.json(response, { status: 500 });
    }
}
