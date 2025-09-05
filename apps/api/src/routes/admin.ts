import express from 'express';
import { z } from 'zod';
import { validateRequest } from '../utils/validation';
import { authenticate, authorize } from '../middleware/auth';
import { db } from '../utils/database';
import { ApiResponse } from '@interview-me/types';

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(authorize('ADMIN'));

// Platform overview metrics
router.get('/overview', async (req, res) => {
    try {
        // Get platform-wide statistics
        const [
            userStats,
            clientStats,
            workerStats,
            revenueStats,
            interviewStats
        ] = await Promise.all([
            // User statistics
            db.query(`
                SELECT 
                    COUNT(*) as total_users,
                    COUNT(CASE WHEN role = 'WORKER' THEN 1 END) as total_workers,
                    COUNT(CASE WHEN role = 'MANAGER' THEN 1 END) as total_managers,
                    COUNT(CASE WHEN role = 'ADMIN' THEN 1 END) as total_admins,
                    COUNT(CASE WHEN role = 'CLIENT' THEN 1 END) as total_clients,
                    COUNT(CASE WHEN is_active = true THEN 1 END) as active_users,
                    COUNT(CASE WHEN last_login_at > NOW() - INTERVAL '7 days' THEN 1 END) as active_last_week
                FROM users
            `),

            // Client statistics
            db.query(`
                SELECT 
                    COUNT(*) as total_clients,
                    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_clients,
                    COUNT(CASE WHEN status = 'placed' THEN 1 END) as placed_clients,
                    COUNT(CASE WHEN is_new = true THEN 1 END) as new_clients,
                    COUNT(CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN 1 END) as clients_this_month,
                    COUNT(CASE WHEN payment_status = 'pending' THEN 1 END) as pending_payments
                FROM clients
            `),

            // Worker performance statistics
            db.query(`
                SELECT 
                    COUNT(DISTINCT c.worker_id) as active_workers,
                    AVG(client_count) as avg_clients_per_worker,
                    MAX(client_count) as max_clients_per_worker,
                    MIN(client_count) as min_clients_per_worker
                FROM (
                    SELECT 
                        worker_id,
                        COUNT(*) as client_count
                    FROM clients 
                    WHERE status = 'active'
                    GROUP BY worker_id
                ) c
            `),

            // Revenue statistics
            db.query(`
                SELECT 
                    COALESCE(SUM(total_paid), 0) as total_revenue,
                    COALESCE(SUM(CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN total_paid ELSE 0 END), 0) as revenue_this_month,
                    COALESCE(SUM(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN total_paid ELSE 0 END), 0) as revenue_this_week,
                    COALESCE(AVG(total_paid), 0) as avg_revenue_per_client
                FROM clients
            `),

            // Interview statistics
            db.query(`
                SELECT 
                    COUNT(*) as total_interviews,
                    COUNT(CASE WHEN status = 'client_accepted' THEN 1 END) as accepted_interviews,
                    COUNT(CASE WHEN status = 'client_declined' THEN 1 END) as declined_interviews,
                    COUNT(CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN 1 END) as interviews_this_month,
                    COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END) as interviews_this_week
                FROM interviews
            `)
        ]);

        const overview = {
            users: userStats.rows[0],
            clients: clientStats.rows[0],
            workers: workerStats.rows[0],
            revenue: revenueStats.rows[0],
            interviews: interviewStats.rows[0],
            timestamp: new Date().toISOString()
        };

        const response: ApiResponse = {
            success: true,
            data: overview,
            message: 'Platform overview retrieved successfully',
        };

        res.json(response);
    } catch (error) {
        console.error('Error fetching platform overview:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch platform overview',
        });
    }
});

