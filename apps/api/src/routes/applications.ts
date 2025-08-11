import express from 'express';
import { z } from 'zod';
import { validateRequest } from '../utils/validation';
import { ApiResponse, Application } from '@interview-me/types';

const router = express.Router();

// Mock applications data - in real app, this would come from database
let mockApplications: Application[] = [
    {
        id: "1",
        clientId: "2",
        jobPreferenceId: "1",
        resumeId: "1",
        companyName: "TechCorp Inc.",
        jobTitle: "Senior Software Engineer",
        applicationDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        status: "applied",
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    },
    {
        id: "2",
        clientId: "2",
        jobPreferenceId: "2",
        resumeId: "2",
        companyName: "Design Studio Pro",
        jobTitle: "UX Designer",
        applicationDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        status: "interviewing",
        interviewDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    },
];

// Validation schemas
const createApplicationSchema = z.object({
    body: z.object({
        clientId: z.string().min(1, 'Client ID is required'),
        jobPreferenceId: z.string().min(1, 'Job preference ID is required'),
        resumeId: z.string().min(1, 'Resume ID is required'),
        companyName: z.string().min(1, 'Company name is required').max(255, 'Company name too long'),
        jobTitle: z.string().min(1, 'Job title is required').max(255, 'Job title too long'),
        applicationDate: z.string().transform(val => new Date(val)),
        status: z.enum(['applied', 'interviewing', 'offered', 'rejected', 'accepted'], {
            errorMap: () => ({ message: 'Status must be applied, interviewing, offered, rejected, or accepted' })
        }).default('applied'),
        interviewDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
        notes: z.string().optional(),
    }),
});

const updateApplicationSchema = z.object({
    params: z.object({
        id: z.string().min(1, 'Application ID is required'),
    }),
    body: z.object({
        companyName: z.string().min(1, 'Company name is required').max(255, 'Company name too long'),
        jobTitle: z.string().min(1, 'Job title is required').max(255, 'Job title too long'),
        jobPreferenceId: z.string().min(1, 'Job preference ID is required'),
        resumeId: z.string().min(1, 'Resume ID is required'),
        applicationDate: z.string().transform(val => new Date(val)),
        status: z.enum(['applied', 'interviewing', 'offered', 'rejected', 'accepted'], {
            errorMap: () => ({ message: 'Status must be applied, interviewing, offered, rejected, or accepted' })
        }),
        interviewDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
        notes: z.string().optional(),
    }),
});

const getApplicationsSchema = z.object({
    query: z.object({
        clientId: z.string().min(1, 'Client ID is required'),
    }),
});

// Get all applications for a client
router.get('/', validateRequest(getApplicationsSchema), async (req, res) => {
    try {
        const { clientId } = req.query;

        const clientApplications = mockApplications.filter(application => application.clientId === clientId);

        const response: ApiResponse = {
            success: true,
            data: clientApplications,
            message: 'Applications retrieved successfully',
        };

        res.json(response);
    } catch (error) {
        console.error('Error fetching applications:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch applications',
        });
    }
});

// Get a specific application
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const application = mockApplications.find(a => a.id === id);

        if (!application) {
            return res.status(404).json({
                success: false,
                error: 'Application not found',
            });
        }

        const response: ApiResponse = {
            success: true,
            data: application,
            message: 'Application retrieved successfully',
        };

        res.json(response);
    } catch (error) {
        console.error('Error fetching application:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch application',
        });
    }
});

// Create a new application
router.post('/', validateRequest(createApplicationSchema), async (req, res) => {
    try {
        const {
            clientId,
            jobPreferenceId,
            resumeId,
            companyName,
            jobTitle,
            applicationDate,
            status,
            interviewDate,
            notes
        } = req.body;

        // Create new application
        const newApplication: Application = {
            id: Date.now().toString(),
            clientId,
            jobPreferenceId,
            resumeId,
            companyName,
            jobTitle,
            applicationDate,
            status,
            interviewDate,
            notes,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        mockApplications.push(newApplication);

        const response: ApiResponse = {
            success: true,
            data: newApplication,
            message: 'Application created successfully',
        };

        res.status(201).json(response);
    } catch (error) {
        console.error('Error creating application:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create application',
        });
    }
});

// Update application
router.put('/:id', validateRequest(updateApplicationSchema), async (req, res) => {
    try {
        const { id } = req.params;
        const {
            companyName,
            jobTitle,
            jobPreferenceId,
            resumeId,
            applicationDate,
            status,
            interviewDate,
            notes
        } = req.body;

        const applicationIndex = mockApplications.findIndex(a => a.id === id);

        if (applicationIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Application not found',
            });
        }

        const application = mockApplications[applicationIndex];

        // Update the application
        const updatedApplication: Application = {
            ...application,
            companyName,
            jobTitle,
            jobPreferenceId,
            resumeId,
            applicationDate,
            status,
            interviewDate,
            notes,
            updatedAt: new Date(),
        };

        mockApplications[applicationIndex] = updatedApplication;

        const response: ApiResponse = {
            success: true,
            data: updatedApplication,
            message: 'Application updated successfully',
        };

        res.json(response);
    } catch (error) {
        console.error('Error updating application:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update application',
        });
    }
});

// Delete application
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const applicationIndex = mockApplications.findIndex(a => a.id === id);

        if (applicationIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Application not found',
            });
        }

        mockApplications.splice(applicationIndex, 1);

        const response: ApiResponse = {
            success: true,
            data: null,
            message: 'Application deleted successfully',
        };

        res.json(response);
    } catch (error) {
        console.error('Error deleting application:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete application',
        });
    }
});

export default router; 