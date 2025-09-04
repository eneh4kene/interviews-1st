import express from 'express';
import { z } from 'zod';
import { validateRequest } from '../utils/validation';
import { ApiResponse, JobPreference } from '@interview-me/types';
import { db } from '../utils/database';

const router = express.Router();

// Mock job preferences data - in real app, this would come from database
let mockJobPreferences: JobPreference[] = [
    {
        id: "1",
        clientId: "2",
        title: "Senior Software Engineer",
        company: "TechCorp Inc.",
        location: "London, UK",
        workType: "hybrid",
        visaSponsorship: false,
        salaryRange: {
            min: 60000,
            max: 80000,
            currency: "GBP",
        },
        status: "active",
        createdAt: new Date("2024-01-15"),
        updatedAt: new Date("2024-01-15"),
    },
    {
        id: "2",
        clientId: "2",
        title: "UX Designer",
        company: "Design Studio Pro",
        location: "Remote",
        workType: "remote",
        visaSponsorship: true,
        salaryRange: {
            min: 45000,
            max: 65000,
            currency: "GBP",
        },
        status: "active",
        createdAt: new Date("2024-01-20"),
        updatedAt: new Date("2024-01-20"),
    },
];

// Validation schemas
const createJobPreferenceSchema = z.object({
    body: z.object({
        clientId: z.string().min(1, 'Client ID is required'),
        title: z.string().min(1, 'Job title is required').max(255, 'Job title too long'),
        company: z.string().optional(),
        location: z.string().min(1, 'Location is required').max(255, 'Location too long'),
        workType: z.enum(['remote', 'hybrid', 'onsite'], {
            errorMap: () => ({ message: 'Work type must be remote, hybrid, or onsite' })
        }),
        visaSponsorship: z.boolean().default(false),
        salaryMin: z.string().optional().transform(val => val ? parseInt(val) : undefined),
        salaryMax: z.string().optional().transform(val => val ? parseInt(val) : undefined),
        currency: z.string().default('GBP'),
        status: z.enum(['active', 'paused', 'achieved'], {
            errorMap: () => ({ message: 'Status must be active, paused, or achieved' })
        }).default('active'),
    }),
});

const updateJobPreferenceSchema = z.object({
    params: z.object({
        id: z.string().min(1, 'Job preference ID is required'),
    }),
    body: z.object({
        title: z.string().min(1, 'Job title is required').max(255, 'Job title too long'),
        company: z.string().optional(),
        location: z.string().min(1, 'Location is required').max(255, 'Location too long'),
        workType: z.enum(['remote', 'hybrid', 'onsite'], {
            errorMap: () => ({ message: 'Work type must be remote, hybrid, or onsite' })
        }),
        visaSponsorship: z.boolean().default(false),
        salaryMin: z.string().optional().transform(val => val ? parseInt(val) : undefined),
        salaryMax: z.string().optional().transform(val => val ? parseInt(val) : undefined),
        currency: z.string().default('GBP'),
        status: z.enum(['active', 'paused', 'achieved'], {
            errorMap: () => ({ message: 'Status must be active, paused, or achieved' })
        }).default('active'),
    }),
});

const getJobPreferencesSchema = z.object({
    query: z.object({
        clientId: z.string().min(1, 'Client ID is required'),
    }),
});

// Get all job preferences for a client
router.get('/', validateRequest(getJobPreferencesSchema), async (req, res) => {
    try {
        const { clientId } = req.query;

        const result = await db.query(`
            SELECT 
                id,
                client_id as "clientId",
                title,
                company,
                location,
                work_type as "workType",
                visa_sponsorship as "visaSponsorship",
                salary_min as "salaryMin",
                salary_max as "salaryMax",
                salary_currency as "currency",
                status,
                created_at as "createdAt",
                updated_at as "updatedAt"
            FROM job_preferences 
            WHERE client_id = $1
            ORDER BY created_at DESC
        `, [clientId]);

        // Transform the data to match the expected format
        const clientJobPreferences = result.rows.map(row => ({
            ...row,
            salaryRange: row.salaryMin && row.salaryMax ? {
                min: row.salaryMin,
                max: row.salaryMax,
                currency: row.currency
            } : undefined
        }));

        const response: ApiResponse = {
            success: true,
            data: clientJobPreferences,
            message: 'Job preferences retrieved successfully',
        };

        res.json(response);
    } catch (error) {
        console.error('Error fetching job preferences:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch job preferences',
        });
    }
});

// Get a specific job preference
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const jobPreference = mockJobPreferences.find(p => p.id === id);

        if (!jobPreference) {
            return res.status(404).json({
                success: false,
                error: 'Job preference not found',
            });
        }

        const response: ApiResponse = {
            success: true,
            data: jobPreference,
            message: 'Job preference retrieved successfully',
        };

        res.json(response);
    } catch (error) {
        console.error('Error fetching job preference:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch job preference',
        });
    }
});

// Create a new job preference
router.post('/', validateRequest(createJobPreferenceSchema), async (req, res) => {
    try {
        const {
            clientId,
            title,
            company,
            location,
            workType,
            visaSponsorship,
            salaryMin,
            salaryMax,
            currency,
            status
        } = req.body;

        // Create new job preference
        const newJobPreference: JobPreference = {
            id: Date.now().toString(),
            clientId,
            title,
            company: company || undefined,
            location,
            workType,
            visaSponsorship,
            salaryRange: salaryMin && salaryMax ? {
                min: salaryMin,
                max: salaryMax,
                currency
            } : undefined,
            status,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        mockJobPreferences.push(newJobPreference);

        const response: ApiResponse = {
            success: true,
            data: newJobPreference,
            message: 'Job preference created successfully',
        };

        res.status(201).json(response);
    } catch (error) {
        console.error('Error creating job preference:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create job preference',
        });
    }
});

// Update job preference
router.put('/:id', validateRequest(updateJobPreferenceSchema), async (req, res) => {
    try {
        const { id } = req.params;
        const {
            title,
            company,
            location,
            workType,
            visaSponsorship,
            salaryMin,
            salaryMax,
            currency,
            status
        } = req.body;

        const jobPreferenceIndex = mockJobPreferences.findIndex(p => p.id === id);

        if (jobPreferenceIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Job preference not found',
            });
        }

        const jobPreference = mockJobPreferences[jobPreferenceIndex];

        // Update the job preference
        const updatedJobPreference: JobPreference = {
            ...jobPreference,
            title,
            company: company || undefined,
            location,
            workType,
            visaSponsorship,
            salaryRange: salaryMin && salaryMax ? {
                min: salaryMin,
                max: salaryMax,
                currency
            } : undefined,
            status,
            updatedAt: new Date(),
        };

        mockJobPreferences[jobPreferenceIndex] = updatedJobPreference;

        const response: ApiResponse = {
            success: true,
            data: updatedJobPreference,
            message: 'Job preference updated successfully',
        };

        res.json(response);
    } catch (error) {
        console.error('Error updating job preference:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update job preference',
        });
    }
});

// Delete job preference
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const jobPreferenceIndex = mockJobPreferences.findIndex(p => p.id === id);

        if (jobPreferenceIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Job preference not found',
            });
        }

        mockJobPreferences.splice(jobPreferenceIndex, 1);

        const response: ApiResponse = {
            success: true,
            data: null,
            message: 'Job preference deleted successfully',
        };

        res.json(response);
    } catch (error) {
        console.error('Error deleting job preference:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete job preference',
        });
    }
});

export default router; 