// Recent activity feed
router.get('/activity', async (req, res) => {
    try {
        const { limit = 20 } = req.query;

        // Get recent user registrations
        const recentUsers = await db.query(`
            SELECT 
                'user_registration' as type,
                name,
                email,
                role,
                created_at as timestamp
            FROM users
            ORDER BY created_at DESC
            LIMIT $1
        `, [limit]);

        // Get recent client registrations
        const recentClients = await db.query(`
            SELECT 
                'client_registration' as type,
                c.name,
                c.email,
                u.name as worker_name,
                c.created_at as timestamp
            FROM clients c
            LEFT JOIN users u ON c.worker_id = u.id
            ORDER BY c.created_at DESC
            LIMIT $1
        `, [limit]);

        // Get recent interviews
        const recentInterviews = await db.query(`
            SELECT 
                'interview_scheduled' as type,
                i.title,
                c.name as client_name,
                u.name as worker_name,
                i.created_at as timestamp
            FROM interviews i
            LEFT JOIN clients c ON i.client_id = c.id
            LEFT JOIN users u ON c.worker_id = u.id
            ORDER BY i.created_at DESC
            LIMIT $1
        `, [limit]);

        // Combine and sort all activities
        const activities = [
            ...recentUsers.rows.map(row => ({ ...row, type: 'user_registration' })),
            ...recentClients.rows.map(row => ({ ...row, type: 'client_registration' })),
            ...recentInterviews.rows.map(row => ({ ...row, type: 'interview_scheduled' }))
        ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, parseInt(limit as string));

        const response: ApiResponse = {
            success: true,
            data: activities,
            message: 'Recent activity retrieved successfully',
        };

        res.json(response);
    } catch (error) {
        console.error('Error fetching recent activity:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch recent activity',
        });
    }
});

// System health check
router.get('/health', async (req, res) => {
    try {
        const healthChecks = await Promise.allSettled([
            // Database health
            db.query('SELECT NOW() as db_time'),
            // Redis health (if available)
            Promise.resolve({ rows: [{ redis_time: new Date().toISOString() }] }),
            // API health
            Promise.resolve({ rows: [{ api_time: new Date().toISOString() }] })
        ]);

        const health = {
            database: healthChecks[0].status === 'fulfilled' ? 'healthy' : 'unhealthy',
            redis: healthChecks[1].status === 'fulfilled' ? 'healthy' : 'unhealthy',
            api: healthChecks[2].status === 'fulfilled' ? 'healthy' : 'unhealthy',
            overall: healthChecks.every(check => check.status === 'fulfilled') ? 'healthy' : 'degraded',
            timestamp: new Date().toISOString()
        };

        const response: ApiResponse = {
            success: true,
            data: health,
            message: 'System health retrieved successfully',
        };

        res.json(response);
    } catch (error) {
        console.error('Error checking system health:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to check system health',
        });
    }
});

