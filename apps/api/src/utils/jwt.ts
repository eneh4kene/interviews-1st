import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { redis } from './database';

// JWT Configuration
const JWT_ALGORITHM = 'RS256';
const ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRY = '30d'; // 30 days

// Load JWT keys
const getPrivateKey = () => {
    try {
        return fs.readFileSync(path.join(process.cwd(), 'private.pem'), 'utf8');
    } catch (error) {
        console.error('Error loading private key:', error);
        throw new Error('JWT private key not found');
    }
};

const getPublicKey = () => {
    try {
        return fs.readFileSync(path.join(process.cwd(), 'public.pem'), 'utf8');
    } catch (error) {
        console.error('Error loading public key:', error);
        throw new Error('JWT public key not found');
    }
};

// JWT Payload interface
interface JWTPayload {
    userId: string;
    email: string;
    role: string;
    type: 'access' | 'refresh';
    iat?: number;
    exp?: number;
}

// Generate access token
export const generateAccessToken = (payload: Omit<JWTPayload, 'type' | 'iat' | 'exp'>): string => {
    const privateKey = getPrivateKey();

    return jwt.sign(
        { ...payload, type: 'access' },
        privateKey,
        {
            algorithm: JWT_ALGORITHM,
            expiresIn: ACCESS_TOKEN_EXPIRY,
            issuer: 'interviewsfirst',
            audience: 'interviewsfirst-users',
        }
    );
};

// Generate refresh token
export const generateRefreshToken = (payload: Omit<JWTPayload, 'type' | 'iat' | 'exp'>): string => {
    const privateKey = getPrivateKey();

    const token = jwt.sign(
        { ...payload, type: 'refresh' },
        privateKey,
        {
            algorithm: JWT_ALGORITHM,
            expiresIn: REFRESH_TOKEN_EXPIRY,
            issuer: 'interviewsfirst',
            audience: 'interviewsfirst-users',
        }
    );

    // Store refresh token in Redis for revocation capability
    const redisKey = `refresh_token:${payload.userId}:${token}`;
    redis.set(redisKey, 'valid', 30 * 24 * 60 * 60); // 30 days

    return token;
};

// Verify and decode JWT token
export const verifyToken = (token: string): JWTPayload => {
    const publicKey = getPublicKey();

    try {
        const decoded = jwt.verify(token, publicKey, {
            algorithms: [JWT_ALGORITHM],
            issuer: 'interviewsfirst',
            audience: 'interviewsfirst-users',
        }) as JWTPayload;

        return decoded;
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            throw new Error('Token expired');
        } else if (error instanceof jwt.JsonWebTokenError) {
            throw new Error('Invalid token');
        } else {
            throw new Error('Token verification failed');
        }
    }
};

// Verify refresh token and check if it's revoked
export const verifyRefreshToken = async (token: string): Promise<JWTPayload> => {
    const decoded = verifyToken(token);

    if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
    }

    // Check if token is revoked in Redis
    const redisKey = `refresh_token:${decoded.userId}:${token}`;
    const isRevoked = await redis.get(redisKey);

    if (!isRevoked) {
        throw new Error('Token revoked');
    }

    return decoded;
};

// Revoke refresh token
export const revokeRefreshToken = async (userId: string, token: string): Promise<void> => {
    const redisKey = `refresh_token:${userId}:${token}`;
    await redis.del(redisKey);
};

// Revoke all refresh tokens for a user
export const revokeAllUserTokens = async (userId: string): Promise<void> => {
    const pattern = `refresh_token:${userId}:*`;
    const keys = await redis.keys(pattern);

    if (keys.length > 0) {
        await Promise.all(keys.map(key => redis.del(key)));
    }
};

// Generate token pair (access + refresh)
export const generateTokenPair = (payload: Omit<JWTPayload, 'type' | 'iat' | 'exp'>) => {
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    return {
        accessToken,
        refreshToken,
    };
};

// Extract token from Authorization header
export const extractTokenFromHeader = (authHeader: string | undefined): string | null => {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    return authHeader.substring(7);
};

// Rate limiting for auth endpoints
export const getAuthRateLimitKey = (ip: string, endpoint: string): string => {
    return `auth_rate_limit:${ip}:${endpoint}`;
};

// Check if user is authenticated (middleware helper)
export const isAuthenticated = (payload: JWTPayload): boolean => {
    return payload.type === 'access' && !!payload.userId;
};

// Check if user has required role
export const hasRole = (payload: JWTPayload, requiredRole: string): boolean => {
    return payload.role === requiredRole || payload.role === 'ADMIN';
};

// Check if user has any of the required roles
export const hasAnyRole = (payload: JWTPayload, requiredRoles: string[]): boolean => {
    return requiredRoles.includes(payload.role) || payload.role === 'ADMIN';
}; 