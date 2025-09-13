import { db } from '../utils/database';

export interface AggregatorStats {
    source: string;
    total_jobs: number;
    eligible_jobs: number;
    recent_jobs: number;
    avg_salary_min: number | null;
    avg_salary_max: number | null;
}

export interface ClientJobStats {
    total_jobs_found: number;
    ai_applicable_jobs: number;
    manual_only_jobs: number;
    average_match_percentage: number;
}

export class JobStatisticsService {
    /**
     * Get aggregator-level statistics (jobs by source)
     */
    async getAggregatorStats(): Promise<AggregatorStats[]> {
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
        ORDER BY total_jobs DESC
      `);
            return result.rows;
        } catch (error) {
            console.error('Error getting aggregator stats:', error);
            return [];
        }
    }

    /**
     * Get client-specific job statistics
     */
    async getClientJobStats(jobs: any[]): Promise<ClientJobStats> {
        try {
            const aiApplicableJobs = jobs.filter(job => job.is_ai_applicable).length;
            const manualOnlyJobs = jobs.filter(job => !job.is_ai_applicable).length;
            const averageMatch = jobs.length > 0
                ? jobs.reduce((sum, job) => sum + (job.match_percentage || 0), 0) / jobs.length
                : 0;

            return {
                total_jobs_found: jobs.length,
                ai_applicable_jobs: aiApplicableJobs,
                manual_only_jobs: manualOnlyJobs,
                average_match_percentage: Math.round(averageMatch)
            };
        } catch (error) {
            console.error('Error calculating client job stats:', error);
            return {
                total_jobs_found: 0,
                ai_applicable_jobs: 0,
                manual_only_jobs: 0,
                average_match_percentage: 0
            };
        }
    }

    /**
     * Get job trends over time
     */
    async getJobTrends(days: number = 30): Promise<any[]> {
        try {
            const result = await db.query(`
        SELECT
          DATE(posted_date) as date,
          source,
          COUNT(*) as job_count
        FROM jobs
        WHERE posted_date >= NOW() - INTERVAL '${days} days'
        GROUP BY DATE(posted_date), source
        ORDER BY date DESC, job_count DESC
      `);
            return result.rows;
        } catch (error) {
            console.error('Error getting job trends:', error);
            return [];
        }
    }

    /**
     * Get salary statistics by source
     */
    async getSalaryStats(): Promise<any[]> {
        try {
            const result = await db.query(`
        SELECT
          source,
          COUNT(*) as total_jobs,
          AVG(salary_min) as avg_salary_min,
          AVG(salary_max) as avg_salary_max,
          MIN(salary_min) as min_salary,
          MAX(salary_max) as max_salary,
          COUNT(CASE WHEN salary_min IS NOT NULL THEN 1 END) as jobs_with_salary
        FROM jobs
        WHERE salary_min IS NOT NULL OR salary_max IS NOT NULL
        GROUP BY source
        ORDER BY avg_salary_min DESC
      `);
            return result.rows;
        } catch (error) {
            console.error('Error getting salary stats:', error);
            return [];
        }
    }
}

// Export singleton instance
export const jobStatisticsService = new JobStatisticsService();
