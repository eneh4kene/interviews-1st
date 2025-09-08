import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/utils/jwt';
import { db } from '@/lib/utils/database';
import { ApiResponse } from '@interview-me/types';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
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

        if (decoded.role !== 'ADMIN') {
            const response: ApiResponse = {
                success: false,
                error: 'Insufficient permissions',
            };
            return NextResponse.json(response, { status: 403 });
        }

        const { rows } = await db.query(
            `SELECT 
                i.id,
                i.client_id as "clientId",
                i.company_name as "companyName",
                i.job_title as "jobTitle",
                i.scheduled_date as "scheduledDate",
                i.interview_type as "interviewType",
                i.status,
                i.payment_status as "paymentStatus",
                i.payment_amount as "paymentAmount",
                i.worker_notes as "notes",
                i.client_response_notes as "feedback",
                i.created_at as "createdAt",
                i.updated_at as "updatedAt",
                c.name as "clientName",
                c.email as "clientEmail",
                c.phone as "clientPhone",
                u.name as "workerName",
                u.email as "workerEmail"
            FROM interviews i
            LEFT JOIN clients c ON i.client_id = c.id
            LEFT JOIN users u ON c.worker_id = u.id
            WHERE i.id = $1`,
            [params.id]
        );

        if (rows.length === 0) {
            const response: ApiResponse = {
                success: false,
                error: 'Interview not found',
            };
            return NextResponse.json(response, { status: 404 });
        }

        const interview = {
            id: rows[0].id,
            client_id: rows[0].clientId,
            title: `${rows[0].companyName} - ${rows[0].jobTitle}`,
            company_name: rows[0].companyName,
            job_title: rows[0].jobTitle,
            scheduled_date: rows[0].scheduledDate,
            interview_type: rows[0].interviewType,
            status: rows[0].status,
            payment_status: rows[0].paymentStatus,
            payment_amount: rows[0].paymentAmount,
            notes: rows[0].notes,
            feedback: rows[0].feedback,
            rating: 0, // Default rating since it doesn't exist in DB
            created_at: rows[0].createdAt,
            updated_at: rows[0].updatedAt,
            client_name: rows[0].clientName,
            client_email: rows[0].clientEmail,
            client_phone: rows[0].clientPhone,
            worker_name: rows[0].workerName,
            worker_email: rows[0].workerEmail,
        };

        const response: ApiResponse = {
            success: true,
            data: interview,
            message: 'Interview retrieved successfully',
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Get interview error:', error);
        const response: ApiResponse = {
            success: false,
            error: 'Failed to retrieve interview',
        };
        return NextResponse.json(response, { status: 500 });
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
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

        if (decoded.role !== 'ADMIN') {
            const response: ApiResponse = {
                success: false,
                error: 'Insufficient permissions',
            };
            return NextResponse.json(response, { status: 403 });
        }

        const body = await request.json();
        const { 
            companyName, 
            jobTitle, 
            scheduledDate, 
            interviewType, 
            status, 
            paymentStatus, 
            paymentAmount, 
            notes, 
            feedback
        } = body;

        // Check if interview exists
        const existingInterview = await db.query(
            'SELECT id FROM interviews WHERE id = $1',
            [params.id]
        );

        if (existingInterview.rows.length === 0) {
            const response: ApiResponse = {
                success: false,
                error: 'Interview not found',
            };
            return NextResponse.json(response, { status: 404 });
        }

        // Build update query dynamically
        const updateFields = [];
        const updateValues = [];
        let paramIndex = 1;

        // Title is derived from company and job, so we don't update it directly

        if (companyName !== undefined) {
            updateFields.push(`company_name = $${paramIndex}`);
            updateValues.push(companyName);
            paramIndex++;
        }

        if (jobTitle !== undefined) {
            updateFields.push(`job_title = $${paramIndex}`);
            updateValues.push(jobTitle);
            paramIndex++;
        }

        if (scheduledDate !== undefined) {
            updateFields.push(`scheduled_date = $${paramIndex}`);
            updateValues.push(scheduledDate);
            paramIndex++;
        }

        if (interviewType !== undefined) {
            updateFields.push(`interview_type = $${paramIndex}`);
            updateValues.push(interviewType);
            paramIndex++;
        }

        if (status !== undefined) {
            updateFields.push(`status = $${paramIndex}`);
            updateValues.push(status);
            paramIndex++;
        }

        if (paymentStatus !== undefined) {
            updateFields.push(`payment_status = $${paramIndex}`);
            updateValues.push(paymentStatus);
            paramIndex++;
        }

        if (paymentAmount !== undefined) {
            updateFields.push(`payment_amount = $${paramIndex}`);
            updateValues.push(paymentAmount);
            paramIndex++;
        }

        if (notes !== undefined) {
            updateFields.push(`worker_notes = $${paramIndex}`);
            updateValues.push(notes);
            paramIndex++;
        }

        if (feedback !== undefined) {
            updateFields.push(`client_response_notes = $${paramIndex}`);
            updateValues.push(feedback);
            paramIndex++;
        }

        // Rating doesn't exist in the actual database schema

        if (updateFields.length === 0) {
            const response: ApiResponse = {
                success: false,
                error: 'No fields to update',
            };
            return NextResponse.json(response, { status: 400 });
        }

        updateFields.push(`updated_at = NOW()`);
        updateValues.push(params.id);

        const updateQuery = `
            UPDATE interviews 
            SET ${updateFields.join(', ')}
            WHERE id = $${paramIndex}
        `;

        await db.query(updateQuery, updateValues);

        const response: ApiResponse = {
            success: true,
            message: 'Interview updated successfully',
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Update interview error:', error);
        const response: ApiResponse = {
            success: false,
            error: 'Failed to update interview',
        };
        return NextResponse.json(response, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
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

        if (decoded.role !== 'ADMIN') {
            const response: ApiResponse = {
                success: false,
                error: 'Insufficient permissions',
            };
            return NextResponse.json(response, { status: 403 });
        }

        // Check if interview exists
        const existingInterview = await db.query(
            'SELECT id FROM interviews WHERE id = $1',
            [params.id]
        );

        if (existingInterview.rows.length === 0) {
            const response: ApiResponse = {
                success: false,
                error: 'Interview not found',
            };
            return NextResponse.json(response, { status: 404 });
        }

        // Delete interview
        await db.query('DELETE FROM interviews WHERE id = $1', [params.id]);

        const response: ApiResponse = {
            success: true,
            message: 'Interview deleted successfully',
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Delete interview error:', error);
        const response: ApiResponse = {
            success: false,
            error: 'Failed to delete interview',
        };
        return NextResponse.json(response, { status: 500 });
    }
}
