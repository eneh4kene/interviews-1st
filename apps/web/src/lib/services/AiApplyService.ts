// AI Apply Service - Orchestrates AI-powered job applications
import { db } from '../utils/database';
import { clientEmailService, ClientEmailInfo } from './ClientEmailService';
import { emailService } from './emailService';

export interface AiApplicationData {
    client_id: string;
    worker_id: string;
    job_id: string;
    job_title: string;
    company_name: string;
    company_website?: string;
    wait_for_approval?: boolean;
    worker_notes?: string;
}

export interface AiApplicationStatus {
    id: string;
    client_id: string;
    worker_id: string;
    job_id: string;
    job_title: string;
    company_name: string;
    company_website?: string;
    status: 'queued' | 'processing' | 'email_discovery' | 'generating_content' | 'awaiting_approval' | 'approved' | 'submitted' | 'successful' | 'failed';
    progress: number;
    wait_for_approval: boolean;
    retry_count: number;
    max_retries: number;
    error_message?: string;
    ai_generated_content?: any;
    worker_notes?: string;
    target_email?: string;
    email_confidence_score?: number;
    alternative_emails?: string[];
    created_at: Date;
    updated_at: Date;
}

export interface ApplicationSubmissionData {
    client_id: string;
    worker_id: string;
    job_id: string;
    job_title: string;
    company_name: string;
    company_website?: string;
    wait_for_approval?: boolean;
    worker_notes?: string;
}

export interface ApplicationResult {
    success: boolean;
    application_id?: string;
    error?: string;
}

export interface ApplicationEdits {
    target_email?: string;
    email_subject?: string;
    email_body?: string;
    resume_content?: string;
    worker_notes?: string;
}

