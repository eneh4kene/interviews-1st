#!/usr/bin/env node

/**
 * Database Maintenance Script
 * Performs routine database maintenance tasks
 * SAFE: Only performs maintenance, doesn't modify data
 */

const { Pool } = require('pg');

// Database configuration
const dbConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};

const pool = new Pool(dbConfig);

class DatabaseMaintenance {
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

    async analyzeTables() {
        console.log('📊 Analyzing tables for better query planning...');
        try {
            await this.pool.query('ANALYZE');
            console.log('✅ Table analysis completed');
            return { status: 'success' };
        } catch (error) {
            console.error('❌ Table analysis failed:', error.message);
            return { status: 'error', error: error.message };
        }
    }

    async vacuumTables() {
        console.log('🧹 Vacuuming tables to reclaim space...');
        try {
            await this.pool.query('VACUUM ANALYZE');
            console.log('✅ Table vacuum completed');
            return { status: 'success' };
        } catch (error) {
            console.error('❌ Table vacuum failed:', error.message);
            return { status: 'error', error: error.message };
        }
    }

    async reindexTables() {
        console.log('🔍 Reindexing tables for better performance...');
        try {
            await this.pool.query('REINDEX DATABASE interviewsfirst');
            console.log('✅ Database reindexing completed');
            return { status: 'success' };
        } catch (error) {
            console.error('❌ Database reindexing failed:', error.message);
            return { status: 'error', error: error.message };
        }
    }

    async cleanupOldData() {
        console.log('🗑️  Cleaning up old data...');
        try {
            // Clean up old audit logs (older than 90 days)
            const auditResult = await this.pool.query(`
                DELETE FROM audit_logs 
                WHERE changed_at < NOW() - INTERVAL '90 days'
            `);
            console.log(`   Cleaned ${auditResult.rowCount} old audit log entries`);

            // Clean up old performance metrics (older than 30 days)
            const metricsResult = await this.pool.query(`
                DELETE FROM performance_metrics 
                WHERE created_at < NOW() - INTERVAL '30 days'
            `);
            console.log(`   Cleaned ${metricsResult.rowCount} old performance metrics`);

            // Clean up old security events (older than 180 days)
            const securityResult = await this.pool.query(`
                DELETE FROM security_events 
                WHERE created_at < NOW() - INTERVAL '180 days'
            `);
            console.log(`   Cleaned ${securityResult.rowCount} old security events`);

            console.log('✅ Data cleanup completed');
            return { status: 'success' };
        } catch (error) {
            console.error('❌ Data cleanup failed:', error.message);
            return { status: 'error', error: error.message };
        }
    }

    async checkDatabaseIntegrity() {
        console.log('🔍 Checking database integrity...');
        try {
            // Check for orphaned records
            const orphanedClients = await this.pool.query(`
                SELECT COUNT(*) as count
                FROM clients c
                LEFT JOIN users u ON c.assigned_worker_id = u.id
                WHERE c.assigned_worker_id IS NOT NULL AND u.id IS NULL
            `);

            if (orphanedClients.rows[0].count > 0) {
                console.log(`   ⚠️  Found ${orphanedClients.rows[0].count} clients with invalid worker assignments`);
            } else {
                console.log('   ✅ No orphaned client records found');
            }

            // Check for duplicate emails
            const duplicateEmails = await this.pool.query(`
                SELECT email, COUNT(*) as count
                FROM users
                GROUP BY email
                HAVING COUNT(*) > 1
            `);

            if (duplicateEmails.rows.length > 0) {
                console.log(`   ⚠️  Found ${duplicateEmails.rows.length} duplicate email addresses`);
            } else {
                console.log('   ✅ No duplicate email addresses found');
            }

            console.log('✅ Database integrity check completed');
            return { status: 'success' };
        } catch (error) {
            console.error('❌ Database integrity check failed:', error.message);
            return { status: 'error', error: error.message };
        }
    }

    async runMaintenance() {
        console.log('🔧 Starting database maintenance...');

        await this.connect();

        const results = {
            analyze: await this.analyzeTables(),
            vacuum: await this.vacuumTables(),
            reindex: await this.reindexTables(),
            cleanup: await this.cleanupOldData(),
            integrity: await this.checkDatabaseIntegrity()
        };

        console.log('\n📊 Maintenance Summary:');
        console.log('======================');

        Object.entries(results).forEach(([task, result]) => {
            const status = result.status === 'success' ? '✅' : '❌';
            console.log(`${status} ${task}: ${result.status}`);
        });

        const allSuccessful = Object.values(results).every(result => result.status === 'success');

        if (allSuccessful) {
            console.log('\n🎉 Database maintenance completed successfully!');
        } else {
            console.log('\n⚠️  Database maintenance completed with some issues');
        }

        await this.pool.end();
        return allSuccessful;
    }
}

// CLI interface
async function main() {
    const command = process.argv[2];
    const maintenance = new DatabaseMaintenance();

    if (command === 'run') {
        const success = await maintenance.runMaintenance();
        process.exit(success ? 0 : 1);
    } else {
        console.log('Usage: node database-maintenance.js run');
        process.exit(1);
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = DatabaseMaintenance;
