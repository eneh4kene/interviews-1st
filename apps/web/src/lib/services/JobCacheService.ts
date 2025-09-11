import { db } from '../utils/database';
import { jobAggregationService } from './jobAggregation';
import { jobClassificationService } from './JobClassificationService';

export interface CachedJob {
    id: string;
    external_id: string;
    title: string;
    company: string;
    company_website?: string;
    location: string;
    salary?: string;
    salary_min?: number;
    salary_max?: number;
    description: string;
    apply_url?: string;
    source: string;
    posted_date: Date;
    job_type?: string;
    work_location?: string;
    requirements?: string[];
    benefits?: string[];
    // Caching fields
    cached_at: Date;
    expires_at: Date;
    preference_hash: string;
    // Classification fields
    is_ai_applicable: boolean;
    confidence_score: number;
    classification_reasons: string[];
    application_method: 'form' | 'email' | 'manual';
}

export interface JobPreferenceHash {
    keywords: string;
    location: string;
    workType: string;
    salaryMin?: number;
    salaryMax?: number;
}

export class JobCacheService {
    private readonly CACHE_DURATION_HOURS = 48;
    private readonly BATCH_SIZE = 50;

    /**
     * Generate a hash for job preferences to group similar searches
     */
    private generatePreferenceHash(preferences: JobPreferenceHash): string {
        const normalized = {
            keywords: preferences.keywords?.toLowerCase().trim() || '',
            location: preferences.location?.toLowerCase().trim() || '',
            workType: preferences.workType || '',
            salaryMin: preferences.salaryMin || 0,
            salaryMax: preferences.salaryMax || 0
        };

        return Buffer.from(JSON.stringify(normalized)).toString('base64');
    }

    /**
     * Get cached jobs for a preference hash
     */
    async getCachedJobs(preferenceHash: string, limit: number = 50): Promise<CachedJob[]> {
        try {
            const result = await db.query(
                `SELECT * FROM jobs 
         WHERE preference_hash = $1 
         AND expires_at > NOW()
         ORDER BY posted_date DESC, cached_at DESC
         LIMIT $2`,
                [preferenceHash, limit]
            );

            return result.rows.map(this.mapDbRowToCachedJob);
        } catch (error) {
            console.error('Error getting cached jobs:', error);
            return [];
        }
    }

    /**
     * Check if we have fresh cached jobs for a preference hash
     */
    async hasFreshJobs(preferenceHash: string, minCount: number = 10): Promise<boolean> {
        try {
            const result = await db.query(
                `SELECT COUNT(*) as count FROM jobs 
         WHERE preference_hash = $1 
         AND expires_at > NOW()`,
                [preferenceHash]
            );

            return parseInt(result.rows[0].count) >= minCount;
        } catch (error) {
            console.error('Error checking fresh jobs:', error);
            return false;
        }
    }

