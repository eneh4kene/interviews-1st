import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/utils/jwt';
import { db } from '@/lib/utils/database';
import { ApiResponse } from '@interview-me/types';
import { promises as fs } from 'fs';
import path from 'path';

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

        const resumeId = params.id;

        // Get resume details
        const { rows } = await db.query(`
            SELECT 
                r.id,
                r.client_id as "clientId",
                r.name,
                r.file_url as "fileUrl",
                r.is_default as "isDefault",
                r.created_at as "createdAt",
                r.updated_at as "updatedAt",
                c.worker_id
            FROM resumes r
            JOIN clients c ON r.client_id = c.id
            WHERE r.id = $1
        `, [resumeId]);

        if (rows.length === 0) {
            const response: ApiResponse = {
                success: false,
                error: 'Resume not found',
            };
            return NextResponse.json(response, { status: 404 });
        }

        // Non-admin users can only access resumes of their own clients
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
                name: rows[0].name,
                fileUrl: rows[0].fileUrl,
                isDefault: rows[0].isDefault,
                createdAt: rows[0].createdAt,
                updatedAt: rows[0].updatedAt
            },
            message: 'Resume retrieved successfully',
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Get resume error:', error);
        const response: ApiResponse = {
            success: false,
            error: 'Failed to retrieve resume',
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

        const resumeId = params.id;
        const body = await request.json();
        const { isDefault } = body;

        // Get resume details and verify access
        const { rows: resumeRows } = await db.query(`
            SELECT 
                r.id,
                r.client_id,
                c.worker_id
            FROM resumes r
            JOIN clients c ON r.client_id = c.id
            WHERE r.id = $1
        `, [resumeId]);

        if (resumeRows.length === 0) {
            const response: ApiResponse = {
                success: false,
                error: 'Resume not found',
            };
            return NextResponse.json(response, { status: 404 });
        }

        // Non-admin users can only update resumes of their own clients
        if (decoded.role !== 'ADMIN' && resumeRows[0].worker_id !== decoded.userId) {
            const response: ApiResponse = {
                success: false,
                error: 'Insufficient permissions',
            };
            return NextResponse.json(response, { status: 403 });
        }

        // If setting as default, unset other defaults for this client
        if (isDefault) {
            await db.query(`
                UPDATE resumes 
                SET is_default = false 
                WHERE client_id = $1 AND id != $2
            `, [resumeRows[0].client_id, resumeId]);
        }

        // Update the resume
        const { rows } = await db.query(`
            UPDATE resumes 
            SET 
                is_default = $1,
                updated_at = NOW()
            WHERE id = $2
            RETURNING 
                id,
                client_id as "clientId",
                name,
                file_url as "fileUrl",
                is_default as "isDefault",
                created_at as "createdAt",
                updated_at as "updatedAt"
        `, [isDefault, resumeId]);

        const response: ApiResponse = {
            success: true,
            data: rows[0],
            message: 'Resume updated successfully',
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Update resume error:', error);
        const response: ApiResponse = {
            success: false,
            error: 'Failed to update resume',
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

        const resumeId = params.id;

        // Get resume details and verify access
        const { rows: resumeRows } = await db.query(`
            SELECT 
                r.id,
                r.client_id,
                r.file_url,
                c.worker_id
            FROM resumes r
            JOIN clients c ON r.client_id = c.id
            WHERE r.id = $1
        `, [resumeId]);

        if (resumeRows.length === 0) {
            const response: ApiResponse = {
                success: false,
                error: 'Resume not found',
            };
            return NextResponse.json(response, { status: 404 });
        }

        // Non-admin users can only delete resumes of their own clients
        if (decoded.role !== 'ADMIN' && resumeRows[0].worker_id !== decoded.userId) {
            const response: ApiResponse = {
                success: false,
                error: 'Insufficient permissions',
            };
            return NextResponse.json(response, { status: 403 });
        }

        // Delete the file from filesystem
        try {
            const uploadDir = path.join(process.cwd(), 'uploads', 'resumes');
            const fullFilePath = path.join(uploadDir, resumeRows[0].file_url);
            await fs.unlink(fullFilePath);
        } catch (fileError) {
            console.warn('Could not delete file from filesystem:', fileError);
            // Continue with database deletion even if file deletion fails
        }

        // Delete the resume record from database
        await db.query(`
            DELETE FROM resumes WHERE id = $1
        `, [resumeId]);

        const response: ApiResponse = {
            success: true,
            message: 'Resume deleted successfully',
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Delete resume error:', error);
        const response: ApiResponse = {
            success: false,
            error: 'Failed to delete resume',
        };
        return NextResponse.json(response, { status: 500 });
    }
}
