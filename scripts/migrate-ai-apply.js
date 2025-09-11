const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function migrateAiApplySchema() {
    const client = await pool.connect();

    try {
        console.log('🚀 Starting AI Apply schema migration...');

        // Read the SQL file
        const fs = require('fs');
        const sql = fs.readFileSync('./scripts/ai-apply-schema-fixed.sql', 'utf8');

        // Execute the SQL
        await client.query(sql);

        console.log('✅ AI Apply schema migration completed successfully!');

        // Verify the changes
        const result = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'applications' 
      AND column_name IN ('job_id', 'company_website', 'apply_url', 'application_type', 'ai_processing_status')
      ORDER BY column_name
    `);

        console.log('📋 New columns added to applications table:');
        result.rows.forEach(row => {
            console.log(`  - ${row.column_name}: ${row.data_type}`);
        });

        // Check new tables
        const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name IN ('job_classifications', 'ai_apply_queue', 'application_email_tracking', 'client_job_preferences_cache')
      ORDER BY table_name
    `);

        console.log('📋 New tables created:');
        tables.rows.forEach(row => {
            console.log(`  - ${row.table_name}`);
        });

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

if (require.main === module) {
    migrateAiApplySchema()
        .then(() => {
            console.log('🎉 Migration completed!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Migration failed:', error);
            process.exit(1);
        });
}

module.exports = { migrateAiApplySchema };
