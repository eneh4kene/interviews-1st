import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../lib/utils/database';
import { ApiResponse } from '@interview-me/types';

export async function GET(request: NextRequest) {
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

        return NextResponse.json(response);
    } catch (error) {
        console.error('Error fetching platform overview:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to fetch platform overview',
        }, { status: 500 });
    }
}
