import express from 'express';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { validateRequest } from '../utils/validation';
import bcrypt from 'bcryptjs';
import { generateTokenPair, verifyRefreshToken, revokeRefreshToken, verifyToken } from '../utils/jwt';
import { authRateLimit } from '../middleware/auth';
import { db } from '../utils/database';
import {
    User,
    LoginRequest,
    LoginResponse,
    RefreshTokenRequest,
    RefreshTokenResponse,
    MagicLinkRequest,
    MagicLinkResponse,
    ApiResponse
} from '@interview-me/types';

const router = express.Router();

// Configure multer for resume uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../uploads/resumes');
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Generate unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `resume-${uniqueSuffix}${ext}`);
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        // Allow only PDF, DOC, DOCX files
        const allowedMimeTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];

        const allowedExtensions = ['.pdf', '.doc', '.docx'];
        const fileExtension = path.extname(file.originalname).toLowerCase();

        // Check both MIME type and file extension
        const isValidMimeType = allowedMimeTypes.includes(file.mimetype);
        const isValidExtension = allowedExtensions.includes(fileExtension);

        if (isValidMimeType || isValidExtension) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PDF, DOC, and DOCX files are allowed.'));
        }
    }
});

// Error handling middleware for multer
const handleMulterError = (error: any, req: any, res: any, next: any) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                error: 'File too large. Maximum size is 5MB.',
            });
        }
        return res.status(400).json({
            success: false,
            error: 'File upload error: ' + error.message,
        });
    }

    if (error instanceof Error && error.message.includes('Invalid file type')) {
        return res.status(400).json({
            success: false,
            error: error.message,
        });
    }

    next(error);
};

// No mock users or passwords; all authentication uses the Neon database

// JWT configuration is now handled in utils/jwt.ts

// Validation schemas
const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
});

const refreshTokenSchema = z.object({
    refreshToken: z.string(),
});

const magicLinkSchema = z.object({
    email: z.string().email(),
    interviewId: z.string(),
});

const jobPreferenceSchema = z.object({
    title: z.string().min(1, 'Job title is required'),
    company: z.string().optional(),
    location: z.string().min(1, 'Location is required'),
    workType: z.enum(['remote', 'hybrid', 'onsite']),
    visaSponsorship: z.boolean().default(false),
    salaryMin: z.number().optional(),
    salaryMax: z.number().optional(),
    currency: z.string().default('GBP'),
});

const clientRegistrationSchema = z.object({
    name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional(),
    location: z.string().min(1),
    linkedinUrl: z.string().url().optional().or(z.literal('')),
    company: z.string().optional(),
    position: z.string().optional(),
    jobPreferences: z.array(jobPreferenceSchema).max(5, 'Maximum 5 job preferences allowed').optional(),
});

// Helper functions
// JWT functions are now handled in utils/jwt.ts
const generateMagicLinkToken = (email: string, interviewId: string): string => {
    // TODO: Implement secure magic link generation
    return `magic_link_${email}_${interviewId}_${Date.now()}`;
};

// Routes
router.post('/login', authRateLimit(5, 15 * 60 * 1000), validateRequest({ body: loginSchema }), async (req, res) => {
    try {
        const { email, password } = req.body as LoginRequest;

        // Find user in database
        const { rows } = await db.query(
            'SELECT id, email, name, role, password_hash, is_active, two_factor_enabled, last_login_at, created_at, updated_at FROM users WHERE email = $1 LIMIT 1',
            [email]
        );

        if (rows.length === 0) {
            const response: LoginResponse = {
                success: false,
                error: 'Invalid credentials',
            };
            return res.status(401).json(response);
        }

        const dbUser = rows[0];

        if (!dbUser.is_active) {
            const response: LoginResponse = {
                success: false,
                error: 'Account disabled',
            };
            return res.status(403).json(response);
        }

        // Verify password using bcrypt
        const passwordHash: string = dbUser.password_hash;
        const isValid = passwordHash && await bcrypt.compare(password, passwordHash);
        if (!isValid) {
            const response: LoginResponse = {
                success: false,
                error: 'Invalid credentials',
            };
            return res.status(401).json(response);
        }

        const user: User = {
            id: dbUser.id,
            email: dbUser.email,
            name: dbUser.name,
            role: dbUser.role,
            isActive: dbUser.is_active,
            twoFactorEnabled: dbUser.two_factor_enabled,
            lastLoginAt: dbUser.last_login_at || null,
            createdAt: dbUser.created_at,
            updatedAt: dbUser.updated_at,
        };

        // Generate tokens
        const { accessToken, refreshToken } = generateTokenPair({
            userId: user.id,
            email: user.email,
            role: user.role,
        });

        // Update last login
        await db.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

        // Set refresh token as HTTP-only cookie
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        });

        // Clear rate-limit counter on successful login
        try {
            const ip = req.ip || (req.connection as any).remoteAddress || 'unknown';
            const endpoint = req.path;
            const key = `auth_rate_limit:${ip}:${endpoint}`;
            const { redis } = await import('../utils/database');
            await redis.del(key);
        } catch (e) {
            // ignore
        }

        const response: LoginResponse = {
            success: true,
            data: {
                user,
                accessToken,
            },
            message: 'Login successful',
        };

        res.status(200).json(response);
    } catch (error) {
        console.error('Login error:', error);
        const response: LoginResponse = {
            success: false,
            error: 'Internal server error',
        };
        res.status(500).json(response);
    }
});

