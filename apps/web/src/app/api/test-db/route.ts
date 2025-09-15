import { NextResponse } from 'next/server';
import { db } from '@/lib/utils/database';

export async function GET() {
    try {
        console.log('Testing database connection...');

        // Simple test query
        const result = await db.query('SELECT COUNT(*) as count FROM jobs');
        console.log('Database query successful:', result.rows[0]);

        return NextResponse.json({
            success: true,
            message: 'Database connection successful',
            jobCount: result.rows[0].count
        });
    } catch (error) {
        console.error('Database test error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Database connection failed'
        }, { status: 500 });
    }
}
