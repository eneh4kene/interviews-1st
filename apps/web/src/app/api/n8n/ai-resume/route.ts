import { NextRequest, NextResponse } from 'next/server';
import { n8nService, N8nAiResumeSuccessOutput, N8nAiResumeErrorOutput } from '@/lib/services/N8nService';

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
        console.log('[n8n webhook] /api/n8n/ai-resume received payload');

        // Support both single object and array payloads from n8n
        if (Array.isArray(body)) {
            console.log(`[n8n webhook] Array payload length=${body.length}`);
            if (body.length === 0) {
                return NextResponse.json({ ok: true, processed: 0 });
            }

            // Filter to only items with a status field; ignore others
            const validItems = body.filter((item: any) => item && item.status);
            if (validItems.length === 0) {
                return NextResponse.json({ error: 'Invalid payload array: no valid items' }, { status: 400 });
            }

            console.log(`[n8n webhook] Valid items to persist: ${validItems.length}`);
            await Promise.all(
                validItems.map((item: N8nAiResumeSuccessOutput | N8nAiResumeErrorOutput) =>
                    n8nService.persistAiResumeResult(item)
                )
            );

            return NextResponse.json({ ok: true, processed: validItems.length });
        }

        if (!body || !body.status) {
            return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
        }

        console.log(`[n8n webhook] Single payload status=${body.status} resume_id=${body.resume_id || 'n/a'}`);
        // Persist success or error
        await n8nService.persistAiResumeResult(body as N8nAiResumeSuccessOutput | N8nAiResumeErrorOutput);

        return NextResponse.json({ ok: true, processed: 1 });
    } catch (error) {
        console.error('n8n ai-resume callback handler error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