    /**
     * Cache jobs from aggregation service
     */
    async cacheJobs(jobs: any[], preferenceHash: string): Promise<CachedJob[]> {
        try {
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + this.CACHE_DURATION_HOURS);

            const cachedJobs: CachedJob[] = [];

            for (const job of jobs) {
                // Classify the job
                const classification = await jobClassificationService.classifyJob(job);

                // Check if job already exists (avoid duplicates)
                const existingJob = await db.query(
                    'SELECT id FROM jobs WHERE external_id = $1 AND source = $2',
                    [job.external_id || job.id, job.source]
                );

                if (existingJob.rows.length > 0) {
                    // Update existing job with new preference hash and expiry
                    await db.query(
                        `UPDATE jobs SET 
             preference_hash = $1, 
             expires_at = $2, 
             cached_at = NOW(),
             is_ai_applicable = $3,
             confidence_score = $4,
             classification_reasons = $5,
             application_method = $6
             WHERE external_id = $7 AND source = $8`,
                        [
                            preferenceHash,
                            expiresAt,
                            classification.is_ai_applicable,
                            classification.confidence_score,
                            classification.classification_reasons,
                            classification.application_method,
                            job.external_id || job.id,
                            job.source
                        ]
                    );
                } else {
                    // Insert new job
                    const result = await db.query(
                        `INSERT INTO jobs (
              external_id, title, company, company_website, location, salary, 
              salary_min, salary_max, description, apply_url, source, posted_date,
              job_type, work_location, requirements, benefits, preference_hash,
              cached_at, expires_at, is_ai_applicable, confidence_score,
              classification_reasons, application_method
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
            RETURNING *`,
                        [
                            job.external_id || job.id,
                            job.title,
                            job.company,
                            job.company_website || null,
                            job.location,
                            job.salary || null,
                            job.salary_min || null,
                            job.salary_max || null,
                            job.description || job.descriptionSnippet || '',
                            job.apply_url || job.applyUrl || null,
                            job.source,
                            job.posted_date || job.postedDate || new Date(),
                            job.job_type || job.jobType || null,
                            job.work_location || job.workLocation || null,
                            job.requirements || null,
                            job.benefits || null,
                            preferenceHash,
                            new Date(),
                            expiresAt,
                            classification.is_ai_applicable,
                            classification.confidence_score,
                            classification.classification_reasons,
                            classification.application_method
                        ]
                    );

                    cachedJobs.push(this.mapDbRowToCachedJob(result.rows[0]));
                }
            }

            return cachedJobs;
        } catch (error) {
            console.error('Error caching jobs:', error);
            throw error;
        }
    }

    /**
     * Get or fetch jobs for client preferences
     */
    async getJobsForClient(clientId: string, preferences: JobPreferenceHash, limit: number = 50): Promise<CachedJob[]> {
        try {
            const preferenceHash = this.generatePreferenceHash(preferences);

            // Check if we have fresh cached jobs
            const hasFreshJobs = await this.hasFreshJobs(preferenceHash, 10);

            if (hasFreshJobs) {
                console.log(`Using cached jobs for preference hash: ${preferenceHash.substring(0, 10)}...`);
                return await this.getCachedJobs(preferenceHash, limit);
            }

            // Need to fetch fresh jobs
            console.log(`Fetching fresh jobs for preference hash: ${preferenceHash.substring(0, 10)}...`);

            const searchFilters = {
                keywords: preferences.keywords,
                location: preferences.location,
                workType: preferences.workType as 'remote' | 'hybrid' | 'onsite',
                salaryMin: preferences.salaryMin,
                salaryMax: preferences.salaryMax,
                limit: this.BATCH_SIZE
            };

            const jobSearchResponse = await jobAggregationService.searchJobs(searchFilters);
            const jobs = jobSearchResponse.jobs || [];

            if (jobs.length === 0) {
                console.log('No jobs found from aggregation service');
                return [];
            }

            // Cache the new jobs
            const cachedJobs = await this.cacheJobs(jobs, preferenceHash);

            // Return the requested number
            return cachedJobs.slice(0, limit);
        } catch (error) {
            console.error('Error getting jobs for client:', error);
            throw error;
        }
    }

    /**
     * Get similar preference hashes (for sharing jobs across workers)
     */
    async getSimilarPreferenceHashes(preferenceHash: string, limit: number = 5): Promise<string[]> {
        try {
            const result = await db.query(
                `SELECT DISTINCT preference_hash, COUNT(*) as job_count
         FROM jobs 
         WHERE expires_at > NOW()
         AND preference_hash != $1
         GROUP BY preference_hash
         ORDER BY job_count DESC
         LIMIT $2`,
                [preferenceHash, limit]
            );

            return result.rows.map(row => row.preference_hash);
        } catch (error) {
            console.error('Error getting similar preference hashes:', error);
            return [];
        }
    }

    /**
     * Clean up expired jobs
     */
    async cleanupExpiredJobs(): Promise<number> {
        try {
            const result = await db.query(
                'DELETE FROM jobs WHERE expires_at <= NOW()'
            );

            console.log(`Cleaned up ${result.rowCount} expired jobs`);
            return result.rowCount || 0;
        } catch (error) {
            console.error('Error cleaning up expired jobs:', error);
            return 0;
        }
    }

    /**
     * Get cache statistics
     */
    async getCacheStats(): Promise<{
        total_jobs: number;
        fresh_jobs: number;
        expired_jobs: number;
        unique_preference_hashes: number;
        oldest_job: Date | null;
        newest_job: Date | null;
    }> {
        try {
            const result = await db.query(`
        SELECT 
          COUNT(*) as total_jobs,
          COUNT(CASE WHEN expires_at > NOW() THEN 1 END) as fresh_jobs,
          COUNT(CASE WHEN expires_at <= NOW() THEN 1 END) as expired_jobs,
          COUNT(DISTINCT preference_hash) as unique_preference_hashes,
          MIN(cached_at) as oldest_job,
          MAX(cached_at) as newest_job
        FROM jobs
      `);

            const stats = result.rows[0];
            return {
                total_jobs: parseInt(stats.total_jobs),
                fresh_jobs: parseInt(stats.fresh_jobs),
                expired_jobs: parseInt(stats.expired_jobs),
                unique_preference_hashes: parseInt(stats.unique_preference_hashes),
                oldest_job: stats.oldest_job,
                newest_job: stats.newest_job
            };
        } catch (error) {
            console.error('Error getting cache stats:', error);
            throw error;
        }
    }

    /**
     * Map database row to CachedJob interface
     */
    private mapDbRowToCachedJob(row: any): CachedJob {
        return {
            id: row.id,
            external_id: row.external_id,
            title: row.title,
            company: row.company,
            company_website: row.company_website,
            location: row.location,
            salary: row.salary,
            salary_min: row.salary_min,
            salary_max: row.salary_max,
            description: row.description,
            apply_url: row.apply_url,
            source: row.source,
            posted_date: row.posted_date,
            job_type: row.job_type,
            work_location: row.work_location,
            requirements: row.requirements,
            benefits: row.benefits,
            cached_at: row.cached_at,
            expires_at: row.expires_at,
            preference_hash: row.preference_hash,
            is_ai_applicable: row.is_ai_applicable,
            confidence_score: row.confidence_score,
            classification_reasons: row.classification_reasons,
            application_method: row.application_method
        };
    }
}

// Export singleton instance
export const jobCacheService = new JobCacheService();
