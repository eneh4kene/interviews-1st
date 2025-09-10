#!/usr/bin/env node

/**
 * Email System Test Script
 * 
 * This script helps test the email notification system
 * Run with: node scripts/test-email-system.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 Email System Testing Script');
console.log('================================\n');

// Check if we're in the right directory
if (!fs.existsSync('package.json')) {
    console.error('❌ Please run this script from the project root directory');
    process.exit(1);
}

// Check if .env.local exists
if (!fs.existsSync('.env.local')) {
    console.log('⚠️  .env.local not found. Creating template...');

    const envTemplate = `# Email Testing Configuration
DATABASE_URL=your_database_url_here
EMAIL_PROVIDER=nodemailer
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-test-email@gmail.com
SMTP_PASS=your-app-password
SMTP_SECURE=false
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
JWT_SECRET=your-jwt-secret-here
`;

    fs.writeFileSync('.env.local', envTemplate);
    console.log('✅ Created .env.local template. Please update with your values.\n');
}

// Check if database schema has been applied
console.log('📋 Checking database setup...');
if (fs.existsSync('scripts/email-schema.sql')) {
    console.log('✅ Email schema file found');
    console.log('   Run: psql -d your_database -f scripts/email-schema.sql');
} else {
    console.log('❌ Email schema file not found');
}

console.log('\n🚀 Starting development server...');
console.log('   This will start the Next.js development server');
console.log('   Press Ctrl+C to stop when testing is complete\n');

// Start the development server
try {
    execSync('npm run dev', { stdio: 'inherit' });
} catch (error) {
    console.error('❌ Failed to start development server:', error.message);
    process.exit(1);
}
