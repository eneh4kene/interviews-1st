import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../lib/utils/database';
import { ApiResponse } from '@interview-me/types';
import bcrypt from 'bcryptjs';

// Get all workers with pagination, search, and filtering
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const search = searchParams.get('search') || '';
        const status = searchParams.get('status') || 'all';

        const offset = (page - 1) * limit;

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

        // Main query
        paramCount++;
        const workersQuery = `
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
            LIMIT $${paramCount} OFFSET $${paramCount + 1}
        `;

        queryParams.push(limit, offset);

        const workersResult = await db.query(workersQuery, queryParams);

        // Count query
        const countQuery = `
            SELECT COUNT(*) as total
            FROM users u
            ${whereClause}
        `;

        const countResult = await db.query(countQuery, queryParams.slice(0, -2));

        const response: ApiResponse = {
            success: true,
            data: {
                workers: workersResult.rows,
                pagination: {
                    page,
                    limit,
                    total: parseInt(countResult.rows[0].total),
                    pages: Math.ceil(parseInt(countResult.rows[0].total) / limit)
                }
            },
            message: 'Workers retrieved successfully',
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Error fetching workers:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to fetch workers',
        }, { status: 500 });
    }
}

// Create new worker
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, email, password, role = 'WORKER', isActive = true, twoFactorEnabled = false } = body;

        // Validate required fields
        if (!name || !email || !password) {
            return NextResponse.json({
                success: false,
                error: 'Name, email, and password are required',
            }, { status: 400 });
        }

        // Check if user already exists
        const existingUser = await db.query(
            'SELECT id FROM users WHERE email = $1',
            [email]
        );

        if (existingUser.rows.length > 0) {
            return NextResponse.json({
                success: false,
                error: 'User with this email already exists',
            }, { status: 400 });
        }

        // Hash password
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

        return NextResponse.json(response, { status: 201 });
    } catch (error) {
        console.error('Error creating worker:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to create worker',
        }, { status: 500 });
    }
}
