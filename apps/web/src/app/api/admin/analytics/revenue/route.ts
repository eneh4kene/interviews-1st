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
        const groupBy = searchParams.get('groupBy') || 'day';

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

        // Determine grouping function based on groupBy parameter
        let groupFunction = 'DATE(created_at)';
        if (groupBy === 'week') {
            groupFunction = 'DATE_TRUNC(\'week\', created_at)';
        } else if (groupBy === 'month') {
            groupFunction = 'DATE_TRUNC(\'month\', created_at)';
        }

        // Get revenue trends
        const revenueTrends = await db.query(`
            SELECT 
                ${groupFunction} as period,
                COALESCE(SUM(payment_amount), 0) as revenue,
                COUNT(*) as transactions,
                COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid_transactions,
                COUNT(CASE WHEN payment_status = 'pending' THEN 1 END) as pending_transactions
            FROM interviews
            WHERE payment_status IN ('paid', 'pending')
            ${dateFilter}
            GROUP BY ${groupFunction}
            ORDER BY period DESC
        `);

        // Get revenue by client
        const revenueByClient = await db.query(`
            SELECT 
                c.id,
                c.name,
                c.email,
                COUNT(i.id) as total_interviews,
                COALESCE(SUM(i.payment_amount), 0) as total_revenue,
                COALESCE(AVG(i.payment_amount), 0) as avg_payment
            FROM clients c
            LEFT JOIN interviews i ON c.id = i.client_id
            WHERE i.payment_status = 'paid'
            ${dateFilter.replace('created_at', 'i.created_at')}
            GROUP BY c.id, c.name, c.email
            ORDER BY total_revenue DESC
            LIMIT 20
        `);

        // Get revenue by worker
        const revenueByWorker = await db.query(`
            SELECT 
                u.id,
                u.name,
                u.email,
                COUNT(i.id) as total_interviews,
                COALESCE(SUM(i.payment_amount), 0) as total_revenue,
                COALESCE(AVG(i.payment_amount), 0) as avg_payment
            FROM users u
            LEFT JOIN clients c ON u.id = c.worker_id
            LEFT JOIN interviews i ON c.id = i.client_id
            WHERE u.role IN ('WORKER', 'MANAGER')
            AND i.payment_status = 'paid'
            ${dateFilter.replace('created_at', 'i.created_at')}
            GROUP BY u.id, u.name, u.email
            ORDER BY total_revenue DESC
            LIMIT 20
        `);

        // Get payment status distribution
        const paymentStatusDistribution = await db.query(`
            SELECT 
                payment_status,
                COUNT(*) as count,
                COALESCE(SUM(payment_amount), 0) as total_amount
            FROM interviews
            WHERE 1=1 ${dateFilter}
            GROUP BY payment_status
        `);

        // Get revenue summary
        const revenueSummary = await db.query(`
            SELECT 
                COALESCE(SUM(payment_amount), 0) as total_revenue,
                COALESCE(AVG(payment_amount), 0) as avg_payment,
                COUNT(*) as total_transactions,
                COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid_transactions,
                COUNT(CASE WHEN payment_status = 'pending' THEN 1 END) as pending_transactions,
                COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN payment_amount ELSE 0 END), 0) as paid_revenue,
                COALESCE(SUM(CASE WHEN payment_status = 'pending' THEN payment_amount ELSE 0 END), 0) as pending_revenue
            FROM interviews
            WHERE 1=1 ${dateFilter}
        `);

        const analytics = {
            period,
            groupBy,
            trends: revenueTrends.rows.map((row: any) => ({
                period: row.period,
                revenue: parseFloat(row.revenue),
                transactions: parseInt(row.transactions),
                paid_transactions: parseInt(row.paid_transactions),
                pending_transactions: parseInt(row.pending_transactions)
            })),
            byClient: revenueByClient.rows.map((row: any) => ({
                id: row.id,
                name: row.name,
                email: row.email,
                total_interviews: parseInt(row.total_interviews),
                total_revenue: parseFloat(row.total_revenue),
                avg_payment: parseFloat(row.avg_payment)
            })),
            byWorker: revenueByWorker.rows.map((row: any) => ({
                id: row.id,
                name: row.name,
                email: row.email,
                total_interviews: parseInt(row.total_interviews),
                total_revenue: parseFloat(row.total_revenue),
                avg_payment: parseFloat(row.avg_payment)
            })),
            statusDistribution: paymentStatusDistribution.rows.map((row: any) => ({
                status: row.payment_status,
                count: parseInt(row.count),
                total_amount: parseFloat(row.total_amount)
            })),
            summary: {
                total_revenue: parseFloat(revenueSummary.rows[0].total_revenue),
                avg_payment: parseFloat(revenueSummary.rows[0].avg_payment),
                total_transactions: parseInt(revenueSummary.rows[0].total_transactions),
                paid_transactions: parseInt(revenueSummary.rows[0].paid_transactions),
                pending_transactions: parseInt(revenueSummary.rows[0].pending_transactions),
                paid_revenue: parseFloat(revenueSummary.rows[0].paid_revenue),
                pending_revenue: parseFloat(revenueSummary.rows[0].pending_revenue)
            }
        };

        const response: ApiResponse = {
            success: true,
            data: analytics,
            message: 'Revenue analytics retrieved successfully',
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Get revenue analytics error:', error);
        const response: ApiResponse = {
            success: false,
            error: 'Failed to retrieve revenue analytics',
        };
        return NextResponse.json(response, { status: 500 });
    }
}
