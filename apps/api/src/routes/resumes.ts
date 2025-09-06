import express from 'express';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { validateRequest } from '../utils/validation';
import { ApiResponse, Resume } from '@interview-me/types';
import { db } from '../utils/database';

const router = express.Router();

// All resume data now comes from the PostgreSQL database

// Configure multer for file uploads with type safety workaround
const storage = multer.diskStorage({
    destination: (req: any, file: any, cb: any) => {
        const uploadDir = path.join(__dirname, '../../uploads/resumes');
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req: any, file: any, cb: any) => {
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
    fileFilter: (req: any, file: any, cb: any) => {
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
            console.log('File validation failed:', {
                originalname: file.originalname,
                mimetype: file.mimetype,
                extension: fileExtension
            });
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

// Validation schemas
const createResumeSchema = z.object({
    body: z.object({
        clientId: z.string().min(1, 'Client ID is required'),
        name: z.string().min(1, 'Resume name is required').max(255, 'Resume name too long'),
        isDefault: z.string().optional().transform(val => val === 'true'),
    }),
});

const updateResumeSchema = z.object({
    params: z.object({
        id: z.string().min(1, 'Resume ID is required'),
    }),
    body: z.object({
        name: z.string().min(1, 'Resume name is required').max(255, 'Resume name too long'),
        isDefault: z.boolean().optional(),
    }),
});

const getResumesSchema = z.object({
    query: z.object({
        clientId: z.string().min(1, 'Client ID is required'),
    }),
});

// Get all resumes for a client
router.get('/', validateRequest(getResumesSchema), async (req, res) => {
    try {
        const { clientId } = req.query;

        const result = await db.query(`
            SELECT 
                id,
                client_id as "clientId",
                name,
                file_url as "fileUrl",
                is_default as "isDefault",
                created_at as "createdAt",
                updated_at as "updatedAt"
            FROM resumes 
            WHERE client_id = $1
            ORDER BY created_at DESC
        `, [clientId]);

        const response: ApiResponse = {
            success: true,
            data: result.rows,
            message: 'Resumes retrieved successfully',
        };

        res.json(response);
    } catch (error) {
        console.error('Error fetching resumes:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch resumes',
        });
    }
});

// Get a specific resume
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await db.query(`
            SELECT 
                id,
                client_id as "clientId",
                name,
                file_url as "fileUrl",
                is_default as "isDefault",
                created_at as "createdAt",
                updated_at as "updatedAt"
            FROM resumes 
            WHERE id = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Resume not found',
            });
        }

        const response: ApiResponse = {
            success: true,
            data: result.rows[0],
            message: 'Resume retrieved successfully',
        };

        res.json(response);
    } catch (error) {
        console.error('Error fetching resume:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch resume',
        });
    }
});

// Upload a new resume
router.post('/', upload.single('file'), handleMulterError, validateRequest(createResumeSchema), async (req: any, res: any) => {
    try {
        const { clientId, name, isDefault = false } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({
                success: false,
                error: 'No file uploaded',
            });
        }

        // Check if this is the first resume for this client
        const existingResumesResult = await db.query(
            'SELECT COUNT(*) as count FROM resumes WHERE client_id = $1',
            [clientId]
        );
        const isFirstResume = parseInt(existingResumesResult.rows[0].count) === 0;

        // Determine if this should be the default resume
        // Only set as default if explicitly requested OR if it's the first resume
        const shouldBeDefault = isDefault || isFirstResume;

        // If this should be default, unset other defaults for this client first
        if (shouldBeDefault) {
            await db.query(
                'UPDATE resumes SET is_default = false WHERE client_id = $1',
                [clientId]
            );
        }

        // Create new resume in database
        const result = await db.query(`
            INSERT INTO resumes (client_id, name, file_url, is_default)
            VALUES ($1, $2, $3, $4)
            RETURNING 
                id,
                client_id as "clientId",
                name,
                file_url as "fileUrl",
                is_default as "isDefault",
                created_at as "createdAt",
                updated_at as "updatedAt"
        `, [clientId, name, file.filename, shouldBeDefault]);

        const response: ApiResponse = {
            success: true,
            data: result.rows[0],
            message: 'Resume uploaded successfully',
        };

        res.status(201).json(response);
    } catch (error) {
        console.error('Error uploading resume:', error);

        // Handle multer errors specifically
        if (error instanceof Error && error.message.includes('Invalid file type')) {
            return res.status(400).json({
                success: false,
                error: error.message,
            });
        }

        res.status(500).json({
            success: false,
            error: 'Failed to upload resume',
        });
    }
});

// Update resume details
router.put('/:id', validateRequest(updateResumeSchema), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, isDefault } = req.body;

        // First, check if resume exists
        const existingResume = await db.query(`
            SELECT id, client_id, is_default
            FROM resumes 
            WHERE id = $1
        `, [id]);

        if (existingResume.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Resume not found',
            });
        }

        const resume = existingResume.rows[0];

        // If setting as default, ensure only one default per client
        if (isDefault) {
            await db.query(`
                UPDATE resumes 
                SET is_default = false 
                WHERE client_id = $1 AND id != $2
            `, [resume.client_id, id]);
        }

        // Update the resume
        const result = await db.query(`
            UPDATE resumes 
            SET name = $1, is_default = $2, updated_at = NOW()
            WHERE id = $3
            RETURNING 
                id,
                client_id as "clientId",
                name,
                file_url as "fileUrl",
                is_default as "isDefault",
                created_at as "createdAt",
                updated_at as "updatedAt"
        `, [name, isDefault !== undefined ? isDefault : resume.is_default, id]);

        const updatedResume = result.rows[0];

        const response: ApiResponse = {
            success: true,
            data: updatedResume,
            message: 'Resume updated successfully',
        };

        res.json(response);
    } catch (error) {
        console.error('Error updating resume:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update resume',
        });
    }
});

// Download resume file
router.get('/:id/download', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await db.query(`
            SELECT name, file_url 
            FROM resumes 
            WHERE id = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Resume not found',
            });
        }

        const resume = result.rows[0];
        const filePath = path.join(__dirname, '../../uploads/resumes', resume.file_url);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                error: 'Resume file not found',
            });
        }

        // Set headers for file download
        res.setHeader('Content-Disposition', `attachment; filename="${resume.name}.pdf"`);
        res.setHeader('Content-Type', 'application/pdf');

        // Stream the file
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
    } catch (error) {
        console.error('Error downloading resume:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to download resume',
        });
    }
});

// Delete resume
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // First, get the resume details to find the file path
        const resumeResult = await db.query(`
            SELECT id, file_url, client_id
            FROM resumes 
            WHERE id = $1
        `, [id]);

        if (resumeResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Resume not found',
            });
        }

        const resume = resumeResult.rows[0];

        // Delete the file from disk
        const filePath = path.join(__dirname, '../../uploads/resumes', resume.file_url);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        // Delete from database
        await db.query('DELETE FROM resumes WHERE id = $1', [id]);

        const response: ApiResponse = {
            success: true,
            message: 'Resume deleted successfully',
        };

        res.json(response);
    } catch (error) {
        console.error('Error deleting resume:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete resume',
        });
    }
});

export default router; 