router.post('/logout', (req, res) => {
    try {
        // Clear refresh token cookie
        res.clearCookie('refreshToken');

        const response: ApiResponse<null> = {
            success: true,
            data: null,
            message: 'Logout successful',
        };

        res.status(200).json(response);
    } catch (error) {
        console.error('Logout error:', error);
        const response: ApiResponse<null> = {
            success: false,
            error: 'Internal server error',
        };
        res.status(500).json(response);
    }
});

router.post('/refresh', validateRequest({ body: refreshTokenSchema }), async (req, res) => {
    try {
        const { refreshToken } = req.body as RefreshTokenRequest;

        // Verify refresh token using our secure JWT system
        const decoded = await verifyRefreshToken(refreshToken);

        // Find user in database
        const { rows } = await db.query(
            'SELECT id, email, name, role, is_active, two_factor_enabled, last_login_at, created_at, updated_at FROM users WHERE id = $1 LIMIT 1',
            [decoded.userId]
        );
        if (rows.length === 0 || !rows[0].is_active) {
            const response: RefreshTokenResponse = {
                success: false,
                error: 'User not found or inactive',
            };
            return res.status(401).json(response);
        }

        const user = rows[0];

        // Generate new tokens using our secure JWT system
        const { accessToken: newAccessToken, refreshToken: newRefreshToken } = generateTokenPair({
            userId: user.id,
            email: user.email,
            role: user.role,
        });

        // Revoke old refresh token
        await revokeRefreshToken(decoded.userId, refreshToken);

        // Set new refresh token as HTTP-only cookie
        res.cookie('refreshToken', newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        });

        const response: RefreshTokenResponse = {
            success: true,
            data: {
                accessToken: newAccessToken,
                refreshToken: newRefreshToken,
            },
            message: 'Token refreshed successfully',
        };

        res.status(200).json(response);
    } catch (error) {
        console.error('Refresh token error:', error);
        const response: RefreshTokenResponse = {
            success: false,
            error: 'Invalid refresh token',
        };
        res.status(401).json(response);
    }
});

router.post('/magic-link', validateRequest({ body: magicLinkSchema }), (req, res) => {
    try {
        const { email, interviewId } = req.body as MagicLinkRequest;

        // In real app, verify that the email matches the client for this interview
        // For now, just generate a magic link token
        const token = generateMagicLinkToken(email, interviewId);
        const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

        const response: MagicLinkResponse = {
            success: true,
            data: {
                token,
                expiresAt,
            },
            message: 'Magic link generated successfully',
        };

        res.status(200).json(response);
    } catch (error) {
        console.error('Magic link error:', error);
        const response: MagicLinkResponse = {
            success: false,
            error: 'Failed to generate magic link',
        };
        res.status(500).json(response);
    }
});

router.get('/me', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            const response: ApiResponse<null> = {
                success: false,
                error: 'No valid authorization token',
            };
            return res.status(401).json(response);
        }

        const token = authHeader.substring(7);
        const decoded = verifyToken(token);

        const { rows } = await db.query(
            'SELECT id, email, name, role, is_active, two_factor_enabled, last_login_at, created_at, updated_at FROM users WHERE id = $1 LIMIT 1',
            [decoded.userId]
        );
        if (rows.length === 0 || !rows[0].is_active) {
            const response: ApiResponse<null> = {
                success: false,
                error: 'User not found or inactive',
            };
            return res.status(401).json(response);
        }

        const user: User = {
            id: rows[0].id,
            email: rows[0].email,
            name: rows[0].name,
            role: rows[0].role,
            isActive: rows[0].is_active,
            twoFactorEnabled: rows[0].two_factor_enabled,
            lastLoginAt: rows[0].last_login_at || null,
            createdAt: rows[0].created_at,
            updatedAt: rows[0].updated_at,
        };

        const response: ApiResponse<User> = {
            success: true,
            data: user,
            message: 'User profile retrieved successfully',
        };

        res.status(200).json(response);
    } catch (error) {
        console.error('Get user profile error:', error);
        const response: ApiResponse<null> = {
            success: false,
            error: 'Invalid token',
        };
        res.status(401).json(response);
    }
});

