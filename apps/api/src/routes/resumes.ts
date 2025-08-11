import express from 'express';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { validateRequest } from '../utils/validation';
import { ApiResponse, Resume } from '@interview-me/types';

const router = express.Router();

// Mock resume data - in real app, this would come from database
let mockResumes: Resume[] = [
    {
        id: "1",
        clientId: "2",
        name: "Software Engineer - Tech Companies",
        fileUrl: "tech-software-engineer.pdf",
        isDefault: true,
        createdAt: new Date("2024-01-15"),
        updatedAt: new Date("2024-01-15"),
    },
    {
        id: "2",
        clientId: "2",
        name: "UX Designer - Creative Agencies",
        fileUrl: "ux-designer.pdf",
        isDefault: false,
        createdAt: new Date("2024-01-20"),
        updatedAt: new Date("2024-01-20"),
    },
];

// Helper function to ensure only one resume per client is default
const ensureSingleDefault = (clientId: string, defaultResumeId?: string) => {
    mockResumes = mockResumes.map(resume => ({
        ...resume,
        isDefault: resume.clientId === clientId
            ? (defaultResumeId ? resume.id === defaultResumeId : false)
            : resume.isDefault
    }));
};

// Configure multer for file uploads
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
const handleMulterError = (error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
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

        const clientResumes = mockResumes.filter(resume => resume.clientId === clientId);

        const response: ApiResponse = {
            success: true,
            data: clientResumes,
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

        const resume = mockResumes.find(r => r.id === id);

        if (!resume) {
            return res.status(404).json({
                success: false,
                error: 'Resume not found',
            });
        }

        const response: ApiResponse = {
            success: true,
            data: resume,
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
router.post('/', upload.single('file'), handleMulterError, validateRequest(createResumeSchema), async (req, res) => {
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
        const existingResumes = mockResumes.filter(r => r.clientId === clientId);
        const isFirstResume = existingResumes.length === 0;

        // Determine if this should be the default resume
        // Only set as default if explicitly requested OR if it's the first resume
        const shouldBeDefault = isDefault || isFirstResume;

        // If this should be default, unset other defaults for this client first
        if (shouldBeDefault) {
            mockResumes = mockResumes.map(r => ({
                ...r,
                isDefault: r.clientId === clientId ? false : r.isDefault
            }));
        }

        // Create new resume
        const newResume: Resume = {
            id: Date.now().toString(),
            clientId,
            name,
            fileUrl: file.filename,
            isDefault: shouldBeDefault,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        // Add the new resume
        mockResumes.push(newResume);

        const response: ApiResponse = {
            success: true,
            data: newResume,
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

        const resumeIndex = mockResumes.findIndex(r => r.id === id);

        if (resumeIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Resume not found',
            });
        }

        const resume = mockResumes[resumeIndex];

        // Update the resume first
        const updatedResume: Resume = {
            ...resume,
            name,
            isDefault: isDefault !== undefined ? isDefault : resume.isDefault,
            updatedAt: new Date(),
        };

        mockResumes[resumeIndex] = updatedResume;

        // Then ensure only one default per client if setting as default
        if (isDefault) {
            ensureSingleDefault(resume.clientId, updatedResume.id);
        }

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

        const resume = mockResumes.find(r => r.id === id);

        if (!resume) {
            return res.status(404).json({
                success: false,
                error: 'Resume not found',
            });
        }

        const filePath = path.join(__dirname, '../../uploads/resumes', resume.fileUrl);

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

        const resumeIndex = mockResumes.findIndex(r => r.id === id);

        if (resumeIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Resume not found',
            });
        }

        const resume = mockResumes[resumeIndex];

        // Delete the file from disk
        const filePath = path.join(__dirname, '../../uploads/resumes', resume.fileUrl);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        // Remove from mock data
        mockResumes.splice(resumeIndex, 1);

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