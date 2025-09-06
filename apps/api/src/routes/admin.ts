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
                i.job_title as title,
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

// ==================== ANALYTICS & REPORTING ====================

// Get platform analytics overview
router.get('/analytics/overview', async (req, res) => {
    try {
        const { period = '30d' } = req.query;

        // Calculate date range based on period
        let dateFilter = '';
        let dateParams: any[] = [];

        switch (period) {
            case '7d':
                dateFilter = 'AND created_at >= NOW() - INTERVAL \'7 days\'';
                break;
            case '30d':
                dateFilter = 'AND created_at >= NOW() - INTERVAL \'30 days\'';
                break;
            case '90d':
                dateFilter = 'AND created_at >= NOW() - INTERVAL \'90 days\'';
                break;
            case '1y':
                dateFilter = 'AND created_at >= NOW() - INTERVAL \'1 year\'';
                break;
        }

        // Get user growth metrics
        const userGrowth = await db.query(`
            SELECT 
                DATE_TRUNC('day', created_at) as date,
                COUNT(*) as new_users,
                COUNT(CASE WHEN role = 'CLIENT' THEN 1 END) as new_clients,
                COUNT(CASE WHEN role IN ('WORKER', 'MANAGER') THEN 1 END) as new_workers
            FROM users 
            WHERE created_at >= NOW() - INTERVAL '30 days'
            GROUP BY DATE_TRUNC('day', created_at)
            ORDER BY date ASC
        `);

        // Get revenue metrics
        const revenueMetrics = await db.query(`
            SELECT 
                COALESCE(SUM(total_paid), 0) as total_revenue,
                COALESCE(SUM(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN total_paid ELSE 0 END), 0) as revenue_30d,
                COALESCE(SUM(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN total_paid ELSE 0 END), 0) as revenue_7d,
                COUNT(CASE WHEN status = 'active' THEN 1 END) as active_clients,
                COUNT(CASE WHEN status = 'placed' THEN 1 END) as placed_clients
            FROM clients
        `);

        // Get interview success metrics
        const interviewMetrics = await db.query(`
            SELECT 
                COUNT(*) as total_interviews,
                COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted_interviews,
                COUNT(CASE WHEN status = 'declined' THEN 1 END) as declined_interviews,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_interviews,
                ROUND(
                    COUNT(CASE WHEN status = 'accepted' THEN 1 END)::decimal / 
                    NULLIF(COUNT(*), 0) * 100, 2
                ) as success_rate
            FROM interviews
            WHERE created_at >= NOW() - INTERVAL '30 days'
        `);

        // Get worker performance metrics
        const workerPerformance = await db.query(`
            SELECT 
                u.id,
                u.name,
                u.email,
                u.role,
                COUNT(DISTINCT c.id) as total_clients,
                COUNT(DISTINCT CASE WHEN c.status = 'active' THEN c.id END) as active_clients,
                COUNT(DISTINCT CASE WHEN c.status = 'placed' THEN c.id END) as placed_clients,
                COALESCE(SUM(c.total_paid), 0) as total_revenue,
                COUNT(DISTINCT i.id) as total_interviews,
                COUNT(DISTINCT CASE WHEN i.status = 'accepted' THEN i.id END) as successful_interviews,
                ROUND(
                    COUNT(DISTINCT CASE WHEN i.status = 'accepted' THEN i.id END)::decimal / 
                    NULLIF(COUNT(DISTINCT i.id), 0) * 100, 2
                ) as success_rate
            FROM users u
            LEFT JOIN clients c ON u.id = c.worker_id
            LEFT JOIN interviews i ON c.id = i.client_id
            WHERE u.role IN ('WORKER', 'MANAGER')
            GROUP BY u.id, u.name, u.email, u.role
            ORDER BY total_revenue DESC
        `);

        // Get platform health metrics
        const platformHealth = await db.query(`
            SELECT 
                COUNT(CASE WHEN is_active = true THEN 1 END) as active_users,
                COUNT(CASE WHEN last_login_at >= NOW() - INTERVAL '7 days' THEN 1 END) as active_last_7d,
                COUNT(CASE WHEN last_login_at >= NOW() - INTERVAL '30 days' THEN 1 END) as active_last_30d,
                COUNT(CASE WHEN two_factor_enabled = true THEN 1 END) as users_with_2fa
            FROM users
        `);

        const response: ApiResponse = {
            success: true,
            data: {
                period,
                userGrowth: userGrowth.rows,
                revenue: revenueMetrics.rows[0],
                interviews: interviewMetrics.rows[0],
                workerPerformance: workerPerformance.rows,
                platformHealth: platformHealth.rows[0],
                generatedAt: new Date().toISOString()
            }
        };

        res.json(response);
    } catch (error) {
        console.error('Error fetching analytics overview:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch analytics overview',
        });
    }
});

