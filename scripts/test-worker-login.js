// Test worker login with specific credentials
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function testWorkerLogin() {
    try {
        console.log('🔍 Testing worker login...');

        // Check if worker exists
        const workerResult = await pool.query(
            'SELECT id, email, name, role, password_hash FROM users WHERE email = $1',
            ['worker1@interview-me.com']
        );

        if (workerResult.rows.length === 0) {
            console.log('❌ Worker not found. Creating worker...');

            // Create worker
            const hashedPassword = await bcrypt.hash('password@worker1', 10);
            const result = await pool.query(`
        INSERT INTO users (email, name, role, password_hash, is_active)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, email, name, role
      `, [
                'worker1@interview-me.com',
                'Worker 1',
                'WORKER',
                hashedPassword,
                true
            ]);

            console.log('✅ Worker created:', result.rows[0]);
            var worker = result.rows[0];
        } else {
            console.log('✅ Worker found:', workerResult.rows[0]);
            var worker = workerResult.rows[0];
        }

        // Verify password
        const isValidPassword = await bcrypt.compare('password@worker1', worker.password_hash);
        if (!isValidPassword) {
            console.log('❌ Invalid password');
            return;
        }

        console.log('✅ Password verified');

        // Generate token
        const token = jwt.sign(
            {
                userId: worker.id,
                email: worker.email,
                role: worker.role,
                type: 'access'
            },
            process.env.JWT_SECRET,
            {
                algorithm: 'HS256',
                expiresIn: '1h',
                issuer: 'interviewsfirst',
                audience: 'interviewsfirst-users'
            }
        );

        console.log('✅ Token generated');
        console.log('🔑 Token:', token);
        console.log('\n📋 Copy this to your browser console:');
        console.log(`localStorage.setItem('accessToken', '${token}');`);

        // Test the token with API
        console.log('\n🔍 Testing token with API...');
        const response = await fetch('http://localhost:3001/api/test-auth', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const result = await response.json();
        console.log('🔍 API response:', result);

        if (result.success) {
            console.log('✅ Authentication test successful!');
            console.log('🎉 You can now test the AI Applications tab!');
        } else {
            console.log('❌ Authentication test failed:', result.error);
        }

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await pool.end();
    }
}

// Run the test
testWorkerLogin();
