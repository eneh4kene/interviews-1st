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

        // Get basic interview counts
        const basicStats = await db.query(`
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
                0 as avg_rating
            FROM interviews
            WHERE 1=1 ${dateFilter}
        `);

        // Get recent interview activity (last 30 days)
        const recentActivity = await db.query(`
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as new_interviews
            FROM interviews
            WHERE created_at >= NOW() - INTERVAL '30 days'
            GROUP BY DATE(created_at)
            ORDER BY date DESC
        `);

        // Get interview status distribution
        const statusDistribution = await db.query(`
            SELECT 
                status,
                COUNT(*) as count
            FROM interviews
            WHERE 1=1 ${dateFilter}
            GROUP BY status
        `);

        // Get interview type distribution
        const typeDistribution = await db.query(`
            SELECT 
                interview_type,
                COUNT(*) as count
            FROM interviews
            WHERE 1=1 ${dateFilter}
            GROUP BY interview_type
        `);

        // Get payment status distribution
        const paymentDistribution = await db.query(`
            SELECT 
                payment_status,
                COUNT(*) as count
            FROM interviews
            WHERE 1=1 ${dateFilter}
            GROUP BY payment_status
        `);

        // Get top performing workers by interview count
        const topWorkers = await db.query(`
            SELECT 
                u.id,
                u.name,
                u.email,
                COUNT(i.id) as interview_count,
                COUNT(CASE WHEN i.status = 'completed' THEN 1 END) as completed_count,
                COUNT(CASE WHEN i.status = 'client_accepted' THEN 1 END) as accepted_count,
                COALESCE(SUM(i.payment_amount), 0) as total_revenue,
                0 as avg_rating
            FROM users u
            LEFT JOIN clients c ON u.id = c.worker_id
            LEFT JOIN interviews i ON c.id = i.client_id
            WHERE u.role IN ('WORKER', 'MANAGER')
            AND (i.id IS NULL OR 1=1 ${dateFilter.replace('created_at', 'i.created_at')})
            GROUP BY u.id, u.name, u.email
            ORDER BY interview_count DESC
            LIMIT 10
        `);

        // Get top clients by interview count
        const topClients = await db.query(`
            SELECT 
                c.id,
                c.name,
                c.email,
                COUNT(i.id) as interview_count,
                COUNT(CASE WHEN i.status = 'completed' THEN 1 END) as completed_count,
                COUNT(CASE WHEN i.status = 'client_accepted' THEN 1 END) as accepted_count,
                COALESCE(SUM(i.payment_amount), 0) as total_paid
            FROM clients c
            LEFT JOIN interviews i ON c.id = i.client_id
            WHERE 1=1 ${dateFilter.replace('created_at', 'i.created_at')}
            GROUP BY c.id, c.name, c.email
            ORDER BY interview_count DESC
            LIMIT 10
        `);

        // Get monthly interview trends
        const monthlyTrends = await db.query(`
            SELECT 
                DATE_TRUNC('month', created_at) as month,
                COUNT(*) as interview_count,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
                COALESCE(SUM(payment_amount), 0) as revenue
            FROM interviews
            WHERE created_at >= NOW() - INTERVAL '12 months'
            GROUP BY DATE_TRUNC('month', created_at)
            ORDER BY month DESC
        `);

        const totalInterviews = parseInt(basicStats.rows[0].total_interviews);
        const acceptedInterviews = parseInt(basicStats.rows[0].accepted_interviews);
        const acceptanceRate = totalInterviews > 0 ? (acceptedInterviews / totalInterviews) * 100 : 0;

        const stats = {
            total_interviews: totalInterviews,
            scheduled_interviews: parseInt(basicStats.rows[0].scheduled_interviews),
            completed_interviews: parseInt(basicStats.rows[0].completed_interviews),
            accepted_interviews: acceptedInterviews,
            declined_interviews: parseInt(basicStats.rows[0].declined_interviews),
            cancelled_interviews: parseInt(basicStats.rows[0].cancelled_interviews),
            paid_interviews: parseInt(basicStats.rows[0].paid_interviews),
            pending_payments: parseInt(basicStats.rows[0].pending_payments),
            total_revenue: parseFloat(basicStats.rows[0].total_revenue),
            avg_payment_amount: parseFloat(basicStats.rows[0].avg_payment_amount),
            avg_rating: parseFloat(basicStats.rows[0].avg_rating),
            acceptance_rate: acceptanceRate,
            recent_activity: recentActivity.rows.map((row: any) => ({
                date: row.date,
                new_interviews: parseInt(row.new_interviews)
            })),
            status_distribution: statusDistribution.rows.map((row: any) => ({
                status: row.status,
                count: parseInt(row.count)
            })),
            type_distribution: typeDistribution.rows.map((row: any) => ({
                interview_type: row.interview_type,
                count: parseInt(row.count)
            })),
            payment_distribution: paymentDistribution.rows.map((row: any) => ({
                payment_status: row.payment_status,
                count: parseInt(row.count)
            })),
            top_workers: topWorkers.rows.map((row: any) => ({
                id: row.id,
                name: row.name,
                email: row.email,
                interview_count: parseInt(row.interview_count),
                completed_count: parseInt(row.completed_count),
                accepted_count: parseInt(row.accepted_count),
                total_revenue: parseFloat(row.total_revenue),
                avg_rating: parseFloat(row.avg_rating)
            })),
            top_clients: topClients.rows.map((row: any) => ({
                id: row.id,
                name: row.name,
                email: row.email,
                interview_count: parseInt(row.interview_count),
                completed_count: parseInt(row.completed_count),
                accepted_count: parseInt(row.accepted_count),
                total_paid: parseFloat(row.total_paid)
            })),
            monthly_trends: monthlyTrends.rows.map((row: any) => ({
                month: row.month,
                interview_count: parseInt(row.interview_count),
                completed_count: parseInt(row.completed_count),
                revenue: parseFloat(row.revenue)
            }))
        };

        const response: ApiResponse = {
            success: true,
            data: stats,
            message: 'Interview statistics retrieved successfully',
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Get interview stats error:', error);
        const response: ApiResponse = {
            success: false,
            error: 'Failed to retrieve interview statistics',
        };
        return NextResponse.json(response, { status: 500 });
    }
}