// Get detailed revenue analytics
router.get('/analytics/revenue', async (req, res) => {
    try {
        const { period = '30d', groupBy = 'day' } = req.query;

        let dateFilter = '';
        let groupByClause = '';

        switch (period) {
            case '7d':
                dateFilter = 'AND created_at >= NOW() - INTERVAL \'7 days\'';
                break;
            case '30d':
                dateFilter = 'AND created_at >= NOW() - INTERVAL \'30 days\'';
                break;
            case '90d':
                dateFilter = 'AND created_at >= NOW() - INTERVAL \'90 days\'';
                break;
            case '1y':
                dateFilter = 'AND created_at >= NOW() - INTERVAL \'1 year\'';
                break;
        }

        switch (groupBy) {
            case 'day':
                groupByClause = 'DATE_TRUNC(\'day\', created_at)';
                break;
            case 'week':
                groupByClause = 'DATE_TRUNC(\'week\', created_at)';
                break;
            case 'month':
                groupByClause = 'DATE_TRUNC(\'month\', created_at)';
                break;
        }

        const revenueData = await db.query(`
            SELECT 
                ${groupByClause} as period,
                SUM(total_paid) as revenue,
                COUNT(*) as transactions,
                AVG(total_paid) as avg_transaction_value,
                COUNT(DISTINCT worker_id) as active_workers
            FROM clients 
            WHERE total_paid > 0 ${dateFilter}
            GROUP BY ${groupByClause}
            ORDER BY period ASC
        `);

        // Get revenue by worker
        const revenueByWorker = await db.query(`
            SELECT 
                u.name as worker_name,
                u.email,
                COUNT(c.id) as client_count,
                SUM(c.total_paid) as total_revenue,
                AVG(c.total_paid) as avg_revenue_per_client
            FROM users u
            LEFT JOIN clients c ON u.id = c.worker_id
            WHERE u.role IN ('WORKER', 'MANAGER') 
            AND c.total_paid > 0 ${dateFilter}
            GROUP BY u.id, u.name, u.email
            ORDER BY total_revenue DESC
        `);

        const response: ApiResponse = {
            success: true,
            data: {
                period,
                groupBy,
                revenueData: revenueData.rows,
                revenueByWorker: revenueByWorker.rows,
                generatedAt: new Date().toISOString()
            }
        };

        res.json(response);
    } catch (error) {
        console.error('Error fetching revenue analytics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch revenue analytics',
        });
    }
});

// Get user engagement analytics
router.get('/analytics/engagement', async (req, res) => {
    try {
        const { period = '30d' } = req.query;

        let dateFilter = '';
        switch (period) {
            case '7d':
                dateFilter = 'AND created_at >= NOW() - INTERVAL \'7 days\'';
                break;
            case '30d':
                dateFilter = 'AND created_at >= NOW() - INTERVAL \'30 days\'';
                break;
            case '90d':
                dateFilter = 'AND created_at >= NOW() - INTERVAL \'90 days\'';
                break;
        }

        // User activity metrics
        const userActivity = await db.query(`
            SELECT 
                role,
                COUNT(*) as total_users,
                COUNT(CASE WHEN last_login_at >= NOW() - INTERVAL '1 day' THEN 1 END) as active_1d,
                COUNT(CASE WHEN last_login_at >= NOW() - INTERVAL '7 days' THEN 1 END) as active_7d,
                COUNT(CASE WHEN last_login_at >= NOW() - INTERVAL '30 days' THEN 1 END) as active_30d,
                COUNT(CASE WHEN last_login_at IS NULL THEN 1 END) as never_logged_in
            FROM users
            GROUP BY role
        `);

        // Client journey metrics
        const clientJourney = await db.query(`
            SELECT 
                status,
                COUNT(*) as count,
                AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/86400) as avg_days_to_status
            FROM clients
            GROUP BY status
        `);

        // Interview engagement
        const interviewEngagement = await db.query(`
            SELECT 
                DATE_TRUNC('day', created_at) as date,
                COUNT(*) as total_interviews,
                COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted,
                COUNT(CASE WHEN status = 'declined' THEN 1 END) as declined,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending
            FROM interviews
            WHERE created_at >= NOW() - INTERVAL '30 days'
            GROUP BY DATE_TRUNC('day', created_at)
            ORDER BY date ASC
        `);

        const response: ApiResponse = {
            success: true,
            data: {
                period,
                userActivity: userActivity.rows,
                clientJourney: clientJourney.rows,
                interviewEngagement: interviewEngagement.rows,
                generatedAt: new Date().toISOString()
            }
        };

        res.json(response);
    } catch (error) {
        console.error('Error fetching engagement analytics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch engagement analytics',
        });
    }
});

