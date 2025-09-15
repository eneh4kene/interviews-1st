const jwt = require('jsonwebtoken');

// Test JWT token verification
function testJWT() {
    const token = 'test-token';
    const secret = process.env.JWT_SECRET || 'your-secret-key';

    try {
        console.log('Testing JWT verification...');
        console.log('Token:', token);
        console.log('Secret:', secret);

        const decoded = jwt.verify(token, secret);
        console.log('✅ JWT verification successful:', decoded);
    } catch (error) {
        console.log('❌ JWT verification failed:', error.message);

        // Try with a valid token
        const validToken = jwt.sign({ userId: 'test-user', role: 'ADMIN' }, secret);
        console.log('Valid token example:', validToken);

        try {
            const decodedValid = jwt.verify(validToken, secret);
            console.log('✅ Valid token works:', decodedValid);
        } catch (validError) {
            console.log('❌ Even valid token fails:', validError.message);
        }
    }
}

testJWT();
