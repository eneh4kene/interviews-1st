#!/usr/bin/env node

/**
 * Email Database Setup Script
 * 
 * This script sets up the email database tables
 * Run with: node scripts/setup-email-database.js
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

console.log('🗄️  Setting up Email Database...');
console.log('================================\n');

// Check if DATABASE_URL is set
if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set');
    console.log('Please set DATABASE_URL in your .env file');
    process.exit(1);
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function runSQLFile(filePath) {
    try {
        console.log(`📄 Reading ${filePath}...`);
        const sql = fs.readFileSync(filePath, 'utf8');

        console.log(`🚀 Executing ${filePath}...`);
        await pool.query(sql);

        console.log(`✅ ${filePath} executed successfully\n`);
    } catch (error) {
        console.error(`❌ Error executing ${filePath}:`, error.message);
        throw error;
    }
}

async function setupDatabase() {
    try {
        // Test connection
        console.log('🔌 Testing database connection...');
        await pool.query('SELECT NOW()');
        console.log('✅ Database connection successful\n');

        // Run email schema
        await runSQLFile('scripts/email-schema.sql');

        // Run email inbox schema
        await runSQLFile('scripts/email-inbox-schema.sql');

        console.log('🎉 Email database setup complete!');
        console.log('\n📊 Created tables:');
        console.log('  - email_templates');
        console.log('  - email_queue');
        console.log('  - email_logs');
        console.log('  - application_emails');
        console.log('  - email_preferences');
        console.log('  - email_inbox');

        console.log('\n🚀 Ready to test the email system!');
        console.log('Run: npm run dev');

    } catch (error) {
        console.error('❌ Database setup failed:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Load environment variables
require('dotenv').config();

setupDatabase();
