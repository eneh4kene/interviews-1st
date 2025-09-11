import express from 'express';
import { z } from 'zod';
import { validateRequest } from '../utils/validation';
import { authenticate, authorize } from '../middleware/auth';
import { jobDiscoveryService } from '../services/JobDiscoveryService';
import { jobClassificationService } from '../services/JobClassificationService';
import { ApiResponse } from '@interview-me/types';

const router = express.Router();

// ==================== JOB DISCOVERY ====================

// Get filtered jobs for a specific client
router.get('/filtered/:clientId', authenticate, authorize(['ADMIN', 'MANAGER', 'WORKER']), async (req, res) => {
    try {
        const { clientId } = req.params;
        const {
            keywords,
            location,
            page = 1,
            limit = 20,
            salaryMin,
            salaryMax,
            workType,
            source,
            aiApplicableOnly
        } = req.query;

        // Validate client ID
        if (!clientId) {
            return res.status(400).json({
                success: false,
                error: 'Client ID is required'
            });
        }

        // Build filters
        const filters = {
            keywords: keywords as string,
            location: location as string,
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            salaryMin: salaryMin ? parseInt(salaryMin as string) : undefined,
            salaryMax: salaryMax ? parseInt(salaryMax as string) : undefined,
            workType: workType as 'remote' | 'hybrid' | 'onsite',
            source: source as string,
            aiApplicableOnly: aiApplicableOnly === 'true'
        };

        // Get filtered jobs
        const jobs = await jobDiscoveryService.getFilteredJobsForClient(clientId, filters);

        const response: ApiResponse = {
            success: true,
            data: {
                jobs,
                pagination: {
                    page: filters.page,
                    limit: filters.limit,
                    total: jobs.length
                }
            }
        };

        res.json(response);
    } catch (error) {
        console.error('Error getting filtered jobs:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get filtered jobs'
        });
    }
});

// Get job discovery statistics for a client
router.get('/stats/:clientId', authenticate, authorize(['ADMIN', 'MANAGER', 'WORKER']), async (req, res) => {
    try {
        const { clientId } = req.params;

        if (!clientId) {
            return res.status(400).json({
                success: false,
                error: 'Client ID is required'
            });
        }

        const stats = await jobDiscoveryService.getClientJobStats(clientId);

        const response: ApiResponse = {
            success: true,
            data: stats
        };

        res.json(response);
    } catch (error) {
        console.error('Error getting job stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get job statistics'
        });
    }
});

// ==================== JOB CLASSIFICATION ====================

// Classify a single job
router.post('/classify', authenticate, authorize(['ADMIN', 'MANAGER', 'WORKER']), async (req, res) => {
    try {
        const { job } = req.body;

        if (!job) {
            return res.status(400).json({
                success: false,
                error: 'Job data is required'
            });
        }

        const classification = await jobClassificationService.getOrCreateClassification(job);

        const response: ApiResponse = {
            success: true,
            data: classification
        };

        res.json(response);
    } catch (error) {
        console.error('Error classifying job:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to classify job'
        });
    }
});

// Batch classify multiple jobs
router.post('/classify/batch', authenticate, authorize(['ADMIN', 'MANAGER', 'WORKER']), async (req, res) => {
    try {
        const { jobs } = req.body;

        if (!jobs || !Array.isArray(jobs)) {
            return res.status(400).json({
                success: false,
                error: 'Jobs array is required'
            });
        }

        const classifications = await jobClassificationService.batchClassifyJobs(jobs);

        const response: ApiResponse = {
            success: true,
            data: classifications
        };

        res.json(response);
    } catch (error) {
        console.error('Error batch classifying jobs:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to batch classify jobs'
        });
    }
});

// Get AI applicable jobs
router.get('/ai-applicable', authenticate, authorize(['ADMIN', 'MANAGER', 'WORKER']), async (req, res) => {
    try {
        const { limit = 50 } = req.query;

        const jobs = await jobClassificationService.getAiApplicableJobs(parseInt(limit as string));

        const response: ApiResponse = {
            success: true,
            data: jobs
        };

        res.json(response);
    } catch (error) {
        console.error('Error getting AI applicable jobs:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get AI applicable jobs'
        });
    }
});

// Get classification statistics
router.get('/classification-stats', authenticate, authorize(['ADMIN', 'MANAGER']), async (req, res) => {
    try {
        const stats = await jobClassificationService.getClassificationStats();

        const response: ApiResponse = {
            success: true,
            data: stats
        };

        res.json(response);
    } catch (error) {
        console.error('Error getting classification stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get classification statistics'
        });
    }
});

// Get job classification by job ID
router.get('/classification/:jobId', authenticate, authorize(['ADMIN', 'MANAGER', 'WORKER']), async (req, res) => {
    try {
        const { jobId } = req.params;

        if (!jobId) {
            return res.status(400).json({
                success: false,
                error: 'Job ID is required'
            });
        }

        const classifications = await jobClassificationService.getClassificationsForJobs([jobId]);
        const classification = classifications[0] || null;

        const response: ApiResponse = {
            success: true,
            data: classification
        };

        res.json(response);
    } catch (error) {
        console.error('Error getting job classification:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get job classification'
        });
    }
});

// Update job classification
router.put('/classification/:jobId', authenticate, authorize(['ADMIN', 'MANAGER']), async (req, res) => {
    try {
        const { jobId } = req.params;
        const { classification } = req.body;

        if (!jobId) {
            return res.status(400).json({
                success: false,
                error: 'Job ID is required'
            });
        }

        if (!classification) {
            return res.status(400).json({
                success: false,
                error: 'Classification data is required'
            });
        }

        const updatedClassification = await jobClassificationService.updateClassification(jobId, classification);

        const response: ApiResponse = {
            success: true,
            data: updatedClassification
        };

        res.json(response);
    } catch (error) {
        console.error('Error updating job classification:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update job classification'
        });
    }
});

export default router;
