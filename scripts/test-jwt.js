// Test JWT functions
const jwt = require('jsonwebtoken');
require('dotenv').config();

console.log('🔍 JWT_SECRET:', process.env.JWT_SECRET ? 'Set' : 'Not set');
console.log('🔍 JWT_SECRET length:', process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 0);

// Test token generation
const testPayload = {
    userId: 'test-user-id',
    email: 'test@example.com',
    role: 'WORKER',
    type: 'access'
};

console.log('🔍 Generating test token...');
const token = jwt.sign(testPayload, process.env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: '1h',
    issuer: 'interviewsfirst',
    audience: 'interviewsfirst-users'
});

console.log('✅ Token generated:', token);

// Test token verification
console.log('🔍 Verifying token...');
try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
        algorithms: ['HS256'],
        issuer: 'interviewsfirst',
        audience: 'interviewsfirst-users'
    });
    console.log('✅ Token verified successfully:', decoded);
} catch (error) {
    console.error('❌ Token verification failed:', error.message);
}
