import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/utils/database';
import { ApiResponse } from '@interview-me/types';
import { verifyToken } from '@/lib/utils/jwt';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const templateId = params.id;

        const result = await db.query(
            'SELECT * FROM email_templates WHERE id = $1',
            [templateId]
        );

        if (result.rows.length === 0) {
            return NextResponse.json({ success: false, error: 'Template not found' }, { status: 404 });
        }

        const response: ApiResponse = {
            success: true,
            data: result.rows[0]
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Error fetching email template:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch email template' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
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

        const templateId = params.id;
        const body = await request.json();
        const { name, subject, html_content, text_content, variables, category, is_active, is_default } = body;

        // If setting as default, unset other defaults in the same category
        if (is_default) {
            await db.query(
                'UPDATE email_templates SET is_default = false WHERE category = $1 AND is_default = true AND id != $2',
                [category || 'general', templateId]
            );
        }

        const result = await db.query(`
            UPDATE email_templates 
            SET name = $1, subject = $2, html_content = $3, text_content = $4, 
                variables = $5, category = $6, is_active = $7, is_default = $8, updated_at = NOW()
            WHERE id = $9
            RETURNING *
        `, [name, subject, html_content, text_content, JSON.stringify(variables || []), category, is_active, is_default || false, templateId]);

        if (result.rows.length === 0) {
            return NextResponse.json({ success: false, error: 'Template not found' }, { status: 404 });
        }

        const response: ApiResponse = {
            success: true,
            data: result.rows[0]
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Error updating email template:', error);
        return NextResponse.json({ success: false, error: 'Failed to update email template' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
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

        const templateId = params.id;

        await db.query('DELETE FROM email_templates WHERE id = $1', [templateId]);

        const response: ApiResponse = {
            success: true,
            data: { message: 'Template deleted successfully' }
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Error deleting email template:', error);
        return NextResponse.json({ success: false, error: 'Failed to delete email template' }, { status: 500 });
    }
}
