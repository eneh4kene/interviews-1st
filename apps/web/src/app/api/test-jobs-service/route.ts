import { NextResponse } from 'next/server';
import { jobDiscoveryService } from '@/lib/services/JobDiscoveryService';

export async function GET() {
    try {
        console.log('Testing JobDiscoveryService...');

        const clientId = '0d8971ac-b96a-4cce-bd86-15550d465975';
        const filters = {
            keywords: 'software',
            location: 'London',
            limit: 5
        };

        console.log('Calling getFilteredJobsForClient...');
        const jobs = await jobDiscoveryService.getFilteredJobsForClient(clientId, filters);
        console.log('Jobs returned:', jobs.length);

        return NextResponse.json({
            success: true,
            message: 'JobDiscoveryService test successful',
            jobCount: jobs.length,
            jobs: jobs.slice(0, 2) // Return first 2 jobs for inspection
        });
    } catch (error) {
        console.error('JobDiscoveryService test error:', error);
        console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'JobDiscoveryService test failed',
            stack: error instanceof Error ? error.stack : undefined
        }, { status: 500 });
    }
}
