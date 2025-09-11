// Test script to verify AI Apply schema can be applied
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Database connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/interview_me'
});

async function testSchema() {
    try {
        console.log('🧪 Testing AI Apply schema...');

        // Read schema file
        const schemaPath = path.join(__dirname, 'ai-apply-core-schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        // Split into individual statements
        const statements = schema
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

        console.log(`📝 Found ${statements.length} SQL statements to execute`);

        // Execute each statement
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            if (statement.trim()) {
                try {
                    console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);
                    await pool.query(statement);
                    console.log(`✅ Statement ${i + 1} executed successfully`);
                } catch (error) {
                    console.error(`❌ Error executing statement ${i + 1}:`, error.message);
                    console.error(`   Statement: ${statement.substring(0, 100)}...`);
                    // Continue with other statements
                }
            }
        }

        // Test table creation by querying them
        console.log('\n🔍 Testing table creation...');

        const tables = [
            'client_emails',
            'ai_applications',
            'client_email_templates',
            'application_queue',
            'email_discovery_results'
        ];

        for (const table of tables) {
            try {
                const result = await pool.query(`SELECT COUNT(*) FROM ${table}`);
                console.log(`✅ Table ${table} exists and is accessible (${result.rows[0].count} rows)`);
            } catch (error) {
                console.error(`❌ Table ${table} not accessible:`, error.message);
            }
        }

        console.log('\n🎉 AI Apply schema test completed!');

    } catch (error) {
        console.error('❌ Schema test failed:', error);
    } finally {
        await pool.end();
    }
}

// Run the test
testSchema();
