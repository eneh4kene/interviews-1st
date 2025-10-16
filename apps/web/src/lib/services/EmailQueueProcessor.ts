/**
 * EMAIL QUEUE PROCESSOR - Automatic Queue Processing
 * Handles automatic processing of email queue for better delivery
 */

import { SimpleEmailService } from './SimpleEmailService';

export class EmailQueueProcessor {
    private static isProcessing = false;
    private static processingInterval: NodeJS.Timeout | null = null;
    private static readonly PROCESSING_INTERVAL = 30000; // 30 seconds

    /**
     * Start automatic queue processing
     */
    static startProcessing(): void {
        if (this.isProcessing) {
            console.log('📧 Email queue processor is already running');
            return;
        }

        this.isProcessing = true;
        console.log('🚀 Starting automatic email queue processor...');

        // Process immediately on start
        this.processQueue();

        // Set up interval for regular processing
        this.processingInterval = setInterval(async () => {
            try {
                await this.processQueue();
            } catch (error) {
                console.error('❌ Error in automatic queue processing:', error);
            }
        }, this.PROCESSING_INTERVAL);

        console.log(`✅ Email queue processor started (interval: ${this.PROCESSING_INTERVAL}ms)`);
    }

    /**
     * Stop automatic queue processing
     */
    static stopProcessing(): void {
        if (!this.isProcessing) {
            console.log('📧 Email queue processor is not running');
            return;
        }

        this.isProcessing = false;

        if (this.processingInterval) {
            clearInterval(this.processingInterval);
            this.processingInterval = null;
        }

        console.log('🛑 Email queue processor stopped');
    }

    /**
     * Process the email queue once
     */
    static async processQueue(): Promise<void> {
        if (this.isProcessing) {
            try {
                await SimpleEmailService.processQueue();
            } catch (error) {
                console.error('❌ Error processing email queue:', error);
            }
        }
    }

    /**
     * Get processor status
     */
    static getStatus(): { isProcessing: boolean; interval: number } {
        return {
            isProcessing: this.isProcessing,
            interval: this.PROCESSING_INTERVAL
        };
    }
}

// Auto-start processor in production
if (typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
    // Only start in server environment
    EmailQueueProcessor.startProcessing();
}

export default EmailQueueProcessor;

