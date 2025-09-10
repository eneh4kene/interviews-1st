#!/usr/bin/env node

const { Pool } = require('pg');
const nodemailer = require('nodemailer');
require('dotenv').config();

async function processEmailQueue() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });

    try {
        console.log('📧 Processing Email Queue...\n');

        // Get pending emails from queue that are ready to be sent
        const pendingEmails = await pool.query(`
      SELECT id, to_email, to_name, from_email, from_name, subject, 
             html_content, text_content, status, retry_count, max_retries, scheduled_at
      FROM email_queue 
      WHERE status = 'pending' 
      AND scheduled_at <= NOW()
      ORDER BY priority DESC, scheduled_at ASC
      LIMIT 10
    `);

        if (pendingEmails.rows.length === 0) {
            console.log('✅ No pending emails to process');
            return;
        }

        console.log(`📬 Found ${pendingEmails.rows.length} pending emails`);

        // Try SendGrid first
        if (process.env.SENDGRID_API_KEY) {
            console.log('📧 Using SendGrid...');
            const sgMail = require('@sendgrid/mail');
            sgMail.setApiKey(process.env.SENDGRID_API_KEY);

            // Process emails with SendGrid
            for (const email of pendingEmails.rows) {
                try {
                    console.log(`📤 Sending email to ${email.to_email}...`);

                    const msg = {
                        to: email.to_email,
                        from: {
                            email: process.env.VERIFIED_SENDER_EMAIL || email.from_email,
                            name: email.from_name
                        },
                        subject: email.subject,
                        html: email.html_content,
                        text: email.text_content
                    };

                    await sgMail.send(msg);

                    // Update email status to sent
                    await pool.query(`
            UPDATE email_queue 
            SET status = 'sent', sent_at = NOW() 
            WHERE id = $1
          `, [email.id]);

                    console.log(`✅ Email sent successfully to ${email.to_email}`);

                } catch (error) {
                    console.error(`❌ Failed to send email to ${email.to_email}:`, error.message);

                    // Update retry count but keep as pending for retry
                    const newRetryCount = email.retry_count + 1;
                    const maxRetries = email.max_retries || 5; // Increased max retries

                    // Only mark as failed if we've exceeded max retries
                    const status = newRetryCount >= maxRetries ? 'failed' : 'pending';

                    // If still pending, schedule for retry in 5 minutes
                    const scheduledAt = status === 'pending'
                        ? new Date(Date.now() + 5 * 60 * 1000) // 5 minutes from now
                        : email.scheduled_at;

                    await pool.query(`
            UPDATE email_queue 
            SET retry_count = $1, status = $2, error_message = $3, scheduled_at = $4
            WHERE id = $5
          `, [newRetryCount, status, error.message, scheduledAt, email.id]);

                    if (status === 'pending') {
                        console.log(`⏰ Email scheduled for retry in 5 minutes (attempt ${newRetryCount}/${maxRetries})`);
                    } else {
                        console.log(`💀 Email permanently failed after ${maxRetries} attempts`);
                    }
                }
            }
        } else {
            console.log('📧 Using SMTP...');

            // Set up email transporter
            const transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST || 'smtp.gmail.com',
                port: parseInt(process.env.SMTP_PORT || '587'),
                secure: process.env.SMTP_SECURE === 'true',
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS
                }
            });

            // Process emails with SMTP
            for (const email of pendingEmails.rows) {
                try {
                    console.log(`📤 Sending email to ${email.to_email}...`);

                    const mailOptions = {
                        from: `${email.from_name} <${email.from_email}>`,
                        to: `${email.to_name} <${email.to_email}>`,
                        subject: email.subject,
                        html: email.html_content,
                        text: email.text_content
                    };

                    await transporter.sendMail(mailOptions);

                    // Update email status to sent
                    await pool.query(`
          UPDATE email_queue 
          SET status = 'sent', sent_at = NOW() 
          WHERE id = $1
        `, [email.id]);

                    console.log(`✅ Email sent successfully to ${email.to_email}`);

                } catch (error) {
                    console.error(`❌ Failed to send email to ${email.to_email}:`, error.message);

                    // Update retry count but keep as pending for retry
                    const newRetryCount = email.retry_count + 1;
                    const maxRetries = email.max_retries || 5; // Increased max retries

                    // Only mark as failed if we've exceeded max retries
                    const status = newRetryCount >= maxRetries ? 'failed' : 'pending';

                    // If still pending, schedule for retry in 5 minutes
                    const scheduledAt = status === 'pending'
                        ? new Date(Date.now() + 5 * 60 * 1000) // 5 minutes from now
                        : email.scheduled_at;

                    await pool.query(`
          UPDATE email_queue 
          SET retry_count = $1, status = $2, error_message = $3, scheduled_at = $4
          WHERE id = $5
        `, [newRetryCount, status, error.message, scheduledAt, email.id]);

                    if (status === 'pending') {
                        console.log(`⏰ Email scheduled for retry in 5 minutes (attempt ${newRetryCount}/${maxRetries})`);
                    } else {
                        console.log(`💀 Email permanently failed after ${maxRetries} attempts`);
                    }
                }
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

    } catch (error) {
        console.error('❌ Error processing email queue:', error.message);
    } finally {
        await pool.end();
    }
}

processEmailQueue();
