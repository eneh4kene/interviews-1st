const { Pool } = require('pg');

// Test the JobDiscoveryService logic
async function testJobDiscoveryService() {
    const pool = new Pool({
        connectionString: "postgresql://neondb_owner:npg_pi8PbIqt5WSD@ep-purple-silence-ad2u8w9w-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('Testing JobDiscoveryService logic...');

        const client = await pool.connect();
        const clientId = '0d8971ac-b96a-4cce-bd86-15550d465975';

        // Test 1: Check if client exists
        const clientResult = await client.query(
            'SELECT id, name FROM clients WHERE id = $1',
            [clientId]
        );
        console.log('✅ Client exists:', clientResult.rows.length > 0);
        if (clientResult.rows.length > 0) {
            console.log('   Client name:', clientResult.rows[0].name);
        }

        // Test 2: Check job preferences
        const prefResult = await client.query(
            'SELECT * FROM job_preferences WHERE client_id = $1',
            [clientId]
        );
        console.log('✅ Job preferences count:', prefResult.rows.length);

        // Test 3: Test default search query (what should run when no preferences)
        const defaultQuery = `
            SELECT 
                id, title, company, company_website, location, salary, salary_min, salary_max,
                description_snippet, apply_url, source, posted_date, job_type, work_location,
                requirements, benefits, auto_apply_status
            FROM jobs 
            WHERE (to_tsvector('english', title) @@ plainto_tsquery('english', $1) OR to_tsvector('english', company) @@ plainto_tsquery('english', $1))
            ORDER BY 
                CASE WHEN search_vector IS NOT NULL THEN 1 ELSE 2 END,
                posted_date DESC, 
                auto_apply_status DESC
            LIMIT $2
        `;

        const defaultResult = await client.query(defaultQuery, ['software engineer', 20]);
        console.log('✅ Default search results:', defaultResult.rows.length);

        if (defaultResult.rows.length > 0) {
            console.log('   First job:', defaultResult.rows[0].title, 'at', defaultResult.rows[0].company);
        }

        // Test 4: Test with location filter
        const locationQuery = `
            SELECT 
                id, title, company, company_website, location, salary, salary_min, salary_max,
                description_snippet, apply_url, source, posted_date, job_type, work_location,
                requirements, benefits, auto_apply_status
            FROM jobs 
            WHERE (to_tsvector('english', location) @@ plainto_tsquery('english', $1) OR work_location = 'remote')
            ORDER BY 
                CASE WHEN search_vector IS NOT NULL THEN 1 ELSE 2 END,
                posted_date DESC, 
                auto_apply_status DESC
            LIMIT $2
        `;

        const locationResult = await client.query(locationQuery, ['London', 20]);
        console.log('✅ Location search results:', locationResult.rows.length);

        client.release();
        await pool.end();

    } catch (error) {
        console.error('❌ Error:', error);
        await pool.end();
    }
}

testJobDiscoveryService();
