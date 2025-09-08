import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../lib/utils/database';
import { ApiResponse } from '@interview-me/types';

// Get single worker
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const { id } = params;

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
            return NextResponse.json({
                success: false,
                error: 'Worker not found',
            }, { status: 404 });
        }

        const response: ApiResponse = {
            success: true,
            data: result.rows[0],
            message: 'Worker retrieved successfully',
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Error fetching worker:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to fetch worker',
        }, { status: 500 });
    }
}

// Update worker
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const { id } = params;
        const body = await request.json();
        const { name, email, role, isActive, twoFactorEnabled } = body;

        // Check if worker exists
        const existingWorker = await db.query(
            'SELECT id FROM users WHERE id = $1 AND role IN (\'WORKER\', \'MANAGER\')',
            [id]
        );

        if (existingWorker.rows.length === 0) {
            return NextResponse.json({
                success: false,
                error: 'Worker not found',
            }, { status: 404 });
        }

        // Check if email is already taken by another user
        if (email) {
            const emailCheck = await db.query(
                'SELECT id FROM users WHERE email = $1 AND id != $2',
                [email, id]
            );

            if (emailCheck.rows.length > 0) {
                return NextResponse.json({
                    success: false,
                    error: 'Email already taken by another user',
                }, { status: 400 });
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
            return NextResponse.json({
                success: false,
                error: 'No fields to update',
            }, { status: 400 });
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

        return NextResponse.json(response);
    } catch (error) {
        console.error('Error updating worker:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to update worker',
        }, { status: 500 });
    }
}

// Delete worker (soft delete by deactivating)
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const { id } = params;

        // Check if worker exists
        const existingWorker = await db.query(
            'SELECT id, name FROM users WHERE id = $1 AND role IN (\'WORKER\', \'MANAGER\')',
            [id]
        );

        if (existingWorker.rows.length === 0) {
            return NextResponse.json({
                success: false,
                error: 'Worker not found',
            }, { status: 404 });
        }

        // Check if worker has active clients
        const activeClients = await db.query(
            'SELECT COUNT(*) as count FROM clients WHERE worker_id = $1 AND status = \'active\'',
            [id]
        );

        if (parseInt(activeClients.rows[0].count) > 0) {
            return NextResponse.json({
                success: false,
                error: 'Cannot delete worker with active clients. Please reassign clients first.',
            }, { status: 400 });
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

        return NextResponse.json(response);
    } catch (error) {
        console.error('Error deleting worker:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to delete worker',
        }, { status: 500 });
    }
}