export class AiApplyService {
    /**
     * Submit a new AI application
     */
    async submitApplication(data: ApplicationSubmissionData): Promise<ApplicationResult> {
        try {
            // Check for duplicate application
            const duplicateCheck = await this.checkDuplicateApplication(data.client_id, data.job_id);
            if (duplicateCheck) {
                return {
                    success: false,
                    error: 'Application already exists for this job'
                };
            }

            // Create AI application record
            const result = await db.query(`
        INSERT INTO ai_applications (
          client_id, worker_id, job_id, job_title, company_name, 
          company_website, wait_for_approval, worker_notes, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'queued')
        RETURNING *
      `, [
                data.client_id,
                data.worker_id,
                data.job_id,
                data.job_title,
                data.company_name,
                data.company_website,
                data.wait_for_approval || false,
                data.worker_notes
            ]);

            const application = result.rows[0];

            // Add to processing queue
            await this.addToQueue(application.id);

            // Start processing if not waiting for approval
            if (!data.wait_for_approval) {
                // Process in background (non-blocking)
                setImmediate(() => this.processApplication(application.id));
            }

            return {
                success: true,
                application_id: application.id
            };
        } catch (error) {
            console.error('Error submitting AI application:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Process an AI application
     */
    async processApplication(applicationId: string): Promise<void> {
        try {
            // Update status to processing
            await this.updateApplicationStatus(applicationId, 'processing', 10);

            // Get application details
            const application = await this.getApplication(applicationId);
            if (!application) {
                throw new Error('Application not found');
            }

            // Step 1: Email Discovery
            await this.updateApplicationStatus(applicationId, 'email_discovery', 30);
            const emailResult = await this.discoverEmail(application.company_name, application.company_website);

            if (!emailResult.success) {
                throw new Error(`Email discovery failed: ${emailResult.error}`);
            }

            // Update with discovered email
            await this.updateApplicationEmail(applicationId, emailResult.email || '', emailResult.confidence_score || 0, emailResult.alternatives || []);

            // Step 2: Generate Content
            await this.updateApplicationStatus(applicationId, 'generating_content', 60);
            const contentResult = await this.generateApplicationContent(applicationId);

            if (!contentResult.success) {
                throw new Error(`Content generation failed: ${contentResult.error}`);
            }

            // Update with generated content
            await this.updateApplicationContent(applicationId, contentResult.content);

            // Step 3: Check if approval is required
            if (application.wait_for_approval) {
                await this.updateApplicationStatus(applicationId, 'awaiting_approval', 80);
                return; // Wait for worker approval
            }

            // Step 4: Send Application
            await this.updateApplicationStatus(applicationId, 'submitted', 90);
            const sendResult = await this.sendApplication(applicationId);

            if (sendResult.success) {
                await this.updateApplicationStatus(applicationId, 'successful', 100);
            } else {
                throw new Error(`Application sending failed: ${sendResult.error}`);
            }

        } catch (error) {
            console.error('Error processing AI application:', error);
            await this.updateApplicationStatus(applicationId, 'failed', 0, error instanceof Error ? error.message : 'Unknown error');
        }
    }

    /**
     * Approve an application with optional edits
     */
    async approveApplication(applicationId: string, edits?: ApplicationEdits): Promise<ApplicationResult> {
        try {
            // Update application with edits if provided
            if (edits) {
                await this.updateApplicationEdits(applicationId, edits);
            }

            // Update status to approved
            await this.updateApplicationStatus(applicationId, 'approved', 85);

            // Send the application
            const sendResult = await this.sendApplication(applicationId);

            if (sendResult.success) {
                await this.updateApplicationStatus(applicationId, 'successful', 100);
                return { success: true };
            } else {
                throw new Error(`Application sending failed: ${sendResult.error}`);
            }
        } catch (error) {
            console.error('Error approving application:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Reject an application
     */
    async rejectApplication(applicationId: string, reason: string): Promise<ApplicationResult> {
        try {
            await this.updateApplicationStatus(applicationId, 'failed', 0, reason);
            return { success: true };
        } catch (error) {
            console.error('Error rejecting application:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Get application by ID
     */
    async getApplication(applicationId: string): Promise<AiApplicationStatus | null> {
        try {
            const result = await db.query(`
        SELECT * FROM ai_applications WHERE id = $1
      `, [applicationId]);

            if (result.rows.length === 0) {
                return null;
            }

            return this.mapRowToApplicationStatus(result.rows[0]);
        } catch (error) {
            console.error('Error getting application:', error);
            return null;
        }
    }

    /**
     * Get applications for a client
     */
    async getClientApplications(clientId: string, status?: string): Promise<AiApplicationStatus[]> {
        try {
            let query = 'SELECT * FROM ai_applications WHERE client_id = $1';
            const params = [clientId];

            if (status) {
                query += ' AND status = $2';
                params.push(status);
            }

            query += ' ORDER BY created_at DESC';

            const result = await db.query(query, params);
            return result.rows.map(row => this.mapRowToApplicationStatus(row));
        } catch (error) {
            console.error('Error getting client applications:', error);
            return [];
        }
    }

    /**
     * Get applications for a worker
     */
    async getWorkerApplications(workerId: string, status?: string): Promise<AiApplicationStatus[]> {
        try {
            let query = 'SELECT * FROM ai_applications WHERE worker_id = $1';
            const params = [workerId];

            if (status) {
                query += ' AND status = $2';
                params.push(status);
            }

            query += ' ORDER BY created_at DESC';

            const result = await db.query(query, params);
            return result.rows.map(row => this.mapRowToApplicationStatus(row));
        } catch (error) {
            console.error('Error getting worker applications:', error);
            return [];
        }
    }

    /**
     * Check for duplicate application
     */
    private async checkDuplicateApplication(clientId: string, jobId: string): Promise<boolean> {
        try {
            const result = await db.query(`
        SELECT id FROM ai_applications 
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
     * Add application to processing queue
     */
    private async addToQueue(applicationId: string, priority: number = 0): Promise<void> {
        try {
            await db.query(`
        INSERT INTO application_queue (ai_application_id, priority, status)
        VALUES ($1, $2, 'pending')
      `, [applicationId, priority]);
        } catch (error) {
            console.error('Error adding to queue:', error);
        }
    }

    /**
     * Update application status
     */
    private async updateApplicationStatus(
        applicationId: string,
        status: string,
        progress: number,
        errorMessage?: string
    ): Promise<void> {
        try {
            await db.query(`
        UPDATE ai_applications 
        SET status = $1, progress = $2, error_message = $3, updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
      `, [status, progress, errorMessage, applicationId]);
        } catch (error) {
            console.error('Error updating application status:', error);
        }
    }

    /**
     * Update application email information
     */
    private async updateApplicationEmail(
        applicationId: string,
        email: string,
        confidence: number,
        alternatives: string[]
    ): Promise<void> {
        try {
            await db.query(`
        UPDATE ai_applications 
        SET target_email = $1, email_confidence_score = $2, alternative_emails = $3, updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
      `, [email, confidence, alternatives, applicationId]);
        } catch (error) {
            console.error('Error updating application email:', error);
        }
    }

    /**
     * Update application content
     */
    private async updateApplicationContent(applicationId: string, content: any): Promise<void> {
        try {
            await db.query(`
        UPDATE ai_applications 
        SET ai_generated_content = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [JSON.stringify(content), applicationId]);
        } catch (error) {
            console.error('Error updating application content:', error);
        }
    }

    /**
     * Update application edits
     */
    private async updateApplicationEdits(applicationId: string, edits: ApplicationEdits): Promise<void> {
        try {
            const updates = [];
            const values = [];
            let paramCount = 1;

            if (edits.target_email) {
                updates.push(`target_email = $${paramCount++}`);
                values.push(edits.target_email);
            }

            if (edits.worker_notes) {
                updates.push(`worker_notes = $${paramCount++}`);
                values.push(edits.worker_notes);
            }

            if (edits.email_subject || edits.email_body || edits.resume_content) {
                // Update AI generated content
                const currentResult = await db.query(
                    'SELECT ai_generated_content FROM ai_applications WHERE id = $1',
                    [applicationId]
                );

                let content = currentResult.rows[0]?.ai_generated_content || {};

                if (edits.email_subject) content.email_subject = edits.email_subject;
                if (edits.email_body) content.email_body = edits.email_body;
                if (edits.resume_content) content.resume_content = edits.resume_content;

                updates.push(`ai_generated_content = $${paramCount++}`);
                values.push(JSON.stringify(content));
            }

            if (updates.length > 0) {
                values.push(applicationId);
                await db.query(`
          UPDATE ai_applications 
          SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
          WHERE id = $${paramCount}
        `, values);
            }
        } catch (error) {
            console.error('Error updating application edits:', error);
        }
    }

    /**
     * Discover email address for company
     */
    private async discoverEmail(companyName: string, companyWebsite?: string): Promise<{
        success: boolean;
        email?: string;
        confidence_score?: number;
        alternatives?: string[];
        error?: string;
    }> {
        try {
            // Check cache first
            const cached = await this.getCachedEmailDiscovery(companyName);
            if (cached) {
                return {
                    success: true,
                    email: cached.primary_email,
                    confidence_score: cached.confidence_score,
                    alternatives: cached.alternative_emails
                };
            }

            // For now, use a simple email discovery strategy
            // In the future, this will integrate with n8n workflows
            const discoveredEmail = this.simpleEmailDiscovery(companyName, companyWebsite);

            // Cache the result
            await this.cacheEmailDiscovery(companyName, companyWebsite, discoveredEmail);

            return {
                success: true,
                email: discoveredEmail.email,
                confidence_score: discoveredEmail.confidence,
                alternatives: discoveredEmail.alternatives
            };
        } catch (error) {
            console.error('Error discovering email:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Generate application content
     */
    private async generateApplicationContent(applicationId: string): Promise<{
        success: boolean;
        content?: any;
        error?: string;
    }> {
        try {
            // Get application details
            const application = await this.getApplication(applicationId);
            if (!application) {
                throw new Error('Application not found');
            }

            // Get client email
            const clientEmail = await clientEmailService.getClientEmail(application.client_id);
            if (!clientEmail) {
                throw new Error('Client email not found');
            }

            // For now, generate simple content
            // In the future, this will integrate with n8n workflows
            const content = {
                email_subject: `Application for ${application.job_title} at ${application.company_name}`,
                email_body: this.generateEmailBody(application, clientEmail),
                resume_content: 'AI-generated resume content will be here',
                from_email: clientEmail.from_email,
                from_name: clientEmail.from_name
            };

            return {
                success: true,
                content
            };
        } catch (error) {
            console.error('Error generating application content:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Send application
     */
    private async sendApplication(applicationId: string): Promise<{ success: boolean; error?: string }> {
        try {
            const application = await this.getApplication(applicationId);
            if (!application || !application.ai_generated_content) {
                throw new Error('Application or content not found');
            }

            const content = application.ai_generated_content;

            // Send email using the email service
            await emailService.queueEmail(
                application.target_email || 'hr@' + application.company_name.toLowerCase().replace(/\s+/g, '') + '.com',
                application.company_name,
                'ai_application',
                {
                    clientName: content.from_name,
                    companyName: application.company_name,
                    jobTitle: application.job_title,
                    emailSubject: content.email_subject,
                    emailBody: content.email_body
                },
                5 // High priority
            );

            return { success: true };
        } catch (error) {
            console.error('Error sending application:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Simple email discovery (placeholder for n8n integration)
     */
    private simpleEmailDiscovery(companyName: string, companyWebsite?: string): {
        email: string;
        confidence: number;
        alternatives: string[];
    } {
        const company = companyName.toLowerCase().replace(/\s+/g, '');
        const baseEmail = `hr@${company}.com`;

        return {
            email: baseEmail,
            confidence: 0.6,
            alternatives: [
                `careers@${company}.com`,
                `jobs@${company}.com`,
                `recruitment@${company}.com`
            ]
        };
    }

    /**
     * Get cached email discovery result
     */
    private async getCachedEmailDiscovery(companyName: string): Promise<any> {
        try {
            const result = await db.query(`
        SELECT * FROM email_discovery_results 
        WHERE company_name = $1 AND expires_at > NOW()
        ORDER BY discovered_at DESC
        LIMIT 1
      `, [companyName]);

            return result.rows[0] || null;
        } catch (error) {
            console.error('Error getting cached email discovery:', error);
            return null;
        }
    }

    /**
     * Cache email discovery result
     */
    private async cacheEmailDiscovery(
        companyName: string,
        companyWebsite: string | undefined,
        result: { email: string; confidence: number; alternatives: string[] }
    ): Promise<void> {
        try {
            await db.query(`
        INSERT INTO email_discovery_results (
          company_name, company_website, primary_email, 
          confidence_score, discovery_method, alternative_emails
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [
                companyName,
                companyWebsite,
                result.email,
                result.confidence,
                'simple_discovery',
                result.alternatives
            ]);
        } catch (error) {
            console.error('Error caching email discovery:', error);
        }
    }

    /**
     * Generate email body
     */
    private generateEmailBody(application: AiApplicationStatus, clientEmail: ClientEmailInfo): string {
        return `
Dear Hiring Manager,

I am writing to express my strong interest in the ${application.job_title} position at ${application.company_name}. 

I am excited about the opportunity to contribute to your team and believe my skills and experience make me a strong candidate for this role.

I have attached my resume for your review and would welcome the opportunity to discuss how I can contribute to ${application.company_name}'s continued success.

Thank you for your time and consideration.

Best regards,
${clientEmail.from_name}
${clientEmail.from_email}
    `.trim();
    }

    /**
     * Map database row to ApplicationStatus
     */
    private mapRowToApplicationStatus(row: any): AiApplicationStatus {
        return {
            id: row.id,
            client_id: row.client_id,
            worker_id: row.worker_id,
            job_id: row.job_id,
            job_title: row.job_title,
            company_name: row.company_name,
            company_website: row.company_website,
            status: row.status,
            progress: row.progress,
            wait_for_approval: row.wait_for_approval,
            retry_count: row.retry_count,
            max_retries: row.max_retries,
            error_message: row.error_message,
            ai_generated_content: row.ai_generated_content,
            worker_notes: row.worker_notes,
            target_email: row.target_email,
            email_confidence_score: row.email_confidence_score,
            alternative_emails: row.alternative_emails,
            created_at: row.created_at,
            updated_at: row.updated_at
        };
    }
}

// Export singleton instance
export const aiApplyService = new AiApplyService();
