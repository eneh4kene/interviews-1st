#!/usr/bin/env node

/**
 * Process Email Queue Script
 * 
 * This script processes pending emails in the queue immediately
 * to fix slow delivery issues
 */

const { Pool } = require('pg');
const sgMail = require('@sendgrid/mail');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// Configure SendGrid
if (process.env.SENDGRID_API_KEY) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    console.log('✅ SendGrid configured');
} else {
    console.error('❌ SENDGRID_API_KEY not found');
    process.exit(1);
}

async function processEmailQueue() {
    console.log('🚀 Starting email queue processing...\n');

    try {
        // Get pending emails
        const pendingEmails = await pool.query(`
      SELECT * FROM email_queue 
      WHERE status = 'pending' 
      AND (scheduled_at IS NULL OR scheduled_at <= NOW())
      ORDER BY priority DESC, scheduled_at ASC
      LIMIT 50
    `);

        console.log(`📧 Found ${pendingEmails.rows.length} pending emails`);

        if (pendingEmails.rows.length === 0) {
            console.log('✅ No pending emails to process');
            return;
        }

        let processed = 0;
        let successful = 0;
        let failed = 0;

        for (const email of pendingEmails.rows) {
            try {
                console.log(`\n📤 Processing email to ${email.to_email}...`);

                // Update status to sending
                await pool.query(
                    'UPDATE email_queue SET status = $1 WHERE id = $2',
                    ['sending', email.id]
                );

                // Parse attachments if they exist
                let attachments = [];
                if (email.attachments) {
                    try {
                        const parsedAttachments = typeof email.attachments === 'string'
                            ? JSON.parse(email.attachments)
                            : email.attachments;

                        if (Array.isArray(parsedAttachments)) {
                            for (const att of parsedAttachments) {
                                if (att.url) {
                                    try {
                                        const response = await fetch(att.url);
                                        if (response.ok) {
                                            const buffer = await response.arrayBuffer();
                                            const base64Content = Buffer.from(buffer).toString('base64');

                                            attachments.push({
                                                content: base64Content,
                                                filename: att.name,
                                                type: att.type || 'application/pdf',
                                                disposition: 'attachment'
                                            });
                                        }
                                    } catch (fetchError) {
                                        console.error(`Error fetching attachment ${att.name}:`, fetchError);
                                    }
                                }
                            }
                        }
                    } catch (error) {
                        console.error('Error parsing attachments:', error);
                    }
                }

                // Prepare SendGrid message
                const msg = {
                    to: email.to_email,
                    from: {
                        email: email.from_email,
                        name: email.from_name
                    },
                    subject: email.subject,
                    text: email.text_content || '',
                    html: email.html_content || email.text_content || ''
                };

                // Add attachments if they exist
                if (attachments.length > 0) {
                    msg.attachments = attachments;
                }

                // Add CC and BCC if they exist
                if (email.cc && email.cc.trim()) {
                    msg.cc = email.cc.split(',').map(email => email.trim());
                }
                if (email.bcc && email.bcc.trim()) {
                    msg.bcc = email.bcc.split(',').map(email => email.trim());
                }

                console.log(`   From: ${email.from_email}`);
                console.log(`   Subject: ${email.subject}`);
                console.log(`   Attachments: ${attachments.length}`);

                // Send email
                await sgMail.send(msg);
                console.log(`   ✅ Sent successfully`);

                // Update status to sent
                await pool.query(
                    'UPDATE email_queue SET status = $1, sent_at = NOW() WHERE id = $2',
                    ['sent', email.id]
                );

                // Log email
                await pool.query(`
          INSERT INTO email_logs (queue_id, recipient_email, subject, status)
          VALUES ($1, $2, $3, $4)
        `, [email.id, email.to_email, email.subject, 'sent']);

                successful++;

            } catch (error) {
                console.error(`   ❌ Failed: ${error.message}`);

                // Update status to failed
                await pool.query(
                    'UPDATE email_queue SET status = $1, error_message = $2 WHERE id = $3',
                    ['failed', error.message, email.id]
                );

                // Log failure
                await pool.query(`
          INSERT INTO email_logs (queue_id, recipient_email, subject, status, error_message)
          VALUES ($1, $2, $3, $4, $5)
        `, [email.id, email.to_email, email.subject, 'failed', error.message]);

                failed++;
            }

            processed++;
        }

        console.log(`\n📊 Processing Summary:`);
        console.log(`   Total processed: ${processed}`);
        console.log(`   Successful: ${successful}`);
        console.log(`   Failed: ${failed}`);

        // Check if there are more pending emails
        const remainingPending = await pool.query(`
      SELECT COUNT(*) as count FROM email_queue 
      WHERE status = 'pending' 
      AND (scheduled_at IS NULL OR scheduled_at <= NOW())
    `);

        if (remainingPending.rows[0].count > 0) {
            console.log(`\n⚠️  ${remainingPending.rows[0].count} emails still pending`);
            console.log('   Run this script again to process remaining emails');
        } else {
            console.log('\n✅ All pending emails processed!');
        }

    } catch (error) {
        console.error('❌ Error processing email queue:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Run the script
processEmailQueue().catch(console.error);
