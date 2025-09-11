// Test login script to create a test user and get auth token
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function createTestUser() {
    try {
        console.log('🔍 Creating test user...');

        // Check if test user already exists
        const existingUser = await pool.query(
            'SELECT id, email, role FROM users WHERE email = $1',
            ['test@interviewsfirst.com']
        );

        if (existingUser.rows.length > 0) {
            console.log('✅ Test user already exists:', existingUser.rows[0]);
            return existingUser.rows[0];
        }

        // Create test user
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash('testpassword123', 10);

        const result = await pool.query(`
      INSERT INTO users (email, name, role, password_hash, is_active)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, email, name, role
    `, [
            'test@interviewsfirst.com',
            'Test Worker',
            'WORKER',
            hashedPassword,
            true
        ]);

        console.log('✅ Test user created:', result.rows[0]);
        return result.rows[0];

    } catch (error) {
        console.error('❌ Error creating test user:', error);
        throw error;
    }
}

async function generateTestToken(user) {
    try {
        console.log('🔍 Generating test token...');

        const token = jwt.sign(
            {
                userId: user.id,
                email: user.email,
                role: user.role,
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

        console.log('✅ Test token generated');
        console.log('🔑 Token:', token);
        console.log('📋 Use this token in your browser console:');
        console.log(`localStorage.setItem('accessToken', '${token}');`);

        return token;

    } catch (error) {
        console.error('❌ Error generating token:', error);
        throw error;
    }
}

async function testAuth() {
    try {
        console.log('🧪 Testing authentication system...');

        // Create test user
        const user = await createTestUser();

        // Generate test token
        const token = await generateTestToken(user);

        // Test the token with our API
        console.log('\n🔍 Testing token with API...');
        const response = await fetch('http://localhost:3000/api/test-auth', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const result = await response.json();
        console.log('🔍 API response:', result);

        if (result.success) {
            console.log('✅ Authentication test successful!');
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
testAuth();
