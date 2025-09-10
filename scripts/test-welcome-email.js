#!/usr/bin/env node

const { Pool } = require('pg');
require('dotenv').config();

async function testWelcomeEmail() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });

    try {
        console.log('🧪 Testing Welcome Email Generation...\n');

        // Get the most recent client
        const client = await pool.query('SELECT id, name, email FROM clients ORDER BY created_at DESC LIMIT 1');
        const clientId = client.rows[0].id;
        const clientName = client.rows[0].name;
        const clientEmail = client.rows[0].email;

        console.log(`📧 Testing with client: ${clientName} (${clientEmail})`);

        // Get client and worker details
        const result = await pool.query(`
      SELECT 
        c.name as client_name,
        c.email as client_email,
        u.name as worker_name,
        u.email as worker_email
      FROM clients c
      LEFT JOIN users u ON c.worker_id = u.id
      WHERE c.id = $1
    `, [clientId]);

        if (result.rows.length === 0) {
            throw new Error('Client not found');
        }

        const { client_name, client_email, worker_name, worker_email } = result.rows[0];
        console.log(`👤 Client: ${client_name} (${client_email})`);
        console.log(`👨‍💼 Worker: ${worker_name} (${worker_email})`);

        // Get email template
        const template = await pool.query('SELECT * FROM email_templates WHERE name = $1 AND is_active = true', ['client_welcome']);

        if (template.rows.length === 0) {
            throw new Error('Email template not found');
        }

        console.log(`📝 Template found: ${template.rows[0].subject}`);

        // Render template with variables
        const templateData = template.rows[0];
        const variables = {
            clientName: client_name,
            workerName: worker_name || 'Your Career Coach',
            workerEmail: worker_email || 'support@interviewsfirst.com',
            workerPhone: 'Contact us for details',
            clientEmail: client_email,
            dashboardUrl: `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3002'}/dashboard`,
            unsubscribeUrl: `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3002'}/unsubscribe?token=${clientId}`
        };

        let subject = templateData.subject;
        let html = templateData.html_content;
        let text = templateData.text_content || '';

        // Replace variables in template
        Object.entries(variables).forEach(([key, value]) => {
            const placeholder = `{{${key}}}`;
            const replacement = value || '';

            subject = subject.replace(new RegExp(placeholder, 'g'), replacement);
            html = html.replace(new RegExp(placeholder, 'g'), replacement);
            text = text.replace(new RegExp(placeholder, 'g'), replacement);
        });

        console.log(`📨 Rendered subject: ${subject}`);

        // Queue email
        const queueResult = await pool.query(`
      INSERT INTO email_queue (
        to_email, to_name, from_email, from_name, template_id, subject,
        html_content, text_content, variables, priority, scheduled_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id
    `, [
            client_email,
            client_name,
            'support@interviewsfirst-dev.com',
            'InterviewsFirst',
            templateData.id,
            subject,
            html,
            text,
            JSON.stringify(variables),
            10,
            new Date()
        ]);

        console.log(`✅ Welcome email queued successfully! ID: ${queueResult.rows[0].id}`);

        // Check queue count
        const queueCount = await pool.query('SELECT COUNT(*) FROM email_queue');
        console.log(`📊 Total emails in queue: ${queueCount.rows[0].count}`);

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        await pool.end();
    }
}

testWelcomeEmail();