// Get worker performance analytics
router.get('/analytics/workers', async (req, res) => {
    try {
        const { period = '30d', sortBy = 'revenue' } = req.query;

        let dateFilter = '';
        switch (period) {
            case '7d':
                dateFilter = 'AND c.created_at >= NOW() - INTERVAL \'7 days\'';
                break;
            case '30d':
                dateFilter = 'AND c.created_at >= NOW() - INTERVAL \'30 days\'';
                break;
            case '90d':
                dateFilter = 'AND c.created_at >= NOW() - INTERVAL \'90 days\'';
                break;
        }

        let orderBy = 'total_revenue DESC';
        switch (sortBy) {
            case 'clients':
                orderBy = 'total_clients DESC';
                break;
            case 'success_rate':
                orderBy = 'success_rate DESC';
                break;
            case 'interviews':
                orderBy = 'total_interviews DESC';
                break;
        }

        const workerAnalytics = await db.query(`
            SELECT 
                u.id,
                u.name,
                u.email,
                u.role,
                u.is_active,
                u.last_login_at,
                COUNT(DISTINCT c.id) as total_clients,
                COUNT(DISTINCT CASE WHEN c.status = 'active' THEN c.id END) as active_clients,
                COUNT(DISTINCT CASE WHEN c.status = 'placed' THEN c.id END) as placed_clients,
                COALESCE(SUM(c.total_paid), 0) as total_revenue,
                COUNT(DISTINCT i.id) as total_interviews,
                COUNT(DISTINCT CASE WHEN i.status = 'accepted' THEN i.id END) as successful_interviews,
                ROUND(
                    COUNT(DISTINCT CASE WHEN i.status = 'accepted' THEN i.id END)::decimal / 
                    NULLIF(COUNT(DISTINCT i.id), 0) * 100, 2
                ) as success_rate,
                ROUND(
                    COUNT(DISTINCT CASE WHEN c.status = 'placed' THEN c.id END)::decimal / 
                    NULLIF(COUNT(DISTINCT c.id), 0) * 100, 2
                ) as placement_rate
            FROM users u
            LEFT JOIN clients c ON u.id = c.worker_id ${dateFilter}
            LEFT JOIN interviews i ON c.id = i.client_id
            WHERE u.role IN ('WORKER', 'MANAGER')
            GROUP BY u.id, u.name, u.email, u.role, u.is_active, u.last_login_at
            ORDER BY ${orderBy}
        `);

        // Get worker performance trends
        const performanceTrends = await db.query(`
            SELECT 
                u.id,
                u.name,
                DATE_TRUNC('week', c.created_at) as week,
                COUNT(DISTINCT c.id) as clients_this_week,
                COALESCE(SUM(c.total_paid), 0) as revenue_this_week
            FROM users u
            LEFT JOIN clients c ON u.id = c.worker_id
            WHERE u.role IN ('WORKER', 'MANAGER')
            AND c.created_at >= NOW() - INTERVAL '12 weeks'
            GROUP BY u.id, u.name, DATE_TRUNC('week', c.created_at)
            ORDER BY u.name, week ASC
        `);

        const response: ApiResponse = {
            success: true,
            data: {
                period,
                sortBy,
                workerAnalytics: workerAnalytics.rows,
                performanceTrends: performanceTrends.rows,
                generatedAt: new Date().toISOString()
            }
        };

        res.json(response);
    } catch (error) {
        console.error('Error fetching worker analytics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch worker analytics',
        });
    }
});

// Export analytics data
router.get('/analytics/export', async (req, res) => {
    try {
        const { type = 'overview', format = 'json', period = '30d' } = req.query;

        // This would typically generate CSV or Excel files
        // For now, we'll return JSON data that can be converted client-side

        const response: ApiResponse = {
            success: true,
            data: {
                type,
                format,
                period,
                message: 'Export functionality will be implemented with file generation',
                generatedAt: new Date().toISOString()
            }
        };

        res.json(response);
    } catch (error) {
        console.error('Error exporting analytics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to export analytics data',
        });
    }
});

// ==================== CLIENT MANAGEMENT ====================

