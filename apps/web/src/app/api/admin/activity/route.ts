import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../lib/utils/database';
import { ApiResponse } from '@interview-me/types';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '20');

        // Get recent user registrations
        const recentUsers = await db.query(`
            SELECT 
                'user_registration' as type,
                name,
                email,
                role,
                created_at as timestamp
            FROM users
            ORDER BY created_at DESC
            LIMIT $1
        `, [limit]);

        // Get recent client registrations
        const recentClients = await db.query(`
            SELECT 
                'client_registration' as type,
                c.name,
                c.email,
                u.name as worker_name,
                c.created_at as timestamp
            FROM clients c
            LEFT JOIN users u ON c.worker_id = u.id
            ORDER BY c.created_at DESC
            LIMIT $1
        `, [limit]);

        // Get recent interviews
        const recentInterviews = await db.query(`
            SELECT 
                'interview_scheduled' as type,
                i.job_title as title,
                c.name as client_name,
                u.name as worker_name,
                i.created_at as timestamp
            FROM interviews i
            LEFT JOIN clients c ON i.client_id = c.id
            LEFT JOIN users u ON c.worker_id = u.id
            ORDER BY i.created_at DESC
            LIMIT $1
        `, [limit]);

        // Combine and sort all activities
        const activities = [
            ...recentUsers.rows.map((row: any) => ({ ...row, type: 'user_registration' })),
            ...recentClients.rows.map((row: any) => ({ ...row, type: 'client_registration' })),
            ...recentInterviews.rows.map((row: any) => ({ ...row, type: 'interview_scheduled' }))
        ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, limit);

        const response: ApiResponse = {
            success: true,
            data: activities,
            message: 'Recent activity retrieved successfully',
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Error fetching recent activity:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to fetch recent activity',
        }, { status: 500 });
    }
}
