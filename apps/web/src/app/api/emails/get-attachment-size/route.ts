/**
 * GET ATTACHMENT SIZE API
 * Gets the file size of an attachment from a URL
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        console.log('📏 Getting attachment size API called');

        const { searchParams } = new URL(request.url);
        const url = searchParams.get('url');

        if (!url) {
            return NextResponse.json(
                { success: false, error: 'URL parameter is required' },
                { status: 400 }
            );
        }

        console.log(`📏 Fetching size for URL: ${url}`);

        // Fetch the file to get its size
        const response = await fetch(url, { method: 'HEAD' });

        if (!response.ok) {
            console.error(`❌ Failed to fetch file: ${response.status} ${response.statusText}`);
            return NextResponse.json(
                { success: false, error: `Failed to fetch file: ${response.status}` },
                { status: response.status }
            );
        }

        const contentLength = response.headers.get('content-length');
        const size = contentLength ? parseInt(contentLength, 10) : 0;

        console.log(`📏 File size: ${size} bytes`);

        return NextResponse.json({
            success: true,
            data: {
                size,
                contentLength: contentLength,
                contentType: response.headers.get('content-type')
            }
        });

    } catch (error) {
        console.error('❌ Error getting attachment size:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