// Get all clients with pagination, search, and filtering
router.get('/clients', async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search = '',
            status = 'all',
            workerId = 'all',
            sortBy = 'created_at',
            sortOrder = 'desc'
        } = req.query;

        const offset = (Number(page) - 1) * Number(limit);

        let whereConditions = [];
        let params: any[] = [];
        let paramCount = 0;

        // Search filter
        if (search) {
            paramCount++;
            whereConditions.push(`(c.name ILIKE $${paramCount} OR c.email ILIKE $${paramCount})`);
            params.push(`%${search}%`);
        }

        // Status filter
        if (status !== 'all') {
            paramCount++;
            if (status === 'new') {
                whereConditions.push(`c.assigned_at > NOW() - INTERVAL '72 hours'`);
            } else {
                whereConditions.push(`c.status = $${paramCount}`);
                params.push(status);
            }
        }

        // Worker filter
        if (workerId !== 'all') {
            paramCount++;
            whereConditions.push(`c.worker_id = $${paramCount}`);
            params.push(workerId);
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        // Main query
        paramCount++;
        const clientsQuery = `
            SELECT 
                c.id,
                c.worker_id,
                c.name,
                c.email,
                c.phone,
                c.linkedin_url,
                c.status,
                c.payment_status,
                c.total_interviews,
                c.total_paid,
                c.is_new,
                c.assigned_at,
                c.created_at,
                c.updated_at,
                u.name as worker_name,
                u.email as worker_email
            FROM clients c
            LEFT JOIN users u ON c.worker_id = u.id
            ${whereClause}
            ORDER BY c.${sortBy} ${(sortOrder as string).toUpperCase()}
            LIMIT $${paramCount} OFFSET $${paramCount + 1}
        `;

        params.push(Number(limit), offset);

        const clientsResult = await db.query(clientsQuery, params);

        // Count query
        const countQuery = `
            SELECT COUNT(*) as total
            FROM clients c
            ${whereClause}
        `;

        const countResult = await db.query(countQuery, params.slice(0, -2));

        const response: ApiResponse = {
            success: true,
            data: {
                clients: clientsResult.rows,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total: Number(countResult.rows[0].total),
                    pages: Math.ceil(Number(countResult.rows[0].total) / Number(limit))
                }
            }
        };

        res.json(response);
    } catch (error) {
        console.error('Error fetching clients:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch clients' });
    }
});

// Get client by ID with full details
router.get('/clients/:id', async (req, res) => {
    try {
        const clientId = req.params.id;

        const result = await db.query(`
            SELECT 
                c.id,
                c.worker_id,
                c.name,
                c.email,
                c.phone,
                c.linkedin_url,
                c.status,
                c.payment_status,
                c.total_interviews,
                c.total_paid,
                c.is_new,
                c.assigned_at,
                c.created_at,
                c.updated_at,
                u.name as worker_name,
                u.email as worker_email
            FROM clients c
            LEFT JOIN users u ON c.worker_id = u.id
            WHERE c.id = $1
        `, [clientId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Client not found' });
        }

        const response: ApiResponse = {
            success: true,
            data: result.rows[0]
        };

        res.json(response);
    } catch (error) {
        console.error('Error fetching client:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch client' });
    }
});

// Create new client
router.post('/clients', async (req, res) => {
    try {
        const { workerId, name, email, phone, linkedinUrl, status = 'active' } = req.body;

        if (!workerId || !name || !email) {
            return res.status(400).json({
                success: false,
                error: 'Worker ID, name, and email are required'
            });
        }

        // Verify worker exists
        const workerCheck = await db.query(
            'SELECT id, name FROM users WHERE id = $1 AND role IN ($2, $3)',
            [workerId, 'WORKER', 'MANAGER']
        );

        if (workerCheck.rows.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid worker ID'
            });
        }

        const result = await db.query(`
            INSERT INTO clients (worker_id, name, email, phone, linkedin_url, status, payment_status, total_interviews, total_paid, is_new, assigned_at)
            VALUES ($1, $2, $3, $4, $5, $6, 'pending', 0, 0, true, NOW())
            RETURNING 
                id,
                worker_id,
                name,
                email,
                phone,
                linkedin_url,
                status,
                payment_status,
                total_interviews,
                total_paid,
                is_new,
                assigned_at,
                created_at,
                updated_at
        `, [workerId, name, email, phone, linkedinUrl, status]);

        const response: ApiResponse = {
            success: true,
            data: result.rows[0]
        };

        res.json(response);
    } catch (error) {
        console.error('Error creating client:', error);
        res.status(500).json({ success: false, error: 'Failed to create client' });
    }
});

