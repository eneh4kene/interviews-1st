// AI Resume Service - Handles resume generation for manual applications
import { db } from '../utils/database';

export interface ResumeGenerationData {
    client_id: string;
    worker_id: string;
    job_id: string;
    job_title: string;
    company_name: string;
    company_website?: string;
    description_snippet: string;
    original_resume_id: string;
    original_resume_url: string;
}

export interface ResumeGenerationStatus {
    id: string;
    client_id: string;
    worker_id: string;
    job_id: string;
    job_title: string;
    company_name: string;
    company_website?: string;
    description_snippet?: string;
    status: 'queued' | 'processing' | 'generating' | 'completed' | 'failed';
    progress: number;
    original_resume_id?: string;
    original_resume_url?: string;
    generated_resume_url?: string;
    generated_resume_filename?: string;
    error_message?: string;
    retry_count: number;
    max_retries: number;
    created_at: Date;
    updated_at: Date;
}

export interface ResumeResult {
    success: boolean;
    resume_id?: string;
    error?: string;
}

export class AiResumeService {
    /**
     * Submit a new resume generation request
     */
    async submitResumeGeneration(data: ResumeGenerationData): Promise<ResumeResult> {
        try {
            // Check for duplicate application for the same job
            const duplicateCheck = await this.checkDuplicateApplication(data.client_id, data.job_id);
            if (duplicateCheck) {
                return {
                    success: false,
                    error: 'Application already exists for this job'
                };
            }

            // Create application record with resume generation status
            const result = await db.query(`
                INSERT INTO applications (
                    client_id, job_id, job_title, company_name, 
                    company_website, apply_url, application_type, 
                    resume_id, notes, application_date, status,
                    resume_generation_status, resume_generation_progress
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                RETURNING *
            `, [
                data.client_id,
                data.job_id,
                data.job_title,
                data.company_name,
                data.company_website,
                null, // apply_url - will be set later
                'manual', // application_type
                data.original_resume_id,
                'Resume generation in progress', // notes
                new Date(),
                'applied',
                'queued', // resume_generation_status
                0 // resume_generation_progress
            ]);

            const application = result.rows[0];

            return {
                success: true,
                resume_id: application.id
            };
        } catch (error) {
            console.error('Error submitting resume generation:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Get resume generation status by ID
     */
    async getResumeStatus(resumeId: string): Promise<ResumeGenerationStatus | null> {
        try {
            const result = await db.query(`
                SELECT * FROM applications WHERE id = $1 AND resume_generation_status IS NOT NULL
            `, [resumeId]);

            if (result.rows.length === 0) {
                return null;
            }

            return this.mapRowToResumeStatus(result.rows[0]);
        } catch (error) {
            console.error('Error getting resume status:', error);
            return null;
        }
    }

    /**
     * Get resume generations for a client
     */
    async getClientResumeGenerations(clientId: string, status?: string): Promise<ResumeGenerationStatus[]> {
        try {
            let query = 'SELECT * FROM applications WHERE client_id = $1 AND resume_generation_status IS NOT NULL';
            const params = [clientId];

            if (status) {
                query += ' AND resume_generation_status = $2';
                params.push(status);
            }

            query += ' ORDER BY created_at DESC';

            const result = await db.query(query, params);
            return result.rows.map((row: any) => this.mapRowToResumeStatus(row));
        } catch (error) {
            console.error('Error getting client resume generations:', error);
            return [];
        }
    }

    /**
     * Get resume generations for a worker (via clients)
     */
    async getWorkerResumeGenerations(workerId: string, status?: string): Promise<ResumeGenerationStatus[]> {
        try {
            let query = `
                SELECT a.* FROM applications a 
                JOIN clients c ON a.client_id = c.id 
                WHERE c.worker_id = $1 AND a.resume_generation_status IS NOT NULL
            `;
            const params = [workerId];

            if (status) {
                query += ' AND a.resume_generation_status = $2';
                params.push(status);
            }

            query += ' ORDER BY a.created_at DESC';

            const result = await db.query(query, params);
            return result.rows.map((row: any) => this.mapRowToResumeStatus(row));
        } catch (error) {
            console.error('Error getting worker resume generations:', error);
            return [];
        }
    }

    /**
     * Update resume generation status
     */
    async updateResumeStatus(
        resumeId: string,
        status: string,
        progress: number,
        errorMessage?: string
    ): Promise<void> {
        try {
            await db.query(`
                UPDATE applications 
                SET resume_generation_status = $1, resume_generation_progress = $2, 
                    resume_generation_error = $3, updated_at = CURRENT_TIMESTAMP
                WHERE id = $4
            `, [status, progress, errorMessage, resumeId]);
        } catch (error) {
            console.error('Error updating resume status:', error);
        }
    }

    /**
     * Update resume generation with generated resume URL
     */
    async updateGeneratedResume(
        resumeId: string,
        resumeUrl: string,
        filename: string
    ): Promise<void> {
        try {
            await db.query(`
                UPDATE applications 
                SET generated_resume_url = $1, generated_resume_filename = $2, 
                    resume_generation_status = 'completed', resume_generation_progress = 100, 
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $3
            `, [resumeUrl, filename, resumeId]);
        } catch (error) {
            console.error('Error updating generated resume:', error);
        }
    }

    /**
     * Check for duplicate application
     */
    private async checkDuplicateApplication(clientId: string, jobId: string): Promise<boolean> {
        try {
            const result = await db.query(`
                SELECT id FROM applications 
                WHERE client_id = $1 AND job_id = $2
                LIMIT 1
            `, [clientId, jobId]);

            return result.rows.length > 0;
        } catch (error) {
            console.error('Error checking duplicate application:', error);
            return false;
        }
    }

    /**
     * Map database row to ResumeGenerationStatus
     */
    private mapRowToResumeStatus(row: any): ResumeGenerationStatus {
        return {
            id: row.id,
            client_id: row.client_id,
            worker_id: row.worker_id || null, // applications table doesn't have worker_id
            job_id: row.job_id,
            job_title: row.job_title,
            company_name: row.company_name,
            company_website: row.company_website,
            description_snippet: row.description_snippet || null,
            status: row.resume_generation_status,
            progress: row.resume_generation_progress || 0,
            original_resume_id: row.resume_id,
            original_resume_url: null, // Not stored in applications table
            generated_resume_url: row.generated_resume_url,
            generated_resume_filename: row.generated_resume_filename,
            error_message: row.resume_generation_error,
            retry_count: row.resume_generation_retry_count || 0,
            max_retries: row.resume_generation_max_retries || 3,
            created_at: row.created_at,
            updated_at: row.updated_at
        };
    }
}

// Export singleton instance
export const aiResumeService = new AiResumeService();
