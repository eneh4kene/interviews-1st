import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/utils/database';

export async function GET(request: NextRequest) {
    try {
        console.log('🧪 Testing database schema...');

        // Check if applications table has the required fields
        const result = await db.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'applications' 
            AND column_name IN (
                'job_id', 'company_website', 'apply_url', 'application_type',
                'resume_generation_status', 'resume_generation_progress',
                'generated_resume_url', 'generated_resume_filename',
                'resume_generation_error'
            )
            ORDER BY column_name
        `);

        console.log('📊 Found columns:', result.rows);

        // Check if the required fields exist
        const requiredFields = [
            'job_id', 'company_website', 'apply_url', 'application_type',
            'resume_generation_status', 'resume_generation_progress',
            'generated_resume_url', 'generated_resume_filename',
            'resume_generation_error'
        ];

        const foundFields = result.rows.map(row => row.column_name);
        const missingFields = requiredFields.filter(field => !foundFields.includes(field));

        console.log('📋 Required fields found:', foundFields);
        console.log('❌ Missing fields:', missingFields);

        return NextResponse.json({
            success: true,
            message: 'Database schema test completed',
            columns_found: result.rows,
            found_fields: foundFields,
            missing_fields: missingFields,
            schema_ready: missingFields.length === 0
        });

    } catch (error) {
        console.error('❌ Database schema test failed:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        }, { status: 500 });
    }
}
