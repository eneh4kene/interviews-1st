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
        const type = searchParams.get('type') || 'overview';
        const format = searchParams.get('format') || 'json';
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

        let exportData: any = {};

        if (type === 'overview') {
            // Get overview data
            const overviewData = await db.query(`
                SELECT 
                    'users' as category,
                    COUNT(*) as count,
                    COUNT(CASE WHEN role = 'CLIENT' THEN 1 END) as clients,
                    COUNT(CASE WHEN role IN ('WORKER', 'MANAGER') THEN 1 END) as workers,
                    COUNT(CASE WHEN role = 'ADMIN' THEN 1 END) as admins
                FROM users
                UNION ALL
                SELECT 
                    'interviews' as category,
                    COUNT(*) as count,
                    COUNT(CASE WHEN status = 'client_accepted' THEN 1 END) as clients,
                    COUNT(CASE WHEN status = 'client_declined' THEN 1 END) as workers,
                    COUNT(CASE WHEN status = 'scheduled' THEN 1 END) as admins
                FROM interviews
                WHERE 1=1 ${dateFilter}
                UNION ALL
                SELECT 
                    'revenue' as category,
                    COALESCE(SUM(payment_amount), 0) as count,
                    COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN payment_amount ELSE 0 END), 0) as clients,
                    COALESCE(SUM(CASE WHEN payment_status = 'pending' THEN payment_amount ELSE 0 END), 0) as workers,
                    0 as admins
                FROM interviews
                WHERE 1=1 ${dateFilter}
            `);

            exportData = {
                period,
                generated_at: new Date().toISOString(),
                data: overviewData.rows.map(row => ({
                    category: row.category,
                    total: parseFloat(row.count),
                    clients: parseFloat(row.clients),
                    workers: parseFloat(row.workers),
                    admins: parseFloat(row.admins)
                }))
            };
        } else if (type === 'revenue') {
            // Get revenue data
            const revenueData = await db.query(`
                SELECT 
                    DATE(created_at) as date,
                    COUNT(*) as transactions,
                    COALESCE(SUM(payment_amount), 0) as total_revenue,
                    COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid_transactions,
                    COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN payment_amount ELSE 0 END), 0) as paid_revenue
                FROM interviews
                WHERE 1=1 ${dateFilter}
                GROUP BY DATE(created_at)
                ORDER BY date DESC
            `);

            exportData = {
                period,
                generated_at: new Date().toISOString(),
                data: revenueData.rows.map(row => ({
                    date: row.date,
                    transactions: parseInt(row.transactions),
                    total_revenue: parseFloat(row.total_revenue),
                    paid_transactions: parseInt(row.paid_transactions),
                    paid_revenue: parseFloat(row.paid_revenue)
                }))
            };
        } else if (type === 'workers') {
            // Get worker data
            const workerData = await db.query(`
                SELECT 
                    u.id,
                    u.name,
                    u.email,
                    u.role,
                    u.is_active,
                    u.last_login_at,
                    COUNT(DISTINCT c.id) as client_count,
                    COUNT(i.id) as total_interviews,
                    COALESCE(SUM(i.payment_amount), 0) as total_revenue
                FROM users u
                LEFT JOIN clients c ON u.id = c.worker_id
                LEFT JOIN interviews i ON c.id = i.client_id
                WHERE u.role IN ('WORKER', 'MANAGER')
                AND (i.id IS NULL OR 1=1 ${dateFilter.replace('created_at', 'i.created_at')})
                GROUP BY u.id, u.name, u.email, u.role, u.is_active, u.last_login_at
                ORDER BY total_revenue DESC
            `);

            exportData = {
                period,
                generated_at: new Date().toISOString(),
                data: workerData.rows.map(row => ({
                    id: row.id,
                    name: row.name,
                    email: row.email,
                    role: row.role,
                    is_active: row.is_active,
                    last_login_at: row.last_login_at,
                    client_count: parseInt(row.client_count),
                    total_interviews: parseInt(row.total_interviews),
                    total_revenue: parseFloat(row.total_revenue)
                }))
            };
        } else if (type === 'clients') {
            // Get client data
            const clientData = await db.query(`
                SELECT 
                    c.id,
                    c.name,
                    c.email,
                    c.status,
                    c.payment_status,
                    c.total_interviews,
                    c.total_paid,
                    c.created_at,
                    u.name as worker_name,
                    u.email as worker_email
                FROM clients c
                LEFT JOIN users u ON c.worker_id = u.id
                WHERE 1=1 ${dateFilter.replace('created_at', 'c.created_at')}
                ORDER BY c.created_at DESC
            `);

            exportData = {
                period,
                generated_at: new Date().toISOString(),
                data: clientData.rows.map(row => ({
                    id: row.id,
                    name: row.name,
                    email: row.email,
                    status: row.status,
                    payment_status: row.payment_status,
                    total_interviews: parseInt(row.total_interviews),
                    total_paid: parseInt(row.total_paid),
                    created_at: row.created_at,
                    worker_name: row.worker_name,
                    worker_email: row.worker_email
                }))
            };
        } else if (type === 'interviews') {
            // Get interview data
            const interviewData = await db.query(`
                SELECT 
                    i.id,
                    i.company_name,
                    i.job_title,
                    i.scheduled_date,
                    i.interview_type,
                    i.status,
                    i.payment_status,
                    i.payment_amount,
                    i.created_at,
                    c.name as client_name,
                    c.email as client_email,
                    u.name as worker_name,
                    u.email as worker_email
                FROM interviews i
                LEFT JOIN clients c ON i.client_id = c.id
                LEFT JOIN users u ON c.worker_id = u.id
                WHERE 1=1 ${dateFilter.replace('created_at', 'i.created_at')}
                ORDER BY i.created_at DESC
            `);

            exportData = {
                period,
                generated_at: new Date().toISOString(),
                data: interviewData.rows.map(row => ({
                    id: row.id,
                    company_name: row.company_name,
                    job_title: row.job_title,
                    scheduled_date: row.scheduled_date,
                    interview_type: row.interview_type,
                    status: row.status,
                    payment_status: row.payment_status,
                    payment_amount: parseFloat(row.payment_amount),
                    created_at: row.created_at,
                    client_name: row.client_name,
                    client_email: row.client_email,
                    worker_name: row.worker_name,
                    worker_email: row.worker_email
                }))
            };
        }

        // Format the response based on requested format
        if (format === 'csv') {
            // Convert to CSV format
            const csvData = convertToCSV(exportData.data);
            const response = new NextResponse(csvData, {
                status: 200,
                headers: {
                    'Content-Type': 'text/csv',
                    'Content-Disposition': `attachment; filename="analytics-${type}-${period}.csv"`
                }
            });
            return response;
        } else {
            // Return JSON format
            const response: ApiResponse = {
                success: true,
                data: exportData,
                message: 'Analytics data exported successfully',
            };
            return NextResponse.json(response);
        }
    } catch (error) {
        console.error('Export analytics error:', error);
        const response: ApiResponse = {
            success: false,
            error: 'Failed to export analytics data',
        };
        return NextResponse.json(response, { status: 500 });
    }
}

// Helper function to convert data to CSV format
function convertToCSV(data: any[]): string {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];
    
    for (const row of data) {
        const values = headers.map(header => {
            const value = row[header];
            // Escape commas and quotes in CSV
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
        });
        csvRows.push(values.join(','));
    }
    
    return csvRows.join('\n');
}
