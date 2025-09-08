import jwt from 'jsonwebtoken';
import { redis } from './database';

// JWT Configuration
const JWT_ALGORITHM = 'HS256';
const ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRY = '30d'; // 30 days

// HS256 secrets from env
const getAccessTokenSecret = () => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET is not set');
    }
    return secret;
};

const getRefreshTokenSecret = () => {
    // Prefer dedicated refresh secret if provided, otherwise fall back to JWT_SECRET
    const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_REFRESH_SECRET or JWT_SECRET must be set');
    }
    return secret;
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
    const secret = getAccessTokenSecret();

    return jwt.sign(
        { ...payload, type: 'access' },
        secret,
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
    const secret = getRefreshTokenSecret();

    const token = jwt.sign(
        { ...payload, type: 'refresh' },
        secret,
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
    // Try verifying with access secret first, then refresh secret as needed
    const accessSecret = getAccessTokenSecret();
    const refreshSecret = getRefreshTokenSecret();

    const tryVerify = (secret: string) => jwt.verify(token, secret, {
        algorithms: [JWT_ALGORITHM],
        issuer: 'interviewsfirst',
        audience: 'interviewsfirst-users',
    }) as JWTPayload;

    try {
        return tryVerify(accessSecret);
    } catch (err) {
        try {
            return tryVerify(refreshSecret);
        } catch (error) {
            if (error instanceof jwt.TokenExpiredError) {
                throw new Error('Token expired');
            } else if (error instanceof jwt.JsonWebTokenError) {
                throw new Error('Invalid token');
            } else {
                throw new Error('Token verification failed');
            }
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
        await Promise.all(keys.map((key: string) => redis.del(key)));
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