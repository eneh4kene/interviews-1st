import { NextRequest, NextResponse } from 'next/server';
import { n8nService, N8nAiApplySuccessOutput, N8nErrorOutput } from '@/lib/services/N8nService';

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
        console.log('[n8n webhook] /webhook-test/ai-apply received payload');

        // Support both single object and array payloads from n8n
        if (Array.isArray(body)) {
            console.log(`[n8n webhook] (test) Array payload length=${body.length}`);
            if (body.length === 0) {
                return NextResponse.json({ ok: true, processed: 0 });
            }

            // Filter to only items with a status field; ignore others
            const validItems = body.filter((item: any) => item && item.status);
            if (validItems.length === 0) {
                return NextResponse.json({ error: 'Invalid payload array: no valid items' }, { status: 400 });
            }

            console.log(`[n8n webhook] (test) Valid items to persist: ${validItems.length}`);
            await Promise.all(
                validItems.map((item: N8nAiApplySuccessOutput | N8nErrorOutput) =>
                    n8nService.persistAiApplyResult(item)
                )
            );

            return NextResponse.json({ ok: true, processed: validItems.length });
        }

        if (!body || !body.status) {
            return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
        }

        console.log(`[n8n webhook] (test) Single payload status=${body.status} ai_application_id=${body.ai_application_id || 'n/a'}`);
        // Persist success or error
        await n8nService.persistAiApplyResult(body as N8nAiApplySuccessOutput | N8nErrorOutput);

        return NextResponse.json({ ok: true, processed: 1 });
    } catch (error) {
        console.error('n8n callback handler (test) error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}


