/**
 * EMAIL ATTACHMENT UPLOAD API
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/utils/jwt';

export async function POST(request: NextRequest) {
    try {
        console.log('📎 Email attachment upload API called');

        // Authenticate user
        const authHeader = request.headers.get("authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json(
                { success: false, error: "No valid authorization token" },
                { status: 401 }
            );
        }
        const token = authHeader.substring(7);
        const decoded = verifyToken(token);

        // Parse the form data
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const clientId = formData.get('clientId') as string;

        if (!file) {
            return NextResponse.json({
                success: false,
                error: 'No file provided'
            }, { status: 400 });
        }

        if (!clientId) {
            return NextResponse.json({
                success: false,
                error: 'Client ID is required'
            }, { status: 400 });
        }

        // Validate file size (max 10MB)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            return NextResponse.json({
                success: false,
                error: 'File size too large. Maximum size is 10MB.'
            }, { status: 400 });
        }

        // Validate file type
        const allowedTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain',
            'image/jpeg',
            'image/png',
            'image/gif'
        ];

        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json({
                success: false,
                error: 'File type not allowed. Allowed types: PDF, DOC, DOCX, TXT, JPG, PNG, GIF'
            }, { status: 400 });
        }

        // Convert file to base64
        const buffer = await file.arrayBuffer();
        const base64Content = Buffer.from(buffer).toString('base64');

        // Generate a unique filename
        const timestamp = Date.now();
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const uniqueFilename = `${timestamp}_${sanitizedName}`;

        // Store the attachment temporarily (in a real app, you'd store this in a file storage service)
        // For now, we'll return the base64 content directly
        const attachmentData = {
            id: `att_${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
            name: file.name,
            url: `data:${file.type};base64,${base64Content}`, // Data URL for immediate use
            size: file.size,
            type: file.type,
            base64Content: base64Content // Store base64 for email sending
        };

        console.log(`✅ Attachment uploaded: ${file.name} (${file.size} bytes)`);

        return NextResponse.json({
            success: true,
            data: attachmentData
        });

    } catch (error: any) {
        console.error('❌ Error uploading attachment:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to upload attachment'
        }, { status: 500 });
    }
}
