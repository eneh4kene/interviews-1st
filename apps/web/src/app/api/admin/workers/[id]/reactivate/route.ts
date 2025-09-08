import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../../lib/utils/database';
import { ApiResponse } from '@interview-me/types';

// Reactivate worker
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const { id } = params;

        const result = await db.query(`
            UPDATE users 
            SET is_active = true, updated_at = CURRENT_TIMESTAMP 
            WHERE id = $1 AND role IN ('WORKER', 'MANAGER')
            RETURNING id, name, email, role, is_active, updated_at
        `, [id]);

        if (result.rows.length === 0) {
            return NextResponse.json({
                success: false,
                error: 'Worker not found',
            }, { status: 404 });
        }

        const response: ApiResponse = {
            success: true,
            data: result.rows[0],
            message: 'Worker reactivated successfully',
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Error reactivating worker:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to reactivate worker',
        }, { status: 500 });
    }
}
