import { db } from '../utils/database';

export interface JobClassification {
  id?: string;
  job_id: string;
  is_ai_applicable: boolean;
  confidence_score: number;
  classification_reasons: string[];
  application_method: 'form' | 'email' | 'manual';
  last_checked_at?: Date;
  created_at?: Date;
  updated_at?: Date;
}

export interface JobListing {
  id: string;
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
}

// Helper function to convert Job to JobListing
function convertJobToJobListing(job: any): JobListing {
  return {
    id: job.id,
    title: job.title,
    company: job.company,
    company_website: job.company_website,
    location: job.location,
    salary: job.salary,
    salary_min: job.salaryMin,
    salary_max: job.salaryMax,
    description: job.descriptionSnippet || job.description || '',
    apply_url: job.applyUrl,
    source: job.source,
    posted_date: new Date(job.postedDate || job.posted_date),
    job_type: job.jobType,
    work_location: job.workLocation,
    requirements: job.requirements,
    benefits: job.benefits
  };
}

export class JobClassificationService {
  /**
   * Classify a job for AI applicability
   */
  async classifyJob(job: JobListing): Promise<JobClassification> {
    const reasons: string[] = [];
    let confidenceScore = 0.0;
    let isAiApplicable = false;
    let applicationMethod: 'form' | 'email' | 'manual' = 'manual';

    // Check if job has company website (required for AI application)
    if (job.company_website) {
      reasons.push('Has company website');
      confidenceScore += 0.4;

      // Check if job has apply URL (form-based application)
      if (job.apply_url) {
        reasons.push('Has apply URL');
        confidenceScore += 0.3;
        applicationMethod = 'form';
      } else {
        reasons.push('Email discovery required');
        confidenceScore += 0.2;
        applicationMethod = 'email';
      }

      // Additional scoring factors
      if (job.description && job.description.length > 100) {
        reasons.push('Detailed job description');
        confidenceScore += 0.1;
      }

      if (job.requirements && job.requirements.length > 0) {
        reasons.push('Clear requirements listed');
        confidenceScore += 0.1;
      }

      if (job.salary_min && job.salary_max) {
        reasons.push('Salary range provided');
        confidenceScore += 0.1;
      }

      // Determine if AI applicable
      isAiApplicable = confidenceScore >= 0.5;
    } else {
      reasons.push('No company website for email discovery');
      confidenceScore = 0.1;
    }

    // Cap confidence score at 1.0
    confidenceScore = Math.min(confidenceScore, 1.0);

    const classification: JobClassification = {
      job_id: job.id,
      is_ai_applicable: isAiApplicable,
      confidence_score: confidenceScore,
      classification_reasons: reasons,
      application_method: applicationMethod,
      last_checked_at: new Date()
    };

    return classification;
  }

  /**
   * Get or create job classification
   */
  async getOrCreateClassification(job: JobListing): Promise<JobClassification> {
    try {
      // Check if classification already exists
      const existing = await db.query(
        'SELECT * FROM job_classifications WHERE job_id = $1',
        [job.id]
      );

      if (existing.rows.length > 0) {
        return existing.rows[0];
      }

      // Create new classification
      const classification = await this.classifyJob(job);

      const result = await db.query(
        `INSERT INTO job_classifications 
         (job_id, is_ai_applicable, confidence_score, classification_reasons, application_method, last_checked_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          classification.job_id,
          classification.is_ai_applicable,
          classification.confidence_score,
          classification.classification_reasons,
          classification.application_method,
          classification.last_checked_at
        ]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Error getting or creating job classification:', error);
      throw error;
    }
  }

  /**
   * Update job classification
   */
  async updateClassification(jobId: string, classification: Partial<JobClassification>): Promise<JobClassification> {
    try {
      const result = await db.query(
        `UPDATE job_classifications 
         SET is_ai_applicable = $2, confidence_score = $3, classification_reasons = $4, 
             application_method = $5, last_checked_at = $6, updated_at = CURRENT_TIMESTAMP
         WHERE job_id = $1
         RETURNING *`,
        [
          jobId,
          classification.is_ai_applicable,
          classification.confidence_score,
          classification.classification_reasons,
          classification.application_method,
          classification.last_checked_at || new Date()
        ]
      );

      if (result.rows.length === 0) {
        throw new Error('Job classification not found');
      }

      return result.rows[0];
    } catch (error) {
      console.error('Error updating job classification:', error);
      throw error;
    }
  }

  /**
   * Get classifications for multiple jobs
   */
  async getClassificationsForJobs(jobIds: string[]): Promise<JobClassification[]> {
    try {
      if (jobIds.length === 0) return [];

      const placeholders = jobIds.map((_, index) => `$${index + 1}`).join(',');
      const result = await db.query(
        `SELECT * FROM job_classifications WHERE job_id IN (${placeholders})`,
        jobIds
      );

      return result.rows;
    } catch (error) {
      console.error('Error getting classifications for jobs:', error);
      throw error;
    }
  }

  /**
   * Get AI applicable jobs
   */
  async getAiApplicableJobs(limit: number = 50): Promise<JobClassification[]> {
    try {
      const result = await db.query(
        `SELECT * FROM job_classifications 
         WHERE is_ai_applicable = true 
         ORDER BY confidence_score DESC, last_checked_at DESC
         LIMIT $1`,
        [limit]
      );

      return result.rows;
    } catch (error) {
      console.error('Error getting AI applicable jobs:', error);
      throw error;
    }
  }

  /**
   * Batch classify jobs
   */
  async batchClassifyJobs(jobs: any[]): Promise<JobClassification[]> {
    try {
      const classifications: JobClassification[] = [];

      for (const job of jobs) {
        const jobListing = convertJobToJobListing(job);
        const classification = await this.getOrCreateClassification(jobListing);
        classifications.push(classification);
      }

      return classifications;
    } catch (error) {
      console.error('Error batch classifying jobs:', error);
      throw error;
    }
  }

  /**
   * Get classification statistics
   */
  async getClassificationStats(): Promise<{
    total_classified: number;
    ai_applicable: number;
    manual_only: number;
    average_confidence: number;
  }> {
    try {
      const result = await db.query(`
        SELECT 
          COUNT(*) as total_classified,
          COUNT(CASE WHEN is_ai_applicable = true THEN 1 END) as ai_applicable,
          COUNT(CASE WHEN is_ai_applicable = false THEN 1 END) as manual_only,
          AVG(confidence_score) as average_confidence
        FROM job_classifications
      `);

      const stats = result.rows[0];
      return {
        total_classified: parseInt(stats.total_classified),
        ai_applicable: parseInt(stats.ai_applicable),
        manual_only: parseInt(stats.manual_only),
        average_confidence: parseFloat(stats.average_confidence) || 0
      };
    } catch (error) {
      console.error('Error getting classification stats:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const jobClassificationService = new JobClassificationService();
