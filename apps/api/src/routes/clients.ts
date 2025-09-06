import express from 'express';
import { z } from 'zod';
import { validateRequest } from '../utils/validation';
import { authenticate, authorize, authorizeAny } from '../middleware/auth';
import { clientAssignmentService } from '../services/clientAssignment';
import { ClientService } from '../services/clientService';
import { ApiResponse, Client } from '@interview-me/types';
import { db } from '../utils/database';

const router = express.Router();

// Apply authentication to all client routes
router.use(authenticate);

// Get all clients for a worker
router.get('/', authorizeAny(['WORKER', 'MANAGER', 'ADMIN']), async (req, res) => {
    try {
        const status = req.query.status as string;

        // Get worker ID from authenticated user or query parameter
        let workerId = req.query.workerId as string;

        // If no workerId in query and user is not admin, use their own ID
        if (!workerId) {
            if (req.user?.role === 'ADMIN') {
                const response: ApiResponse = {
                    success: false,
                    error: 'Worker ID is required for admin users',
                };
                return res.status(400).json(response);
            }
            workerId = req.user?.userId as string;
        }

        // Non-admin users can only access their own data
        if (req.user?.role !== 'ADMIN' && workerId !== req.user?.userId) {
            const response: ApiResponse = {
                success: false,
                error: 'Insufficient permissions',
            };
            return res.status(403).json(response);
        }

        let query = `
            SELECT 
                c.id,
                c.worker_id as "workerId",
                c.name,
                c.email,
                c.phone,
                c.linkedin_url as "linkedinUrl",
                c.status,
                c.payment_status as "paymentStatus",
                c.total_interviews as "totalInterviews",
                c.total_paid as "totalPaid",
                c.is_new as "isNew",
                c.assigned_at as "assignedAt",
                c.created_at as "createdAt",
                c.updated_at as "updatedAt"
            FROM clients c
            WHERE c.worker_id = $1
        `;

        const params: any[] = [workerId];

        if (status && status !== 'all') {
            if (status === 'new') {
                // Filter for clients assigned within the last 72 hours
                query += ` AND c.assigned_at > NOW() - INTERVAL '72 hours'`;
            } else {
                query += ` AND c.status = $2`;
                params.push(status);
            }
        }

        query += ` ORDER BY c.assigned_at DESC`;

        const result = await db.query(query, params);

        const response: ApiResponse<Client[]> = {
            success: true,
            data: result.rows,
        };

        res.json(response);
    } catch (error) {
        console.error('Error fetching clients:', error);
        const response: ApiResponse = {
            success: false,
            error: 'Failed to fetch clients',
        };
        res.status(500).json(response);
    }
});

// Get client by ID
router.get('/:id', async (req, res) => {
    try {
        const clientId = req.params.id;

        const result = await db.query(`
            SELECT 
                c.id,
                c.worker_id as "workerId",
                c.name,
                c.email,
                c.phone,
                c.linkedin_url as "linkedinUrl",
                c.status,
                c.payment_status as "paymentStatus",
                c.total_interviews as "totalInterviews",
                c.total_paid as "totalPaid",
                c.is_new as "isNew",
                c.assigned_at as "assignedAt",
                c.created_at as "createdAt",
                c.updated_at as "updatedAt"
            FROM clients c
            WHERE c.id = $1
        `, [clientId]);

        if (result.rows.length === 0) {
            const response: ApiResponse = {
                success: false,
                error: 'Client not found',
            };
            return res.status(404).json(response);
        }

        const response: ApiResponse<Client> = {
            success: true,
            data: result.rows[0],
        };

        res.json(response);
    } catch (error) {
        console.error('Error fetching client:', error);
        const response: ApiResponse = {
            success: false,
            error: 'Failed to fetch client',
        };
        res.status(500).json(response);
    }
});

// Create new client
router.post('/', async (req, res) => {
    try {
        const { workerId, name, email, phone, linkedinUrl } = req.body;

        if (!workerId || !name || !email) {
            const response: ApiResponse = {
                success: false,
                error: 'Worker ID, name, and email are required',
            };
            return res.status(400).json(response);
        }

        const response = await ClientService.createClient(
            { name, email, phone, linkedinUrl, workerId },
            { assignToWorker: workerId }
        );

        const statusCode = response.success ? 201 :
            response.error?.includes('already exists') ? 409 : 400;

        res.status(statusCode).json(response);
    } catch (error) {
        console.error('Error creating client:', error);
        const response: ApiResponse = {
            success: false,
            error: 'Failed to create client',
        };
        res.status(500).json(response);
    }
});

// Auto-assign client (for worker dashboard)
router.post('/auto-assign', async (req, res) => {
    try {
        const { name, email, phone, location, linkedinUrl, company, position } = req.body;

        const response = await ClientService.createClient(
            { name, email, phone, location, linkedinUrl, company, position },
            { autoAssign: true, requireWorker: true }
        );

        const statusCode = response.success ? 201 :
            response.error?.includes('already exists') ? 409 :
                response.error?.includes('No available workers') ? 503 : 400;

        res.status(statusCode).json(response);
    } catch (error) {
        console.error('Error auto-assigning client:', error);
        const response: ApiResponse = {
            success: false,
            error: 'Failed to create client',
        };
        res.status(500).json(response);
    }
});

