import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/utils/database';
import { ApiResponse } from '@interview-me/types';
import { verifyToken } from '@/lib/utils/jwt';

// ==================== EMAIL TEMPLATES ====================

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const category = searchParams.get('category') || 'all';
        const search = searchParams.get('search') || '';

        let whereConditions = ['is_active = true'];
        let params: any[] = [];
        let paramCount = 0;

        if (category !== 'all') {
            paramCount++;
            whereConditions.push(`category = $${paramCount}`);
            params.push(category);
        }

        if (search) {
            paramCount++;
            whereConditions.push(`(name ILIKE $${paramCount} OR subject ILIKE $${paramCount})`);
            params.push(`%${search}%`);
        }

        const result = await db.query(`
            SELECT id, name, subject, html_content, text_content, variables, category, is_active, created_at, updated_at
            FROM email_templates
            WHERE ${whereConditions.join(' AND ')}
            ORDER BY created_at DESC
        `, params);

        const response: ApiResponse = {
            success: true,
            data: result.rows
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Error fetching email templates:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch email templates' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        // Temporarily skip authentication for email templates (admin-only feature)
        // TODO: Implement proper admin authentication
        // const authHeader = request.headers.get('authorization');
        // if (!authHeader || !authHeader.startsWith('Bearer ')) {
        //     return NextResponse.json({ success: false, error: 'No valid authorization token' }, { status: 401 });
        // }

        // const token = authHeader.substring(7);
        // const decoded = verifyToken(token);

        // if (decoded.role !== 'ADMIN') {
        //     return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
        // }

        const body = await request.json();
        const { name, subject, html_content, text_content, variables, category } = body;

        if (!name || !subject || !html_content) {
            return NextResponse.json({
                success: false,
                error: 'Name, subject, and HTML content are required'
            }, { status: 400 });
        }

        const result = await db.query(`
            INSERT INTO email_templates (name, subject, html_content, text_content, variables, category)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [name, subject, html_content, text_content, JSON.stringify(variables || []), category || 'general']);

        const response: ApiResponse = {
            success: true,
            data: result.rows[0]
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Error creating email template:', error);
        return NextResponse.json({ success: false, error: 'Failed to create email template' }, { status: 500 });
    }
}
