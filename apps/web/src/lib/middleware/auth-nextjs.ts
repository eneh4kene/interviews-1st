// Next.js Authentication Middleware
import { NextRequest } from 'next/server';
import { verifyToken, extractTokenFromHeader } from '../utils/jwt';

export interface AuthUser {
    id: string;
    email: string;
    role: string;
}

export interface AuthResult {
    success: boolean;
    user?: AuthUser;
    error?: string;
}

export async function authMiddleware(request: NextRequest): Promise<AuthResult> {
    try {
        console.log('🔍 Auth middleware called');
        console.log('🔍 JWT_SECRET available:', !!process.env.JWT_SECRET);

        // Extract token from Authorization header
        const authHeader = request.headers.get('authorization');
        console.log('🔍 Auth header:', authHeader);

        const token = extractTokenFromHeader(authHeader || undefined);
        console.log('🔍 Extracted token:', token ? 'Present' : 'Missing');

        if (!token) {
            return {
                success: false,
                error: 'Access token required'
            };
        }

        // Verify the token
        console.log('🔍 Verifying token...');
        const decoded = verifyToken(token);
        console.log('🔍 Token decoded:', decoded);

        if (decoded.type !== 'access') {
            return {
                success: false,
                error: 'Invalid token type'
            };
        }

        // Return user information
        return {
            success: true,
            user: {
                id: decoded.userId,
                email: decoded.email,
                role: decoded.role
            }
        };

    } catch (error) {
        console.error('❌ Auth middleware error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Authentication failed'
        };
    }
}

// Helper function to check if user has required role
export function hasRole(user: AuthUser, requiredRole: string): boolean {
    return user.role === requiredRole;
}

// Helper function to check if user has any of the required roles
export function hasAnyRole(user: AuthUser, requiredRoles: string[]): boolean {
    return requiredRoles.includes(user.role);
}
