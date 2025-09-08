import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/utils/database';
import { ApiResponse, OfferDeclineRequest, OfferDeclineResponse } from '@interview-me/types';

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;
        const body = await request.json();
        const { token, reason } = body as OfferDeclineRequest;

        // Verify the offer token
        const offerResult = await db.query(
            'SELECT * FROM interview_offers WHERE interview_id = $1 AND token = $2 AND status = $3',
            [id, token, 'SENT']
        );

        if (offerResult.rows.length === 0) {
            const response: OfferDeclineResponse = {
                success: false,
                error: 'Invalid or expired offer token',
            };
            return NextResponse.json(response, { status: 400 });
        }

        const offer = offerResult.rows[0];

        // Update offer status to declined
        await db.query(
            'UPDATE interview_offers SET status = $1, declined_at = NOW() WHERE id = $2',
            ['DECLINED', offer.id]
        );

        // Log the decline reason if provided
        if (reason) {
            await db.query(
                'UPDATE interview_offers SET decline_reason = $1 WHERE id = $2',
                [reason, offer.id]
            );
        }

        const response: OfferDeclineResponse = {
            success: true,
            message: 'Offer declined successfully',
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Decline offer error:', error);
        const response: OfferDeclineResponse = {
            success: false,
            error: 'Failed to decline offer',
        };
        return NextResponse.json(response, { status: 500 });
    }
}
