import { db } from '../utils/database';
import { Client, User } from '@interview-me/types';

export interface AssignmentResult {
    success: boolean;
    clientId?: string;
    workerId?: string;
    error?: string;
}

export class ClientAssignmentService {
    // Get available workers (WORKER role, active)
    private async getAvailableWorkers(): Promise<User[]> {
        const result = await db.query(
            'SELECT * FROM users WHERE role = $1 AND is_active = $2 ORDER BY last_login_at ASC',
            ['WORKER', true]
        );
        return result.rows;
    }

    // Get worker with least clients
    private async getWorkerWithLeastClients(): Promise<User | null> {
        const result = await db.query(`
      SELECT u.*, COUNT(c.id) as client_count
      FROM users u
      LEFT JOIN clients c ON u.id = c.worker_id AND c.status = 'active'
      WHERE u.role = 'WORKER' AND u.is_active = true
      GROUP BY u.id
      ORDER BY client_count ASC, u.last_login_at ASC
      LIMIT 1
    `);

        return result.rows[0] || null;
    }

    // Auto-assign a new client to a worker
    async autoAssignClient(clientData: Omit<Client, 'id' | 'workerId' | 'isNew' | 'assignedAt' | 'createdAt' | 'updatedAt'>): Promise<AssignmentResult> {
        try {
            // Get worker with least clients
            const worker = await this.getWorkerWithLeastClients();

            if (!worker) {
                return {
                    success: false,
                    error: 'No available workers found'
                };
            }

            // Insert client with auto-assignment
            const result = await db.query(`
        INSERT INTO clients (
          worker_id, name, email, phone, linkedin_url, profile_picture,
          status, payment_status, total_interviews, total_paid,
          is_new, assigned_at, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *
      `, [
                worker.id,
                clientData.name,
                clientData.email,
                clientData.phone,
                clientData.linkedinUrl,
                clientData.profilePicture,
                'active',
                'pending',
                0,
                0,
                true,
                new Date(),
                new Date(),
                new Date()
            ]);

            const assignedClient = result.rows[0];

            // Schedule removal of "new" status after 72 hours
            setTimeout(async () => {
                try {
                    await db.query(
                        'UPDATE clients SET is_new = false WHERE id = $1',
                        [assignedClient.id]
                    );
                    console.log(`Removed "new" status from client ${assignedClient.id}`);
                } catch (error) {
                    console.error('Error removing new status:', error);
                }
            }, 72 * 60 * 60 * 1000); // 72 hours

            return {
                success: true,
                clientId: assignedClient.id,
                workerId: worker.id
            };
        } catch (error) {
            console.error('Auto-assignment error:', error);
            return {
                success: false,
                error: 'Failed to auto-assign client'
            };
        }
    }

    // Reassign client to different worker
    async reassignClient(clientId: string, newWorkerId: string): Promise<AssignmentResult> {
        try {
            // Verify new worker exists and is active
            const workerResult = await db.query(
                'SELECT * FROM users WHERE id = $1 AND role = $2 AND is_active = $3',
                [newWorkerId, 'WORKER', true]
            );

            if (workerResult.rows.length === 0) {
                return {
                    success: false,
                    error: 'Invalid worker ID or worker not available'
                };
            }

            // Update client assignment
            await db.query(
                'UPDATE clients SET worker_id = $1, assigned_at = $2, updated_at = $3 WHERE id = $4',
                [newWorkerId, new Date(), new Date(), clientId]
            );

            return {
                success: true,
                clientId,
                workerId: newWorkerId
            };
        } catch (error) {
            console.error('Reassignment error:', error);
            return {
                success: false,
                error: 'Failed to reassign client'
            };
        }
    }

    // Get clients for a specific worker
    async getWorkerClients(workerId: string, status?: string): Promise<Client[]> {
        try {
            let query = 'SELECT * FROM clients WHERE worker_id = $1';
            const params = [workerId];

            if (status) {
                query += ' AND status = $2';
                params.push(status);
            }

            query += ' ORDER BY created_at DESC';

            const result = await db.query(query, params);
            return result.rows;
        } catch (error) {
            console.error('Get worker clients error:', error);
            return [];
        }
    }

    // Get new clients (assigned in last 72 hours)
    async getNewClients(workerId?: string): Promise<Client[]> {
        try {
            let query = `
        SELECT * FROM clients 
        WHERE is_new = true 
        AND assigned_at > NOW() - INTERVAL '72 hours'
      `;
            const params: string[] = [];

            if (workerId) {
                query += ' AND worker_id = $1';
                params.push(workerId);
            }

            query += ' ORDER BY assigned_at DESC';

            const result = await db.query(query, params);
            return result.rows;
        } catch (error) {
            console.error('Get new clients error:', error);
            return [];
        }
    }

    // Get assignment statistics
    async getAssignmentStats(): Promise<{
        totalWorkers: number;
        totalClients: number;
        averageClientsPerWorker: number;
        newClients: number;
    }> {
        try {
            const workersResult = await db.query(
                'SELECT COUNT(*) as count FROM users WHERE role = $1 AND is_active = $2',
                ['WORKER', true]
            );

            const clientsResult = await db.query(
                'SELECT COUNT(*) as count FROM clients WHERE status = $1',
                ['active']
            );

            const newClientsResult = await db.query(
                'SELECT COUNT(*) as count FROM clients WHERE is_new = true AND assigned_at > NOW() - INTERVAL \'72 hours\''
            );

            const totalWorkers = parseInt(workersResult.rows[0].count);
            const totalClients = parseInt(clientsResult.rows[0].count);
            const newClients = parseInt(newClientsResult.rows[0].count);

            return {
                totalWorkers,
                totalClients,
                averageClientsPerWorker: totalWorkers > 0 ? totalClients / totalWorkers : 0,
                newClients
            };
        } catch (error) {
            console.error('Get assignment stats error:', error);
            return {
                totalWorkers: 0,
                totalClients: 0,
                averageClientsPerWorker: 0,
                newClients: 0
            };
        }
    }
}

export const clientAssignmentService = new ClientAssignmentService(); 