// Update client
router.put('/clients/:id', async (req, res) => {
    try {
        const clientId = req.params.id;
        const { name, email, phone, linkedinUrl, status, paymentStatus, workerId } = req.body;

        // Check if client exists
        const clientCheck = await db.query('SELECT id FROM clients WHERE id = $1', [clientId]);
        if (clientCheck.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Client not found' });
        }

        // If reassigning worker, verify new worker exists
        if (workerId) {
            const workerCheck = await db.query(
                'SELECT id FROM users WHERE id = $1 AND role IN ($2, $3)',
                [workerId, 'WORKER', 'MANAGER']
            );
            if (workerCheck.rows.length === 0) {
                return res.status(400).json({ success: false, error: 'Invalid worker ID' });
            }
        }

        const updateFields = [];
        const params = [];
        let paramCount = 0;

        if (name !== undefined) {
            paramCount++;
            updateFields.push(`name = $${paramCount}`);
            params.push(name);
        }
        if (email !== undefined) {
            paramCount++;
            updateFields.push(`email = $${paramCount}`);
            params.push(email);
        }
        if (phone !== undefined) {
            paramCount++;
            updateFields.push(`phone = $${paramCount}`);
            params.push(phone);
        }
        if (linkedinUrl !== undefined) {
            paramCount++;
            updateFields.push(`linkedin_url = $${paramCount}`);
            params.push(linkedinUrl);
        }
        if (status !== undefined) {
            paramCount++;
            updateFields.push(`status = $${paramCount}`);
            params.push(status);
        }
        if (paymentStatus !== undefined) {
            paramCount++;
            updateFields.push(`payment_status = $${paramCount}`);
            params.push(paymentStatus);
        }
        if (workerId !== undefined) {
            paramCount++;
            updateFields.push(`worker_id = $${paramCount}`);
            updateFields.push(`assigned_at = NOW()`);
            params.push(workerId);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({ success: false, error: 'No fields to update' });
        }

        paramCount++;
        updateFields.push(`updated_at = NOW()`);
        params.push(clientId);

        const result = await db.query(`
            UPDATE clients 
            SET ${updateFields.join(', ')}
            WHERE id = $${paramCount}
            RETURNING 
                id,
                worker_id,
                name,
                email,
                phone,
                linkedin_url,
                status,
                payment_status,
                total_interviews,
                total_paid,
                is_new,
                assigned_at,
                created_at,
                updated_at
        `, params);

        const response: ApiResponse = {
            success: true,
            data: result.rows[0]
        };

        res.json(response);
    } catch (error) {
        console.error('Error updating client:', error);
        res.status(500).json({ success: false, error: 'Failed to update client' });
    }
});

// Delete client
router.delete('/clients/:id', async (req, res) => {
    try {
        const clientId = req.params.id;

        // Check if client exists
        const clientCheck = await db.query('SELECT id FROM clients WHERE id = $1', [clientId]);
        if (clientCheck.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Client not found' });
        }

        // Check if client has active interviews
        const interviewCheck = await db.query(
            'SELECT COUNT(*) as count FROM interviews WHERE client_id = $1 AND status IN ($2, $3)',
            [clientId, 'scheduled', 'in_progress']
        );

        if (Number(interviewCheck.rows[0].count) > 0) {
            return res.status(400).json({
                success: false,
                error: 'Cannot delete client with active interviews'
            });
        }

        await db.query('DELETE FROM clients WHERE id = $1', [clientId]);

        const response: ApiResponse = {
            success: true,
            data: { message: 'Client deleted successfully' }
        };

        res.json(response);
    } catch (error) {
        console.error('Error deleting client:', error);
        res.status(500).json({ success: false, error: 'Failed to delete client' });
    }
});

// Get client statistics
router.get('/clients/stats', async (req, res) => {
    try {
        const { period = '30d' } = req.query;

        let dateFilter = '';
        if (period === '7d') {
            dateFilter = "AND created_at > NOW() - INTERVAL '7 days'";
        } else if (period === '30d') {
            dateFilter = "AND created_at > NOW() - INTERVAL '30 days'";
        } else if (period === '90d') {
            dateFilter = "AND created_at > NOW() - INTERVAL '90 days'";
        }

        const stats = await db.query(`
            SELECT 
                COUNT(*) as total_clients,
                COUNT(CASE WHEN status = 'active' THEN 1 END) as active_clients,
                COUNT(CASE WHEN status = 'placed' THEN 1 END) as placed_clients,
                COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_clients,
                COUNT(CASE WHEN is_new = true THEN 1 END) as new_clients,
                COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid_clients,
                COUNT(CASE WHEN payment_status = 'pending' THEN 1 END) as pending_payments,
                COALESCE(SUM(total_paid), 0) as total_revenue,
                COALESCE(AVG(total_paid), 0) as avg_revenue_per_client,
                COALESCE(SUM(total_interviews), 0) as total_interviews
            FROM clients
            WHERE 1=1 ${dateFilter}
        `);

        const response: ApiResponse = {
            success: true,
            data: {
                period,
                ...stats.rows[0],
                generatedAt: new Date().toISOString()
            }
        };

        res.json(response);
    } catch (error) {
        console.error('Error fetching client stats:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch client statistics' });
    }
});

// Bulk assign clients to workers
router.post('/clients/bulk-assign', async (req, res) => {
    try {
        const { clientIds, workerId } = req.body;

        if (!clientIds || !Array.isArray(clientIds) || clientIds.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Client IDs array is required'
            });
        }

        if (!workerId) {
            return res.status(400).json({
                success: false,
                error: 'Worker ID is required'
            });
        }

        // Verify worker exists
        const workerCheck = await db.query(
            'SELECT id, name FROM users WHERE id = $1 AND role IN ($2, $3)',
            [workerId, 'WORKER', 'MANAGER']
        );

        if (workerCheck.rows.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid worker ID'
            });
        }

        // Update clients
        const result = await db.query(`
            UPDATE clients 
            SET worker_id = $1, assigned_at = NOW(), updated_at = NOW()
            WHERE id = ANY($2)
            RETURNING id, name, worker_id, assigned_at
        `, [workerId, clientIds]);

        const response: ApiResponse = {
            success: true,
            data: {
                assignedCount: result.rows.length,
                clients: result.rows,
                worker: workerCheck.rows[0]
            }
        };

        res.json(response);
    } catch (error) {
        console.error('Error bulk assigning clients:', error);
        res.status(500).json({ success: false, error: 'Failed to bulk assign clients' });
    }
});

