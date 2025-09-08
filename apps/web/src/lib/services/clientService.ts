import { db } from '../utils/database';
import { ApiResponse, Client } from '@interview-me/types';

export interface CreateClientData {
    name: string;
    email: string;
    phone?: string;
    location?: string;
    linkedinUrl?: string;
    company?: string;
    position?: string;
    status?: string;
    workerId?: string; // Optional - for manual assignment
    autoAssign?: boolean; // Whether to auto-assign to available worker
}

export interface CreateClientOptions {
    assignToWorker?: string; // Specific worker ID
    autoAssign?: boolean; // Auto-assign to least busy worker
    requireWorker?: boolean; // Whether worker assignment is required
}

export class ClientService {
    /**
     * Unified client creation service
     * Handles all client creation scenarios with proper validation and assignment
     */
    static async createClient(
        data: CreateClientData,
        options: CreateClientOptions = {}
    ): Promise<ApiResponse<Client>> {
        try {
            const {
                name,
                email,
                phone,
                location,
                linkedinUrl,
                company,
                position,
                status = 'active',
                workerId,
                autoAssign = false
            } = data;

            const {
                assignToWorker,
                autoAssign: shouldAutoAssign = autoAssign,
                requireWorker = false
            } = options;

            // Validate required fields
            if (!name || !email) {
                return {
                    success: false,
                    error: 'Name and email are required',
                };
            }

            // Check if client already exists
            const existingClient = await db.query(
                'SELECT id FROM clients WHERE email = $1',
                [email]
            );

            if (existingClient.rows.length > 0) {
                return {
                    success: false,
                    error: 'A client with this email already exists',
                };
            }

            // Determine worker assignment
            let assignedWorkerId: string | null = null;
            let assignmentMessage = '';

            if (assignToWorker) {
                // Manual assignment to specific worker
                const workerCheck = await db.query(
                    'SELECT id, name FROM users WHERE id = $1 AND role IN ($2, $3) AND is_active = true',
                    [assignToWorker, 'WORKER', 'MANAGER']
                );

                if (workerCheck.rows.length === 0) {
                    return {
                        success: false,
                        error: 'Invalid worker ID or worker not found',
                    };
                }

                assignedWorkerId = assignToWorker;
                assignmentMessage = `Assigned to ${workerCheck.rows[0].name}`;
            } else if (shouldAutoAssign || requireWorker) {
                // Auto-assign to least busy worker
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
                    return {
                        success: false,
                        error: 'No available workers to assign this client',
                    };
                }

                assignedWorkerId = availableWorkers.rows[0].id;
                const workerName = availableWorkers.rows[0].name;
                const clientCount = availableWorkers.rows[0].client_count;
                assignmentMessage = `Auto-assigned to ${workerName} (${clientCount + 1} clients)`;
            } else if (workerId) {
                // Use provided worker ID
                assignedWorkerId = workerId;
            }

            // Create the client
            const result = await db.query(`
                INSERT INTO clients (
                    worker_id, name, email, phone, linkedin_url, 
                    status, payment_status, total_interviews, total_paid, is_new, assigned_at
                )
                VALUES ($1, $2, $3, $4, $5, $6, 'pending', 0, 0, true, NOW())
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
            `, [
                assignedWorkerId,
                name,
                email,
                phone || null,
                linkedinUrl || null,
                status
            ]);

            const response: ApiResponse<Client> = {
                success: true,
                data: result.rows[0],
                message: `Client created successfully. ${assignmentMessage}`,
            };

            return response;
        } catch (error) {
            console.error('Error creating client:', error);
            return {
                success: false,
                error: 'Failed to create client',
            };
        }
    }

    /**
     * Get client by ID with optional worker validation
     */
    static async getClient(id: string, workerId?: string): Promise<ApiResponse<Client>> {
        try {
            let query = `
                SELECT 
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
                FROM clients 
                WHERE id = $1
            `;
            const params = [id];

            if (workerId) {
                query += ' AND worker_id = $2';
                params.push(workerId);
            }

            const result = await db.query(query, params);

            if (result.rows.length === 0) {
                return {
                    success: false,
                    error: 'Client not found',
                };
            }

            return {
                success: true,
                data: result.rows[0],
                message: 'Client retrieved successfully',
            };
        } catch (error) {
            console.error('Error getting client:', error);
            return {
                success: false,
                error: 'Failed to get client',
            };
        }
    }
}
