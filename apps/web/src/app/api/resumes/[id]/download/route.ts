import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/utils/jwt';
import { db } from '@/lib/utils/database';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { success: false, error: 'No valid authorization token' },
                { status: 401 }
            );
        }

        const token = authHeader.substring(7);
        const decoded = verifyToken(token);

        const resumeId = params.id;

        // Get resume details and verify access
        const { rows } = await db.query(`
            SELECT 
                r.id,
                r.name,
                r.file_url,
                c.worker_id
            FROM resumes r
            JOIN clients c ON r.client_id = c.id
            WHERE r.id = $1
        `, [resumeId]);

        if (rows.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Resume not found' },
                { status: 404 }
            );
        }

        // Non-admin users can only download resumes of their own clients
        if (decoded.role !== 'ADMIN' && rows[0].worker_id !== decoded.userId) {
            return NextResponse.json(
                { success: false, error: 'Insufficient permissions' },
                { status: 403 }
            );
        }

        // Construct full file path from filename
        const uploadDir = path.join(process.cwd(), 'uploads', 'resumes');
        const fullFilePath = path.join(uploadDir, rows[0].file_url);

        // Check if file exists
        try {
            await fs.access(fullFilePath);
        } catch (error) {
            return NextResponse.json(
                { success: false, error: 'File not found on server' },
                { status: 404 }
            );
        }

        // Read the file
        const fileBuffer = await fs.readFile(fullFilePath);

        // Determine content type based on file extension
        const fileExtension = path.extname(rows[0].name).toLowerCase();
        let contentType = 'application/octet-stream';

        switch (fileExtension) {
            case '.pdf':
                contentType = 'application/pdf';
                break;
            case '.doc':
                contentType = 'application/msword';
                break;
            case '.docx':
                contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
                break;
        }

        // Return the file
        return new NextResponse(new Uint8Array(fileBuffer), {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Content-Disposition': `attachment; filename="${rows[0].name}"`,
                'Content-Length': fileBuffer.length.toString(),
            },
        });
    } catch (error) {
        console.error('Download resume error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to download resume' },
            { status: 500 }
        );
    }
}
