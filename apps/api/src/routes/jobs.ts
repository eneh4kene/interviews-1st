import express from 'express';
import { z } from 'zod';
import { validateRequest } from '../utils/validation';
import { authenticate, authorize } from '../middleware/auth';
import { jobAggregationService } from '../services/jobAggregation';
import { ApiResponse, JobSearchFilters, AutoApplyStatus } from '@interview-me/types';

const router = express.Router();

// Validation schemas
const jobSearchSchema = z.object({
    query: z.object({
        keywords: z.string().optional(),
        location: z.string().optional(),
        radius: z.string().transform(val => parseInt(val)).optional(),
        jobType: z.string().optional(),
        workLocation: z.string().optional(),
        salaryMin: z.string().transform(val => parseInt(val)).optional(),
        salaryMax: z.string().transform(val => parseInt(val)).optional(),
        postedWithin: z.enum(['24h', '7d', '30d', 'all']).optional(),
        company: z.string().optional(),
        autoApplyEligible: z.string().transform(val => val === 'true').optional(),
        page: z.string().transform(val => parseInt(val)).optional(),
        limit: z.string().transform(val => parseInt(val)).optional(),
        source: z.enum(['live', 'stored', 'both']).optional().default('both')
    })
});

const updateAutoApplySchema = z.object({
    params: z.object({
        id: z.string().uuid()
    }),
    body: z.object({
        status: z.enum(['eligible', 'ineligible', 'pending_review', 'applied', 'failed', 'blacklisted']),
        notes: z.string().optional()
    })
});

// Search jobs endpoint
router.get('/search', validateRequest(jobSearchSchema), async (req, res) => {
    try {
        const filters: JobSearchFilters = {
            keywords: req.query.keywords as string,
            location: req.query.location as string,
            radius: Number(req.query.radius),
            jobType: req.query.jobType ? [req.query.jobType as any] : undefined,
            workLocation: req.query.workLocation ? [req.query.workLocation as any] : undefined,
            salaryMin: Number(req.query.salaryMin),
            salaryMax: Number(req.query.salaryMax),
            postedWithin: req.query.postedWithin as '24h' | '7d' | '30d' | 'all',
            company: req.query.company as string,
            autoApplyEligible: req.query.autoApplyEligible === 'true',
            page: Number(req.query.page),
            limit: Number(req.query.limit)
        };

        const source = req.query.source as 'live' | 'stored' | 'both';

        let response;
        if (source === 'stored') {
            response = await jobAggregationService.getStoredJobs(filters);
        } else if (source === 'live') {
            response = await jobAggregationService.searchJobs(filters);
        } else {
            // 'both' - try stored first, then live if needed
            response = await jobAggregationService.getStoredJobs(filters);
            if (response.jobs.length === 0) {
                response = await jobAggregationService.searchJobs(filters);
            }
        }

        const apiResponse: ApiResponse = {
            success: true,
            data: response,
            message: `Found ${response.totalCount} jobs`
        };

        res.json(apiResponse);
    } catch (error) {
        console.error('Job search error:', error);
        const apiResponse: ApiResponse = {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to search jobs'
        };
        res.status(500).json(apiResponse);
    }
});

// Get job by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // First, try to find the job in stored database
        const storedResult = await jobAggregationService.getStoredJobs({});
        let job = storedResult.jobs.find(j => j.id === id);

        // If not found in database, try to find by external_id (in case the ID is from an aggregator)
        if (!job) {
            try {
                const externalResult = await jobAggregationService.getStoredJobs({});
                job = externalResult.jobs.find(j => j.externalId === id);
            } catch (externalError) {
                console.error('Error searching by external ID:', externalError);
            }
        }

        // If still not found, try to fetch from live aggregators
        if (!job) {
            try {
                // Search with a broad query to get more jobs
                const liveResult = await jobAggregationService.searchJobs({
                    keywords: 'developer', // Use a broad search term
                    location: 'London', // Use a common location
                    limit: 50 // Get more jobs to increase chances of finding the specific one
                });
                
                // Find the job with matching ID (from aggregator)
                job = liveResult.jobs.find(j => j.id === id);
                
                // If found, store it in the database for future access
                if (job) {
                    await (jobAggregationService as any).storeJobs([job]);
                }
            } catch (liveError) {
                console.error('Error fetching from live aggregators:', liveError);
            }
        }

        if (!job) {
            const apiResponse: ApiResponse = {
                success: false,
                error: 'Job not found'
            };
            return res.status(404).json(apiResponse);
        }

        const apiResponse: ApiResponse = {
            success: true,
            data: job
        };

        res.json(apiResponse);
    } catch (error) {
        console.error('Get job error:', error);
        const apiResponse: ApiResponse = {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get job'
        };
        res.status(500).json(apiResponse);
    }
});

