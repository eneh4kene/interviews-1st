import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/utils/jwt';
import { db } from '@/lib/utils/database';
import { ApiResponse, OfferAcceptRequest, OfferAcceptResponse } from '@interview-me/types';

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;
        const body = await request.json();
        const { token } = body as OfferAcceptRequest;

        // Verify the offer token
        const offerResult = await db.query(
            'SELECT * FROM interview_offers WHERE interview_id = $1 AND token = $2 AND status = $3',
            [id, token, 'SENT']
        );

        if (offerResult.rows.length === 0) {
            const response: OfferAcceptResponse = {
                success: false,
                error: 'Invalid or expired offer token',
            };
            return NextResponse.json(response, { status: 400 });
        }

        const offer = offerResult.rows[0];

        // Check if offer is expired
        if (new Date() > new Date(offer.expires_at)) {
            const response: OfferAcceptResponse = {
                success: false,
                error: 'Offer has expired',
            };
            return NextResponse.json(response, { status: 400 });
        }

        // Update offer status to accepted
        await db.query(
            'UPDATE interview_offers SET status = $1, accepted_at = NOW() WHERE id = $2',
            ['ACCEPTED', offer.id]
        );

        // Create Stripe checkout session (placeholder)
        const checkoutUrl = `/checkout?session_id=stripe_session_${offer.id}`;
        const sessionId = `stripe_session_${offer.id}`;

        const response: OfferAcceptResponse = {
            success: true,
            data: {
                checkoutUrl,
                sessionId,
            },
            message: 'Offer accepted successfully',
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Accept offer error:', error);
        const response: OfferAcceptResponse = {
            success: false,
            error: 'Failed to accept offer',
        };
        return NextResponse.json(response, { status: 500 });
    }
}
