// AI Application Queue Service - Manages the processing queue for AI applications
import { db } from '../utils/database';
import { aiApplyService } from './AiApplyService';

export interface QueueItem {
    id: string;
    ai_application_id: string;
    priority: number;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    scheduled_at: Date;
    started_at?: Date;
    completed_at?: Date;
    error_message?: string;
    created_at: Date;
}

export interface QueueStats {
    total_pending: number;
    total_processing: number;
    total_completed: number;
    total_failed: number;
    average_processing_time: number;
}

export class AiApplicationQueue {
    private isProcessing = false;
    private processingInterval: NodeJS.Timeout | null = null;

    /**
     * Start the queue processor
     */
    startProcessing(intervalMs: number = 30000): void {
        if (this.isProcessing) {
            console.log('Queue processor is already running');
            return;
        }

        this.isProcessing = true;
        console.log('Starting AI application queue processor...');

        this.processingInterval = setInterval(async () => {
            try {
                await this.processNext();
            } catch (error) {
                console.error('Error in queue processing:', error);
            }
        }, intervalMs);

        // Process immediately
        this.processNext();
    }

    /**
     * Stop the queue processor
     */
    stopProcessing(): void {
        if (this.processingInterval) {
            clearInterval(this.processingInterval);
            this.processingInterval = null;
        }
        this.isProcessing = false;
        console.log('AI application queue processor stopped');
    }

    /**
     * Process the next item in the queue
     */
    async processNext(): Promise<void> {
        try {
            // Get the next pending item
            const nextItem = await this.getNextQueueItem();
            if (!nextItem) {
                return; // No items to process
            }

            console.log(`Processing queue item: ${nextItem.id}`);

            // Update status to processing
            await this.updateQueueItemStatus(nextItem.id, 'processing', new Date());

            // Process the application
            await aiApplyService.processApplication(nextItem.ai_application_id);

            // Update status to completed
            await this.updateQueueItemStatus(nextItem.id, 'completed', undefined, new Date());

        } catch (error) {
            console.error('Error processing queue item:', error);

            // Mark as failed if we have the item
            if (error instanceof Error && error.message.includes('queue item')) {
                const itemId = error.message.split(': ')[1];
                await this.updateQueueItemStatus(itemId, 'failed', undefined, new Date(), error.message);
            }
        }
    }

    /**
     * Add an application to the queue
     */
    async enqueueApplication(applicationId: string, priority: number = 0): Promise<string> {
        try {
            const result = await db.query(`
        INSERT INTO application_queue (ai_application_id, priority, status)
        VALUES ($1, $2, 'pending')
        RETURNING id
      `, [applicationId, priority]);

            const queueId = result.rows[0].id;
            console.log(`Application ${applicationId} added to queue with ID ${queueId}`);

            // Trigger immediate processing if not already running
            if (!this.isProcessing) {
                setImmediate(() => this.processNext());
            }

            return queueId;
        } catch (error) {
            console.error('Error enqueueing application:', error);
            throw error;
        }
    }

    /**
     * Get the next item to process
     */
    async getNextQueueItem(): Promise<QueueItem | null> {
        try {
            const result = await db.query(`
        SELECT q.*, a.status as application_status
        FROM application_queue q
        JOIN ai_applications a ON q.ai_application_id = a.id
        WHERE q.status = 'pending'
        AND a.status IN ('queued', 'processing', 'email_discovery', 'generating_content')
        ORDER BY q.priority DESC, q.scheduled_at ASC
        LIMIT 1
      `);

            if (result.rows.length === 0) {
                return null;
            }

            return this.mapRowToQueueItem(result.rows[0]);
        } catch (error) {
            console.error('Error getting next queue item:', error);
            return null;
        }
    }

    /**
     * Get queue statistics
     */
    async getQueueStats(): Promise<QueueStats> {
        try {
            const result = await db.query(`
        SELECT 
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as total_pending,
          COUNT(CASE WHEN status = 'processing' THEN 1 END) as total_processing,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as total_completed,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as total_failed,
          AVG(CASE 
            WHEN status = 'completed' AND started_at IS NOT NULL AND completed_at IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (completed_at - started_at))
            ELSE NULL 
          END) as average_processing_time
        FROM application_queue
        WHERE created_at > NOW() - INTERVAL '24 hours'
      `);

            const stats = result.rows[0];
            return {
                total_pending: parseInt(stats.total_pending) || 0,
                total_processing: parseInt(stats.total_processing) || 0,
                total_completed: parseInt(stats.total_completed) || 0,
                total_failed: parseInt(stats.total_failed) || 0,
                average_processing_time: parseFloat(stats.average_processing_time) || 0
            };
        } catch (error) {
            console.error('Error getting queue stats:', error);
            return {
                total_pending: 0,
                total_processing: 0,
                total_completed: 0,
                total_failed: 0,
                average_processing_time: 0
            };
        }
    }

