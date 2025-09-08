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

        // Calculate date range based on period
        let dateFilter = '';
        if (period === '7d') {
            dateFilter = "AND created_at >= NOW() - INTERVAL '7 days'";
        } else if (period === '30d') {
            dateFilter = "AND created_at >= NOW() - INTERVAL '30 days'";
        } else if (period === '90d') {
            dateFilter = "AND created_at >= NOW() - INTERVAL '90 days'";
        } else if (period === '1y') {
            dateFilter = "AND created_at >= NOW() - INTERVAL '1 year'";
        }

        // Get basic client counts
        const basicStats = await db.query(`
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

        // Get recent client activity (last 30 days)
        const recentActivity = await db.query(`
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as new_clients
            FROM clients
            WHERE created_at >= NOW() - INTERVAL '30 days'
            GROUP BY DATE(created_at)
            ORDER BY date DESC
        `);

        // Get client status distribution
        const statusDistribution = await db.query(`
            SELECT 
                status,
                COUNT(*) as count
            FROM clients
            WHERE 1=1 ${dateFilter}
            GROUP BY status
        `);

        // Get payment status distribution
        const paymentDistribution = await db.query(`
            SELECT 
                payment_status,
                COUNT(*) as count
            FROM clients
            WHERE 1=1 ${dateFilter}
            GROUP BY payment_status
        `);

        // Get top workers by client count
        const topWorkers = await db.query(`
            SELECT 
                u.id,
                u.name,
                u.email,
                COUNT(c.id) as client_count,
                COALESCE(SUM(c.total_paid), 0) as total_revenue
            FROM users u
            LEFT JOIN clients c ON u.id = c.worker_id
            WHERE u.role IN ('WORKER', 'MANAGER')
            AND (c.id IS NULL OR 1=1 ${dateFilter.replace('created_at', 'c.created_at')})
            GROUP BY u.id, u.name, u.email
            ORDER BY client_count DESC
            LIMIT 10
        `);

        const stats = {
            total_clients: parseInt(basicStats.rows[0].total_clients),
            active_clients: parseInt(basicStats.rows[0].active_clients),
            placed_clients: parseInt(basicStats.rows[0].placed_clients),
            inactive_clients: parseInt(basicStats.rows[0].inactive_clients),
            new_clients: parseInt(basicStats.rows[0].new_clients),
            paid_clients: parseInt(basicStats.rows[0].paid_clients),
            pending_payments: parseInt(basicStats.rows[0].pending_payments),
            total_revenue: parseFloat(basicStats.rows[0].total_revenue),
            avg_revenue_per_client: parseFloat(basicStats.rows[0].avg_revenue_per_client),
            total_interviews: parseInt(basicStats.rows[0].total_interviews),
            recent_activity: recentActivity.rows.map(row => ({
                date: row.date,
                new_clients: parseInt(row.new_clients)
            })),
            status_distribution: statusDistribution.rows.map(row => ({
                status: row.status,
                count: parseInt(row.count)
            })),
            payment_distribution: paymentDistribution.rows.map(row => ({
                payment_status: row.payment_status,
                count: parseInt(row.count)
            })),
            top_workers: topWorkers.rows.map(row => ({
                id: row.id,
                name: row.name,
                email: row.email,
                client_count: parseInt(row.client_count),
                total_revenue: parseFloat(row.total_revenue)
            }))
        };

        const response: ApiResponse = {
            success: true,
            data: stats,
            message: 'Client statistics retrieved successfully',
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Get client stats error:', error);
        const response: ApiResponse = {
            success: false,
            error: 'Failed to retrieve client statistics',
        };
        return NextResponse.json(response, { status: 500 });
    }
}
