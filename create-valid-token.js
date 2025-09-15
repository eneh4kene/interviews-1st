const jwt = require('jsonwebtoken');

// Create a valid JWT token with the correct user ID
const secret = 'your-secret-key';
const payload = {
    userId: '550e8400-e29b-41d4-a716-446655440003', // This matches the worker_id
    role: 'ADMIN'
};

const token = jwt.sign(payload, secret);
console.log('Valid JWT token:', token);

// Verify it works
try {
    const decoded = jwt.verify(token, secret);
    console.log('Token verification successful:', decoded);
} catch (error) {
    console.log('Token verification failed:', error.message);
}