    /**
     * Get queue position for an application
     */
    async getQueuePosition(applicationId: string): Promise<number> {
        try {
            const result = await db.query(`
        SELECT COUNT(*) as position
        FROM application_queue
        WHERE status = 'pending'
        AND priority >= (
          SELECT priority 
          FROM application_queue 
          WHERE ai_application_id = $1
        )
        AND scheduled_at <= (
          SELECT scheduled_at 
          FROM application_queue 
          WHERE ai_application_id = $1
        )
        AND ai_application_id != $1
      `, [applicationId]);

            return parseInt(result.rows[0].position) || 0;
        } catch (error) {
            console.error('Error getting queue position:', error);
            return 0;
        }
    }

    /**
     * Get all queue items
     */
    async getQueueItems(limit: number = 50, offset: number = 0): Promise<QueueItem[]> {
        try {
            const result = await db.query(`
        SELECT q.*, a.job_title, a.company_name, a.status as application_status
        FROM application_queue q
        JOIN ai_applications a ON q.ai_application_id = a.id
        ORDER BY q.priority DESC, q.scheduled_at ASC
        LIMIT $1 OFFSET $2
      `, [limit, offset]);

            return result.rows.map(row => this.mapRowToQueueItem(row));
        } catch (error) {
            console.error('Error getting queue items:', error);
            return [];
        }
    }

    /**
     * Update queue item status
     */
    async updateQueueItemStatus(
        queueId: string,
        status: string,
        startedAt?: Date,
        completedAt?: Date,
        errorMessage?: string
    ): Promise<void> {
        try {
            const updates = [];
            const values = [];
            let paramCount = 1;

            updates.push(`status = $${paramCount++}`);
            values.push(status);

            if (startedAt) {
                updates.push(`started_at = $${paramCount++}`);
                values.push(startedAt);
            }

            if (completedAt) {
                updates.push(`completed_at = $${paramCount++}`);
                values.push(completedAt);
            }

            if (errorMessage) {
                updates.push(`error_message = $${paramCount++}`);
                values.push(errorMessage);
            }

            values.push(queueId);

            await db.query(`
        UPDATE application_queue 
        SET ${updates.join(', ')}
        WHERE id = $${paramCount}
      `, values);

        } catch (error) {
            console.error('Error updating queue item status:', error);
        }
    }

    /**
     * Remove completed items older than specified days
     */
    async cleanupCompletedItems(olderThanDays: number = 7): Promise<number> {
        try {
            const result = await db.query(`
        DELETE FROM application_queue 
        WHERE status = 'completed' 
        AND completed_at < NOW() - INTERVAL '${olderThanDays} days'
      `);

            console.log(`Cleaned up ${result.rowCount} completed queue items`);
            return result.rowCount || 0;
        } catch (error) {
            console.error('Error cleaning up completed items:', error);
            return 0;
        }
    }

    /**
     * Retry failed items
     */
    async retryFailedItems(maxRetries: number = 3): Promise<number> {
        try {
            const result = await db.query(`
        UPDATE application_queue 
        SET status = 'pending', error_message = NULL, started_at = NULL, completed_at = NULL
        WHERE status = 'failed' 
        AND ai_application_id IN (
          SELECT id FROM ai_applications 
          WHERE retry_count < $1
        )
      `, [maxRetries]);

            console.log(`Retried ${result.rowCount} failed queue items`);
            return result.rowCount || 0;
        } catch (error) {
            console.error('Error retrying failed items:', error);
            return 0;
        }
    }

    /**
     * Get queue health status
     */
    async getQueueHealth(): Promise<{
        is_healthy: boolean;
        issues: string[];
        stats: QueueStats;
    }> {
        const stats = await this.getQueueStats();
        const issues: string[] = [];

        // Check for stuck processing items (older than 10 minutes)
        const stuckItems = await db.query(`
      SELECT COUNT(*) as count
      FROM application_queue 
      WHERE status = 'processing' 
      AND started_at < NOW() - INTERVAL '10 minutes'
    `);

        if (parseInt(stuckItems.rows[0].count) > 0) {
            issues.push(`${stuckItems.rows[0].count} items stuck in processing`);
        }

        // Check for high failure rate
        const totalItems = stats.total_pending + stats.total_processing + stats.total_completed + stats.total_failed;
        if (totalItems > 0) {
            const failureRate = stats.total_failed / totalItems;
            if (failureRate > 0.2) {
                issues.push(`High failure rate: ${(failureRate * 100).toFixed(1)}%`);
            }
        }

        // Check for queue backlog
        if (stats.total_pending > 100) {
            issues.push(`Large queue backlog: ${stats.total_pending} items`);
        }

        return {
            is_healthy: issues.length === 0,
            issues,
            stats
        };
    }

    /**
     * Map database row to QueueItem
     */
    private mapRowToQueueItem(row: any): QueueItem {
        return {
            id: row.id,
            ai_application_id: row.ai_application_id,
            priority: row.priority,
            status: row.status,
            scheduled_at: row.scheduled_at,
            started_at: row.started_at,
            completed_at: row.completed_at,
            error_message: row.error_message,
            created_at: row.created_at
        };
    }
}

// Export singleton instance
export const aiApplicationQueue = new AiApplicationQueue();
