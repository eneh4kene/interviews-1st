import { db, redis } from '../utils/database';
import {
    Job,
    JobAggregator,
    JobSearchFilters,
    JobSearchResponse,
    JobAggregatorResponse,
    AggregatorConfig,
    AutoApplyStatus
} from '@interview-me/types';
import { createHash } from 'crypto';
import dotenv from 'dotenv';

// Load environment variables at the top
dotenv.config();

// Debug environment variables
console.log('🔍 Job Aggregation Environment Variables Debug:');
console.log('ADZUNA_APP_ID:', process.env.ADZUNA_APP_ID);
console.log('ADZUNA_APP_KEY:', process.env.ADZUNA_APP_KEY ? '***SET***' : 'NOT SET');
console.log('JOOBLE_API_KEY:', process.env.JOOBLE_API_KEY ? '***SET***' : 'NOT SET');

// Aggregator configurations
const aggregatorConfigs: Record<JobAggregator, AggregatorConfig> = {
    adzuna: {
        name: 'adzuna',
        apiKey: process.env.ADZUNA_APP_KEY || 'a6d2443f0062ec8789388ac6a314df2c',
        appId: process.env.ADZUNA_APP_ID || '00287061',
        baseUrl: process.env.ADZUNA_BASE_URL || 'https://api.adzuna.com/v1/api',
        rateLimit: {
            requestsPerMinute: parseInt(process.env.ADZUNA_RATE_LIMIT_PER_MINUTE || '25'),
            requestsPerDay: 250
        },
        enabled: true
    },
    jooble: {
        name: 'jooble',
        apiKey: process.env.JOOBLE_API_KEY || '6e9517d9-6fa7-4d0c-aa3f-16a3483a0452',
        baseUrl: process.env.JOOBLE_BASE_URL || 'https://jooble.org/api',
        rateLimit: {
            requestsPerMinute: parseInt(process.env.JOOBLE_RATE_LIMIT_PER_MINUTE || '60'),
            requestsPerDay: 500
        },
        enabled: true
    },
    indeed: {
        name: 'indeed',
        apiKey: '',
        baseUrl: '',
        rateLimit: { requestsPerMinute: 0, requestsPerDay: 0 },
        enabled: false
    },
    ziprecruiter: {
        name: 'ziprecruiter',
        apiKey: '',
        baseUrl: '',
        rateLimit: { requestsPerMinute: 0, requestsPerDay: 0 },
        enabled: false
    },
    workable: {
        name: 'workable',
        apiKey: '',
        baseUrl: '',
        rateLimit: { requestsPerMinute: 0, requestsPerDay: 0 },
        enabled: false
    },
    greenhouse: {
        name: 'greenhouse',
        apiKey: '',
        baseUrl: '',
        rateLimit: { requestsPerMinute: 0, requestsPerDay: 0 },
        enabled: false
    }
};

// Debug aggregator configs
console.log('🔍 Job Aggregation Configs:');
console.log('Adzuna enabled:', aggregatorConfigs.adzuna.enabled);
console.log('Adzuna has API key:', !!aggregatorConfigs.adzuna.apiKey);
console.log('Adzuna has App ID:', !!aggregatorConfigs.adzuna.appId);
console.log('Jooble enabled:', aggregatorConfigs.jooble.enabled);
console.log('Jooble has API key:', !!aggregatorConfigs.jooble.apiKey);

export class JobAggregationService {
    private cacheTTL = parseInt(process.env.JOB_CACHE_TTL_SECONDS || '1800'); // 30 minutes
    private storageTTLDays = parseInt(process.env.JOB_STORAGE_TTL_DAYS || '30');

    // Strip HTML tags from text
    private stripHtmlTags(text: string): string {
        return text.replace(/<[^>]*>/g, ''); // removes <b>, <i>, <br>, etc.
    }

