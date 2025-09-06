#!/usr/bin/env node

/**
 * Database Health Check Script
 * Monitors database health and performance
 * SAFE: Only reads data, doesn't modify anything
 */

const { Pool } = require('pg');

// Database configuration
const dbConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};

const pool = new Pool(dbConfig);

class DatabaseHealthChecker {
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

    async checkDatabaseSize() {
        try {
            const result = await this.pool.query(`
                SELECT pg_size_pretty(pg_database_size(current_database())) as size,
                       pg_database_size(current_database()) as size_bytes
            `);
            return {
                status: 'healthy',
                size: result.rows[0].size,
                sizeBytes: parseInt(result.rows[0].size_bytes)
            };
        } catch (error) {
            return { status: 'unhealthy', error: error.message };
        }
    }

    async checkActiveConnections() {
        try {
            const result = await this.pool.query(`
                SELECT count(*) as active_connections
                FROM pg_stat_activity 
                WHERE state = 'active'
            `);
            const connections = parseInt(result.rows[0].active_connections);
            return {
                status: connections < 50 ? 'healthy' : 'warning',
                connections: connections
            };
        } catch (error) {
            return { status: 'unhealthy', error: error.message };
        }
    }

    async checkSlowQueries() {
        try {
            const result = await this.pool.query(`
                SELECT count(*) as slow_queries
                FROM pg_stat_activity 
                WHERE state = 'active' 
                AND query_start < NOW() - INTERVAL '30 seconds'
            `);
            const slowQueries = parseInt(result.rows[0].slow_queries);
            return {
                status: slowQueries === 0 ? 'healthy' : 'warning',
                slowQueries: slowQueries
            };
        } catch (error) {
            return { status: 'unhealthy', error: error.message };
        }
    }

    async checkTableStats() {
        try {
            const result = await this.pool.query(`
                SELECT 
                    schemaname,
                    tablename,
                    n_tup_ins as inserts,
                    n_tup_upd as updates,
                    n_tup_del as deletes,
                    n_live_tup as live_tuples,
                    n_dead_tup as dead_tuples
                FROM pg_stat_user_tables
                ORDER BY n_live_tup DESC
                LIMIT 10
            `);
            return {
                status: 'healthy',
                tables: result.rows
            };
        } catch (error) {
            return { status: 'unhealthy', error: error.message };
        }
    }

    async checkIndexUsage() {
        try {
            const result = await this.pool.query(`
                SELECT 
                    schemaname,
                    tablename,
                    indexname,
                    idx_scan as index_scans,
                    idx_tup_read as tuples_read,
                    idx_tup_fetch as tuples_fetched
                FROM pg_stat_user_indexes
                WHERE idx_scan > 0
                ORDER BY idx_scan DESC
                LIMIT 10
            `);
            return {
                status: 'healthy',
                indexes: result.rows
            };
        } catch (error) {
            return { status: 'unhealthy', error: error.message };
        }
    }

    async runHealthCheck() {
        console.log('🏥 Running database health check...');
        
        await this.connect();
        
        const checks = {
            databaseSize: await this.checkDatabaseSize(),
            activeConnections: await this.checkActiveConnections(),
            slowQueries: await this.checkSlowQueries(),
            tableStats: await this.checkTableStats(),
            indexUsage: await this.checkIndexUsage()
        };

        console.log('\n📊 Database Health Report:');
        console.log('========================');
        
        // Database Size
        console.log(`\n💾 Database Size: ${checks.databaseSize.status.toUpperCase()}`);
        if (checks.databaseSize.status === 'healthy') {
            console.log(`   Size: ${checks.databaseSize.size}`);
        } else {
            console.log(`   Error: ${checks.databaseSize.error}`);
        }

        // Active Connections
        console.log(`\n🔗 Active Connections: ${checks.activeConnections.status.toUpperCase()}`);
        if (checks.activeConnections.status === 'healthy') {
            console.log(`   Connections: ${checks.activeConnections.connections}`);
        } else {
            console.log(`   Error: ${checks.activeConnections.error}`);
        }

        // Slow Queries
        console.log(`\n⏱️  Slow Queries: ${checks.slowQueries.status.toUpperCase()}`);
        if (checks.slowQueries.status === 'healthy') {
            console.log(`   Slow queries: ${checks.slowQueries.slowQueries}`);
        } else {
            console.log(`   Error: ${checks.slowQueries.error}`);
        }

        // Table Statistics
        console.log(`\n📋 Table Statistics: ${checks.tableStats.status.toUpperCase()}`);
        if (checks.tableStats.status === 'healthy') {
            console.log('   Top tables by live tuples:');
            checks.tableStats.tables.forEach(table => {
                console.log(`     ${table.tablename}: ${table.live_tuples} live, ${table.dead_tuples} dead`);
            });
        } else {
            console.log(`   Error: ${checks.tableStats.error}`);
        }

        // Index Usage
        console.log(`\n🔍 Index Usage: ${checks.indexUsage.status.toUpperCase()}`);
        if (checks.indexUsage.status === 'healthy') {
            console.log('   Most used indexes:');
            checks.indexUsage.indexes.forEach(index => {
                console.log(`     ${index.indexname}: ${index.index_scans} scans`);
            });
        } else {
            console.log(`   Error: ${checks.indexUsage.error}`);
        }

        // Overall Health
        const overallStatus = Object.values(checks).every(check => 
            check.status === 'healthy' || check.status === 'warning'
        ) ? 'healthy' : 'unhealthy';

        console.log(`\n🎯 Overall Database Health: ${overallStatus.toUpperCase()}`);
        
        await this.pool.end();
        return overallStatus;
    }
}

// CLI interface
async function main() {
    const command = process.argv[2];
    const checker = new DatabaseHealthChecker();
    
    if (command === 'check') {
        const status = await checker.runHealthCheck();
        process.exit(status === 'healthy' ? 0 : 1);
    } else {
        console.log('Usage: node database-health-check.js check');
        process.exit(1);
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = DatabaseHealthChecker;
