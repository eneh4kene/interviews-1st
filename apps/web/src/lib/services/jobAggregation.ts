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


// Aggregator configurations
const aggregatorConfigs: Record<JobAggregator, AggregatorConfig> = {
    adzuna: {
        name: 'adzuna',
        apiKey: process.env.ADZUNA_APP_KEY || 'a6d2443f0062ec8789388ac6a314df2c',
        appId: process.env.ADZUNA_APP_ID || '00287061',
        baseUrl: process.env.ADZUNA_BASE_URL || 'https://api.adzuna.com/v1/api',
        rateLimit: {
            requestsPerMinute: 25,
            requestsPerDay: 250
        },
        enabled: true
    },
    jooble: {
        name: 'jooble',
        apiKey: process.env.JOOBLE_API_KEY || '6e9517d9-6fa7-4d0c-aa3f-16a3483a0452',
        baseUrl: process.env.JOOBLE_BASE_URL || 'https://jooble.org/api',
        rateLimit: {
            requestsPerMinute: 60,
            requestsPerDay: 500
        },
        enabled: true
    },
};


export class JobAggregationService {
    private cacheTTL = parseInt(process.env.JOB_CACHE_TTL_SECONDS || '1800'); // 30 minutes

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

    // Check if stored jobs are fresh (less than 24 hours old)
    private isStoredDataFresh(jobs: Job[]): boolean {
        if (jobs.length === 0) return false;

        const now = new Date();
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        // Check if any job is newer than 24 hours
        return jobs.some(job => {
            const jobDate = new Date(job.postedDate || job.createdAt);
            return jobDate > twentyFourHoursAgo;
        });
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
                // Extract company website from company object or description
                normalized.company_website = this.extractCompanyWebsite(rawJob);
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
                // Extract company website from company object or description
                normalized.company_website = this.extractCompanyWebsite(rawJob);
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

    // Extract company website from job data
    private extractCompanyWebsite(rawJob: any): string | undefined {
        // Try to extract from company object first
        if (rawJob.company?.website) {
            return rawJob.company.website;
        }

        // Try to extract from company object display_name if it contains a domain
        if (rawJob.company?.display_name) {
            const domainMatch = rawJob.company.display_name.match(/([a-zA-Z0-9-]+\.(?:com|co\.uk|org|net|io|ai|tech|dev))/i);
            if (domainMatch) {
                return `https://${domainMatch[1]}`;
            }
        }

        // Try to extract from description using regex patterns
        const description = rawJob.description || rawJob.snippet || '';
        const websitePatterns = [
            // Look for explicit website mentions
            /(?:visit|see|check|apply at|more info at|website:?)\s*([a-zA-Z0-9-]+\.(?:com|co\.uk|org|net|io|ai|tech|dev|co|uk))/gi,
            // Look for www. patterns
            /(?:www\.)([a-zA-Z0-9-]+\.(?:com|co\.uk|org|net|io|ai|tech|dev|co|uk))/gi,
            // Look for full URLs
            /(?:https?:\/\/)(?:www\.)?([a-zA-Z0-9-]+\.(?:com|co\.uk|org|net|io|ai|tech|dev|co|uk))/gi
        ];

        for (const pattern of websitePatterns) {
            const match = pattern.exec(description);
            if (match) {
                let website = match[1];

                // Validate that it looks like a real domain (not too short, not generic)
                if (website.length < 4 || website.includes('example') || website.includes('test') || website.includes('localhost')) {
                    continue;
                }

                if (!website.startsWith('http')) {
                    website = `https://${website}`;
                }

                // Additional validation - check if it's not a common non-company domain
                const commonNonCompanyDomains = ['google.com', 'linkedin.com', 'indeed.com', 'glassdoor.com', 'monster.com', 'ziprecruiter.com'];
                if (commonNonCompanyDomains.some(domain => website.includes(domain))) {
                    continue;
                }

                return website;
            }
        }

        // No mock website generation - only return real websites found in the data
        return undefined;
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
                const offset = index * 16; // 16 fields per job (added company_website)
                return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12}, $${offset + 13}, $${offset + 14}, $${offset + 15}, $${offset + 16})`;
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
                    job.company_website || null, // Add company_website field
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
                    external_id, title, company, company_website, location, salary, description_snippet,
                    source, posted_date, apply_url, job_type, work_location,
                    salary_min, salary_max, salary_currency, auto_apply_status
                ) VALUES ${values}
                ON CONFLICT (external_id, source) DO UPDATE SET
                    title = EXCLUDED.title,
                    company = EXCLUDED.company,
                    company_website = EXCLUDED.company_website,
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

    // Search jobs with caching and aggregation
    async searchJobs(filters: JobSearchFilters): Promise<JobSearchResponse> {
        const cacheKey = `job_search:${JSON.stringify(filters)}`;

        // Try to get from cache first
        const cached = await redis.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }

        // Fetch from external APIs
        const aggregatorResults = await this.fetchFromAggregators(filters);

        // Combine and deduplicate jobs
        const allJobs = aggregatorResults
            .filter(result => result.success)
            .flatMap(result => result.jobs);

        const deduplicatedJobs = this.deduplicateJobs(allJobs);

        // Store fresh jobs in database for future queries
        if (deduplicatedJobs.length > 0) {
            await this.storeJobs(deduplicatedJobs);
        }

        // Use the jobs we determined above
        let jobsToFilter = deduplicatedJobs;

        // If no jobs found, return empty result
        if (jobsToFilter.length === 0) {
            return {
                jobs: [],
                totalCount: 0,
                page: filters.page || 1,
                totalPages: 0,
                aggregatorResults: {}
            };
        }

        // Apply basic filtering
        const filteredJobs = jobsToFilter;

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

    // Get job by ID
    async getJobById(id: string): Promise<Job | null> {
        try {
            const result = await db.query(
                'SELECT * FROM jobs WHERE id = $1',
                [id]
            );

            if (result.rows.length === 0) {
                return null;
            }

            const row = result.rows[0];
            return {
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
                company_website: row.company_website,
                createdAt: row.created_at,
                updatedAt: row.updated_at
            };
        } catch (error) {
            console.error('Error getting job by ID:', error);
            return null;
        }
    }

}

export const jobAggregationService = new JobAggregationService(); 