// Worker performance metrics
router.get('/workers/performance', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT 
                u.id,
                u.name,
                u.email,
                u.last_login_at,
                COUNT(c.id) as total_clients,
                COUNT(CASE WHEN c.status = 'active' THEN 1 END) as active_clients,
                COUNT(CASE WHEN c.status = 'placed' THEN 1 END) as placed_clients,
                COALESCE(SUM(c.total_interviews), 0) as total_interviews,
                COALESCE(SUM(c.total_paid), 0) as total_revenue,
                COALESCE(AVG(c.total_paid), 0) as avg_revenue_per_client
            FROM users u
            LEFT JOIN clients c ON u.id = c.worker_id
            WHERE u.role IN ('WORKER', 'MANAGER')
            GROUP BY u.id, u.name, u.email, u.last_login_at
            ORDER BY total_revenue DESC
        `);

        const response: ApiResponse = {
            success: true,
            data: result.rows,
            message: 'Worker performance metrics retrieved successfully',
        };

        res.json(response);
    } catch (error) {
        console.error('Error fetching worker performance:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch worker performance metrics',
        });
    }
});

// Get all workers
router.get('/workers', async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', status = 'all' } = req.query;
        const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

        let whereClause = "WHERE u.role IN ('WORKER', 'MANAGER')";
        const queryParams: any[] = [];
        let paramCount = 0;

        if (search) {
            paramCount++;
            whereClause += ` AND (u.name ILIKE $${paramCount} OR u.email ILIKE $${paramCount})`;
            queryParams.push(`%${search}%`);
        }

        if (status !== 'all') {
            paramCount++;
            whereClause += ` AND u.is_active = $${paramCount}`;
            queryParams.push(status === 'active');
        }

        const result = await db.query(`
            SELECT 
                u.id,
                u.name,
                u.email,
                u.role,
                u.is_active,
                u.two_factor_enabled,
                u.last_login_at,
                u.created_at,
                u.updated_at,
                COUNT(c.id) as total_clients,
                COUNT(CASE WHEN c.status = 'active' THEN 1 END) as active_clients,
                COUNT(CASE WHEN c.status = 'placed' THEN 1 END) as placed_clients,
                COALESCE(SUM(c.total_interviews), 0) as total_interviews,
                COALESCE(SUM(c.total_paid), 0) as total_revenue
            FROM users u
            LEFT JOIN clients c ON u.id = c.worker_id
            ${whereClause}
            GROUP BY u.id, u.name, u.email, u.role, u.is_active, u.two_factor_enabled, u.last_login_at, u.created_at, u.updated_at
            ORDER BY u.created_at DESC
            LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
        `, [...queryParams, parseInt(limit as string), offset]);

        // Get total count for pagination
        const countResult = await db.query(`
            SELECT COUNT(*) as total
            FROM users u
            ${whereClause}
        `, queryParams);

        const response: ApiResponse = {
            success: true,
            data: {
                workers: result.rows,
                pagination: {
                    page: parseInt(page as string),
                    limit: parseInt(limit as string),
                    total: parseInt(countResult.rows[0].total),
                    pages: Math.ceil(parseInt(countResult.rows[0].total) / parseInt(limit as string))
                }
            },
            message: 'Workers retrieved successfully',
        };

        res.json(response);
    } catch (error) {
        console.error('Error fetching workers:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch workers',
        });
    }
});

// Get single worker
router.get('/workers/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await db.query(`
            SELECT 
                u.id,
                u.name,
                u.email,
                u.role,
                u.is_active,
                u.two_factor_enabled,
                u.last_login_at,
                u.created_at,
                u.updated_at,
                COUNT(c.id) as total_clients,
                COUNT(CASE WHEN c.status = 'active' THEN 1 END) as active_clients,
                COUNT(CASE WHEN c.status = 'placed' THEN 1 END) as placed_clients,
                COALESCE(SUM(c.total_interviews), 0) as total_interviews,
                COALESCE(SUM(c.total_paid), 0) as total_revenue
            FROM users u
            LEFT JOIN clients c ON u.id = c.worker_id
            WHERE u.id = $1 AND u.role IN ('WORKER', 'MANAGER')
            GROUP BY u.id, u.name, u.email, u.role, u.is_active, u.two_factor_enabled, u.last_login_at, u.created_at, u.updated_at
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Worker not found',
            });
        }

        const response: ApiResponse = {
            success: true,
            data: result.rows[0],
            message: 'Worker retrieved successfully',
        };

        res.json(response);
    } catch (error) {
        console.error('Error fetching worker:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch worker',
        });
    }
});

// Create new worker
router.post('/workers', async (req, res) => {
    try {
        const { name, email, password, role = 'WORKER', isActive = true, twoFactorEnabled = false } = req.body;

        // Validate required fields
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Name, email, and password are required',
            });
        }

        // Check if user already exists
        const existingUser = await db.query(
            'SELECT id FROM users WHERE email = $1',
            [email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'User with this email already exists',
            });
        }

        // Hash password
        const bcrypt = require('bcryptjs');
        const passwordHash = await bcrypt.hash(password, 10);

        // Create worker
        const result = await db.query(`
            INSERT INTO users (name, email, role, password_hash, is_active, two_factor_enabled)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, name, email, role, is_active, two_factor_enabled, created_at, updated_at
        `, [name, email, role, passwordHash, isActive, twoFactorEnabled]);

        const response: ApiResponse = {
            success: true,
            data: result.rows[0],
            message: 'Worker created successfully',
        };

        res.status(201).json(response);
    } catch (error) {
        console.error('Error creating worker:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create worker',
        });
    }
});