// ==================== INTERVIEW MANAGEMENT ====================

// Get all interviews with pagination, search, and filtering
router.get('/interviews', async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search = '',
            status = 'all',
            clientId = 'all',
            workerId = 'all',
            sortBy = 'scheduled_date',
            sortOrder = 'desc',
            dateFrom = '',
            dateTo = ''
        } = req.query;

        const offset = (Number(page) - 1) * Number(limit);

        let whereConditions = [];
        let params: any[] = [];
        let paramCount = 0;

        // Search filter
        if (search) {
            paramCount++;
            whereConditions.push(`(i.company_name ILIKE $${paramCount} OR i.job_title ILIKE $${paramCount} OR c.name ILIKE $${paramCount})`);
            params.push(`%${search}%`);
        }

        // Status filter
        if (status !== 'all') {
            paramCount++;
            whereConditions.push(`i.status = $${paramCount}`);
            params.push(status);
        }

        // Client filter
        if (clientId !== 'all') {
            paramCount++;
            whereConditions.push(`i.client_id = $${paramCount}`);
            params.push(clientId);
        }

        // Worker filter
        if (workerId !== 'all') {
            paramCount++;
            whereConditions.push(`c.worker_id = $${paramCount}`);
            params.push(workerId);
        }

        // Date range filter
        if (dateFrom) {
            paramCount++;
            whereConditions.push(`i.scheduled_date >= $${paramCount}`);
            params.push(dateFrom);
        }
        if (dateTo) {
            paramCount++;
            whereConditions.push(`i.scheduled_date <= $${paramCount}`);
            params.push(dateTo);
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        // Main query
        paramCount++;
        const interviewsQuery = `
            SELECT 
                i.id,
                i.client_id,
                i.company_name,
                i.job_title,
                i.scheduled_date,
                i.interview_type,
                i.status,
                i.payment_status,
                i.payment_amount,
                i.payment_currency,
                i.client_response_date,
                i.client_response_notes,
                i.worker_notes,
                i.paid_at,
                i.created_at,
                i.updated_at,
                c.name as client_name,
                c.email as client_email,
                c.phone as client_phone,
                u.name as worker_name,
                u.email as worker_email
            FROM interviews i
            LEFT JOIN clients c ON i.client_id = c.id
            LEFT JOIN users u ON c.worker_id = u.id
            ${whereClause}
            ORDER BY i.${sortBy} ${(sortOrder as string).toUpperCase()}
            LIMIT $${paramCount} OFFSET $${paramCount + 1}
        `;

        params.push(Number(limit), offset);

        const interviewsResult = await db.query(interviewsQuery, params);

        // Count query
        const countQuery = `
            SELECT COUNT(*) as total
            FROM interviews i
            LEFT JOIN clients c ON i.client_id = c.id
            ${whereClause}
        `;

        const countResult = await db.query(countQuery, params.slice(0, -2));

        const response: ApiResponse = {
            success: true,
            data: {
                interviews: interviewsResult.rows,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total: Number(countResult.rows[0].total),
                    pages: Math.ceil(Number(countResult.rows[0].total) / Number(limit))
                }
            }
        };

        res.json(response);
    } catch (error) {
        console.error('Error fetching interviews:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch interviews' });
    }
});

// Get interview by ID with full details
router.get('/interviews/:id', async (req, res) => {
    try {
        const interviewId = req.params.id;

        const result = await db.query(`
            SELECT 
                i.id,
                i.client_id,
                i.company_name,
                i.job_title,
                i.scheduled_date,
                i.interview_type,
                i.status,
                i.payment_status,
                i.payment_amount,
                i.payment_currency,
                i.client_response_date,
                i.client_response_notes,
                i.worker_notes,
                i.paid_at,
                i.created_at,
                i.updated_at,
                c.name as client_name,
                c.email as client_email,
                c.phone as client_phone,
                u.name as worker_name,
                u.email as worker_email
            FROM interviews i
            LEFT JOIN clients c ON i.client_id = c.id
            LEFT JOIN users u ON c.worker_id = u.id
            WHERE i.id = $1
        `, [interviewId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Interview not found' });
        }

        const response: ApiResponse = {
            success: true,
            data: result.rows[0]
        };

        res.json(response);
    } catch (error) {
        console.error('Error fetching interview:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch interview' });
    }
});

