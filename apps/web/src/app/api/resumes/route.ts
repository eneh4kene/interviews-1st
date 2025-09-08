import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/utils/jwt';
import { db } from '@/lib/utils/database';
import { ApiResponse } from '@interview-me/types';
import multer from 'multer';
import { promises as fs } from 'fs';
import path from 'path';

// Configure multer for file uploads
const upload = multer({
    storage: multer.diskStorage({
        destination: async (req, file, cb) => {
            const uploadDir = path.join(process.cwd(), 'uploads', 'resumes');
            await fs.mkdir(uploadDir, { recursive: true });
            cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, `resume-${uniqueSuffix}-${file.originalname}`);
        },
    }),
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PDF and Word documents are allowed.'));
        }
    },
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
});

export async function GET(request: NextRequest) {
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

        const { searchParams } = new URL(request.url);
        const clientId = searchParams.get('clientId');

        if (!clientId) {
            const response: ApiResponse = {
                success: false,
                error: 'Client ID is required',
            };
            return NextResponse.json(response, { status: 400 });
        }

        // Verify user has access to this client
        const { rows: clientRows } = await db.query(`
      SELECT worker_id FROM clients WHERE id = $1
    `, [clientId]);

        if (clientRows.length === 0) {
            const response: ApiResponse = {
                success: false,
                error: 'Client not found',
            };
            return NextResponse.json(response, { status: 404 });
        }

        // Non-admin users can only access their own clients
        if (decoded.role !== 'ADMIN' && clientRows[0].worker_id !== decoded.userId) {
            const response: ApiResponse = {
                success: false,
                error: 'Insufficient permissions',
            };
            return NextResponse.json(response, { status: 403 });
        }

        // Get resumes for the client
        const { rows } = await db.query(`
      SELECT 
        id,
        client_id as "clientId",
        name as "filename",
        file_url as "filePath",
        is_default as "isDefault",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM resumes 
      WHERE client_id = $1
      ORDER BY created_at DESC
    `, [clientId]);

        const response: ApiResponse = {
            success: true,
            data: rows,
            message: 'Resumes retrieved successfully',
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Get resumes error:', error);
        const response: ApiResponse = {
            success: false,
            error: 'Failed to retrieve resumes',
        };
        return NextResponse.json(response, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
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

        // Parse form data
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const clientId = formData.get('clientId') as string;

        if (!file || !clientId) {
            const response: ApiResponse = {
                success: false,
                error: 'File and client ID are required',
            };
            return NextResponse.json(response, { status: 400 });
        }

        // Verify user has access to this client
        const { rows: clientRows } = await db.query(`
      SELECT worker_id FROM clients WHERE id = $1
    `, [clientId]);

        if (clientRows.length === 0) {
            const response: ApiResponse = {
                success: false,
                error: 'Client not found',
            };
            return NextResponse.json(response, { status: 404 });
        }

        // Non-admin users can only upload to their own clients
        if (decoded.role !== 'ADMIN' && clientRows[0].worker_id !== decoded.userId) {
            const response: ApiResponse = {
                success: false,
                error: 'Insufficient permissions',
            };
            return NextResponse.json(response, { status: 403 });
        }

        // Validate file type
        const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        if (!allowedTypes.includes(file.type)) {
            const response: ApiResponse = {
                success: false,
                error: 'Invalid file type. Only PDF and Word documents are allowed.',
            };
            return NextResponse.json(response, { status: 400 });
        }

        // Validate file size (10MB limit)
        if (file.size > 10 * 1024 * 1024) {
            const response: ApiResponse = {
                success: false,
                error: 'File size too large. Maximum size is 10MB.',
            };
            return NextResponse.json(response, { status: 400 });
        }

        // Generate unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const filename = `resume-${uniqueSuffix}-${file.name}`;
        const uploadDir = path.join(process.cwd(), 'uploads', 'resumes');
        const filePath = path.join(uploadDir, filename);

        // Ensure upload directory exists
        await fs.mkdir(uploadDir, { recursive: true });

        // Save file
        const bytes = await file.arrayBuffer();
        await fs.writeFile(filePath, Buffer.from(bytes));

        // Save resume record to database
        const { rows } = await db.query(`
      INSERT INTO resumes (
        client_id,
        name,
        file_url
      ) VALUES ($1, $2, $3)
      RETURNING 
        id,
        client_id as "clientId",
        name as "filename",
        file_url as "filePath",
        is_default as "isDefault",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `, [
            clientId,
            file.name,
            filePath
        ]);

        const response: ApiResponse = {
            success: true,
            data: rows[0],
            message: 'Resume uploaded successfully',
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Upload resume error:', error);
        const response: ApiResponse = {
            success: false,
            error: 'Failed to upload resume',
        };
        return NextResponse.json(response, { status: 500 });
    }
}
