import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/utils/jwt';
import { db } from '@/lib/utils/database';
import { ApiResponse } from '@interview-me/types';

export async function POST(
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
        const { feedbackScore, feedbackNotes } = body;

        if (feedbackScore === undefined || feedbackScore === null) {
            const response: ApiResponse = {
                success: false,
                error: 'Feedback score is required',
            };
            return NextResponse.json(response, { status: 400 });
        }

        // Validate feedback score (assuming 1-5 scale)
        if (feedbackScore < 1 || feedbackScore > 5) {
            const response: ApiResponse = {
                success: false,
                error: 'Feedback score must be between 1 and 5',
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

        // Update interview with feedback
        const updateFields = ['rating = $1', 'updated_at = NOW()'];
        const updateValues = [feedbackScore];
        let paramIndex = 2;

        if (feedbackNotes !== undefined) {
            updateFields.push(`feedback = $${paramIndex}`);
            updateValues.push(feedbackNotes);
            paramIndex++;
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
            message: 'Interview feedback added successfully',
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Add interview feedback error:', error);
        const response: ApiResponse = {
            success: false,
            error: 'Failed to add interview feedback',
        };
        return NextResponse.json(response, { status: 500 });
    }
}
