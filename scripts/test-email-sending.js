#!/usr/bin/env node

const { Pool } = require('pg');
const nodemailer = require('nodemailer');
const sgMail = require('@sendgrid/mail');
require('dotenv').config();

async function testEmailSending() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });

    try {
        console.log('🧪 Testing Email Sending...\n');

        // Test SendGrid first
        if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_API_KEY.startsWith('SG.')) {
            console.log('📧 Testing SendGrid...');

            sgMail.setApiKey(process.env.SENDGRID_API_KEY);

            try {
                const msg = {
                    to: 'test@example.com',
                    from: {
                        email: process.env.VERIFIED_SENDER_EMAIL || 'interviewsfirst@gmail.com',
                        name: 'InterviewsFirst Test'
                    },
                    subject: 'Test Email from InterviewsFirst',
                    html: '<h1>Test Email</h1><p>This is a test email from InterviewsFirst.</p>',
                    text: 'Test Email - This is a test email from InterviewsFirst.'
                };

                await sgMail.send(msg);
                console.log('✅ SendGrid test successful!');

                // Process the actual email queue
                await processEmailQueueWithSendGrid(pool);
                return;

            } catch (error) {
                console.error('❌ SendGrid test failed:', error.message);
                console.log('📝 Trying SMTP instead...');
            }
        }

        // Test SMTP
        if (process.env.SMTP_USER && process.env.SMTP_PASS) {
            console.log('📧 Testing SMTP...');

            const transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST || 'smtp.gmail.com',
                port: parseInt(process.env.SMTP_PORT || '587'),
                secure: process.env.SMTP_SECURE === 'true',
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS
                }
            });

            try {
                await transporter.verify();
                console.log('✅ SMTP transporter verified');

                // Process the actual email queue
                await processEmailQueueWithSMTP(pool, transporter);
                return;

            } catch (error) {
                console.error('❌ SMTP test failed:', error.message);
            }
        }

        console.log('❌ No working email configuration found');
        console.log('Please configure either SendGrid or SMTP in your .env file');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

async function processEmailQueueWithSendGrid(pool) {
    console.log('\n📬 Processing email queue with SendGrid...');

    const pendingEmails = await pool.query(`
    SELECT id, to_email, to_name, from_email, from_name, subject, 
           html_content, text_content, status, retry_count, max_retries
    FROM email_queue 
    WHERE status = 'pending' 
    ORDER BY priority DESC, scheduled_at ASC
    LIMIT 5
  `);

    for (const email of pendingEmails.rows) {
        try {
            console.log(`📤 Sending email to ${email.to_email}...`);

            const msg = {
                to: email.to_email,
                from: {
                    email: email.from_email,
                    name: email.from_name
                },
                subject: email.subject,
                html: email.html_content,
                text: email.text_content
            };

            await sgMail.send(msg);

            await pool.query(`
        UPDATE email_queue 
        SET status = 'sent', sent_at = NOW() 
        WHERE id = $1
      `, [email.id]);

            console.log(`✅ Email sent successfully to ${email.to_email}`);

        } catch (error) {
            console.error(`❌ Failed to send email to ${email.to_email}:`, error.message);

            const newRetryCount = email.retry_count + 1;
            const status = newRetryCount >= (email.max_retries || 3) ? 'failed' : 'pending';

            await pool.query(`
        UPDATE email_queue 
        SET retry_count = $1, status = $2, error_message = $3
        WHERE id = $4
      `, [newRetryCount, status, error.message, email.id]);
        }
    }
}

async function processEmailQueueWithSMTP(pool, transporter) {
    console.log('\n📬 Processing email queue with SMTP...');

    const pendingEmails = await pool.query(`
    SELECT id, to_email, to_name, from_email, from_name, subject, 
           html_content, text_content, status, retry_count, max_retries
    FROM email_queue 
    WHERE status = 'pending' 
    ORDER BY priority DESC, scheduled_at ASC
    LIMIT 5
  `);

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

            await pool.query(`
        UPDATE email_queue 
        SET status = 'sent', sent_at = NOW() 
        WHERE id = $1
      `, [email.id]);

            console.log(`✅ Email sent successfully to ${email.to_email}`);

        } catch (error) {
            console.error(`❌ Failed to send email to ${email.to_email}:`, error.message);

            const newRetryCount = email.retry_count + 1;
            const status = newRetryCount >= (email.max_retries || 3) ? 'failed' : 'pending';

            await pool.query(`
        UPDATE email_queue 
        SET retry_count = $1, status = $2, error_message = $3
        WHERE id = $4
      `, [newRetryCount, status, error.message, email.id]);
        }
    }
}

testEmailSending();