    // Decode HTML entities in text
    private decodeHtmlEntities(text: string): string {
        const htmlEntities: Record<string, string> = {
            '&amp;': '&',
            '&lt;': '<',
            '&gt;': '>',
            '&quot;': '"',
            '&#39;': "'",
            '&apos;': "'",
            '&nbsp;': ' ',
            '&copy;': '©',
            '&reg;': '®',
            '&trade;': '™',
            '&hellip;': '...',
            '&mdash;': '—',
            '&ndash;': '–',
            '&lsquo;': '\u2018',
            '&rsquo;': '\u2019',
            '&ldquo;': '"',
            '&rdquo;': '"',
            '&bull;': '•',
            '&para;': '¶',
            '&dagger;': '†',
            '&Dagger;': '‡',
            '&permil;': '‰',
            '&lsaquo;': '‹',
            '&rsaquo;': '›',
            '&euro;': '€',
            '&pound;': '£',
            '&yen;': '¥',
            '&cent;': '¢',
            '&curren;': '¤',
            '&brvbar;': '¦',
            '&sect;': '§',
            '&uml;': '¨',
            '&ordf;': 'ª',
            '&laquo;': '«',
            '&not;': '¬',
            '&shy;': '',
            '&macr;': '¯',
            '&deg;': '°',
            '&plusmn;': '±',
            '&sup2;': '²',
            '&sup3;': '³',
            '&acute;': '´',
            '&micro;': 'µ',
            '&middot;': '·',
            '&cedil;': '¸',
            '&sup1;': '¹',
            '&ordm;': 'º',
            '&raquo;': '»',
            '&frac14;': '¼',
            '&frac12;': '½',
            '&frac34;': '¾',
            '&iquest;': '¿',
            '&Agrave;': 'À',
            '&Aacute;': 'Á',
            '&Acirc;': 'Â',
            '&Atilde;': 'Ã',
            '&Auml;': 'Ä',
            '&Aring;': 'Å',
            '&AElig;': 'Æ',
            '&Ccedil;': 'Ç',
            '&Egrave;': 'È',
            '&Eacute;': 'É',
            '&Ecirc;': 'Ê',
            '&Euml;': 'Ë',
            '&Igrave;': 'Ì',
            '&Iacute;': 'Í',
            '&Icirc;': 'Î',
            '&Iuml;': 'Ï',
            '&ETH;': 'Ð',
            '&Ntilde;': 'Ñ',
            '&Ograve;': 'Ò',
            '&Oacute;': 'Ó',
            '&Ocirc;': 'Ô',
            '&Otilde;': 'Õ',
            '&Ouml;': 'Ö',
            '&times;': '×',
            '&Oslash;': 'Ø',
            '&Ugrave;': 'Ù',
            '&Uacute;': 'Ú',
            '&Ucirc;': 'Û',
            '&Uuml;': 'Ü',
            '&Yacute;': 'Ý',
            '&THORN;': 'Þ',
            '&szlig;': 'ß',
            '&agrave;': 'à',
            '&aacute;': 'á',
            '&acirc;': 'â',
            '&atilde;': 'ã',
            '&auml;': 'ä',
            '&aring;': 'å',
            '&aelig;': 'æ',
            '&ccedil;': 'ç',
            '&egrave;': 'è',
            '&eacute;': 'é',
            '&ecirc;': 'ê',
            '&euml;': 'ë',
            '&igrave;': 'ì',
            '&iacute;': 'í',
            '&icirc;': 'î',
            '&iuml;': 'ï',
            '&eth;': 'ð',
            '&ntilde;': 'ñ',
            '&ograve;': 'ò',
            '&oacute;': 'ó',
            '&ocirc;': 'ô',
            '&otilde;': 'õ',
            '&ouml;': 'ö',
            '&divide;': '÷',
            '&oslash;': 'ø',
            '&ugrave;': 'ù',
            '&uacute;': 'ú',
            '&ucirc;': 'û',
            '&uuml;': 'ü',
            '&yacute;': 'ý',
            '&thorn;': 'þ',
            '&yuml;': 'ÿ'
        };

        return text.replace(/&[a-zA-Z0-9#]+;/g, (entity) => {
            return htmlEntities[entity] || entity;
        });
    }

    // Generate hash for deduplication
    private generateHash(text: string): string {
        return createHash('sha256').update(text.toLowerCase().trim()).digest('hex');
    }

