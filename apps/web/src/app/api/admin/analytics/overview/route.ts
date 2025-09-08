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

        // Get user growth data
        const userGrowth = await db.query(`
            SELECT 
                DATE(created_at) as date,
                COUNT(CASE WHEN role = 'CLIENT' THEN 1 END) as new_clients,
                COUNT(CASE WHEN role IN ('WORKER', 'MANAGER') THEN 1 END) as new_workers,
                COUNT(*) as new_users
            FROM users
            WHERE created_at >= NOW() - INTERVAL '30 days'
            GROUP BY DATE(created_at)
            ORDER BY date DESC
        `);

        // Get revenue data
        const revenueData = await db.query(`
            SELECT 
                COALESCE(SUM(payment_amount), 0) as total_revenue,
                COALESCE(SUM(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN payment_amount ELSE 0 END), 0) as revenue_30d,
                COALESCE(SUM(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN payment_amount ELSE 0 END), 0) as revenue_7d
            FROM interviews
            WHERE payment_status = 'paid'
        `);

        // Get client counts
        const clientData = await db.query(`
            SELECT 
                COUNT(*) as total_clients,
                COUNT(CASE WHEN status = 'active' THEN 1 END) as active_clients,
                COUNT(CASE WHEN status = 'placed' THEN 1 END) as placed_clients
            FROM clients
        `);

        // Get interview data
        const interviewData = await db.query(`
            SELECT 
                COUNT(*) as total_interviews,
                COUNT(CASE WHEN status = 'client_accepted' THEN 1 END) as accepted_interviews,
                COUNT(CASE WHEN status = 'client_declined' THEN 1 END) as declined_interviews,
                COUNT(CASE WHEN status = 'scheduled' THEN 1 END) as pending_interviews
            FROM interviews
            WHERE 1=1 ${dateFilter}
        `);

        // Get success rate
        const totalCompleted = interviewData.rows[0].accepted_interviews + interviewData.rows[0].declined_interviews;
        const successRate = totalCompleted > 0 ? (interviewData.rows[0].accepted_interviews / totalCompleted) * 100 : 0;

        // Get worker performance data
        const workerPerformance = await db.query(`
            SELECT 
                u.id,
                u.name,
                u.email,
                COUNT(i.id) as total_interviews,
                COUNT(CASE WHEN i.status = 'client_accepted' THEN 1 END) as successful_interviews,
                COALESCE(SUM(i.payment_amount), 0) as total_revenue
            FROM users u
            LEFT JOIN clients c ON u.id = c.worker_id
            LEFT JOIN interviews i ON c.id = i.client_id
            WHERE u.role IN ('WORKER', 'MANAGER')
            AND (i.id IS NULL OR 1=1 ${dateFilter.replace('created_at', 'i.created_at')})
            GROUP BY u.id, u.name, u.email
            ORDER BY total_revenue DESC
            LIMIT 10
        `);

        // Get recent activity
        const recentActivity = await db.query(`
            SELECT 
                'interview' as type,
                i.id,
                i.company_name as title,
                i.created_at,
                c.name as client_name
            FROM interviews i
            LEFT JOIN clients c ON i.client_id = c.id
            WHERE i.created_at >= NOW() - INTERVAL '7 days'
            UNION ALL
            SELECT 
                'client' as type,
                c.id,
                c.name as title,
                c.created_at,
                c.name as client_name
            FROM clients c
            WHERE c.created_at >= NOW() - INTERVAL '7 days'
            ORDER BY created_at DESC
            LIMIT 20
        `);

        // Get monthly trends
        const monthlyTrends = await db.query(`
            SELECT 
                DATE_TRUNC('month', created_at) as month,
                COUNT(*) as interviews,
                COALESCE(SUM(payment_amount), 0) as revenue
            FROM interviews
            WHERE created_at >= NOW() - INTERVAL '12 months'
            GROUP BY DATE_TRUNC('month', created_at)
            ORDER BY month DESC
        `);

        // Get platform health data
        const platformHealthData = await db.query(`
            SELECT 
                COUNT(CASE WHEN last_login_at >= NOW() - INTERVAL '1 day' THEN 1 END) as active_users,
                COUNT(CASE WHEN last_login_at >= NOW() - INTERVAL '7 days' THEN 1 END) as active_last_7d,
                COUNT(CASE WHEN last_login_at >= NOW() - INTERVAL '30 days' THEN 1 END) as active_last_30d,
                COUNT(CASE WHEN two_factor_enabled = true THEN 1 END) as users_with_2fa
            FROM users
            WHERE role != 'ADMIN'
        `);

        const overview = {
            period,
            userGrowth: userGrowth.rows.map((row: any) => ({
                date: row.date,
                new_users: parseInt(row.new_users),
                new_clients: parseInt(row.new_clients),
                new_workers: parseInt(row.new_workers)
            })),
            revenue: {
                total_revenue: parseFloat(revenueData.rows[0].total_revenue),
                revenue_30d: parseFloat(revenueData.rows[0].revenue_30d),
                revenue_7d: parseFloat(revenueData.rows[0].revenue_7d),
                active_clients: parseInt(clientData.rows[0].active_clients),
                placed_clients: parseInt(clientData.rows[0].placed_clients)
            },
            interviews: {
                total_interviews: parseInt(interviewData.rows[0].total_interviews),
                accepted_interviews: parseInt(interviewData.rows[0].accepted_interviews),
                declined_interviews: parseInt(interviewData.rows[0].declined_interviews),
                pending_interviews: parseInt(interviewData.rows[0].pending_interviews),
                success_rate: successRate
            },
            workerPerformance: workerPerformance.rows.map((row: any) => ({
                id: row.id,
                name: row.name,
                email: row.email,
                total_interviews: parseInt(row.total_interviews),
                successful_interviews: parseInt(row.successful_interviews),
                total_revenue: parseFloat(row.total_revenue)
            })),
            recentActivity: recentActivity.rows.map((row: any) => ({
                type: row.type,
                id: row.id,
                title: row.title,
                created_at: row.created_at,
                client_name: row.client_name
            })),
            monthlyTrends: monthlyTrends.rows.map((row: any) => ({
                month: row.month,
                interviews: parseInt(row.interviews),
                revenue: parseFloat(row.revenue)
            })),
            platformHealth: {
                active_users: parseInt(platformHealthData.rows[0].active_users),
                active_last_7d: parseInt(platformHealthData.rows[0].active_last_7d),
                active_last_30d: parseInt(platformHealthData.rows[0].active_last_30d),
                users_with_2fa: parseInt(platformHealthData.rows[0].users_with_2fa)
            },
            generatedAt: new Date().toISOString()
        };

        const response: ApiResponse = {
            success: true,
            data: overview,
            message: 'Analytics overview retrieved successfully',
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Get analytics overview error:', error);
        const response: ApiResponse = {
            success: false,
            error: 'Failed to retrieve analytics overview',
        };
        return NextResponse.json(response, { status: 500 });
    }
}
