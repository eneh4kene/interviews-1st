#!/usr/bin/env ts-node

import { db } from '../apps/api/src/utils/database';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

async function seedDatabase() {
    try {
        console.log('🌱 Starting database seeding...');

        const seedSQLPath = path.join(__dirname, 'seed-mock-data.sql');
        const seedSQL = fs.readFileSync(seedSQLPath, 'utf8');

        console.log('📖 Read seed SQL file');

        // Execute the SQL as a single query
        await db.query(seedSQL);

        console.log('✅ Database seeded successfully!');

        // Verify record counts
        const tables = ['users', 'clients', 'resumes', 'job_preferences', 'applications', 'interviews', 'payments', 'jobs', 'client_notifications'];

        for (const table of tables) {
            const result = await db.query(`SELECT COUNT(*) AS count FROM ${table}`);
            console.log(`   ${table}: ${result.rows[0].count} records`);
        }

        console.log('\n🎉 Database seeding completed successfully!');
    } catch (error) {
        console.error('❌ Error seeding database:', error);
        process.exit(1);
    }
}

seedDatabase().catch(console.error);

