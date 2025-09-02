#!/usr/bin/env node

/**
 * Database Seeding Script for InterviewsFirst Platform
 * 
 * This script seeds your Neon PostgreSQL database with mock data for development and testing.
 * 
 * Usage:
 * 1. Make sure your DATABASE_URL is set in your environment
 * 2. Run: node scripts/seed-database.js
 * 
 * Prerequisites:
 * - Run scripts/init-db.sql first to create the database schema
 * - Set DATABASE_URL environment variable
 */



const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();  // instead of import dotenv

// Check if DATABASE_URL is set
if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set');
    console.log('💡 Please set it to your Neon PostgreSQL connection string');
    console.log('   Example: export DATABASE_URL="postgresql://user:pass@host:port/db?sslmode=require"');
    process.exit(1);
}

// Create database connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function seedDatabase() {
    const client = await pool.connect();

    try {
        console.log('🌱 Starting database seeding...');

        // Read the seed SQL file
        const seedSQLPath = path.join(__dirname, 'seed-mock-data.sql');
        const seedSQL = fs.readFileSync(seedSQLPath, 'utf8');

        console.log('📖 Read seed SQL file');

        // Execute the seed SQL
        await client.query(seedSQL);

        console.log('✅ Database seeded successfully!');

        // Verify the data
        console.log('\n📊 Verifying seeded data...');

        const tables = ['users', 'clients', 'resumes', 'job_preferences', 'applications', 'interviews', 'payments', 'jobs', 'client_notifications'];

        for (const table of tables) {
            const result = await client.query(`SELECT COUNT(*) as count FROM ${table}`);
            console.log(`   ${table}: ${result.rows[0].count} records`);
        }

        console.log('\n🎉 Database seeding completed successfully!');
        console.log('\n🔑 Test Login Credentials:');
        console.log('   Admin: admin@interview-me.com');
        console.log('   Worker: worker1@interview-me.com');
        console.log('   Client: client1@email.com');
        console.log('\n💡 All users have password hash: $2b$10$mock.hash.for.testing');

    } catch (error) {
        console.error('❌ Error seeding database:', error);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

// Run the seeding
seedDatabase().catch(console.error);