// Update client
router.put('/:id', async (req, res) => {
    try {
        const clientId = req.params.id;
        const { name, email, phone, linkedinUrl, status, paymentStatus } = req.body;

        const result = await db.query(`
            UPDATE clients 
            SET 
                name = COALESCE($2, name),
                email = COALESCE($3, email),
                phone = COALESCE($4, phone),
                linkedin_url = COALESCE($5, linkedin_url),
                status = COALESCE($6, status),
                payment_status = COALESCE($7, payment_status),
                updated_at = NOW()
            WHERE id = $1
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
        `, [clientId, name, email, phone, linkedinUrl, status, paymentStatus]);

        if (result.rows.length === 0) {
            const response: ApiResponse = {
                success: false,
                error: 'Client not found',
            };
            return res.status(404).json(response);
        }

        const response: ApiResponse<Client> = {
            success: true,
            data: result.rows[0],
            message: 'Client updated successfully',
        };

        res.json(response);
    } catch (error) {
        console.error('Error updating client:', error);
        const response: ApiResponse = {
            success: false,
            error: 'Failed to update client',
        };
        res.status(500).json(response);
    }
});

// Delete client
router.delete('/:id', async (req, res) => {
    try {
        const clientId = req.params.id;

        const result = await db.query('DELETE FROM clients WHERE id = $1 RETURNING id', [clientId]);

        if (result.rows.length === 0) {
            const response: ApiResponse = {
                success: false,
                error: 'Client not found',
            };
            return res.status(404).json(response);
        }

        const response: ApiResponse = {
            success: true,
            message: 'Client deleted successfully',
        };

        res.json(response);
    } catch (error) {
        console.error('Error deleting client:', error);
        const response: ApiResponse = {
            success: false,
            error: 'Failed to delete client',
        };
        res.status(500).json(response);
    }
});

// Get dashboard stats for a worker
router.get('/stats/dashboard', authorizeAny(['WORKER', 'MANAGER', 'ADMIN']), async (req, res) => {
    let workerId: string = '';
    try {
        // Get worker ID from authenticated user or query parameter
        workerId = req.query.workerId as string;

        // If no workerId in query and user is not admin, use their own ID
        if (!workerId) {
            if (req.user?.role === 'ADMIN') {
                const response: ApiResponse = {
                    success: false,
                    error: 'Worker ID is required for admin users',
                };
                return res.status(400).json(response);
            }
            workerId = req.user?.userId as string;
        }

        // Non-admin users can only access their own data
        if (req.user?.role !== 'ADMIN' && workerId !== req.user?.userId) {
            const response: ApiResponse = {
                success: false,
                error: 'Insufficient permissions',
            };
            return res.status(403).json(response);
        }

        // Get client stats
        const clientStats = await db.query(`
            SELECT 
                COUNT(*) as total_clients,
                COUNT(CASE WHEN status = 'active' THEN 1 END) as active_clients,
                COUNT(CASE WHEN is_new = true THEN 1 END) as new_clients,
                COUNT(CASE WHEN status = 'placed' THEN 1 END) as placements_this_month,
                COUNT(CASE WHEN payment_status = 'pending' THEN 1 END) as pending_payments,
                COALESCE(SUM(total_paid), 0) as total_revenue,
                COALESCE(SUM(total_interviews), 0) as interviews_this_month
            FROM clients 
            WHERE worker_id = $1
        `, [workerId]);

        // Get interview stats (more robust approach)
        const interviewStats = await db.query(`
            SELECT 
                COUNT(*) as interviews_scheduled,
                COUNT(CASE WHEN status = 'client_accepted' THEN 1 END) as interviews_accepted,
                COUNT(CASE WHEN status = 'client_declined' THEN 1 END) as interviews_declined
            FROM interviews i
            WHERE i.client_id IN (
                SELECT id FROM clients WHERE worker_id = $1
            )
        `, [workerId]);

        const cs = clientStats.rows[0] || {
            total_clients: '0',
            active_clients: '0',
            new_clients: '0',
            interviews_this_month: '0',
            placements_this_month: '0',
            pending_payments: '0',
            total_revenue: '0',
        } as any;

        const is = interviewStats.rows[0] || {
            interviews_scheduled: '0',
            interviews_accepted: '0',
            interviews_declined: '0',
        } as any;

        const stats: any = {
            totalClients: Number(cs.total_clients || 0),
            activeClients: Number(cs.active_clients || 0),
            newClients: Number(cs.new_clients || 0),
            interviewsThisMonth: Number(cs.interviews_this_month || 0),
            placementsThisMonth: Number(cs.placements_this_month || 0),
            pendingPayments: Number(cs.pending_payments || 0),
            totalRevenue: Number(cs.total_revenue || 0),
            interviewsScheduled: Number(is.interviews_scheduled || 0),
            interviewsAccepted: Number(is.interviews_accepted || 0),
            interviewsDeclined: Number(is.interviews_declined || 0),
        };

        // Calculate success rate
        stats.successRate = stats.interviewsScheduled > 0
            ? Math.round((stats.interviewsAccepted / stats.interviewsScheduled) * 1000) / 10
            : 0;

        const response: ApiResponse<typeof stats> = {
            success: true,
            data: stats,
        };

        res.json(response);
    } catch (error) {
        console.error('Error fetching dashboard stats for workerId:', workerId, 'Error:', error);
        const response: ApiResponse = {
            success: false,
            error: 'Failed to fetch dashboard stats',
        };
        res.status(500).json(response);
    }
});

export default router; 