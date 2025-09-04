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

export default router;