// Update auto-apply status (requires authentication)
router.put('/:id/auto-apply', authenticate, authorize('WORKER'), validateRequest(updateAutoApplySchema), async (req, res) => {
    try {
        const { id } = req.params;
        const { status, notes } = req.body;

        const success = await jobAggregationService.updateAutoApplyStatus(id, status as AutoApplyStatus, notes);

        if (!success) {
            const apiResponse: ApiResponse = {
                success: false,
                error: 'Failed to update auto-apply status'
            };
            return res.status(400).json(apiResponse);
        }

        const apiResponse: ApiResponse = {
            success: true,
            message: 'Auto-apply status updated successfully'
        };

        res.json(apiResponse);
    } catch (error) {
        console.error('Update auto-apply status error:', error);
        const apiResponse: ApiResponse = {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to update auto-apply status'
        };
        res.status(500).json(apiResponse);
    }
});

// Get aggregator statistics (requires authentication)
router.get('/stats/aggregators', authenticate, authorize('WORKER'), async (req, res) => {
    try {
        const stats = await jobAggregationService.getAggregatorStats();

        const apiResponse: ApiResponse = {
            success: true,
            data: stats,
            message: 'Aggregator statistics retrieved successfully'
        };

        res.json(apiResponse);
    } catch (error) {
        console.error('Get aggregator stats error:', error);
        const apiResponse: ApiResponse = {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get aggregator statistics'
        };
        res.status(500).json(apiResponse);
    }
});

// Get job recommendations for a client (requires authentication)
router.get('/recommendations/:clientId', authenticate, authorize('WORKER'), async (req, res) => {
    try {
        const { clientId } = req.params;
        const { limit = 10 } = req.query;

        // TODO: Implement job recommendations based on client preferences
        // For now, return recent jobs that are eligible for auto-apply
        const filters: JobSearchFilters = {
            autoApplyEligible: true,
            limit: parseInt(limit as string),
            postedWithin: '7d'
        };

        const response = await jobAggregationService.getStoredJobs(filters);

        const apiResponse: ApiResponse = {
            success: true,
            data: response.jobs,
            message: `Found ${response.jobs.length} recommended jobs`
        };

        res.json(apiResponse);
    } catch (error) {
        console.error('Get job recommendations error:', error);
        const apiResponse: ApiResponse = {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get job recommendations'
        };
        res.status(500).json(apiResponse);
    }
});

// Health check for job aggregators
router.get('/health/aggregators', async (req, res) => {
    try {
        const testFilters: JobSearchFilters = {
            keywords: 'test',
            location: 'London',
            limit: 1
        };

        const response = await jobAggregationService.searchJobs(testFilters);

        const healthStatus = {
            timestamp: new Date().toISOString(),
            aggregators: response.aggregatorResults,
            overall: Object.values(response.aggregatorResults).some((result: any) => result.success)
        };

        const apiResponse: ApiResponse = {
            success: true,
            data: healthStatus,
            message: 'Job aggregator health check completed'
        };

        res.json(apiResponse);
    } catch (error) {
        console.error('Aggregator health check error:', error);
        const apiResponse: ApiResponse = {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to check aggregator health'
        };
        res.status(500).json(apiResponse);
    }
});

export default router; 