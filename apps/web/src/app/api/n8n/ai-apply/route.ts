import { NextRequest, NextResponse } from 'next/server';
import { n8nService, N8nAiApplySuccessOutput, N8nErrorOutput } from '@/src/lib/services/N8nService';

export async function POST(req: NextRequest) {
    try {
        // Optional secret verification
        const secret = process.env.N8N_WEBHOOK_SECRET;
        if (secret) {
            const headerSecret = req.headers.get('x-webhook-secret');
            if (headerSecret !== secret) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }
        }

        const body = await req.json();

        if (!body || !body.status) {
            return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
        }

        // Persist success or error
        await n8nService.persistAiApplyResult(body as N8nAiApplySuccessOutput | N8nErrorOutput);

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('n8n callback handler error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}