// Update worker
router.put('/workers/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, role, isActive, twoFactorEnabled } = req.body;

        // Check if worker exists
        const existingWorker = await db.query(
            'SELECT id FROM users WHERE id = $1 AND role IN (\'WORKER\', \'MANAGER\')',
            [id]
        );

        if (existingWorker.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Worker not found',
            });
        }

        // Check if email is already taken by another user
        if (email) {
            const emailCheck = await db.query(
                'SELECT id FROM users WHERE email = $1 AND id != $2',
                [email, id]
            );

            if (emailCheck.rows.length > 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Email already taken by another user',
                });
            }
        }

        // Build update query dynamically
        const updateFields = [];
        const updateValues = [];
        let paramCount = 0;

        if (name !== undefined) {
            paramCount++;
            updateFields.push(`name = $${paramCount}`);
            updateValues.push(name);
        }

        if (email !== undefined) {
            paramCount++;
            updateFields.push(`email = $${paramCount}`);
            updateValues.push(email);
        }

        if (role !== undefined) {
            paramCount++;
            updateFields.push(`role = $${paramCount}`);
            updateValues.push(role);
        }

        if (isActive !== undefined) {
            paramCount++;
            updateFields.push(`is_active = $${paramCount}`);
            updateValues.push(isActive);
        }

        if (twoFactorEnabled !== undefined) {
            paramCount++;
            updateFields.push(`two_factor_enabled = $${paramCount}`);
            updateValues.push(twoFactorEnabled);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No fields to update',
            });
        }

        updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
        updateValues.push(id);

        const result = await db.query(`
            UPDATE users 
            SET ${updateFields.join(', ')}
            WHERE id = $${paramCount + 1}
            RETURNING id, name, email, role, is_active, two_factor_enabled, last_login_at, created_at, updated_at
        `, updateValues);

        const response: ApiResponse = {
            success: true,
            data: result.rows[0],
            message: 'Worker updated successfully',
        };

        res.json(response);
    } catch (error) {
        console.error('Error updating worker:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update worker',
        });
    }
});

// Delete worker (soft delete by deactivating)
router.delete('/workers/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Check if worker exists
        const existingWorker = await db.query(
            'SELECT id, name FROM users WHERE id = $1 AND role IN (\'WORKER\', \'MANAGER\')',
            [id]
        );

        if (existingWorker.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Worker not found',
            });
        }

        // Check if worker has active clients
        const activeClients = await db.query(
            'SELECT COUNT(*) as count FROM clients WHERE worker_id = $1 AND status = \'active\'',
            [id]
        );

        if (parseInt(activeClients.rows[0].count) > 0) {
            return res.status(400).json({
                success: false,
                error: 'Cannot delete worker with active clients. Please reassign clients first.',
            });
        }

        // Soft delete by deactivating
        await db.query(
            'UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
            [id]
        );

        const response: ApiResponse = {
            success: true,
            message: 'Worker deactivated successfully',
        };

        res.json(response);
    } catch (error) {
        console.error('Error deleting worker:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete worker',
        });
    }
});

// Reactivate worker
router.post('/workers/:id/reactivate', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await db.query(`
            UPDATE users 
            SET is_active = true, updated_at = CURRENT_TIMESTAMP 
            WHERE id = $1 AND role IN ('WORKER', 'MANAGER')
            RETURNING id, name, email, role, is_active, updated_at
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Worker not found',
            });
        }

        const response: ApiResponse = {
            success: true,
            data: result.rows[0],
            message: 'Worker reactivated successfully',
        };

        res.json(response);
    } catch (error) {
        console.error('Error reactivating worker:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to reactivate worker',
        });
    }
});

export default router;
