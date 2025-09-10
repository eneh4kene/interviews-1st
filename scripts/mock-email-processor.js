#!/usr/bin/env node

const { Pool } = require('pg');
require('dotenv').config();

async function mockProcessEmailQueue() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });

    try {
        console.log('📧 Mock Processing Email Queue...\n');

        // Get pending emails from queue
        const pendingEmails = await pool.query(`
      SELECT id, to_email, to_name, from_email, from_name, subject, 
             html_content, text_content, status, retry_count, max_retries
      FROM email_queue 
      WHERE status = 'pending' 
      ORDER BY priority DESC, scheduled_at ASC
      LIMIT 10
    `);

        if (pendingEmails.rows.length === 0) {
            console.log('✅ No pending emails to process');
            return;
        }

        console.log(`📬 Found ${pendingEmails.rows.length} pending emails`);

        // Mock process each email
        for (const email of pendingEmails.rows) {
            try {
                console.log(`📤 Processing email to ${email.to_email}...`);
                console.log(`   Subject: ${email.subject}`);
                console.log(`   From: ${email.from_name} <${email.from_email}>`);

                // Simulate email sending delay
                await new Promise(resolve => setTimeout(resolve, 1000));

                // Update email status to sent (mock success)
                await pool.query(`
          UPDATE email_queue 
          SET status = 'sent', sent_at = NOW() 
          WHERE id = $1
        `, [email.id]);

                console.log(`✅ Email processed successfully for ${email.to_email}`);

            } catch (error) {
                console.error(`❌ Failed to process email to ${email.to_email}:`, error.message);

                // Update retry count
                const newRetryCount = email.retry_count + 1;
                const status = newRetryCount >= (email.max_retries || 3) ? 'failed' : 'pending';

                await pool.query(`
          UPDATE email_queue 
          SET retry_count = $1, status = $2, error_message = $3
          WHERE id = $4
        `, [newRetryCount, status, error.message, email.id]);
            }
        }

        // Check final queue status
        const queueStatus = await pool.query(`
      SELECT status, COUNT(*) as count 
      FROM email_queue 
      GROUP BY status
    `);

        console.log('\n📊 Queue Status:');
        queueStatus.rows.forEach(row => {
            console.log(`  ${row.status}: ${row.count} emails`);
        });

        console.log('\n📧 Email Details:');
        const allEmails = await pool.query(`
      SELECT to_email, subject, status, sent_at, created_at
      FROM email_queue 
      ORDER BY created_at DESC
    `);

        allEmails.rows.forEach(email => {
            console.log(`  ${email.to_email}: "${email.subject}" - ${email.status} (${email.sent_at || 'not sent'})`);
        });

    } catch (error) {
        console.error('❌ Error processing email queue:', error.message);
    } finally {
        await pool.end();
    }
}

mockProcessEmailQueue();