    // Normalize job data from different aggregators
    private normalizeJob(rawJob: any, source: JobAggregator): Job {
        const normalized: Job = {
            id: '',
            title: '',
            company: '',
            location: '',
            descriptionSnippet: '',
            source,
            postedDate: '',
            applyUrl: '',
            autoApplyStatus: 'pending_review' as AutoApplyStatus,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        switch (source) {
            case 'adzuna':
                normalized.id = rawJob.id || '';
                normalized.title = this.stripHtmlTags(this.decodeHtmlEntities(rawJob.title || ''));
                normalized.company = this.stripHtmlTags(this.decodeHtmlEntities(rawJob.company?.display_name || ''));
                normalized.location = this.stripHtmlTags(this.decodeHtmlEntities(rawJob.location?.display_name || ''));
                normalized.salary = rawJob.salary_min || rawJob.salary_max ?
                    `${rawJob.salary_min || ''} - ${rawJob.salary_max || ''} ${rawJob.salary_currency || 'GBP'}` : undefined;
                normalized.descriptionSnippet = this.stripHtmlTags(this.decodeHtmlEntities(rawJob.description || ''));
                normalized.postedDate = rawJob.created || '';
                normalized.applyUrl = rawJob.redirect_url || '';
                normalized.externalId = rawJob.id?.toString() || '';
                normalized.salaryMin = rawJob.salary_min;
                normalized.salaryMax = rawJob.salary_max;
                normalized.salaryCurrency = rawJob.salary_currency || 'GBP';
                normalized.jobType = this.mapJobType(rawJob.contract_time || '') as any;
                normalized.workLocation = this.mapWorkLocation(rawJob.contract_time || '') as any;
                break;

            case 'jooble':
                normalized.id = rawJob.id?.toString() || '';
                normalized.title = this.stripHtmlTags(this.decodeHtmlEntities(rawJob.title || ''));
                normalized.company = this.stripHtmlTags(this.decodeHtmlEntities(rawJob.company || ''));
                normalized.location = this.stripHtmlTags(this.decodeHtmlEntities(rawJob.location || ''));
                normalized.salary = rawJob.salary || '';
                normalized.descriptionSnippet = this.stripHtmlTags(this.decodeHtmlEntities(rawJob.snippet || ''));
                normalized.postedDate = rawJob.updated || '';
                normalized.applyUrl = rawJob.link || '';
                normalized.externalId = rawJob.id?.toString() || '';
                normalized.jobType = this.mapJobType(rawJob.type || '') as any;
                // Extract salary range if available
                if (rawJob.salary) {
                    const salaryMatch = rawJob.salary.match(/(\d+(?:,\d+)*)\s*-\s*(\d+(?:,\d+)*)\s*(\w+)/);
                    if (salaryMatch) {
                        normalized.salaryMin = parseInt(salaryMatch[1].replace(/,/g, ''));
                        normalized.salaryMax = parseInt(salaryMatch[2].replace(/,/g, ''));
                        normalized.salaryCurrency = salaryMatch[3];
                    }
                }
                break;

            default:
                throw new Error(`Unsupported aggregator: ${source}`);
        }

        // Generate deduplication hashes
        normalized.title = normalized.title.trim();
        normalized.company = normalized.company.trim();
        normalized.location = normalized.location.trim();

        return normalized;
    }

    // Map job types from aggregator format to our format
    private mapJobType(aggregatorType: string): string | undefined {
        const typeMap: Record<string, string> = {
            'full_time': 'full-time',
            'part_time': 'part-time',
            'contract': 'contract',
            'internship': 'internship',
            'temporary': 'temporary',
            'freelance': 'freelance',
            'Full-time': 'full-time',
            'Part-time': 'part-time',
            'Contract': 'contract',
            'Internship': 'internship',
            'Temporary': 'temporary',
            'Freelance': 'freelance',
            'permanent': 'full-time'
        };
        return typeMap[aggregatorType] || undefined;
    }

    // Map work location from aggregator format to our format
    private mapWorkLocation(aggregatorLocation: string): string | undefined {
        const locationMap: Record<string, string> = {
            'remote': 'remote',
            'hybrid': 'hybrid',
            'onsite': 'onsite',
            'office': 'onsite',
            'work_from_home': 'remote'
        };
        return locationMap[aggregatorLocation] || undefined;
    }

    // Fetch jobs from Adzuna API
    private async fetchAdzunaJobs(filters: JobSearchFilters): Promise<JobAggregatorResponse> {
        try {
            const config = aggregatorConfigs.adzuna;
            console.log('🔍 Fetching Adzuna jobs with config:', {
                enabled: config.enabled,
                hasApiKey: !!config.apiKey,
                hasAppId: !!config.appId,
                baseUrl: config.baseUrl
            });

            if (!config.enabled || !config.apiKey || !config.appId) {
                return { success: false, jobs: [], source: 'adzuna', error: 'Adzuna not configured' };
            }

            // Use the exact format from the working Postman request
            const params = new URLSearchParams({
                app_id: config.appId,
                app_key: config.apiKey,
                where: filters.location || 'london'
            });

            // Only add what parameter if keywords are provided
            if (filters.keywords) {
                params.append('what', filters.keywords);
            }

            const url = `${config.baseUrl}/jobs/gb/search/1?${params.toString()}`;
            console.log('🔍 Adzuna API URL:', url);

            const response = await fetch(url, {
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'InterviewsFirst/1.0'
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Adzuna API error response:', errorText);
                throw new Error(`Adzuna API error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            console.log('🔍 Adzuna API response:', { count: (data as any).results?.length || 0 });

            const jobs = ((data as any).results || []).map((job: any) => this.normalizeJob(job, 'adzuna'));

            return { success: true, jobs, source: 'adzuna' };
        } catch (error) {
            console.error('Adzuna API error:', error);
            return {
                success: false,
                jobs: [],
                source: 'adzuna',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    // Fetch jobs from Jooble API
    private async fetchJoobleJobs(filters: JobSearchFilters): Promise<JobAggregatorResponse> {
        try {
            const config = aggregatorConfigs.jooble;
            console.log('🔍 Fetching Jooble jobs with config:', {
                enabled: config.enabled,
                hasApiKey: !!config.apiKey,
                baseUrl: config.baseUrl
            });

            if (!config.enabled || !config.apiKey) {
                return { success: false, jobs: [], source: 'jooble', error: 'Jooble not configured' };
            }

            const requestBody = {
                keywords: filters.keywords || 'software engineer',
                location: filters.location || 'London',
                radius: filters.radius?.toString() || '40',
                page: filters.page?.toString() || '1',
                ResultOnPage: '50'
            };

            if (filters.salaryMin) {
                (requestBody as any).salary = filters.salaryMin;
            }

            const url = `${config.baseUrl}/${config.apiKey}`;
            console.log('🔍 Jooble API URL:', url);
            console.log('🔍 Jooble request body:', requestBody);

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                throw new Error(`Jooble API error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            console.log('🔍 Jooble API response:', { count: (data as any).jobs?.length || 0 });

            const jobs = ((data as any).jobs || []).map((job: any) => this.normalizeJob(job, 'jooble'));

            return { success: true, jobs, source: 'jooble' };
        } catch (error) {
            console.error('Jooble API error:', error);
            return {
                success: false,
                jobs: [],
                source: 'jooble',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    // Fetch jobs from all enabled aggregators in parallel
    private async fetchFromAggregators(filters: JobSearchFilters): Promise<JobAggregatorResponse[]> {
        const promises: Promise<JobAggregatorResponse>[] = [];

        if (aggregatorConfigs.adzuna.enabled) {
            promises.push(this.fetchAdzunaJobs(filters));
        }

        if (aggregatorConfigs.jooble.enabled) {
            promises.push(this.fetchJoobleJobs(filters));
        }

        return Promise.allSettled(promises).then(results =>
            results.map(result =>
                result.status === 'fulfilled' ? result.value : {
                    success: false,
                    jobs: [],
                    source: 'unknown' as JobAggregator,
                    error: 'Promise rejected'
                }
            )
        );
    }

    // Deduplicate jobs based on title and company+location
    private deduplicateJobs(jobs: Job[]): Job[] {
        const seen = new Set<string>();
        const deduplicated: Job[] = [];

        for (const job of jobs) {
            const titleHash = this.generateHash(job.title);
            const companyLocationHash = this.generateHash(`${job.company}${job.location}`);
            const combinedHash = `${titleHash}:${companyLocationHash}`;

            if (!seen.has(combinedHash)) {
                seen.add(combinedHash);
                (job as any).title_hash = titleHash;
                (job as any).company_location_hash = companyLocationHash;
                deduplicated.push(job);
            }
        }

        return deduplicated;
    }

    // Store jobs in database
    private async storeJobs(jobs: Job[]): Promise<void> {
        if (jobs.length === 0) return;

        try {
            const values = jobs.map((job, index) => {
                const offset = index * 15; // 15 fields per job
                return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12}, $${offset + 13}, $${offset + 14}, $${offset + 15})`;
            }).join(', ');

            const params: any[] = [];
            jobs.forEach(job => {
                // Convert salary values to integers for database storage
                const salaryMin = job.salaryMin ? Math.round(parseFloat(job.salaryMin.toString())) : null;
                const salaryMax = job.salaryMax ? Math.round(parseFloat(job.salaryMax.toString())) : null;

                params.push(
                    job.externalId,
                    job.title,
                    job.company,
                    job.location,
                    job.salary,
                    job.descriptionSnippet,
                    job.source,
                    job.postedDate,
                    job.applyUrl,
                    job.jobType,
                    job.workLocation,
                    salaryMin,
                    salaryMax,
                    job.salaryCurrency,
                    job.autoApplyStatus
                );
            });

            const query = `
                INSERT INTO jobs (
                    external_id, title, company, location, salary, description_snippet,
                    source, posted_date, apply_url, job_type, work_location,
                    salary_min, salary_max, salary_currency, auto_apply_status
                ) VALUES ${values}
                ON CONFLICT (external_id, source) DO UPDATE SET
                    title = EXCLUDED.title,
                    company = EXCLUDED.company,
                    location = EXCLUDED.location,
                    salary = EXCLUDED.salary,
                    description_snippet = EXCLUDED.description_snippet,
                    posted_date = EXCLUDED.posted_date,
                    apply_url = EXCLUDED.apply_url,
                    job_type = EXCLUDED.job_type,
                    work_location = EXCLUDED.work_location,
                    salary_min = EXCLUDED.salary_min,
                    salary_max = EXCLUDED.salary_max,
                    salary_currency = EXCLUDED.salary_currency,
                    updated_at = CURRENT_TIMESTAMP
            `;

            await db.query(query, params);
        } catch (error) {
            console.error('Error storing jobs:', error);
        }
    }

    // Clean up old jobs (older than TTL)
    private async cleanupOldJobs(): Promise<void> {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - this.storageTTLDays);

            await db.query(
                'DELETE FROM jobs WHERE posted_date < $1',
                [cutoffDate]
            );
        } catch (error) {
            console.error('Error cleaning up old jobs:', error);
        }
    }

    // Search jobs with caching and aggregation
    async searchJobs(filters: JobSearchFilters): Promise<JobSearchResponse> {
        const cacheKey = `job_search:${JSON.stringify(filters)}`;

        // Try to get from cache first
        const cached = await redis.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }

        // Fetch from aggregators
        const aggregatorResults = await this.fetchFromAggregators(filters);

        // Combine and deduplicate jobs
        const allJobs = aggregatorResults
            .filter(result => result.success)
            .flatMap(result => result.jobs);

        const deduplicatedJobs = this.deduplicateJobs(allJobs);

        // Store in database for future queries
        await this.storeJobs(deduplicatedJobs);

        // Apply additional filters to stored jobs
        const filteredJobs = await this.applyFilters(deduplicatedJobs, filters);

        // Paginate results
        const page = filters.page || 1;
        const limit = filters.limit || 20;
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedJobs = filteredJobs.slice(startIndex, endIndex);

        const response: JobSearchResponse = {
            jobs: paginatedJobs,
            totalCount: filteredJobs.length,
            page,
            totalPages: Math.ceil(filteredJobs.length / limit),
            aggregatorResults: aggregatorResults.reduce((acc, result) => {
                acc[result.source] = {
                    count: result.jobs.length,
                    success: result.success,
                    error: result.error
                };
                return acc;
            }, {} as any)
        };

        // Cache the result
        await redis.set(cacheKey, JSON.stringify(response), this.cacheTTL);

        return response;
    }

    // Apply additional filters to jobs
    private async applyFilters(jobs: Job[], filters: JobSearchFilters): Promise<Job[]> {
        let filteredJobs = jobs;

        // Filter by job type
        if (filters.jobType && filters.jobType.length > 0) {
            filteredJobs = filteredJobs.filter(job =>
                job.jobType && filters.jobType!.includes(job.jobType as any)
            );
        }

        // Filter by work location
        if (filters.workLocation && filters.workLocation.length > 0) {
            filteredJobs = filteredJobs.filter(job =>
                job.workLocation && filters.workLocation!.includes(job.workLocation as any)
            );
        }

        // Filter by salary range
        if (filters.salaryMin) {
            filteredJobs = filteredJobs.filter(job =>
                job.salaryMin && job.salaryMin >= filters.salaryMin!
            );
        }

        if (filters.salaryMax) {
            filteredJobs = filteredJobs.filter(job =>
                job.salaryMax && job.salaryMax <= filters.salaryMax!
            );
        }

        // Filter by posted date
        if (filters.postedWithin && filters.postedWithin !== 'all') {
            const cutoffDate = new Date();
            switch (filters.postedWithin) {
                case '24h':
                    cutoffDate.setDate(cutoffDate.getDate() - 1);
                    break;
                case '7d':
                    cutoffDate.setDate(cutoffDate.getDate() - 7);
                    break;
                case '30d':
                    cutoffDate.setDate(cutoffDate.getDate() - 30);
                    break;
            }
            filteredJobs = filteredJobs.filter(job =>
                new Date(job.postedDate) >= cutoffDate
            );
        }

        // Filter by company
        if (filters.company) {
            filteredJobs = filteredJobs.filter(job =>
                job.company.toLowerCase().includes(filters.company!.toLowerCase())
            );
        }

        // Filter by auto-apply eligibility
        if (filters.autoApplyEligible !== undefined) {
            filteredJobs = filteredJobs.filter(job =>
                filters.autoApplyEligible ? job.autoApplyStatus === 'eligible' : job.autoApplyStatus !== 'eligible'
            );
        }

        // Sort by posted date (newest first)
        filteredJobs.sort((a, b) => new Date(b.postedDate).getTime() - new Date(a.postedDate).getTime());

        return filteredJobs;
    }

    // Get jobs from database (for stored jobs)
    async getStoredJobs(filters: JobSearchFilters): Promise<JobSearchResponse> {
        try {
            // If no specific filters are applied, use the optimized view for better performance
            if (!filters.keywords && !filters.location && !filters.jobType && !filters.workLocation &&
                !filters.salaryMin && !filters.salaryMax && !filters.company &&
                filters.autoApplyEligible === undefined && (!filters.postedWithin || filters.postedWithin === 'all')) {
                return this.getRecentJobsFromView(filters);
            }

            let query = 'SELECT * FROM jobs WHERE 1=1';
            const params: any[] = [];
            let paramIndex = 1;

            // Apply filters
            if (filters.keywords) {
                query += ` AND to_tsvector('english', title || ' ' || company || ' ' || description_snippet) @@ plainto_tsquery('english', $${paramIndex})`;
                params.push(filters.keywords);
                paramIndex++;
            }

            if (filters.location) {
                query += ` AND location ILIKE $${paramIndex}`;
                params.push(`%${filters.location}%`);
                paramIndex++;
            }

            if (filters.jobType && filters.jobType.length > 0) {
                query += ` AND job_type = ANY($${paramIndex})`;
                params.push(filters.jobType);
                paramIndex++;
            }

            if (filters.workLocation && filters.workLocation.length > 0) {
                query += ` AND work_location = ANY($${paramIndex})`;
                params.push(filters.workLocation);
                paramIndex++;
            }

            if (filters.salaryMin) {
                query += ` AND salary_min >= $${paramIndex}`;
                params.push(filters.salaryMin);
                paramIndex++;
            }

            if (filters.salaryMax) {
                query += ` AND salary_max <= $${paramIndex}`;
                params.push(filters.salaryMax);
                paramIndex++;
            }

            if (filters.company) {
                query += ` AND company ILIKE $${paramIndex}`;
                params.push(`%${filters.company}%`);
                paramIndex++;
            }

            if (filters.autoApplyEligible !== undefined) {
                query += ` AND auto_apply_status = $${paramIndex}`;
                params.push(filters.autoApplyEligible ? 'eligible' : 'ineligible');
                paramIndex++;
            }

            // Apply posted date filter
            if (filters.postedWithin && filters.postedWithin !== 'all') {
                const cutoffDate = new Date();
                switch (filters.postedWithin) {
                    case '24h':
                        cutoffDate.setDate(cutoffDate.getDate() - 1);
                        break;
                    case '7d':
                        cutoffDate.setDate(cutoffDate.getDate() - 7);
                        break;
                    case '30d':
                        cutoffDate.setDate(cutoffDate.getDate() - 30);
                        break;
                }
                query += ` AND posted_date >= $${paramIndex}`;
                params.push(cutoffDate);
                paramIndex++;
            }

            // Order by posted date
            query += ' ORDER BY posted_date DESC';

            // Apply pagination
            const page = filters.page || 1;
            const limit = filters.limit || 20;
            const offset = (page - 1) * limit;
            query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
            params.push(limit, offset);

            const result = await db.query(query, params);
            const jobs = result.rows.map(row => ({
                ...row,
                postedDate: row.posted_date,
                descriptionSnippet: row.description_snippet,
                applyUrl: row.apply_url,
                jobType: row.job_type,
                workLocation: row.work_location,
                salaryMin: row.salary_min,
                salaryMax: row.salary_max,
                salaryCurrency: row.salary_currency,
                autoApplyStatus: row.auto_apply_status,
                externalId: row.external_id,
                createdAt: row.created_at,
                updatedAt: row.updated_at
            }));

            // Get total count for pagination
            const countQuery = query.replace(/SELECT \*/, 'SELECT COUNT(*)').replace(/ORDER BY.*LIMIT.*OFFSET.*/, '');
            const countResult = await db.query(countQuery, params.slice(0, -2));
            const totalCount = parseInt(countResult.rows[0].count);

            return {
                jobs,
                totalCount,
                page,
                totalPages: Math.ceil(totalCount / limit),
                aggregatorResults: {}
            };
        } catch (error) {
            console.error('Error getting stored jobs:', error);
            return {
                jobs: [],
                totalCount: 0,
                page: 1,
                totalPages: 0,
                aggregatorResults: {}
            };
        }
    }

    // Get recent jobs from optimized view for better performance
    private async getRecentJobsFromView(filters: JobSearchFilters): Promise<JobSearchResponse> {
        try {
            const page = filters.page || 1;
            const limit = filters.limit || 20;
            const offset = (page - 1) * limit;

            // Query the optimized view
            const query = `
                SELECT * FROM recent_jobs_view 
                WHERE row_num > $1 AND row_num <= $2
                ORDER BY posted_date DESC
            `;

            const result = await db.query(query, [offset, offset + limit]);
            const jobs = result.rows.map(row => ({
                ...row,
                postedDate: row.posted_date,
                descriptionSnippet: row.description_snippet,
                applyUrl: row.apply_url,
                jobType: row.job_type,
                workLocation: row.work_location,
                salaryMin: row.salary_min,
                salaryMax: row.salary_max,
                salaryCurrency: row.salary_currency,
                autoApplyStatus: row.auto_apply_status,
                externalId: row.external_id,
                createdAt: row.created_at,
                updatedAt: row.updated_at
            }));

            // Get total count from view
            const countResult = await db.query('SELECT COUNT(*) FROM recent_jobs_view');
            const totalCount = parseInt(countResult.rows[0].count);

            return {
                jobs,
                totalCount,
                page,
                totalPages: Math.ceil(totalCount / limit),
                aggregatorResults: {}
            };
        } catch (error) {
            console.error('Error getting recent jobs from view:', error);
            return {
                jobs: [],
                totalCount: 0,
                page: 1,
                totalPages: 0,
                aggregatorResults: {}
            };
        }
    }

    // Update auto-apply status for a job
    async updateAutoApplyStatus(jobId: string, status: AutoApplyStatus, notes?: string): Promise<boolean> {
        try {
            await db.query(
                'UPDATE jobs SET auto_apply_status = $1, auto_apply_notes = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
                [status, notes, jobId]
            );
            return true;
        } catch (error) {
            console.error('Error updating auto-apply status:', error);
            return false;
        }
    }

    // Get aggregator statistics
    async getAggregatorStats(): Promise<any> {
        try {
            const result = await db.query(`
                SELECT
                    source,
                    COUNT(*) as total_jobs,
                    COUNT(CASE WHEN auto_apply_status = 'eligible' THEN 1 END) as eligible_jobs,
                    COUNT(CASE WHEN posted_date >= NOW() - INTERVAL '7 days' THEN 1 END) as recent_jobs,
                    AVG(CASE WHEN salary_min IS NOT NULL THEN salary_min END) as avg_salary_min,
                    AVG(CASE WHEN salary_max IS NOT NULL THEN salary_max END) as avg_salary_max
                FROM jobs
                GROUP BY source
            `);
            return result.rows;
        } catch (error) {
            console.error('Error getting aggregator stats:', error);
            return [];
        }
    }

    // Initialize cleanup job (run periodically)
    async initializeCleanup(): Promise<void> {
        // Run cleanup every 24 hours
        setInterval(async () => {
            await this.cleanupOldJobs();
        }, 24 * 60 * 60 * 1000);
    }
}

export const jobAggregationService = new JobAggregationService(); 