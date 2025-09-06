import { db } from '../utils/database';
import { redis } from '../utils/database';
import { Interview, InterviewOffer, Client } from '@interview-me/types';
import crypto from 'crypto';

export interface SchedulingResult {
    success: boolean;
    interviewId?: string;
    offerId?: string;
    magicLink?: string;
    error?: string;
}

export interface InterviewOfferData {
    interviewId: string;
    clientId: string;
    expiresAt: Date;
}

export class InterviewSchedulingService {
    // Schedule an interview
    async scheduleInterview(interviewData: Omit<Interview, 'id' | 'status' | 'paymentStatus' | 'createdAt' | 'updatedAt'>): Promise<SchedulingResult> {
        try {
            // Verify client exists
            const clientResult = await db.query(
                'SELECT * FROM clients WHERE id = $1',
                [interviewData.clientId]
            );

            if (clientResult.rows.length === 0) {
                return {
                    success: false,
                    error: 'Client not found'
                };
            }

            // Insert interview
            const result = await db.query(`
        INSERT INTO interviews (
          application_id, client_id, company_name, job_title,
          scheduled_date, interview_type, status, payment_status,
          payment_amount, payment_currency, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `, [
                interviewData.applicationId,
                interviewData.clientId,
                interviewData.companyName,
                interviewData.jobTitle,
                interviewData.scheduledDate,
                interviewData.interviewType,
                'scheduled',
                'pending',
                interviewData.paymentAmount || 10.00,
                interviewData.paymentCurrency || 'GBP',
                new Date(),
                new Date()
            ]);

            const interview = result.rows[0];

            // Generate magic link offer
            const offerResult = await this.generateMagicLinkOffer({
                interviewId: interview.id,
                clientId: interviewData.clientId,
                expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000) // 48 hours
            });

            if (!offerResult.success) {
                return {
                    success: false,
                    error: 'Failed to generate magic link offer'
                };
            }

            return {
                success: true,
                interviewId: interview.id,
                offerId: offerResult.offerId,
                magicLink: offerResult.magicLink
            };
        } catch (error) {
            console.error('Schedule interview error:', error);
            return {
                success: false,
                error: 'Failed to schedule interview'
            };
        }
    }

    // Generate magic link offer
    async generateMagicLinkOffer(offerData: InterviewOfferData): Promise<SchedulingResult> {
        try {
            // Generate secure token
            const token = crypto.randomBytes(32).toString('hex');

            // Insert offer
            const result = await db.query(`
        INSERT INTO interview_offers (
          interview_id, client_id, token, status, expires_at,
          payment_status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
                offerData.interviewId,
                offerData.clientId,
                token,
                'SENT',
                offerData.expiresAt,
                'PENDING',
                new Date(),
                new Date()
            ]);

            const offer = result.rows[0];

            // Store in Redis for quick lookup
            await redis.set(
                `interview_offer:${token}`,
                JSON.stringify(offer),
                48 * 60 * 60 // 48 hours
            );

            // Generate magic link
            const magicLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/offer/${token}`;

            return {
                success: true,
                offerId: offer.id,
                magicLink
            };
        } catch (error) {
            console.error('Generate magic link error:', error);
            return {
                success: false,
                error: 'Failed to generate magic link'
            };
        }
    }

    // Get interview offer by token
    async getInterviewOffer(token: string): Promise<InterviewOffer | null> {
        try {
            // Try Redis first
            const cachedOffer = await redis.get(`interview_offer:${token}`);
            if (cachedOffer) {
                return JSON.parse(cachedOffer);
            }

            // Fallback to database
            const result = await db.query(`
        SELECT io.*, i.*, c.name as client_name, c.email as client_email
        FROM interview_offers io
        JOIN interviews i ON io.interview_id = i.id
        JOIN clients c ON io.client_id = c.id
        WHERE io.token = $1 AND io.status = 'SENT' AND io.expires_at > NOW()
      `, [token]);

            if (result.rows.length === 0) {
                return null;
            }

            const offer = result.rows[0];

            // Cache in Redis
            await redis.set(
                `interview_offer:${token}`,
                JSON.stringify(offer),
                48 * 60 * 60
            );

            return offer;
        } catch (error) {
            console.error('Get interview offer error:', error);
            return null;
        }
    }

    // Accept interview offer
    async acceptInterviewOffer(token: string, stripeSessionId?: string): Promise<SchedulingResult> {
        try {
            const offer = await this.getInterviewOffer(token);

            if (!offer) {
                return {
                    success: false,
                    error: 'Invalid or expired offer'
                };
            }

            // Update offer status
            await db.query(`
        UPDATE interview_offers 
        SET status = 'ACCEPTED', accepted_at = $1, payment_status = $2, stripe_session_id = $3, updated_at = $4
        WHERE token = $5
      `, [
                new Date(),
                stripeSessionId ? 'PAID' : 'PENDING',
                stripeSessionId,
                new Date(),
                token
            ]);

            // Update interview status
            await db.query(`
        UPDATE interviews 
        SET status = 'client_accepted', client_response_date = $1, updated_at = $2
        WHERE id = $3
      `, [
                new Date(),
                new Date(),
                offer.interviewId
            ]);

            // Remove from Redis cache
            await redis.del(`interview_offer:${token}`);

            return {
                success: true,
                interviewId: offer.interviewId
            };
        } catch (error) {
            console.error('Accept interview offer error:', error);
            return {
                success: false,
                error: 'Failed to accept interview offer'
            };
        }
    }

    // Decline interview offer
    async declineInterviewOffer(token: string, notes?: string): Promise<SchedulingResult> {
        try {
            const offer = await this.getInterviewOffer(token);

            if (!offer) {
                return {
                    success: false,
                    error: 'Invalid or expired offer'
                };
            }

            // Update offer status
            await db.query(`
        UPDATE interview_offers 
        SET status = 'DECLINED', declined_at = $1, updated_at = $2
        WHERE token = $3
      `, [
                new Date(),
                new Date(),
                token
            ]);

            // Update interview status
            await db.query(`
        UPDATE interviews 
        SET status = 'client_declined', client_response_date = $1, client_response_notes = $2, updated_at = $3
        WHERE id = $4
      `, [
                new Date(),
                notes,
                new Date(),
                offer.interviewId
            ]);

            // Remove from Redis cache
            await redis.del(`interview_offer:${token}`);

            return {
                success: true,
                interviewId: offer.interviewId
            };
        } catch (error) {
            console.error('Decline interview offer error:', error);
            return {
                success: false,
                error: 'Failed to decline interview offer'
            };
        }
    }

    // Get interviews for a client
    async getClientInterviews(clientId: string): Promise<Interview[]> {
        try {
            const result = await db.query(`
        SELECT * FROM interviews 
        WHERE client_id = $1 
        ORDER BY scheduled_date DESC
      `, [clientId]);

            return result.rows;
        } catch (error) {
            console.error('Get client interviews error:', error);
            return [];
        }
    }

    // Get interviews for a worker
    async getWorkerInterviews(workerId: string): Promise<Interview[]> {
        try {
            const result = await db.query(`
        SELECT i.* FROM interviews i
        JOIN clients c ON i.client_id = c.id
        WHERE c.worker_id = $1
        ORDER BY i.scheduled_date DESC
      `, [workerId]);

            return result.rows;
        } catch (error) {
            console.error('Get worker interviews error:', error);
            return [];
        }
    }

    // Update interview status
    async updateInterviewStatus(interviewId: string, status: string, notes?: string): Promise<SchedulingResult> {
        try {
            await db.query(`
        UPDATE interviews 
        SET status = $1, worker_notes = $2, updated_at = $3
        WHERE id = $4
      `, [status, notes, new Date(), interviewId]);

            return {
                success: true,
                interviewId
            };
        } catch (error) {
            console.error('Update interview status error:', error);
            return {
                success: false,
                error: 'Failed to update interview status'
            };
        }
    }

    // Clean up expired offers
    async cleanupExpiredOffers(): Promise<void> {
        try {
            await db.query(`
        UPDATE interview_offers 
        SET status = 'EXPIRED', updated_at = $1
        WHERE status = 'SENT' AND expires_at < NOW()
      `, [new Date()]);

            console.log('Cleaned up expired interview offers');
        } catch (error) {
            console.error('Cleanup expired offers error:', error);
        }
    }
}

export const interviewSchedulingService = new InterviewSchedulingService();

// Schedule cleanup job to run every hour
setInterval(() => {
    interviewSchedulingService.cleanupExpiredOffers();
}, 60 * 60 * 1000); // 1 hour 