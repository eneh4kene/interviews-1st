import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/utils/database';
import { ApiResponse } from '@interview-me/types';

const jobPreferenceSchema = z.object({
    title: z.string().min(1, 'Job title is required'),
    company: z.string().optional(),
    location: z.string().min(1, 'Location is required'),
    workType: z.enum(['remote', 'hybrid', 'onsite']),
    visaSponsorship: z.boolean().default(false),
    salaryMin: z.number().optional(),
    salaryMax: z.number().optional(),
    currency: z.string().default('GBP'),
});

const clientRegistrationSchema = z.object({
    name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional(),
    location: z.string().min(1),
    linkedinUrl: z.string().url().optional().or(z.literal('')),
    company: z.string().optional(),
    position: z.string().optional(),
    jobPreferences: z.array(jobPreferenceSchema).max(5, 'Maximum 5 job preferences allowed').optional(),
});

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const validatedData = clientRegistrationSchema.parse(body);
        const { name, email, phone, location, linkedinUrl, company, position, jobPreferences = [] } = validatedData;

        // Check if client already exists
        const existingClient = await db.query(
            'SELECT id FROM clients WHERE email = $1',
            [email]
        );

        if (existingClient.rows.length > 0) {
            const response: ApiResponse = {
                success: false,
                error: 'A client with this email already exists',
            };
            return NextResponse.json(response, { status: 409 });
        }

        // Use load-balanced assignment to worker with least clients
        const availableWorkers = await db.query(`
            SELECT u.id, u.name, u.email, COUNT(c.id) as client_count
            FROM users u
            LEFT JOIN clients c ON u.id = c.worker_id AND c.status = 'active'
            WHERE u.role IN ('WORKER', 'MANAGER') AND u.is_active = true
            GROUP BY u.id, u.name, u.email
            ORDER BY client_count ASC, u.last_login_at ASC
            LIMIT 1
        `);

        if (availableWorkers.rows.length === 0) {
            const response: ApiResponse = {
                success: false,
                error: 'No available workers to assign this client',
            };
            return NextResponse.json(response, { status: 503 });
        }

        const workerId = availableWorkers.rows[0].id;
        const workerName = availableWorkers.rows[0].name;
        const clientCount = availableWorkers.rows[0].client_count;

        // Create the client
        const result = await db.query(`
            INSERT INTO clients (worker_id, name, email, phone, linkedin_url, status, payment_status, total_interviews, total_paid, is_new)
            VALUES ($1, $2, $3, $4, $5, 'active', 'pending', 0, 0, true)
            RETURNING 
                id,
                worker_id as "workerId",
                name,
                email,
                phone,
                linkedin_url as "linkedinUrl",
                status,
                payment_status as "paymentStatus",
                total_interviews as "totalInterviews",
                total_paid as "totalPaid",
                is_new as "isNew",
                assigned_at as "assignedAt",
                created_at as "createdAt",
                updated_at as "updatedAt"
        `, [workerId, name, email, phone || null, linkedinUrl || null]);

        const clientId = result.rows[0].id;

        // Create job preferences if provided
        if (jobPreferences && jobPreferences.length > 0) {
            for (const preference of jobPreferences) {
                await db.query(`
                    INSERT INTO job_preferences (
                        client_id, title, company, location, work_type, 
                        visa_sponsorship, salary_min, salary_max, salary_currency, status
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active')
                `, [
                    clientId,
                    preference.title,
                    preference.company || null,
                    preference.location,
                    preference.workType,
                    preference.visaSponsorship,
                    preference.salaryMin || null,
                    preference.salaryMax || null,
                    preference.currency
                ]);
            }
        }

        const response: ApiResponse = {
            success: true,
            data: result.rows[0],
            message: `Client registered successfully. Assigned to ${workerName} (${clientCount + 1} clients). You will be contacted by your assigned career coach soon.`,
        };

        return NextResponse.json(response, { status: 201 });
    } catch (error) {
        console.error('Client registration error:', error);
        const response: ApiResponse = {
            success: false,
            error: 'Failed to register client',
        };
        return NextResponse.json(response, { status: 500 });
    }
}
