#!/usr/bin/env node

/**
 * InterviewsFirst Database Migration System
 * Handles database schema migrations and data seeding
 */

const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

// Database configuration
const dbConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};

const pool = new Pool(dbConfig);

// Migration tracking table
const MIGRATIONS_TABLE = `
    CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        version VARCHAR(255) UNIQUE NOT NULL,
        filename VARCHAR(255) NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        checksum VARCHAR(255)
    );
`;

// Migration files directory
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

class DatabaseMigrator {
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

    async ensureMigrationsTable() {
        await this.pool.query(MIGRATIONS_TABLE);
        console.log('✅ Migrations table ensured');
    }

    async getAppliedMigrations() {
        const result = await this.pool.query(
            'SELECT version FROM schema_migrations ORDER BY applied_at'
        );
        return result.rows.map(row => row.version);
    }

    async getMigrationFiles() {
        try {
            const files = await fs.readdir(MIGRATIONS_DIR);
            return files
                .filter(file => file.endsWith('.sql'))
                .sort()
                .map(file => ({
                    filename: file,
                    version: file.split('_')[0],
                    path: path.join(MIGRATIONS_DIR, file)
                }));
        } catch (error) {
            console.log('📁 No migrations directory found, creating...');
            await fs.mkdir(MIGRATIONS_DIR, { recursive: true });
            return [];
        }
    }

    async calculateChecksum(filePath) {
        const content = await fs.readFile(filePath, 'utf8');
        const crypto = require('crypto');
        return crypto.createHash('md5').update(content).digest('hex');
    }

    async runMigration(migration) {
        console.log(`🔄 Running migration: ${migration.filename}`);

        try {
            const content = await fs.readFile(migration.path, 'utf8');
            const checksum = await this.calculateChecksum(migration.path);

            // Start transaction
            await this.pool.query('BEGIN');

            // Run migration SQL
            await this.pool.query(content);

            // Record migration
            await this.pool.query(
                'INSERT INTO schema_migrations (version, filename, checksum) VALUES ($1, $2, $3)',
                [migration.version, migration.filename, checksum]
            );

            // Commit transaction
            await this.pool.query('COMMIT');

            console.log(`✅ Migration applied: ${migration.filename}`);
            return true;
        } catch (error) {
            await this.pool.query('ROLLBACK');
            console.error(`❌ Migration failed: ${migration.filename}`, error.message);
            return false;
        }
    }

    async migrate() {
        console.log('🚀 Starting database migration...');

        await this.connect();
        await this.ensureMigrationsTable();

        const appliedMigrations = await this.getAppliedMigrations();
        const migrationFiles = await this.getMigrationFiles();

        console.log(`📊 Found ${migrationFiles.length} migration files`);
        console.log(`📊 Applied migrations: ${appliedMigrations.length}`);

        let newMigrations = 0;
        let failedMigrations = 0;

        for (const migration of migrationFiles) {
            if (!appliedMigrations.includes(migration.version)) {
                const success = await this.runMigration(migration);
                if (success) {
                    newMigrations++;
                } else {
                    failedMigrations++;
                    break; // Stop on first failure
                }
            } else {
                console.log(`⏭️  Skipping already applied migration: ${migration.filename}`);
            }
        }

        console.log(`\n📈 Migration Summary:`);
        console.log(`   ✅ New migrations applied: ${newMigrations}`);
        console.log(`   ❌ Failed migrations: ${failedMigrations}`);
        console.log(`   📊 Total migrations: ${appliedMigrations.length + newMigrations}`);

        if (failedMigrations > 0) {
            process.exit(1);
        }
    }

    async rollback(targetVersion = null) {
        console.log('🔄 Starting database rollback...');

        await this.connect();
        await this.ensureMigrationsTable();

        const appliedMigrations = await this.getAppliedMigrations();

        if (appliedMigrations.length === 0) {
            console.log('📊 No migrations to rollback');
            return;
        }

        const migrationsToRollback = targetVersion
            ? appliedMigrations.filter(v => v > targetVersion).reverse()
            : [appliedMigrations[appliedMigrations.length - 1]];

        console.log(`🔄 Rolling back ${migrationsToRollback.length} migrations...`);

        for (const version of migrationsToRollback) {
            console.log(`⚠️  Rollback not implemented for version: ${version}`);
            console.log('   Manual rollback required');
        }
    }

    async status() {
        console.log('📊 Database Migration Status');
        console.log('============================');

        await this.connect();
        await this.ensureMigrationsTable();

        const appliedMigrations = await this.getAppliedMigrations();
        const migrationFiles = await this.getMigrationFiles();

        console.log(`\n📁 Migration Files: ${migrationFiles.length}`);
        migrationFiles.forEach(file => {
            const status = appliedMigrations.includes(file.version) ? '✅ Applied' : '⏳ Pending';
            console.log(`   ${status} ${file.filename}`);
        });

        console.log(`\n📊 Summary:`);
        console.log(`   Applied: ${appliedMigrations.length}`);
        console.log(`   Pending: ${migrationFiles.length - appliedMigrations.length}`);
    }
}

// CLI interface
async function main() {
    const command = process.argv[2];
    const migrator = new DatabaseMigrator();

    switch (command) {
        case 'migrate':
            await migrator.migrate();
            break;
        case 'rollback':
            const targetVersion = process.argv[3];
            await migrator.rollback(targetVersion);
            break;
        case 'status':
            await migrator.status();
            break;
        default:
            console.log('Usage: node migrate-database.js [migrate|rollback|status]');
            console.log('  migrate  - Run pending migrations');
            console.log('  rollback - Rollback last migration');
            console.log('  status   - Show migration status');
            process.exit(1);
    }

    await migrator.pool.end();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = DatabaseMigrator;
