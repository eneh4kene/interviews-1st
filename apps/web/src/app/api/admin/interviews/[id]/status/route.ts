import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/utils/jwt';
import { db } from '@/lib/utils/database';
import { ApiResponse } from '@interview-me/types';

export async function PATCH(
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
        const { status, notes } = body;

        if (!status) {
            const response: ApiResponse = {
                success: false,
                error: 'Status is required',
            };
            return NextResponse.json(response, { status: 400 });
        }

        // Validate status
        const validStatuses = ['scheduled', 'completed', 'client_accepted', 'client_declined', 'cancelled'];
        if (!validStatuses.includes(status)) {
            const response: ApiResponse = {
                success: false,
                error: 'Invalid status',
            };
            return NextResponse.json(response, { status: 400 });
        }

        // Check if interview exists
        const existingInterview = await db.query(
            'SELECT id, status FROM interviews WHERE id = $1',
            [params.id]
        );

        if (existingInterview.rows.length === 0) {
            const response: ApiResponse = {
                success: false,
                error: 'Interview not found',
            };
            return NextResponse.json(response, { status: 404 });
        }

        // Update interview status
        const updateFields = ['status = $1', 'updated_at = NOW()'];
        const updateValues = [status];
        let paramIndex = 2;

        if (notes !== undefined) {
            updateFields.push(`notes = $${paramIndex}`);
            updateValues.push(notes);
            paramIndex++;
        }

        // If status is completed, set payment status to paid if not already set
        if (status === 'completed') {
            updateFields.push(`payment_status = CASE WHEN payment_status = 'pending' THEN 'paid' ELSE payment_status END`);
        }

        updateValues.push(params.id);

        const updateQuery = `
            UPDATE interviews 
            SET ${updateFields.join(', ')}
            WHERE id = $${paramIndex}
        `;

        await db.query(updateQuery, updateValues);

        const response: ApiResponse = {
            success: true,
            message: 'Interview status updated successfully',
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Update interview status error:', error);
        const response: ApiResponse = {
            success: false,
            error: 'Failed to update interview status',
        };
        return NextResponse.json(response, { status: 500 });
    }
}