// Client registration endpoint
router.post('/register-client', upload.single('resume'), handleMulterError, async (req: any, res: any) => {
    try {
        const { name, email, phone, location, linkedinUrl, company, position, jobPreferences: jobPreferencesStr } = req.body;
        const resumeFile = req.file;
        
        // Parse job preferences from JSON string
        let jobPreferences = [];
        if (jobPreferencesStr) {
            try {
                jobPreferences = JSON.parse(jobPreferencesStr);
            } catch (error) {
                console.error('Error parsing job preferences:', error);
                jobPreferences = [];
            }
        }

        // Check if client already exists
        const existingClient = await db.query(
            'SELECT id FROM clients WHERE email = $1',
            [email]
        );

        if (existingClient.rows.length > 0) {
            const response: ApiResponse = {
                success: false,
                error: 'A client with this email already exists',
            };
            return res.status(409).json(response);
        }

        // Use load-balanced assignment to worker with least clients
        const availableWorkers = await db.query(`
            SELECT u.id, u.name, u.email, COUNT(c.id) as client_count
            FROM users u
            LEFT JOIN clients c ON u.id = c.worker_id AND c.status = 'active'
            WHERE u.role IN ('WORKER', 'MANAGER') AND u.is_active = true
            GROUP BY u.id, u.name, u.email
            ORDER BY client_count ASC, u.last_login_at ASC
            LIMIT 1
        `);

        if (availableWorkers.rows.length === 0) {
            const response: ApiResponse = {
                success: false,
                error: 'No available workers to assign this client',
            };
            return res.status(503).json(response);
        }

        const workerId = availableWorkers.rows[0].id;
        const workerName = availableWorkers.rows[0].name;
        const clientCount = availableWorkers.rows[0].client_count;

        // Create the client
        const result = await db.query(`
            INSERT INTO clients (worker_id, name, email, phone, linkedin_url, status, payment_status, total_interviews, total_paid, is_new)
            VALUES ($1, $2, $3, $4, $5, 'active', 'pending', 0, 0, true)
            RETURNING 
                id,
                worker_id as "workerId",
                name,
                email,
                phone,
                linkedin_url as "linkedinUrl",
                status,
                payment_status as "paymentStatus",
                total_interviews as "totalInterviews",
                total_paid as "totalPaid",
                is_new as "isNew",
                assigned_at as "assignedAt",
                created_at as "createdAt",
                updated_at as "updatedAt"
        `, [workerId, name, email, phone || null, linkedinUrl || null]);

        const clientId = result.rows[0].id;

        // Create resume if provided
        if (resumeFile) {
            await db.query(`
                INSERT INTO resumes (client_id, name, file_url, is_default)
                VALUES ($1, $2, $3, true)
            `, [
                clientId,
                resumeFile.originalname,
                resumeFile.filename
            ]);
        }

        // Create job preferences if provided
        if (jobPreferences && jobPreferences.length > 0) {
            for (const preference of jobPreferences) {
                await db.query(`
                    INSERT INTO job_preferences (
                        client_id, title, company, location, work_type, 
                        visa_sponsorship, salary_min, salary_max, salary_currency, status
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active')
                `, [
                    clientId,
                    preference.title,
                    preference.company || null,
                    preference.location,
                    preference.workType,
                    preference.visaSponsorship,
                    preference.salaryMin || null,
                    preference.salaryMax || null,
                    preference.currency
                ]);
            }
        }

        const response: ApiResponse = {
            success: true,
            data: result.rows[0],
            message: `Client registered successfully. Assigned to ${workerName} (${clientCount + 1} clients). You will be contacted by your assigned career coach soon.`,
        };

        res.status(201).json(response);
    } catch (error) {
        console.error('Client registration error:', error);
        const response: ApiResponse = {
            success: false,
            error: 'Failed to register client',
        };
        res.status(500).json(response);
    }
});

// Get client resume for n8n workflow
router.get('/client/:clientId/resume', async (req, res) => {
    try {
        const { clientId } = req.params;

        // Get client's default resume
        const result = await db.query(`
            SELECT 
                r.id,
                r.name,
                r.file_url,
                r.is_default,
                c.name as client_name,
                c.email as client_email
            FROM resumes r
            JOIN clients c ON r.client_id = c.id
            WHERE r.client_id = $1 AND r.is_default = true
            ORDER BY r.created_at DESC
            LIMIT 1
        `, [clientId]);

        if (result.rows.length === 0) {
            const response: ApiResponse = {
                success: false,
                error: 'No resume found for this client',
            };
            return res.status(404).json(response);
        }

        const resume = result.rows[0];
        
        // Construct the file URL
        const fileUrl = `${req.protocol}://${req.get('host')}/uploads/resumes/${resume.file_url}`;

        const response: ApiResponse = {
            success: true,
            data: {
                ...resume,
                fileUrl,
                downloadUrl: fileUrl
            },
            message: 'Resume retrieved successfully',
        };

        res.json(response);
    } catch (error) {
        console.error('Get client resume error:', error);
        const response: ApiResponse = {
            success: false,
            error: 'Failed to retrieve client resume',
        };
        res.status(500).json(response);
    }
});

export default router; 