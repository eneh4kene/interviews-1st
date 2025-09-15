const { Pool } = require('pg');

// Test the database connection and query directly
async function testJobsQuery() {
    const pool = new Pool({
        connectionString: "postgresql://neondb_owner:npg_pi8PbIqt5WSD@ep-purple-silence-ad2u8w9w-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('Testing database connection...');

        // Test basic connection
        const client = await pool.connect();
        console.log('✅ Database connected');

        // Test a simple query
        const result = await client.query('SELECT COUNT(*) FROM jobs');
        console.log('✅ Jobs count:', result.rows[0].count);

        // Test client preferences query
        const clientId = '0d8971ac-b96a-4cce-bd86-15550d465975';
        const prefResult = await client.query(
            'SELECT * FROM job_preferences WHERE client_id = $1',
            [clientId]
        );
        console.log('✅ Client preferences:', prefResult.rows.length);

        // Test FTS query
        const ftsResult = await client.query(
            "SELECT id, title FROM jobs WHERE to_tsvector('english', title) @@ plainto_tsquery('english', $1) LIMIT 5",
            ['software']
        );
        console.log('✅ FTS query result:', ftsResult.rows.length);

        client.release();
        await pool.end();

    } catch (error) {
        console.error('❌ Database error:', error);
        await pool.end();
    }
}

testJobsQuery();