// Create new interview
router.post('/interviews', async (req, res) => {
    try {
        const {
            clientId,
            companyName,
            jobTitle,
            scheduledDate,
            interviewType = 'video',
            status = 'scheduled',
            paymentAmount = 0,
            paymentCurrency = 'USD'
        } = req.body;

        if (!clientId || !companyName || !jobTitle || !scheduledDate) {
            return res.status(400).json({
                success: false,
                error: 'Client ID, company name, job title, and scheduled date are required'
            });
        }

        // Verify client exists
        const clientCheck = await db.query(
            'SELECT id, name FROM clients WHERE id = $1',
            [clientId]
        );

        if (clientCheck.rows.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid client ID'
            });
        }

        const result = await db.query(`
            INSERT INTO interviews (
                client_id, company_name, job_title, scheduled_date, 
                interview_type, status, payment_status, payment_amount, payment_currency
            )
            VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8)
            RETURNING 
                id,
                client_id,
                company_name,
                job_title,
                scheduled_date,
                interview_type,
                status,
                payment_status,
                payment_amount,
                payment_currency,
                created_at,
                updated_at
        `, [clientId, companyName, jobTitle, scheduledDate, interviewType, status, paymentAmount, paymentCurrency]);

        const response: ApiResponse = {
            success: true,
            data: result.rows[0]
        };

        res.json(response);
    } catch (error) {
        console.error('Error creating interview:', error);
        res.status(500).json({ success: false, error: 'Failed to create interview' });
    }
});

// Update interview
router.put('/interviews/:id', async (req, res) => {
    try {
        const interviewId = req.params.id;
        const {
            companyName,
            jobTitle,
            scheduledDate,
            interviewType,
            status,
            paymentStatus,
            paymentAmount,
            paymentCurrency,
            clientResponseNotes,
            workerNotes
        } = req.body;

        // Check if interview exists
        const interviewCheck = await db.query('SELECT id FROM interviews WHERE id = $1', [interviewId]);
        if (interviewCheck.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Interview not found' });
        }

        const updateFields = [];
        const params = [];
        let paramCount = 0;

        if (companyName !== undefined) {
            paramCount++;
            updateFields.push(`company_name = $${paramCount}`);
            params.push(companyName);
        }
        if (jobTitle !== undefined) {
            paramCount++;
            updateFields.push(`job_title = $${paramCount}`);
            params.push(jobTitle);
        }
        if (scheduledDate !== undefined) {
            paramCount++;
            updateFields.push(`scheduled_date = $${paramCount}`);
            params.push(scheduledDate);
        }
        if (interviewType !== undefined) {
            paramCount++;
            updateFields.push(`interview_type = $${paramCount}`);
            params.push(interviewType);
        }
        if (status !== undefined) {
            paramCount++;
            updateFields.push(`status = $${paramCount}`);
            params.push(status);
        }
        if (paymentStatus !== undefined) {
            paramCount++;
            updateFields.push(`payment_status = $${paramCount}`);
            params.push(paymentStatus);
        }
        if (paymentAmount !== undefined) {
            paramCount++;
            updateFields.push(`payment_amount = $${paramCount}`);
            params.push(paymentAmount);
        }
        if (paymentCurrency !== undefined) {
            paramCount++;
            updateFields.push(`payment_currency = $${paramCount}`);
            params.push(paymentCurrency);
        }
        if (clientResponseNotes !== undefined) {
            paramCount++;
            updateFields.push(`client_response_notes = $${paramCount}`);
            params.push(clientResponseNotes);
        }
        if (workerNotes !== undefined) {
            paramCount++;
            updateFields.push(`worker_notes = $${paramCount}`);
            params.push(workerNotes);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({ success: false, error: 'No fields to update' });
        }

        paramCount++;
        updateFields.push(`updated_at = NOW()`);
        params.push(interviewId);

        const result = await db.query(`
            UPDATE interviews 
            SET ${updateFields.join(', ')}
            WHERE id = $${paramCount}
            RETURNING 
                id,
                client_id,
                company_name,
                job_title,
                scheduled_date,
                interview_type,
                status,
                payment_status,
                payment_amount,
                payment_currency,
                client_response_notes,
                worker_notes,
                paid_at,
                created_at,
                updated_at
        `, params);

        const response: ApiResponse = {
            success: true,
            data: result.rows[0]
        };

        res.json(response);
    } catch (error) {
        console.error('Error updating interview:', error);
        res.status(500).json({ success: false, error: 'Failed to update interview' });
    }
});

