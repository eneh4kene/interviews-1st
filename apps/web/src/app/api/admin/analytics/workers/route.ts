import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/utils/jwt';
import { db } from '@/lib/utils/database';
import { ApiResponse } from '@interview-me/types';

export async function GET(request: NextRequest) {
    try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            const response: ApiResponse = {
                success: false,
                error: 'No valid authorization token',
            };
            return NextResponse.json(response, { status: 401 });
        }

        const token = authHeader.substring(7);
        const decoded = verifyToken(token);

        if (decoded.role !== 'ADMIN') {
            const response: ApiResponse = {
                success: false,
                error: 'Insufficient permissions',
            };
            return NextResponse.json(response, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const period = searchParams.get('period') || '30d';
        const sortBy = searchParams.get('sortBy') || 'revenue';

        // Calculate date range based on period
        let dateFilter = '';
        if (period === '7d') {
            dateFilter = "AND i.created_at >= NOW() - INTERVAL '7 days'";
        } else if (period === '30d') {
            dateFilter = "AND i.created_at >= NOW() - INTERVAL '30 days'";
        } else if (period === '90d') {
            dateFilter = "AND i.created_at >= NOW() - INTERVAL '90 days'";
        } else if (period === '1y') {
            dateFilter = "AND i.created_at >= NOW() - INTERVAL '1 year'";
        }

        // Determine sort order
        let orderBy = 'total_revenue DESC';
        if (sortBy === 'interviews') {
            orderBy = 'total_interviews DESC';
        } else if (sortBy === 'success_rate') {
            orderBy = 'success_rate DESC';
        } else if (sortBy === 'clients') {
            orderBy = 'client_count DESC';
        }

        // Get worker performance data
        const workerPerformance = await db.query(`
            SELECT 
                u.id,
                u.name,
                u.email,
                u.role,
                u.is_active,
                u.last_login_at,
                u.created_at,
                COUNT(DISTINCT c.id) as client_count,
                COUNT(i.id) as total_interviews,
                COUNT(CASE WHEN i.status = 'client_accepted' THEN 1 END) as successful_interviews,
                COUNT(CASE WHEN i.status = 'client_declined' THEN 1 END) as declined_interviews,
                COUNT(CASE WHEN i.status = 'scheduled' THEN 1 END) as pending_interviews,
                COALESCE(SUM(i.payment_amount), 0) as total_revenue,
                COALESCE(AVG(i.payment_amount), 0) as avg_payment,
                CASE 
                    WHEN COUNT(i.id) > 0 THEN 
                        (COUNT(CASE WHEN i.status = 'client_accepted' THEN 1 END)::float / COUNT(i.id)) * 100
                    ELSE 0 
                END as success_rate
            FROM users u
            LEFT JOIN clients c ON u.id = c.worker_id
            LEFT JOIN interviews i ON c.id = i.client_id
            WHERE u.role IN ('WORKER', 'MANAGER')
            AND (i.id IS NULL OR 1=1 ${dateFilter})
            GROUP BY u.id, u.name, u.email, u.role, u.is_active, u.last_login_at, u.created_at
            ORDER BY ${orderBy}
        `);

        // Get worker activity trends
        const activityTrends = await db.query(`
            SELECT 
                DATE(i.created_at) as date,
                u.id as worker_id,
                u.name as worker_name,
                COUNT(i.id) as interviews_conducted
            FROM users u
            LEFT JOIN clients c ON u.id = c.worker_id
            LEFT JOIN interviews i ON c.id = i.client_id
            WHERE u.role IN ('WORKER', 'MANAGER')
            AND i.created_at >= NOW() - INTERVAL '30 days'
            GROUP BY DATE(i.created_at), u.id, u.name
            ORDER BY date DESC, interviews_conducted DESC
        `);

        // Get worker client assignments
        const clientAssignments = await db.query(`
            SELECT 
                u.id as worker_id,
                u.name as worker_name,
                COUNT(c.id) as total_clients,
                COUNT(CASE WHEN c.status = 'active' THEN 1 END) as active_clients,
                COUNT(CASE WHEN c.status = 'placed' THEN 1 END) as placed_clients,
                COUNT(CASE WHEN c.status = 'inactive' THEN 1 END) as inactive_clients
            FROM users u
            LEFT JOIN clients c ON u.id = c.worker_id
            WHERE u.role IN ('WORKER', 'MANAGER')
            GROUP BY u.id, u.name
            ORDER BY total_clients DESC
        `);

        // Get worker summary statistics
        const summaryStats = await db.query(`
            SELECT 
                COUNT(DISTINCT u.id) as total_workers,
                COUNT(CASE WHEN u.is_active = true THEN 1 END) as active_workers,
                COUNT(CASE WHEN u.last_login_at >= NOW() - INTERVAL '7 days' THEN 1 END) as recently_active,
                COALESCE(AVG(worker_stats.client_count), 0) as avg_clients_per_worker,
                COALESCE(AVG(worker_stats.total_interviews), 0) as avg_interviews_per_worker,
                COALESCE(AVG(worker_stats.total_revenue), 0) as avg_revenue_per_worker
            FROM users u
            LEFT JOIN (
                SELECT 
                    c.worker_id,
                    COUNT(DISTINCT c.id) as client_count,
                    COUNT(i.id) as total_interviews,
                    COALESCE(SUM(i.payment_amount), 0) as total_revenue
                FROM clients c
                LEFT JOIN interviews i ON c.id = i.client_id
                WHERE c.worker_id IS NOT NULL
                AND (i.id IS NULL OR 1=1 ${dateFilter})
                GROUP BY c.worker_id
            ) worker_stats ON u.id = worker_stats.worker_id
            WHERE u.role IN ('WORKER', 'MANAGER')
        `);

        const analytics = {
            period,
            sortBy,
            workers: workerPerformance.rows.map((row: any) => ({
                id: row.id,
                name: row.name,
                email: row.email,
                role: row.role,
                is_active: row.is_active,
                last_login_at: row.last_login_at,
                created_at: row.created_at,
                client_count: parseInt(row.client_count),
                total_interviews: parseInt(row.total_interviews),
                successful_interviews: parseInt(row.successful_interviews),
                declined_interviews: parseInt(row.declined_interviews),
                pending_interviews: parseInt(row.pending_interviews),
                total_revenue: parseFloat(row.total_revenue),
                avg_payment: parseFloat(row.avg_payment),
                success_rate: parseFloat(row.success_rate)
            })),
            activityTrends: activityTrends.rows.map((row: any) => ({
                date: row.date,
                worker_id: row.worker_id,
                worker_name: row.worker_name,
                interviews_conducted: parseInt(row.interviews_conducted)
            })),
            clientAssignments: clientAssignments.rows.map((row: any) => ({
                worker_id: row.worker_id,
                worker_name: row.worker_name,
                total_clients: parseInt(row.total_clients),
                active_clients: parseInt(row.active_clients),
                placed_clients: parseInt(row.placed_clients),
                inactive_clients: parseInt(row.inactive_clients)
            })),
            summary: {
                total_workers: parseInt(summaryStats.rows[0].total_workers),
                active_workers: parseInt(summaryStats.rows[0].active_workers),
                recently_active: parseInt(summaryStats.rows[0].recently_active),
                avg_clients_per_worker: parseFloat(summaryStats.rows[0].avg_clients_per_worker),
                avg_interviews_per_worker: parseFloat(summaryStats.rows[0].avg_interviews_per_worker),
                avg_revenue_per_worker: parseFloat(summaryStats.rows[0].avg_revenue_per_worker)
            }
        };

        const response: ApiResponse = {
            success: true,
            data: analytics,
            message: 'Worker analytics retrieved successfully',
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Get worker analytics error:', error);
        const response: ApiResponse = {
            success: false,
            error: 'Failed to retrieve worker analytics',
        };
        return NextResponse.json(response, { status: 500 });
    }
}
