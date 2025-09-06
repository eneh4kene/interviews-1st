#!/usr/bin/env node

/**
 * InterviewsFirst Database Seeding Script
 * Populates the database with initial data for development and testing
 * SAFE: Only adds new data, doesn't modify existing functionality
 */

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// Database configuration
const dbConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};

const pool = new Pool(dbConfig);

class DatabaseSeeder {
    constructor() {
        this.pool = pool;
    }

    async connect() {
        try {
            await this.pool.query('SELECT NOW()');
            console.log('✅ Database connected successfully');
        } catch (error) {
            console.error('❌ Database connection failed:', error.message);
            process.exit(1);
        }
    }

    async seedUsers() {
        console.log('👥 Seeding users...');

        const users = [
            {
                id: uuidv4(),
                email: 'admin@interviewsfirst.com',
                password: 'admin123',
                name: 'System Administrator',
                role: 'ADMIN'
            },
            {
                id: uuidv4(),
                email: 'worker1@interviewsfirst.com',
                password: 'worker123',
                name: 'John Smith',
                role: 'WORKER'
            },
            {
                id: uuidv4(),
                email: 'worker2@interviewsfirst.com',
                password: 'worker123',
                name: 'Sarah Johnson',
                role: 'WORKER'
            }
        ];

        for (const user of users) {
            const hashedPassword = await bcrypt.hash(user.password, 10);

            await this.pool.query(`
                INSERT INTO users (id, email, password_hash, name, role, is_active, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
                ON CONFLICT (email) DO UPDATE SET
                    password_hash = EXCLUDED.password_hash,
                    name = EXCLUDED.name,
                    role = EXCLUDED.role,
                    updated_at = NOW()
            `, [user.id, user.email, hashedPassword, user.name, user.role, true]);
        }

        console.log(`✅ Seeded ${users.length} users`);
        return users;
    }

    async seed() {
        console.log('🚀 Starting database seeding...');

        await this.connect();
        const users = await this.seedUsers();

        console.log('\n🎉 Database seeding completed successfully!');
        console.log(`📊 Seeded: ${users.length} users`);

        await this.pool.end();
    }
}

// CLI interface
async function main() {
    const command = process.argv[2];
    const seeder = new DatabaseSeeder();

    if (command === 'seed') {
        await seeder.seed();
    } else {
        console.log('Usage: node seed-database.js seed');
        process.exit(1);
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = DatabaseSeeder;