// Delete interview
router.delete('/interviews/:id', async (req, res) => {
    try {
        const interviewId = req.params.id;

        // Check if interview exists
        const interviewCheck = await db.query('SELECT id FROM interviews WHERE id = $1', [interviewId]);
        if (interviewCheck.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Interview not found' });
        }

        await db.query('DELETE FROM interviews WHERE id = $1', [interviewId]);

        const response: ApiResponse = {
            success: true,
            data: { message: 'Interview deleted successfully' }
        };

        res.json(response);
    } catch (error) {
        console.error('Error deleting interview:', error);
        res.status(500).json({ success: false, error: 'Failed to delete interview' });
    }
});

// Get interview statistics
router.get('/interviews/stats', async (req, res) => {
    try {
        const { period = '30d' } = req.query;

        let dateFilter = '';
        if (period === '7d') {
            dateFilter = "AND created_at > NOW() - INTERVAL '7 days'";
        } else if (period === '30d') {
            dateFilter = "AND created_at > NOW() - INTERVAL '30 days'";
        } else if (period === '90d') {
            dateFilter = "AND created_at > NOW() - INTERVAL '90 days'";
        }

        const stats = await db.query(`
            SELECT 
                COUNT(*) as total_interviews,
                COUNT(CASE WHEN status = 'scheduled' THEN 1 END) as scheduled_interviews,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_interviews,
                COUNT(CASE WHEN status = 'client_accepted' THEN 1 END) as accepted_interviews,
                COUNT(CASE WHEN status = 'client_declined' THEN 1 END) as declined_interviews,
                COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_interviews,
                COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid_interviews,
                COUNT(CASE WHEN payment_status = 'pending' THEN 1 END) as pending_payments,
                COALESCE(SUM(payment_amount), 0) as total_revenue,
                COALESCE(AVG(payment_amount), 0) as avg_payment_amount,
                COALESCE(AVG(feedback_score), 0) as avg_feedback_score,
                ROUND(
                    COUNT(CASE WHEN status = 'client_accepted' THEN 1 END)::decimal / 
                    NULLIF(COUNT(CASE WHEN status IN ('client_accepted', 'client_declined') THEN 1 END), 0) * 100, 2
                ) as acceptance_rate
            FROM interviews
            WHERE 1=1 ${dateFilter}
        `);

        const response: ApiResponse = {
            success: true,
            data: {
                period,
                ...stats.rows[0],
                generatedAt: new Date().toISOString()
            }
        };

        res.json(response);
    } catch (error) {
        console.error('Error fetching interview stats:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch interview statistics' });
    }
});

// Update interview status
router.patch('/interviews/:id/status', async (req, res) => {
    try {
        const interviewId = req.params.id;
        const { status, notes } = req.body;

        if (!status) {
            return res.status(400).json({
                success: false,
                error: 'Status is required'
            });
        }

        // Check if interview exists
        const interviewCheck = await db.query('SELECT id FROM interviews WHERE id = $1', [interviewId]);
        if (interviewCheck.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Interview not found' });
        }

        const updateFields = [`status = $1`, `updated_at = NOW()`];
        const params = [status];

        if (notes) {
            updateFields.push(`worker_notes = $2`);
            params.push(notes);
        }

        if (status === 'client_accepted' || status === 'client_declined') {
            updateFields.push(`client_response_date = NOW()`);
            if (notes) {
                updateFields.push(`client_response_notes = $2`);
            }
        }

        const result = await db.query(`
            UPDATE interviews 
            SET ${updateFields.join(', ')}
            WHERE id = $${params.length + 1}
            RETURNING 
                id,
                status,
                client_response_date,
                client_response_notes,
                worker_notes,
                updated_at
        `, [...params, interviewId]);

        const response: ApiResponse = {
            success: true,
            data: result.rows[0]
        };

        res.json(response);
    } catch (error) {
        console.error('Error updating interview status:', error);
        res.status(500).json({ success: false, error: 'Failed to update interview status' });
    }
});

// Add interview feedback
router.post('/interviews/:id/feedback', async (req, res) => {
    try {
        const interviewId = req.params.id;
        const { feedbackScore, feedbackNotes } = req.body;

        if (!feedbackScore || feedbackScore < 1 || feedbackScore > 5) {
            return res.status(400).json({
                success: false,
                error: 'Feedback score must be between 1 and 5'
            });
        }

        // Check if interview exists
        const interviewCheck = await db.query('SELECT id FROM interviews WHERE id = $1', [interviewId]);
        if (interviewCheck.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Interview not found' });
        }

        const result = await db.query(`
            UPDATE interviews 
            SET feedback_score = $1, feedback_notes = $2, updated_at = NOW()
            WHERE id = $3
            RETURNING 
                id,
                feedback_score,
                feedback_notes,
                updated_at
        `, [feedbackScore, feedbackNotes, interviewId]);

        const response: ApiResponse = {
            success: true,
            data: result.rows[0]
        };

        res.json(response);
    } catch (error) {
        console.error('Error adding interview feedback:', error);
        res.status(500).json({ success: false, error: 'Failed to add interview feedback' });
    }
});

export default router;
